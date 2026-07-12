import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';

let io: SocketServer;

export function initSocket(server: HttpServer, frontendUrl: string): SocketServer {
  io = new SocketServer(server, {
    cors: {
      origin: frontendUrl,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Cafe Admin joins a room based on their restaurant ID
    socket.on('join_restaurant', (restaurantId: string) => {
      socket.join(`restaurant_${restaurantId}`);
      console.log(`Socket ${socket.id} joined room restaurant_${restaurantId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
}
