import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Activity, Mic, Camera, Book, Brain, Moon, ShieldAlert, 
  Cloud, Gamepad2, LogOut 
} from 'lucide-react';
import { useStore } from '../store';
import { disconnectSocket } from '../lib/socket';

export default function More() {
  const navigate = useNavigate();
  const { logout } = useStore();

  const features = [
    { title: 'Family Dashboard', icon: Activity, color: 'text-emerald-500', shadow: 'shadow-emerald-100/50', bg: 'bg-emerald-50', action: () => navigate('/dashboard') },
    { title: 'Voice Emotion', icon: Mic, color: 'text-purple-500', shadow: 'shadow-purple-100/50', bg: 'bg-purple-50', action: () => {} },
    { title: 'Injury Analyzer', icon: Camera, color: 'text-rose-500', shadow: 'shadow-rose-100/50', bg: 'bg-rose-50', action: () => {} },
    { title: 'Recipe Suggester', icon: Book, color: 'text-amber-500', shadow: 'shadow-amber-100/50', bg: 'bg-amber-50', action: () => {} },
    { title: 'Memory Games', icon: Brain, color: 'text-blue-500', shadow: 'shadow-blue-100/50', bg: 'bg-blue-50', action: () => {} },
    { title: 'Sleep Story', icon: Moon, color: 'text-indigo-500', shadow: 'shadow-indigo-100/50', bg: 'bg-indigo-50', action: () => {} },
    { title: 'SOS Settings', icon: ShieldAlert, color: 'text-red-500', shadow: 'shadow-red-100/50', bg: 'bg-red-50', action: () => {} },
    { title: 'Weather Nudge', icon: Cloud, color: 'text-sky-500', shadow: 'shadow-sky-100/50', bg: 'bg-sky-50', action: () => {} },
    { title: 'Game Scores', icon: Gamepad2, color: 'text-orange-500', shadow: 'shadow-orange-100/50', bg: 'bg-orange-50', action: () => {} },
  ];

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-warm-50 pb-[100px]">
       <div className="bg-white rounded-b-[40px] shadow-sm px-6 pt-12 pb-8 border-b border-warm-100 flex justify-between items-center relative z-10 w-full mb-6">
         <h1 className="text-[32px] font-bold text-gray-900 leading-tight">
           More<br/><span className="text-warm-500">Exploration</span> ✨
         </h1>
        <button
          onClick={handleLogout}
          className="w-14 h-14 bg-rose-50 hover:bg-rose-100 text-rose-500 text-sm font-bold rounded-full shadow-sm transition-colors flex items-center justify-center shrink-0"
        >
          <LogOut className="w-6 h-6 mr-1" />
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4 px-6">
        {features.map((item, i) => (
          <motion.button
            key={item.title}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.04, type: 'spring' }}
            whileTap={{ scale: 0.94 }}
            onClick={item.action}
            className="rounded-[32px] p-6 border-2 border-white shadow-sm flex flex-col items-center justify-center text-center aspect-square bg-white hover:border-warm-100 transition-colors"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg ${item.shadow} ${item.bg} ${item.color}`}>
               <item.icon className="w-7 h-7" strokeWidth={2.5}/>
            </div>
            <h3 className="font-bold text-gray-800 text-[15px] leading-tight px-1">{item.title}</h3>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
