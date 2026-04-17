import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pill, X, Check, Loader2 } from 'lucide-react';
import api from '../lib/api';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    name?: string;
    dosage?: string;
    unit?: string;
    frequency?: string;
  };
}

export default function AddMedicineModal({ onClose, onSuccess, initialData }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    dosage: initialData?.dosage || '',
    unit: initialData?.unit || 'mg',
    frequency: initialData?.frequency || 'daily',
    totalQuantity: '',
    refillThreshold: '5',
    endDate: '', // Expiry Date
  });

  const [scheduledTimes, setScheduledTimes] = useState<string[]>(['09:00']);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.name || !formData.dosage) {
        throw new Error('Name and dosage are required.');
      }

      await api.post('/medicine', {
        name: formData.name,
        dosage: Number(formData.dosage),
        unit: formData.unit,
        frequency: formData.frequency,
        totalQuantity: formData.totalQuantity ? Number(formData.totalQuantity) : null,
        refillThreshold: Number(formData.refillThreshold),
        endDate: formData.endDate || undefined,
        scheduledTimes: scheduledTimes,
        startDate: new Date(),
      });

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to add medicine.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white w-full max-w-sm rounded-[36px] overflow-hidden shadow-2xl relative"
        >
          <div className="p-5 flex justify-between items-center border-b border-warm-100">
            <div className="flex items-center gap-2 text-warm-500">
              <Pill className="w-6 h-6" />
              <h3 className="text-xl font-bold text-gray-900">Add Medicine</h3>
            </div>
            <button onClick={onClose} disabled={loading} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="w-full p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Medicine Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Paracetamol"
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-900 font-medium focus:border-warm-500 outline-none"
                required
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">Dosage</label>
                <input
                  type="number"
                  name="dosage"
                  value={formData.dosage}
                  onChange={handleChange}
                  placeholder="e.g. 500"
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-900 font-medium focus:border-warm-500 outline-none"
                  required
                />
              </div>
              <div className="w-24">
                <label className="block text-sm font-bold text-gray-700 mb-1">Unit</label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-900 font-medium focus:border-warm-500 outline-none"
                >
                  <option value="mg">mg</option>
                  <option value="ml">ml</option>
                  <option value="mcg">mcg</option>
                  <option value="g">g</option>
                  <option value="pills">pills</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Frequency</label>
              <select
                name="frequency"
                value={formData.frequency}
                onChange={handleChange}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-900 font-medium focus:border-warm-500 outline-none"
              >
                <option value="daily">Daily</option>
                <option value="twice_daily">Twice Daily</option>
                <option value="weekly">Weekly</option>
                <option value="as_needed">As Needed</option>
              </select>
            </div>

            {/* Reminder Times */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-bold text-gray-700 font-bold">Reminder Times</label>
                <button 
                  type="button"
                  onClick={() => setScheduledTimes([...scheduledTimes, '12:00'])}
                  className="text-xs font-bold text-warm-600 bg-warm-50 px-2 py-1 rounded-lg hover:bg-warm-100"
                >
                  + Add Time
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {scheduledTimes.map((time, idx) => (
                  <div key={idx} className="flex gap-1">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => {
                        const newTimes = [...scheduledTimes];
                        newTimes[idx] = e.target.value;
                        setScheduledTimes(newTimes);
                      }}
                      className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-xl px-2 py-2 text-sm focus:border-warm-500 outline-none"
                    />
                    {scheduledTimes.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => setScheduledTimes(scheduledTimes.filter((_, i) => i !== idx))}
                        className="text-rose-400 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Take Until (Expiry Date)</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-900 font-medium focus:border-warm-500 outline-none"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">Total Stock</label>
                <input
                  type="number"
                  name="totalQuantity"
                  value={formData.totalQuantity}
                  onChange={handleChange}
                  placeholder="e.g. 30"
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-900 font-medium focus:border-warm-500 outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">Alert At (Low)</label>
                <input
                  type="number"
                  name="refillThreshold"
                  value={formData.refillThreshold}
                  onChange={handleChange}
                  placeholder="e.g. 5"
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-900 font-medium focus:border-warm-500 outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 font-bold rounded-[20px] flex items-center justify-center gap-2 text-white bg-warm-500 hover:bg-warm-600 shadow-lg shadow-warm-500/30 transition-transform active:scale-95"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Save Medicine
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
