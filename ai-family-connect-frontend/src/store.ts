import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, FamilyMember, Medicine } from './types';

interface Notification {
  id: string;
  type: 'medicine' | 'warning' | 'emergency' | 'info';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

interface AppState {
  user: User | null;
  token: string | null;
  familyMembers: FamilyMember[];
  medicines: Medicine[];
  notifications: Notification[];
  socketConnected: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setFamilyMembers: (members: FamilyMember[]) => void;
  setMedicines: (meds: Medicine[]) => void;
  addNotification: (notif: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  setSocketConnected: (connected: boolean) => void;
  logout: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      familyMembers: [],
      medicines: [],
      notifications: [],
      socketConnected: false,
      setUser: (user) => set({ user }),
      setToken: (token) => {
        if (token) {
          localStorage.setItem('token', token);
        } else {
          localStorage.removeItem('token');
        }
        set({ token });
      },
      setFamilyMembers: (familyMembers) => set({ familyMembers }),
      setMedicines: (medicines) => set({ medicines }),
      addNotification: (notif) =>
        set((state) => ({
          notifications: [
            {
              ...notif,
              id: Date.now().toString() + Math.random(),
              read: false,
              createdAt: new Date(),
            },
            ...state.notifications,
          ].slice(0, 20),
        })),
      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      clearNotifications: () => set({ notifications: [] }),
      setSocketConnected: (connected) => set({ socketConnected: connected }),
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, familyMembers: [], medicines: [] });
      },
    }),
    {
      name: 'ai-family-connect-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
