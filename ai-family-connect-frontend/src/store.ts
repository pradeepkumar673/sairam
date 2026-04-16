import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  token: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

interface AppState {
  user: User | null;
  familyMembers: FamilyMember[];
  setUser: (user: User | null) => void;
  addFamilyMember: (member: FamilyMember) => void;
}

export const useStore = create<AppState>((set) => ({
  user: { id: '1', name: 'Thatha', token: 'mock-token' }, // Mocking an older adult user
  familyMembers: [],
  setUser: (user) => set({ user }),
  addFamilyMember: (member) => set((state) => ({ 
    familyMembers: [...state.familyMembers, member] 
  })),
}));
