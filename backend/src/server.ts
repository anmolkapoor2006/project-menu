import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { PrismaClient } from '@prisma/client';

// Socket.io initialization
import { initSocket } from './io';

// Controller imports
import { register, login, me } from './controllers/auth.controller';
import { updateRestaurant, getQRCode } from './controllers/restaurant.controller';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from './controllers/menu.controller';
import { getPublicMenu, logViewEvent } from './controllers/public.controller';
import { placeOrder, getOrders, updateOrderStatus } from './controllers/order.controller';
import { getRestaurantAnalytics, getPlatformAnalytics } from './controllers/analytics.controller';

// Middleware imports
import { authenticateToken } from './middleware/auth.middleware';
import { upload } from './middleware/upload.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const prisma = new PrismaClient();

// Configure CORS
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));

app.use(express.json());

// Serve static uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Health Check
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: String(error) });
  }
});

// Authentication
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.get('/api/auth/me', authenticateToken, me);

// Restaurant Profile & QR
app.put('/api/restaurants/:id', authenticateToken, upload.single('logo'), updateRestaurant);
app.get('/api/restaurants/:id/qrcode', authenticateToken, getQRCode);

// Categories
app.post('/api/restaurants/:id/categories', authenticateToken, createCategory);
app.put('/api/categories/:id', authenticateToken, updateCategory);
app.delete('/api/categories/:id', authenticateToken, deleteCategory);

// Menu Items
app.post('/api/categories/:categoryId/items', authenticateToken, upload.single('image'), createMenuItem);
app.put('/api/items/:id', authenticateToken, upload.single('image'), updateMenuItem);
app.delete('/api/items/:id', authenticateToken, deleteMenuItem);

// Orders
app.post('/api/public/menu/:slug/order', placeOrder);
app.get('/api/restaurants/:id/orders', authenticateToken, getOrders);
app.put('/api/orders/:id/status', authenticateToken, updateOrderStatus);

// Analytics
app.get('/api/restaurants/:id/analytics', authenticateToken, getRestaurantAnalytics);
app.get('/api/admin/analytics/platform', authenticateToken, getPlatformAnalytics);

// Public Menu Access
app.get('/api/public/menu/:slug', getPublicMenu);
app.post('/api/public/menu/:slug/view-event', logViewEvent);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

// Create HTTP server and bind Socket.io
const server = http.createServer(app);
initSocket(server, FRONTEND_URL);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
