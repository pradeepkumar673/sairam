/**
 * WoundIdentifier.tsx
 * Upload or capture a wound/injury photo → calls POST /api/safety/injury-photo
 * Returns severity, possible injury, immediate action, care instructions
 */
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Upload, X, AlertTriangle, Loader2,
  ShieldAlert, CheckCircle, RotateCcw, HeartPulse
} from 'lucide-react';
import api from '../lib/api';

interface InjuryAnalysis {
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  possibleInjury: string;
  immediateAction: string;
  requiresDoctor: boolean;
  requiresEmergency: boolean;
  careInstructions: string[];
}

interface WoundIdentifierProps {
  onClose: () => void;
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  minor:    { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', label: '🟢 Minor' },
  moderate: { bg: 'bg-amber-50 border-amber-200',   text: 'text-amber-800',   label: '🟡 Moderate' },
  severe:   { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-800',  label: '🟠 Severe' },
  critical: { bg: 'bg-rose-50 border-rose-200',     text: 'text-rose-800',    label: '🔴 Critical' },
};

export default function WoundIdentifier({ onClose }: WoundIdentifierProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<InjuryAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [bodyPart, setBodyPart] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const analyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('injuryImage', file);
      if (bodyPart) formData.append('bodyPart', bodyPart);
      const res = await api.post('/safety/injury-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data.data.analysis);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Analysis failed. Please try again with a clearer photo.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setBodyPart('');
  };

  const sStyle = result ? (SEVERITY_STYLES[result.severity] || SEVERITY_STYLES.minor) : null;

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
          className="w-full sm:max-w-lg bg-white rounded-t-[40px] sm:rounded-[36px] shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-rose-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-rose-50 rounded-2xl flex items-center justify-center">
                <HeartPulse className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h3 className="text-[20px] font-bold text-gray-900">Wound Identifier</h3>
                <p className="text-xs text-gray-500">AI-powered first aid analysis</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-4">
            {!result ? (
              <>
                {/* Disclaimer */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-amber-800 text-sm">
                  <strong>⚠️ Note:</strong> This is AI-assisted guidance only. For emergencies, call 108 immediately.
                </div>

                {/* Upload */}
                {!preview ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-[28px] p-8 text-center cursor-pointer transition-all ${
                      dragOver ? 'border-rose-400 bg-rose-50' : 'border-rose-200 bg-rose-50/50 hover:border-rose-400 hover:bg-rose-50'
                    }`}
                  >
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <Camera className="w-8 h-8 text-rose-500" />
                    </div>
                    <p className="font-bold text-gray-800 text-lg mb-1">Take or Upload Photo</p>
                    <p className="text-gray-500 text-sm">Tap to use camera or select image</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                  </div>
                ) : (
                  <div className="relative rounded-[28px] overflow-hidden bg-gray-100">
                    <img src={preview} alt="Wound" className="w-full max-h-60 object-contain" />
                    <button
                      onClick={reset}
                      className="absolute top-3 right-3 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Body part */}
                {file && (
                  <input
                    type="text"
                    value={bodyPart}
                    onChange={(e) => setBodyPart(e.target.value)}
                    placeholder="Body part (e.g. left knee, right hand) — optional"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                )}

                {error && (
                  <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm font-medium flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.capture = 'environment';
                      input.onchange = (e) => {
                        const f = (e.target as HTMLInputElement).files?.[0];
                        if (f) handleFile(f);
                      };
                      input.click();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-2xl transition"
                  >
                    <Camera className="w-5 h-5" />
                    Camera
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-2xl transition"
                  >
                    <Upload className="w-5 h-5" />
                    Gallery
                  </button>
                </div>

                <button
                  onClick={analyze}
                  disabled={!file || analyzing}
                  className="w-full py-4 bg-rose-500 hover:bg-rose-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-lg rounded-[24px] flex items-center justify-center gap-3 transition shadow-lg shadow-rose-500/20"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Analyzing wound...
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-6 h-6" />
                      Analyze Wound
                    </>
                  )}
                </button>
              </>
            ) : (
              /* Results */
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Severity */}
                <div className={`border-2 rounded-2xl p-4 ${sStyle!.bg}`}>
                  <p className={`text-xl font-bold ${sStyle!.text}`}>{sStyle!.label}</p>
                  <p className={`text-sm mt-1 ${sStyle!.text} opacity-80`}>{result!.possibleInjury}</p>
                </div>

                {/* Emergency banner */}
                {result!.requiresEmergency && (
                  <div className="bg-red-600 text-white rounded-2xl p-4 flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                    <p className="font-bold">CALL EMERGENCY SERVICES (108) NOW</p>
                  </div>
                )}

                {/* Immediate action */}
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                  <p className="font-bold text-orange-800 mb-1">⚡ Immediate Action</p>
                  <p className="text-orange-700">{result!.immediateAction}</p>
                </div>

                {/* Care instructions */}
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    Care Instructions
                  </p>
                  <ol className="space-y-2">
                    {result!.careInstructions.map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-gray-700">
                        <span className="w-6 h-6 bg-warm-100 text-warm-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                {result!.requiresDoctor && !result!.requiresEmergency && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-blue-800 text-sm font-medium">
                    🏥 Please visit a doctor or clinic for proper treatment.
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={reset}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl flex items-center justify-center gap-2 transition"
                  >
                    <RotateCcw className="w-5 h-5" />
                    New Analysis
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-warm-500 hover:bg-warm-600 text-white font-bold rounded-2xl transition"
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
