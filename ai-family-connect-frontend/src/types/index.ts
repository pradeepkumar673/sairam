export interface User {
  id: string;
  name: string;
  email: string;
  role: 'elder' | 'student' | 'family';
  inviteCode: string;
  avatar?: string;
}

export interface FamilyMember {
  _id?: string;
  linkId?: string;
  member: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    avatar?: string;
  };
  linkedSince?: string;
}

export interface Medicine {
  _id: string;
  name: string;
  dosage: number;
  unit: string;
  frequency: string;
  timesPerDay: string[];
  currentStock?: number;
  refillThreshold: number;
  isActive: boolean;
}

export interface MoodEntry {
  _id: string;
  mood: string;
  moodScore: number;
  source: string;
  notes?: string;
  createdAt: string;
}

export interface SOSAlert {
  _id: string;
  triggeredBy: { _id: string; firstName: string; lastName: string };
  message: string;
  location?: { latitude: number; longitude: number; address?: string };
  createdAt: string;
}
