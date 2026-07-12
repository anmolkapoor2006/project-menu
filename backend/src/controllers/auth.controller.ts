import { Request, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwttokenkey123!';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  restaurantName: z.string().min(2, 'Restaurant name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and dashes').optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

async function generateUniqueSlug(name: string): Promise<string> {
  let baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!baseSlug) {
    baseSlug = 'restaurant';
  }

  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await prisma.restaurant.findUnique({
      where: { slug }
    });
    if (!existing) {
      break;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

export async function register(req: Request, res: Response) {
  try {
    const body = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: body.email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    let slug = body.slug;
    if (slug) {
      const existingRestaurant = await prisma.restaurant.findUnique({
        where: { slug }
      });
      if (existingRestaurant) {
        return res.status(400).json({ error: 'Restaurant slug is already taken' });
      }
    } else {
      slug = await generateUniqueSlug(body.restaurantName);
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    // Create User and Restaurant in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: body.name,
          email: body.email,
          passwordHash,
          role: Role.RESTAURANT_ADMIN,
        }
      });

      const restaurant = await tx.restaurant.create({
        data: {
          ownerId: user.id,
          name: body.restaurantName,
          slug: slug as string,
        }
      });

      return { user, restaurant };
    });

    // Generate JWT
    const token = jwt.sign(
      {
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role,
        restaurantId: result.restaurant.id,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Restaurant registered successfully',
      token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
      restaurant: result.restaurant,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { restaurants: true }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(body.password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const restaurant = user.restaurants[0] || null;

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        restaurantId: restaurant ? restaurant.id : undefined,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      restaurant,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function me(req: any, res: Response) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        restaurants: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
