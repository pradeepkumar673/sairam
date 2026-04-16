import { NavLink } from 'react-router-dom';
import { Home, MessageCircle, Bot, Grid } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/chat', icon: MessageCircle, label: 'Chat' },
  { path: '/chatbot', icon: Bot, label: 'Saathi' },
  { path: '/more', icon: Grid, label: 'More' },
];

export default function BottomNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 md:max-w-md md:mx-auto bg-white/90 backdrop-blur-md border-t border-warm-100 shadow-[0_-8px_30px_rgba(249,115,22,0.1)] rounded-t-[32px] z-50">
      <div className="flex justify-around items-center h-[88px] px-4 pb-safe">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center w-[72px] h-[72px] rounded-3xl transition-colors ${
                isActive ? 'text-warm-600' : 'text-gray-400 hover:text-warm-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="nav-bubble"
                    className="absolute inset-0 bg-warm-100/60 rounded-3xl"
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                  />
                )}
                <motion.div
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: 'spring', bounce: 0.3 }}
                >
                  <item.icon className="w-8 h-8 mb-1 z-10 relative" strokeWidth={isActive ? 2.5 : 2} />
                </motion.div>
                <span className="text-[12px] font-semibold z-10 relative">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
