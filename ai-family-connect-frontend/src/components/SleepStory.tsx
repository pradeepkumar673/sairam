/**
 * SleepStory.tsx
 * Picks a theme & length → calls POST /api/ai/sleep-story
 * Renders the story and optionally reads it aloud using Web Speech API TTS.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Volume2, VolumeX, Loader2, X, RotateCcw, Play, Pause } from 'lucide-react';
import api from '../lib/api';

interface SleepStoryResult {
  title: string;
  story: string;
  duration: string;
  theme: string;
}

interface SleepStoryProps {
  onClose: () => void;
}

const THEMES = [
  { id: 'nature', emoji: '🌿', label: 'Nature Walk' },
  { id: 'ocean', emoji: '🌊', label: 'Ocean Calm' },
  { id: 'village', emoji: '🏡', label: 'Village Life' },
  { id: 'mountains', emoji: '🏔️', label: 'Mountain Air' },
  { id: 'garden', emoji: '🌸', label: 'Flower Garden' },
  { id: 'stars', emoji: '⭐', label: 'Starry Night' },
];

const LENGTHS = [
  { id: 'short', label: 'Short', sub: '~2 min', words: 150 },
  { id: 'medium', label: 'Medium', sub: '~5 min', words: 300 },
  { id: 'long', label: 'Long', sub: '~8 min', words: 500 },
];

let speechUtterance: SpeechSynthesisUtterance | null = null;

export default function SleepStory({ onClose }: SleepStoryProps) {
  const [theme, setTheme] = useState('nature');
  const [length, setLength] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState<SleepStoryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const generateStory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/ai/sleep-story', {
        preferences: { theme, length },
      });
      setStory(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate story. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRead = () => {
    if (!story) return;
    if (!('speechSynthesis' in window)) {
      setError('Text-to-speech not supported in your browser.');
      return;
    }

    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }

    speechUtterance = new SpeechSynthesisUtterance(story?.story || "Once upon a time...");
    speechUtterance.rate = 0.82;
    speechUtterance.pitch = 0.9;
    speechUtterance.lang = 'en-IN';

    // Prefer a calm female voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.toLowerCase().includes('female') || v.name.includes('Samantha') || v.name.includes('Karen'));
    if (preferred) speechUtterance.voice = preferred;

    speechUtterance.onend = () => setPlaying(false);
    speechUtterance.onerror = () => setPlaying(false);

    window.speechSynthesis.speak(speechUtterance);
    setPlaying(true);
  };

  const reset = () => {
    window.speechSynthesis?.cancel();
    setPlaying(false);
    setStory(null);
    setError(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[101] bg-indigo-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 28 }}
          className="w-full sm:max-w-lg bg-white rounded-t-[40px] sm:rounded-[36px] shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-indigo-100 flex-shrink-0 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-indigo-100 rounded-2xl flex items-center justify-center">
                <Moon className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-[20px] font-bold text-gray-900">Sleep Stories</h3>
                <p className="text-xs text-indigo-500">Calming AI-generated bedtime stories</p>
              </div>
            </div>
            <button
              onClick={() => { window.speechSynthesis?.cancel(); onClose(); }}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-5">
            {!story ? (
              <>
                {/* Theme picker */}
                <div>
                  <p className="font-bold text-gray-800 mb-3">Choose a theme 🌙</p>
                  <div className="grid grid-cols-3 gap-2">
                    {THEMES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={`flex flex-col items-center py-3 px-2 rounded-2xl border-2 transition-all ${
                          theme === t.id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-100 bg-gray-50 hover:border-indigo-200'
                        }`}
                      >
                        <span className="text-2xl mb-1">{t.emoji}</span>
                        <span className={`text-xs font-bold ${theme === t.id ? 'text-indigo-700' : 'text-gray-600'}`}>
                          {t.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Length picker */}
                <div>
                  <p className="font-bold text-gray-800 mb-3">Story length</p>
                  <div className="flex gap-3">
                    {LENGTHS.map(l => (
                      <button
                        key={l.id}
                        onClick={() => setLength(l.id)}
                        className={`flex-1 py-3 rounded-2xl border-2 transition-all text-center ${
                          length === l.id
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-indigo-200'
                        }`}
                      >
                        <p className="font-bold text-sm">{l.label}</p>
                        <p className="text-xs opacity-70">{l.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm">{error}</div>
                )}

                <button
                  onClick={generateStory}
                  disabled={loading}
                  className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-lg rounded-[24px] flex items-center justify-center gap-3 transition shadow-lg shadow-indigo-500/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Writing your story...
                    </>
                  ) : (
                    <>
                      <Moon className="w-6 h-6" />
                      Generate Sleep Story
                    </>
                  )}
                </button>
              </>
            ) : (
              /* Story view */
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Title */}
                <div className="text-center py-2">
                  <div className="text-4xl mb-2">🌙</div>
                  <h4 className="text-2xl font-bold text-indigo-900">{story?.title || "Peaceful Night Story"}</h4>
                  <p className="text-xs text-indigo-400 mt-1">
                    {THEMES.find(t => t.id === story?.theme)?.emoji || "✨"} {story?.theme || "Calm"} · {story?.duration || "Ready"}
                  </p>
                </div>

                {/* TTS controls */}
                <div className="flex justify-center">
                  <button
                    onClick={toggleRead}
                    className={`flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm transition shadow-sm ${
                      playing
                        ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                        : 'bg-indigo-500 text-white hover:bg-indigo-600'
                    }`}
                  >
                    {playing ? (
                      <>
                        <Pause className="w-4 h-4" /> Stop Reading
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" /> Read Aloud
                      </>
                    )}
                  </button>
                </div>

                {/* Story text */}
                <div className="bg-indigo-50 rounded-3xl p-5 max-h-72 overflow-y-auto font-serif shadow-inner border border-indigo-100/50">
                  <p className="text-indigo-900 leading-relaxed text-[17px] whitespace-pre-wrap italic opacity-90 drop-shadow-sm transition-all duration-700">
                    "{story?.story || "Your calming bedtime story is preparing..."}"
                  </p>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={reset}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl flex items-center justify-center gap-2 transition"
                  >
                    <RotateCcw className="w-5 h-5" />
                    New Story
                  </button>
                  <button
                    onClick={() => { window.speechSynthesis?.cancel(); onClose(); }}
                    className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-2xl transition"
                  >
                    Good Night 🌙
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
