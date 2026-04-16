import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Check, Loader2, Upload } from 'lucide-react';
import api from '../lib/api';
import { useStore } from '../store';
import type { Medicine } from '../types';

interface Props {
  onClose: () => void;
  onSuccess: (medicines: Medicine[]) => void;
}

export default function DoctorSlipScanner({ onClose, onSuccess }: Props) {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleScan = async () => {
    if (!image) return;
    setScanning(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('slipImage', image);

      // Call the backend AI extraction endpoint
      const res = await api.post('/medicine/scan-slip', formData);
      const newMedicines = res.data?.data;
      
      onSuccess(newMedicines);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to scan the slip. Please try again.');
    } finally {
      setScanning(false);
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
            <h3 className="text-xl font-bold text-gray-900">Scan Prescription</h3>
            <button onClick={onClose} disabled={scanning} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 flex flex-col items-center">
            {preview ? (
              <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden mb-6 border-2 border-emerald-100 shadow-inner">
                <img src={preview} alt="Slip Preview" className="w-full h-full object-cover" />
                {scanning && (
                  <motion.div 
                    initial={{ top: 0 }}
                    animate={{ top: '100%' }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                    className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] z-10"
                  />
                )}
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-warm-200 bg-warm-50 flex flex-col items-center justify-center cursor-pointer hover:bg-warm-100 transition-colors mb-6"
              >
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-warm-500 mb-3">
                  <Camera className="w-8 h-8" />
                </div>
                <p className="font-bold text-gray-700 text-lg">Tap to Upload</p>
                <p className="text-sm text-gray-500 font-medium">Clear photo of doctor's prescription</p>
              </div>
            )}

            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageSelect}
            />

            {error && <div className="w-full p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold mb-4 text-center">{error}</div>}

            <div className="w-full flex gap-3">
              {preview && !scanning && (
                <button
                  onClick={() => { setImage(null); setPreview(null); }}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-[20px] active:scale-95 transition-transform"
                >
                  Clear
                </button>
              )}
              <button
                onClick={preview ? handleScan : () => fileInputRef.current?.click()}
                disabled={scanning}
                className={`flex-1 py-4 font-bold rounded-[20px] flex items-center justify-center gap-2 text-white shadow-lg transition-transform active:scale-95 ${
                  preview ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-warm-500 hover:bg-warm-600 shadow-warm-500/30'
                }`}
              >
                {scanning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Extracting...
                  </>
                ) : preview ? (
                  <>
                    <Check className="w-5 h-5" />
                    Extract Medicines
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Choose Image
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
