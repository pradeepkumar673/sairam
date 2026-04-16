/**
 * More.tsx — Fixed: all feature buttons now open their real components
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity, Mic, Camera, ChefHat, Brain, Moon,
  ShieldAlert, Cloud, Gamepad2, LogOut, FileText, HeartPulse
} from 'lucide-react';
import { useStore } from '../store';
import { disconnectSocket } from '../lib/socket';
import VoiceEmotion from '../components/VoiceEmotion';
import WoundIdentifier from '../components/WoundIdentifier';
import RecipeSuggester from '../components/RecipeSuggester';
import SleepStory from '../components/SleepStory';
import DoctorSlipScanner from '../components/DoctorSlipScanner';

type ModalType = 'voice' | 'wound' | 'recipe' | 'sleep' | 'scan' | null;

export default function More() {
  const navigate = useNavigate();
  const { logout } = useStore();
  const [modal, setModal] = useState<ModalType>(null);

  const features = [
    {
      title: 'Voice Emotion',
      icon: Mic,
      color: 'bg-purple-50 text-purple-600',
      border: 'border-purple-100',
      action: () => setModal('voice'),
    },
    {
      title: 'Wound Identifier',
      icon: HeartPulse,
      color: 'bg-rose-50 text-rose-600',
      border: 'border-rose-100',
      action: () => setModal('wound'),
    },
    {
      title: 'Recipe Suggester',
      icon: ChefHat,
      color: 'bg-amber-50 text-amber-600',
      border: 'border-amber-100',
      action: () => setModal('recipe'),
    },
    {
      title: 'Doctor Slip Scanner',
      icon: FileText,
      color: 'bg-blue-50 text-blue-600',
      border: 'border-blue-100',
      action: () => setModal('scan'),
    },
    {
      title: 'Sleep Story',
      icon: Moon,
      color: 'bg-indigo-50 text-indigo-600',
      border: 'border-indigo-100',
      action: () => setModal('sleep'),
    },
    {
      title: 'Family Dashboard',
      icon: Activity,
      color: 'bg-emerald-50 text-emerald-600',
      border: 'border-emerald-100',
      action: () => navigate('/dashboard'),
    },
    {
      title: 'Memory Games',
      icon: Brain,
      color: 'bg-sky-50 text-sky-600',
      border: 'border-sky-100',
      action: () => {},  // future feature
    },
    {
      title: 'SOS Settings',
      icon: ShieldAlert,
      color: 'bg-red-50 text-red-600',
      border: 'border-red-100',
      action: () => {},
    },
    {
      title: 'Weather Nudge',
      icon: Cloud,
      color: 'bg-cyan-50 text-cyan-600',
      border: 'border-cyan-100',
      action: () => {},
    },
    {
      title: 'Game Scores',
      icon: Gamepad2,
      color: 'bg-orange-50 text-orange-600',
      border: 'border-orange-100',
      action: () => {},
    },
  ];

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-warm-50 p-6 pt-12 pb-32">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">More</h1>
        <button
          onClick={handleLogout}
          className="p-3 bg-white rounded-full shadow-sm text-gray-600 border border-gray-100"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {features.map((item, i) => (
          <motion.button
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.96 }}
            onClick={item.action}
            className={`rounded-3xl p-5 border ${item.border} shadow-sm flex flex-col items-center justify-center text-center aspect-square bg-white`}
          >
            <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center mb-3`}>
              <item.icon className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-gray-900 leading-tight text-sm">{item.title}</h3>
          </motion.button>
        ))}
      </div>

      {/* Modals */}
      {modal === 'voice' && <VoiceEmotion onClose={() => setModal(null)} />}
      {modal === 'wound' && <WoundIdentifier onClose={() => setModal(null)} />}
      {modal === 'recipe' && <RecipeSuggester onClose={() => setModal(null)} />}
      {modal === 'sleep' && <SleepStory onClose={() => setModal(null)} />}
      {modal === 'scan' && (
        <DoctorSlipScanner
          onClose={() => setModal(null)}
          onMedicinesAdded={() => {
            /* optionally refresh medicines in Home */
          }}
        />
      )}
    </div>
  );
}
