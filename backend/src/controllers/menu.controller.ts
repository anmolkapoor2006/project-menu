import { Response } from 'express';
import prisma from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';
import { uploadToCloudinary } from '../utils/cloudinary';
import { clearMenuCache } from '../utils/menuCache';

const booleanPreprocess = (val: unknown) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (val === 'true' || val === true) return true;
  if (val === 'false' || val === false) return false;
  return Boolean(val);
};

const numberPreprocess = (val: unknown) => {
  if (val === undefined || val === null || val === '') return undefined;
  const num = Number(val);
  return isNaN(num) ? undefined : num;
};

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  displayOrder: z.preprocess(numberPreprocess, z.number().int().default(0)),
});

const itemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional().nullable(),
  price: z.preprocess(numberPreprocess, z.number().positive('Price must be greater than 0')),
  isVeg: z.preprocess(booleanPreprocess, z.boolean().default(true)),
  isAvailable: z.preprocess(booleanPreprocess, z.boolean().default(true)),
  badge: z.string().optional().nullable(),
  prepTime: z.string().optional().nullable(),
  displayOrder: z.preprocess(numberPreprocess, z.number().int().default(0)),
});

async function isAuthorizedForRestaurant(user: any, restaurantId: string): Promise<boolean> {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.restaurantId === restaurantId) return true;
  const userId = user.id || user.userId;
  if (userId) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (restaurant && restaurant.ownerId === userId) return true;
  }
  return false;
}

// --- Category Controllers ---

export async function createCategory(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: restaurantId } = req.params;

    const isAuth = await isAuthorizedForRestaurant(req.user, restaurantId);
    if (!isAuth) {
      return res.status(403).json({ error: 'Not authorized to modify this menu' });
    }

    const body = categorySchema.parse(req.body);

    const category = await prisma.menuCategory.create({
      data: {
        restaurantId,
        name: body.name,
        displayOrder: body.displayOrder,
      },
    });

    clearMenuCache();

    return res.status(201).json({ message: 'Category created successfully', category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateCategory(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const existing = await prisma.menuCategory.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const isAuth = await isAuthorizedForRestaurant(req.user, existing.restaurantId);
    if (!isAuth) {
      return res.status(403).json({ error: 'Not authorized to modify this category' });
    }

    const body = categorySchema.partial().parse(req.body);

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.displayOrder !== undefined) updateData.displayOrder = body.displayOrder;

    const category = await prisma.menuCategory.update({
      where: { id },
      data: updateData,
    });

    clearMenuCache();

    return res.json({ message: 'Category updated successfully', category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteCategory(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const existing = await prisma.menuCategory.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const isAuth = await isAuthorizedForRestaurant(req.user, existing.restaurantId);
    if (!isAuth) {
      return res.status(403).json({ error: 'Not authorized to delete this category' });
    }

    await prisma.menuCategory.delete({ where: { id } });

    clearMenuCache();

    return res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// --- Menu Item Controllers ---

export async function createMenuItem(req: AuthenticatedRequest, res: Response) {
  try {
    const { categoryId } = req.params;

    const category = await prisma.menuCategory.findUnique({ where: { id: categoryId } });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const isAuth = await isAuthorizedForRestaurant(req.user, category.restaurantId);
    if (!isAuth) {
      return res.status(403).json({ error: 'Not authorized to add items to this category' });
    }

    const body = itemSchema.parse(req.body);
    const imageUrl = req.file ? await uploadToCloudinary(req.file.path) : undefined;

    const item = await prisma.menuItem.create({
      data: {
        categoryId,
        name: body.name,
        description: body.description || null,
        price: body.price.toString(),
        isVeg: body.isVeg,
        isAvailable: body.isAvailable,
        badge: body.badge || null,
        prepTime: body.prepTime || null,
        displayOrder: body.displayOrder,
        imageUrl: imageUrl || null,
      },
    });

    clearMenuCache();

    return res.status(201).json({ message: 'Menu item created successfully', item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateMenuItem(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const existing = await prisma.menuItem.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const isAuth = await isAuthorizedForRestaurant(req.user, existing.category.restaurantId);
    if (!isAuth) {
      return res.status(403).json({ error: 'Not authorized to update this item' });
    }

    const body = itemSchema.partial().parse(req.body);
    const imageUrl = req.file ? await uploadToCloudinary(req.file.path) : undefined;

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.price !== undefined) updateData.price = body.price.toString();
    if (body.isVeg !== undefined) updateData.isVeg = body.isVeg;
    if (body.isAvailable !== undefined) updateData.isAvailable = body.isAvailable;
    if (body.badge !== undefined) updateData.badge = body.badge;
    if (body.prepTime !== undefined) updateData.prepTime = body.prepTime;
    if (body.displayOrder !== undefined) updateData.displayOrder = body.displayOrder;
    if (imageUrl) {
      updateData.imageUrl = imageUrl;
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: updateData,
    });

    clearMenuCache();

    return res.json({ message: 'Menu item updated successfully', item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteMenuItem(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const existing = await prisma.menuItem.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const isAuth = await isAuthorizedForRestaurant(req.user, existing.category.restaurantId);
    if (!isAuth) {
      return res.status(403).json({ error: 'Not authorized to delete this item' });
    }

    await prisma.menuItem.delete({ where: { id } });

    clearMenuCache();

    return res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getRestaurantFullMenu(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: restaurantId } = req.params;

    const isAuth = await isAuthorizedForRestaurant(req.user, restaurantId);
    if (!isAuth) {
      return res.status(403).json({ error: 'Not authorized to view this menu' });
    }

    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId },
      orderBy: { displayOrder: 'asc' },
      include: {
        items: {
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    return res.json({ categories });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
