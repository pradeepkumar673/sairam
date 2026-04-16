import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import { X, Phone, MapPin, Smile } from 'lucide-react';

interface MoodAnalyzerProps {
  onClose: () => void;
}

export default function MoodAnalyzer({ onClose }: MoodAnalyzerProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  const startAnalysis = () => {
    setAnalyzing(true);
    let current = 0;
    const interval = setInterval(() => {
      current += 2;
      setProgress(current);
      if (current >= 100) {
        clearInterval(interval);
        setAnalyzing(false);
        setResult({
          score: 85,
          title: "You look calm and peaceful today",
          emoji: "😌",
          message: "It’s wonderful to see you relaxed. Maintaining this peace is great for your heart health!"
        });
      }
    }, 100);
  };

  useEffect(() => {
    // Auto start analysis after short delay
    const t = setTimeout(startAnalysis, 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-12 h-12 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white"
        >
          <X className="w-6 h-6" />
        </button>

        {!result ? (
          <div className="relative h-[60vh] bg-gray-900 rounded-[32px] m-2 overflow-hidden">
            <Webcam
              audio={false}
              className="absolute inset-0 w-full h-full object-cover"
              mirrored
            />
            {analyzing && (
              <div className="absolute inset-0 z-10">
                {/* Simulated Face Mesh overlay */}
                <svg className="absolute inset-0 w-full h-full opacity-50" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <motion.path 
                    d="M 30,40 Q 50,30 70,40 Q 60,60 50,70 Q 40,60 30,40 Z" 
                    stroke="#10b981" 
                    strokeWidth="0.5" 
                    fill="none" 
                    initial={{ pathLength: 0 }} 
                    animate={{ pathLength: 1 }} 
                    transition={{ duration: 2, repeat: Infinity }} 
                  />
                  {/* Dots */}
                  {[30, 70, 50].map((cx, i) => (
                    <circle key={i} cx={cx} cy={i===2 ? 70 : 40} r="2" fill="#facc15" />
                  ))}
                </svg>

                <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center">
                  <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-full text-white font-medium mb-4">
                    Analyzing your expression...
                  </div>
                  <div className="w-2/3 h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-emerald-400"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 md:p-8 flex flex-col items-center text-center"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="text-8xl mb-4"
            >
              {result.emoji}
            </motion.div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
              {result.title}
            </h2>
            
            <div className="w-full my-6 bg-warm-50 rounded-3xl p-5 border border-warm-100">
              <div className="flex justify-between text-sm font-semibold text-gray-500 mb-2">
                <span>Stressed</span>
                <span className="text-emerald-600">Peaceful</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${result.score}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-orange-400 via-yellow-400 to-emerald-500"
                />
              </div>
            </div>

            <p className="text-lg text-gray-600 mb-8 px-2">
              {result.message}
            </p>

            <div className="w-full space-y-3">
              <button 
                onClick={() => window.location.href="tel:1234567890"}
                className="w-full py-4 bg-warm-500 text-white text-lg font-bold rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-warm-500/30 active:scale-[0.98]"
              >
                <Phone className="w-6 h-6" />
                Call Ramesh (Son)
              </button>
              <button 
                onClick={() => onClose()}
                className="w-full py-4 bg-white border-2 border-warm-100 text-warm-900 text-lg font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <MapPin className="w-6 h-6" />
                Visit Nearby Park
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
