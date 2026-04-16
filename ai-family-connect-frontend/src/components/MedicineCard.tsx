import { useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Medicine } from '../types';
import api from '../lib/api';

interface Props {
  medicine: Medicine;
  onUpdate: () => void;
}

export default function MedicineCard({ medicine, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);
  const isLowStock = medicine.currentStock !== undefined && medicine.currentStock <= medicine.refillThreshold;
  // Based on your initial text, assume a "taken" flag locally or from API. For now, we just post to API.
  // In a robust implementation, the backend array for timesPerDay should track taken status.

  const handleTakeDose = async () => {
    setLoading(true);
    try {
      await api.post(`/medicine/${medicine._id}/log`, {
        status: 'taken',
        scheduledTime: new Date().toISOString(),
      });
      onUpdate();
    } catch (err) {
      console.error('Failed to log dose', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[28px] p-5 flex items-center justify-between border-2 border-transparent hover:border-warm-100 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
    >
      <div className="flex-1 pr-4">
        <h4 className="text-[20px] font-bold text-gray-900 leading-tight mb-1">{medicine.name}</h4>
        <p className="text-gray-500 font-medium text-[15px]">
          {medicine.dosage} {medicine.unit} • {medicine.frequency}
        </p>
        {isLowStock && (
          <div className="flex items-center gap-1.5 mt-3 text-amber-600 bg-amber-50 w-max px-3 py-1.5 rounded-full">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-bold">Low stock: {medicine.currentStock} left</span>
          </div>
        )}
      </div>
      
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleTakeDose}
        disabled={loading}
        className="w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center bg-gray-50 text-gray-400 hover:bg-emerald-50 hover:text-emerald-500 transition-colors border-2 border-gray-100 hover:border-emerald-100"
      >
        {loading ? (
           <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
        ) : (
          <CheckCircle2 className="w-8 h-8" />
        )}
      </motion.button>
    </motion.div>
  );
}
