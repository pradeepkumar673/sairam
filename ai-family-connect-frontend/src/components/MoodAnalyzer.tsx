import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, RefreshCw, Smile } from 'lucide-react';
import api from '../lib/api';

interface MoodAnalyzerProps {
  onClose: () => void;
  onAnalysisComplete?: (result: any) => void;
}

export default function MoodAnalyzer({ onClose, onAnalysisComplete }: MoodAnalyzerProps) {
  const webcamRef = useRef<Webcam>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
    }
  }, [webcamRef]);

  const analyzeMood = async (imageBase64: string) => {
    setAnalyzing(true);
    setError(null);
    try {
      console.log('Converting captured image to blob...');
      const res = await fetch(imageBase64);
      const blob = await res.blob();
      const file = new File([blob], 'mood.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('faceImage', file);

      console.log('Sending mood analysis request...');
      const response = await api.post('/ai/mood-mirror', formData);
      console.log('Mood analysis success:', response.data.data);

      setResult(response.data.data);
      onAnalysisComplete?.(response.data.data);
    } catch (err: any) {
      console.error('Mood analysis failed:', err);
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setResult(null);
    setError(null);
  };

  useEffect(() => {
    if (capturedImage && !result && !analyzing) {
      analyzeMood(capturedImage);
    }
  }, [capturedImage]);

  // Determine color for the progress bar based on confidence score
  const getGradientForScore = (score: number) => {
    if (score > 75) return 'from-emerald-400 to-emerald-500';
    if (score > 45) return 'from-amber-400 to-amber-500';
    return 'from-rose-400 to-rose-500';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-white rounded-[36px] overflow-hidden shadow-2xl relative"
        >
          <div className="p-5 flex justify-between items-center border-b border-warm-100/50 bg-white/80 backdrop-blur-sm z-10 relative">
            <h3 className="text-[22px] font-bold text-gray-900 tracking-tight">Mood Mirror</h3>
            <button onClick={onClose} className="w-12 h-12 rounded-full bg-warm-50 flex items-center justify-center hover:bg-warm-100 transition-colors">
              <X className="w-6 h-6 text-gray-700" />
            </button>
          </div>

          <div className="p-5">
            {!capturedImage ? (
              <div className="relative rounded-[32px] overflow-hidden bg-black shadow-inner">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: 'user' }}
                  className="w-full h-[400px] object-cover scale-[1.02]"
                />
                
                {/* Face Scanning Overlay Animation */}
                <div className="absolute inset-0 border-[6px] border-black/20 rounded-[32px] pointer-events-none" />
                
                {/* Advanced Face Mesh Simulation */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                  <motion.svg 
                    viewBox="0 0 200 240" 
                    className="w-64 h-72 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1 }}
                  >
                    {/* Geometric Mesh Lines */}
                    <motion.path
                      d="M100,40 L60,80 L40,130 L60,180 L100,210 L140,180 L160,130 L140,80 Z M60,80 L100,90 L140,80 M40,130 L80,135 L120,135 L160,130 M60,180 L100,175 L140,180 M100,40 L100,90 L100,135 L100,175 L100,210"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.5"
                      strokeDasharray="4 2"
                      animate={{ strokeDashoffset: [0, -20] }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    />
                    {/* Inner Mesh Details */}
                    <path d="M70,110 L90,110 M110,110 L130,110 M90,155 L110,155" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                    
                    {/* Pulsing Nodes (Dots) */}
                    {[
                      {x:100, y:40}, {x:60, y:80}, {x:140, y:80}, {x:40, y:130}, 
                      {x:160, y:130}, {x:60, y:180}, {x:140, y:180}, {x:100, y:210},
                      {x:80, y:110}, {x:120, y:110}, {x:100, y:145}, {x:90, y:170}, {x:110, y:170}
                    ].map((p, i) => (
                      <motion.circle
                        key={i}
                        cx={p.x} cy={p.y} r="1.5"
                        fill="currentColor"
                        animate={{ r: [1.5, 2.5, 1.5], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                      />
                    ))}
                  </motion.svg>
                </div>

                {/* Vertical Scanning Beam */}
                <motion.div 
                  initial={{ top: '10%', opacity: 0.4 }}
                  animate={{ top: '90%', opacity: [0.4, 0.8, 0.4] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                  className="absolute left-[10%] right-[10%] h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.9)] pointer-events-none"
                />
                
                {/* Yellow Face Guide Frame */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <motion.div 
                     animate={{ opacity: [0.4, 0.7, 0.4] }}
                     transition={{ duration: 3, repeat: Infinity }}
                     className="w-52 h-64 border-2 border-dashed border-yellow-400/60 rounded-[48px] shadow-[0_0_20px_rgba(250,204,21,0.2)]" 
                   />
                </div>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={capture}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl border-[6px] border-warm-500 hover:border-warm-400 transition-colors"
                >
                  <Camera className="w-8 h-8 text-warm-600" />
                </motion.button>
              </div>
            ) : analyzing ? (
              <div className="flex flex-col items-center justify-center py-16 h-[400px]">
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                    className="w-20 h-20 border-4 border-warm-100 border-t-warm-500 border-r-warm-500 rounded-full mb-6"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pb-6">
                    <Smile className="w-8 h-8 text-warm-500" />
                  </div>
                </div>
                <p className="text-[20px] font-bold text-gray-800">Reading your expression...</p>
                <p className="text-gray-500 font-medium mt-2">Just a moment please</p>
              </div>
            ) : result ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 pt-2 pb-2">
                <div className="text-center space-y-2">
                  <motion.div 
                    initial={{ scale: 0, rotate: -20 }} 
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                    className="text-[80px] leading-none mb-4 inline-block drop-shadow-md"
                  >
                    {result.emotion === 'happy' ? '😊' : result.emotion === 'sad' ? '😔' : result.emotion === 'anxious' ? '😟' : '😌'}
                  </motion.div>
                  <h4 className="text-[28px] font-bold text-gray-900 capitalize tracking-tight">{result.emotion}</h4>
                  <p className="text-gray-600 font-medium text-[16px] px-4 leading-relaxed">{result.suggestion}</p>
                </div>

                <div className="bg-gradient-to-b from-gray-50 to-white rounded-[24px] p-6 shadow-sm border border-gray-100">
                  <div className="flex justify-between text-[13px] font-bold text-gray-400 mb-3 uppercase tracking-wider">
                    <span>Low</span>
                    <span className="text-gray-900 tracking-normal capitalize">Confidence Score</span>
                    <span>High</span>
                  </div>
                  <div className="h-5 bg-gray-200 rounded-full overflow-hidden shadow-inner p-1">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${result.confidence}%` }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                      className={`h-full rounded-full bg-gradient-to-r ${getGradientForScore(result.confidence)} relative overflow-hidden`}
                    >
                      <div className="absolute inset-0 bg-white/20 w-full h-full transform -skew-x-12 -translate-x-full animate-[shimmer_2s_infinite]" />
                    </motion.div>
                  </div>
                  <p className="text-center mt-3 font-bold text-gray-900 text-[20px]">
                    {result.confidence}<span className="text-gray-400 text-sm">%</span>
                  </p>
                </div>

                {result.alertFamily && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} delay={0.5}
                    className="bg-amber-50 border-2 border-amber-200 rounded-[24px] p-5 text-amber-900 shadow-sm"
                  >
                    <p className="font-bold flex items-center justify-center gap-2">
                       <span className="text-xl">❤️</span> We've subtly notified your family.
                    </p>
                  </motion.div>
                )}

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={retake}
                    className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold text-[18px] rounded-[24px] flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Retake
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-4 bg-warm-500 text-white font-bold text-[18px] rounded-[24px] hover:bg-warm-600 transition-colors shadow-lg shadow-warm-500/20"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            ) : null}

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 p-5 bg-rose-50 border-2 border-rose-100 text-rose-700 rounded-[24px] flex flex-col items-center text-center">
                <span className="font-bold mb-2">{error}</span>
                <button onClick={retake} className="font-bold underline text-rose-900 py-2">Try Again</button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
