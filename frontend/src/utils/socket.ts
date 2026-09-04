import io, { Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config';

let socketInstance: Socket | null = null;
let activeRestaurantId: string | null = null;

/**
 * Returns a shared singleton Socket.io client instance
 * configured with reliable reconnects and transport fallbacks.
 */
export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      withCredentials: true,
    });

    socketInstance.on('connect', () => {
      console.log('🟢 [Socket.io] Connected to server:', socketInstance?.id);
      if (activeRestaurantId) {
        socketInstance?.emit('join_restaurant', activeRestaurantId);
        console.log(`[Socket.io] Re-joined room: restaurant_${activeRestaurantId}`);
      }
    });

    socketInstance.on('reconnect', (attempt) => {
      console.log(`🔄 [Socket.io] Reconnected after attempt #${attempt}`);
      if (activeRestaurantId) {
        socketInstance?.emit('join_restaurant', activeRestaurantId);
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.warn('⚠️ [Socket.io] Connection notice:', error.message);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 [Socket.io] Disconnected:', reason);
    });
  }

  return socketInstance;
}

/**
 * Ensures the socket joins the specified restaurant room.
 * Also saves the active room so reconnects automatically rejoin.
 */
export function joinRestaurantRoom(restaurantId: string): void {
  activeRestaurantId = restaurantId;
  const s = getSocket();
  if (s.connected && restaurantId) {
    s.emit('join_restaurant', restaurantId);
    console.log(`[Socket.io] Joined room: restaurant_${restaurantId}`);
  }
}
