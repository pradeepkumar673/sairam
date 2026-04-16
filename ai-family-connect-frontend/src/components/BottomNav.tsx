import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MessageCircle, Bot, Grid } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/chat', icon: MessageCircle, label: 'Family Chat' },
    { path: '/bot', icon: Bot, label: 'Saathi' },
    { path: '/more', icon: Grid, label: 'More' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 md:max-w-md md:mx-auto bg-white border-t border-warm-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-3xl z-50">
      <div className="flex justify-around items-center h-20 px-2 pb-safe">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center justify-center w-16 h-16 rounded-2xl"
            >
              {isActive && (
                <motion.div
                  layoutId="bubble"
                  className="absolute inset-0 bg-warm-100/50 rounded-2xl"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon
                className={`w-7 h-7 mb-1 z-10 transition-colors duration-300 ${
                  isActive ? 'text-warm-600' : 'text-gray-400'
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-[11px] font-medium z-10 transition-colors duration-300 ${
                  isActive ? 'text-warm-900' : 'text-gray-500'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
