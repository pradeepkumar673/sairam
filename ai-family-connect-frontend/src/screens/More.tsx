import { Activity, Mic, Camera, Book, Brain, Moon, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export default function More() {
  const cards = [
    { title: 'Voice Emotion Guardian', icon: Mic, color: 'bg-purple-50 text-purple-600 border-purple-100' },
    { title: 'Injury Photo Analyzer', icon: Camera, color: 'bg-rose-50 text-rose-600 border-rose-100' },
    { title: 'Kitchen Recipe Suggester', icon: Book, color: 'bg-amber-50 text-amber-600 border-amber-100' },
    { title: 'Memory Games', icon: Brain, color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { title: 'Sleep Story Generator', icon: Moon, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    { title: 'Family Dashboard', icon: Activity, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { title: 'SOS Settings', icon: ShieldAlert, color: 'bg-red-50 text-red-600 border-red-100' },
  ];

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col p-6 pt-12 pb-32">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 mx-2 tracking-tight">Explore More</h1>
      
      <div className="grid grid-cols-2 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.96 }}
            className={`cursor-pointer rounded-3xl p-5 border ${card.color} border-opacity-50 shadow-sm flex flex-col items-center justify-center text-center aspect-square`}
          >
            <card.icon className="w-10 h-10 mb-4" strokeWidth={2} />
            <h3 className="font-bold text-gray-900 leading-tight">{card.title}</h3>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
