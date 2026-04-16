/**
 * VoiceEmotion.tsx
 * Records voice via Web Speech API (SpeechRecognition), sends transcribed text
 * to POST /api/ai/voice-emotion → returns emotion analysis.
 * Falls back to typed text input if mic is unavailable.
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Loader2, RotateCcw, Volume2 } from 'lucide-react';
import api from '../lib/api';

interface VoiceEmotionResult {
  emotion: string;
  stressLevel: 'low' | 'medium' | 'high';
  energyLevel: 'low' | 'medium' | 'high';
  suggestion: string;
  alertFamily: boolean;
}

interface VoiceEmotionProps {
  onClose: () => void;
}

const EMOTION_EMOJI: Record<string, string> = {
  joy: '😊', happy: '😊', happiness: '😊',
  sad: '😔', sadness: '😔',
  anger: '😠', angry: '😠',
  fear: '😨',
  disgust: '😒',
  surprise: '😲',
  neutral: '😐',
  calm: '😌',
  anxious: '😟', anxiety: '😟',
  distressed: '😰',
  lonely: '🥺',
  confused: '😕',
};

const STRESS_COLOR: Record<string, string> = {
  low: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  high: 'text-rose-600 bg-rose-50 border-rose-200',
};

export default function VoiceEmotion({ onClose }: VoiceEmotionProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<VoiceEmotionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (e: any) => {
      const t = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(' ');
      setTranscript(t);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = (e: any) => {
      setError(`Microphone error: ${e.error}. You can type your text below instead.`);
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;
    setTranscript('');
    setResult(null);
    setError(null);
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      setError('Could not start microphone. Please allow microphone access.');
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const analyzeEmotion = async () => {
    // The component uses 'transcript' which we send as 'text' in req.body
    if (!transcript.trim()) {
      setError('Please speak something or type a sentence first.');
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const res = await api.post('/ai/voice-emotion', { text: transcript });
      setResult(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setTranscript('');
    setResult(null);
    setError(null);
  };

  const emoji = result ? (EMOTION_EMOJI[result.emotion.toLowerCase()] || '🤔') : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[101] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 28 }}
          className="w-full sm:max-w-md bg-white rounded-t-[40px] sm:rounded-[36px] shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-purple-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-purple-50 rounded-2xl flex items-center justify-center">
                <Volume2 className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h3 className="text-[20px] font-bold text-gray-900">Voice Emotion</h3>
                <p className="text-xs text-gray-500">Speak a few sentences to detect your mood</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-5">
            {!result ? (
              <>
                {/* Mic button */}
                {supported && (
                  <div className="flex flex-col items-center py-4">
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      onClick={listening ? stopListening : startListening}
                      className={`w-28 h-28 rounded-full flex items-center justify-center shadow-xl transition-all ${
                        listening
                          ? 'bg-red-500 shadow-red-400/40'
                          : 'bg-purple-500 shadow-purple-400/40'
                      }`}
                    >
                      {listening ? (
                        <MicOff className="w-12 h-12 text-white" />
                      ) : (
                        <Mic className="w-12 h-12 text-white" />
                      )}
                    </motion.button>
                    <p className="mt-4 text-gray-600 font-medium">
                      {listening ? '🔴 Listening... tap to stop' : 'Tap to speak'}
                    </p>
                    {listening && (
                      <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="mt-2 w-3 h-3 bg-red-500 rounded-full"
                      />
                    )}
                  </div>
                )}

                {/* Transcript / text area */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {supported ? 'Transcript (auto-filled or type manually)' : 'Type your thoughts below'}
                  </label>
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    rows={4}
                    placeholder={
                      supported
                        ? 'Speak above or type here... e.g. "Today I feel quite tired and a bit worried."'
                        : 'Type how you are feeling... e.g. "I feel lonely today and a bit sad."'
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm">
                    {error}
                  </div>
                )}

                <button
                  onClick={analyzeEmotion}
                  disabled={!transcript.trim() || analyzing}
                  className="w-full py-4 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-lg rounded-[24px] flex items-center justify-center gap-3 transition shadow-lg shadow-purple-500/20"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Analyzing emotion...
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-6 h-6" />
                      Detect Emotion
                    </>
                  )}
                </button>
              </>
            ) : (
              /* Results */
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Emotion card */}
                <div className="text-center py-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                    className="text-7xl mb-3"
                  >
                    {emoji}
                  </motion.div>
                  <h4 className="text-3xl font-bold text-gray-900 capitalize">{result.emotion}</h4>
                </div>

                {/* Stress & Energy */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`border rounded-2xl p-3 text-center ${STRESS_COLOR[result.stressLevel]}`}>
                    <p className="text-xs font-bold uppercase tracking-wide opacity-70">Stress</p>
                    <p className="font-bold text-lg capitalize mt-1">{result.stressLevel}</p>
                  </div>
                  <div className="border border-blue-200 bg-blue-50 rounded-2xl p-3 text-center text-blue-600">
                    <p className="text-xs font-bold uppercase tracking-wide opacity-70">Energy</p>
                    <p className="font-bold text-lg capitalize mt-1">{result.energyLevel}</p>
                  </div>
                </div>

                {/* Suggestion */}
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
                  <p className="font-bold text-purple-800 mb-1">💜 Saathi says</p>
                  <p className="text-purple-700 leading-relaxed">{result.suggestion}</p>
                </div>

                {/* Transcript shown */}
                <div className="bg-gray-50 rounded-2xl p-3">
                  <p className="text-xs text-gray-400 font-bold mb-1">WHAT YOU SAID</p>
                  <p className="text-gray-600 text-sm italic">"{transcript}"</p>
                </div>

                {result.alertFamily && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-sm font-medium">
                    ❤️ Your family has been gently notified that you may need some support.
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={reset}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Try Again
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-warm-500 hover:bg-warm-600 text-white font-bold rounded-2xl"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
