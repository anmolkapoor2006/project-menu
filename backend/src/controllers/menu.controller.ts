import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

const prisma = new PrismaClient();

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  displayOrder: z.preprocess((val) => Number(val), z.number().int().default(0)),
});

const itemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  price: z.preprocess((val) => Number(val), z.number().positive('Price must be greater than 0')),
  isVeg: z.preprocess((val) => val === 'true' || val === true, z.boolean().default(true)),
  isAvailable: z.preprocess((val) => val === 'true' || val === true, z.boolean().default(true)),
  displayOrder: z.preprocess((val) => Number(val), z.number().int().default(0)),
});

// --- Category Controllers ---

export async function createCategory(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: restaurantId } = req.params;

    if (!req.user || (req.user.role !== 'SUPER_ADMIN' && req.user.restaurantId !== restaurantId)) {
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
    const body = categorySchema.parse(req.body);

    const existing = await prisma.menuCategory.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (!req.user || (req.user.role !== 'SUPER_ADMIN' && req.user.restaurantId !== existing.restaurantId)) {
      return res.status(403).json({ error: 'Not authorized to modify this category' });
    }

    const updated = await prisma.menuCategory.update({
      where: { id },
      data: {
        name: body.name,
        displayOrder: body.displayOrder,
      },
    });

    return res.json({ message: 'Category updated successfully', category: updated });
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

    if (!req.user || (req.user.role !== 'SUPER_ADMIN' && req.user.restaurantId !== existing.restaurantId)) {
      return res.status(403).json({ error: 'Not authorized to delete this category' });
    }

    await prisma.menuCategory.delete({ where: { id } });

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

    if (!req.user || (req.user.role !== 'SUPER_ADMIN' && req.user.restaurantId !== category.restaurantId)) {
      return res.status(403).json({ error: 'Not authorized to add items to this category' });
    }

    const body = itemSchema.parse(req.body);
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const menuItem = await prisma.menuItem.create({
      data: {
        categoryId,
        name: body.name,
        description: body.description,
        price: body.price,
        isVeg: body.isVeg,
        isAvailable: body.isAvailable,
        displayOrder: body.displayOrder,
        imageUrl,
      },
    });

    return res.status(201).json({ message: 'Menu item created successfully', item: menuItem });
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
    const body = itemSchema.partial().parse(req.body);

    const existing = await prisma.menuItem.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    if (!req.user || (req.user.role !== 'SUPER_ADMIN' && req.user.restaurantId !== existing.category.restaurantId)) {
      return res.status(403).json({ error: 'Not authorized to modify this menu item' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const updateData: any = { ...body };
    if (imageUrl) {
      updateData.imageUrl = imageUrl;
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: updateData,
    });

    return res.json({ message: 'Menu item updated successfully', item: updated });
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

    if (!req.user || (req.user.role !== 'SUPER_ADMIN' && req.user.restaurantId !== existing.category.restaurantId)) {
      return res.status(403).json({ error: 'Not authorized to delete this menu item' });
    }

    await prisma.menuItem.delete({ where: { id } });

    return res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
