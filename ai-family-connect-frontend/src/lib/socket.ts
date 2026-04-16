import { io, Socket } from 'socket.io-client';
import { useStore } from '../store';

let socket: Socket | null = null;

export const initSocket = (): Socket => {
  if (socket) return socket;

  const token = localStorage.getItem('token');
  if (!token) throw new Error('No auth token');

  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
    auth: { token: `Bearer ${token}` },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
  });

  // Global listeners for real-time alerts
  socket.on('medicine:reminder', (data) => {
    useStore.getState().addNotification({
      type: 'medicine',
      title: 'Medicine Reminder',
      message: data.message,
    });
    // Show browser notification if permitted
    if (Notification.permission === 'granted') {
      new Notification('💊 Medicine Time', { body: data.message });
    }
  });

  socket.on('medicine:missed', (data) => {
    useStore.getState().addNotification({
      type: 'warning',
      title: 'Missed Dose',
      message: data.message,
    });
  });

  socket.on('medicine:low_stock', (data) => {
    useStore.getState().addNotification({
      type: 'warning',
      title: 'Low Medicine Stock',
      message: data.message,
    });
  });

  socket.on('sos:alert', (data) => {
    useStore.getState().addNotification({
      type: 'emergency',
      title: '🆘 SOS Alert',
      message: data.message,
    });
  });

  socket.on('fall:detected', (data) => {
    useStore.getState().addNotification({
      type: 'emergency',
      title: 'Fall Detected!',
      message: data.message,
    });
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
