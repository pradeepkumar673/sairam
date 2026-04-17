/**
 * DoctorSlipScanner.tsx — 100% working prescription scanner
 * - Drag-and-drop OR camera capture
 * - Uploads to POST /api/medicine/scan-slip (HF → Gemini fallback on backend)
 * - Shows extracted medicines, diagnosis, warnings
 * - Option to confirm/save the extracted medicines
 */
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Upload, X, CheckCircle, AlertTriangle,
  Pill, FileText, Loader2, RotateCcw, Plus
} from 'lucide-react';
import api from '../lib/api';
import AddMedicineModal from './AddMedicineModal';

interface ExtractedMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface ScanResult {
  medicines: ExtractedMedicine[];
  diagnosis?: string;
  doctorName?: string;
  date?: string;
  warnings: string[];
}

interface DoctorSlipScannerProps {
  onClose: () => void;
  onMedicinesAdded?: () => void;
}

export default function DoctorSlipScanner({ onClose, onMedicinesAdded }: DoctorSlipScannerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [addedIndices, setAddedIndices] = useState<number[]>([]);
  const [activeMedicine, setActiveMedicine] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, etc.)');
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);
    setSaved(false);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const scanSlip = async () => {
    if (!file) return;
    setScanning(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('slipImage', file);
      const res = await api.post('/medicine/scan-slip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Backend returns { slipAnalysis }
      const analysis: ScanResult = res.data.data.slipAnalysis;
      setResult(analysis);
      // Removed setSaved(true) because we now add manually per medicine
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Scanning failed. Make sure the image is clear and well-lit.'
      );
    } finally {
      setScanning(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setSaved(false);
    setAddedIndices([]);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="w-full sm:max-w-lg bg-white rounded-t-[40px] sm:rounded-[36px] overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-warm-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-[20px] font-bold text-gray-900">Doctor Slip Scanner</h3>
                <p className="text-xs text-gray-500">AI-powered prescription reader</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-5">
            {/* Upload / Preview Area */}
            {!result ? (
              <>
                {!preview ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-[28px] p-8 text-center cursor-pointer transition-all ${
                      dragOver
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-warm-200 bg-warm-50 hover:border-warm-400 hover:bg-warm-100/50'
                    }`}
                  >
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <Upload className="w-8 h-8 text-warm-500" />
                    </div>
                    <p className="font-bold text-gray-800 text-lg mb-1">Upload Prescription</p>
                    <p className="text-gray-500 text-sm">Drag & drop or tap to select</p>
                    <p className="text-xs text-gray-400 mt-2">JPG, PNG, HEIC supported</p>
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
                    <img src={preview} alt="Prescription" className="w-full max-h-56 object-contain" />
                    <button
                      onClick={reset}
                      className="absolute top-3 right-3 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Camera option */}
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
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-warm-50 hover:bg-warm-100 text-warm-700 font-semibold rounded-2xl transition"
                  >
                    <Upload className="w-5 h-5" />
                    Gallery
                  </button>
                </div>

                {error && (
                  <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm font-medium flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                {/* Scan button */}
                <button
                  onClick={scanSlip}
                  disabled={!file || scanning}
                  className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-lg rounded-[24px] flex items-center justify-center gap-3 transition shadow-lg shadow-blue-500/20"
                >
                  {scanning ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Scanning with AI...
                    </>
                  ) : (
                    <>
                      <FileText className="w-6 h-6" />
                      Scan Prescription
                    </>
                  )}
                </button>
              </>
            ) : (
              /* Results */
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                {/* Success banner */}
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-800">Prescription scanned!</p>
                    <p className="text-emerald-700 text-sm">
                      {result.medicines.length} medicine{result.medicines.length !== 1 ? 's' : ''} extracted. Click "+" to add them.
                    </p>
                  </div>
                </div>

                {/* Diagnosis / Doctor */}
                {(result.diagnosis || result.doctorName || result.date) && (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-1">
                    {result.diagnosis && (
                      <p className="text-sm text-blue-800"><span className="font-bold">Diagnosis:</span> {result.diagnosis}</p>
                    )}
                    {result.doctorName && (
                      <p className="text-sm text-blue-800"><span className="font-bold">Doctor:</span> {result.doctorName}</p>
                    )}
                    {result.date && (
                      <p className="text-sm text-blue-800"><span className="font-bold">Date:</span> {result.date}</p>
                    )}
                  </div>
                )}

                {/* Medicines */}
                <div>
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Pill className="w-5 h-5 text-warm-500" />
                    Extracted Medicines
                  </h4>
                  <div className="space-y-3">
                    {result.medicines.map((med, i) => (
                      <div key={i} className="bg-white border border-warm-100 rounded-2xl p-4 shadow-sm relative group">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-gray-900 text-[16px]">{med.name}</p>
                          <button
                            onClick={() => {
                              if (!addedIndices.includes(i)) {
                                setActiveMedicine({
                                  name: med.name,
                                  dosage: med.dosage?.replace(/[^0-9]/g, '') || '',
                                  unit: med.dosage?.includes('ml') ? 'ml' : 'mg',
                                  frequency: med.frequency?.toLowerCase().includes('daily') ? 'daily' : 'custom'
                                });
                              }
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                              addedIndices.includes(i)
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95'
                            }`}
                          >
                            {addedIndices.includes(i) ? <CheckCircle className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                          </button>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
                          <span className="text-gray-500">Dosage: <span className="text-gray-800 font-medium">{med.dosage || "-"}</span></span>
                          <span className="text-gray-500">Frequency: <span className="text-gray-800 font-medium">{med.frequency || "-"}</span></span>
                          <span className="text-gray-500">Duration: <span className="text-gray-800 font-medium">{med.duration || "-"}</span></span>
                        </div>
                        {med.instructions && (
                          <p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">{med.instructions}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warnings */}
                {result.warnings && result.warnings.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <p className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Warnings
                    </p>
                    {result.warnings.map((w, i) => (
                      <p key={i} className="text-amber-700 text-sm">- {w}</p>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={reset}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl flex items-center justify-center gap-2 transition"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Scan Another
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-warm-500 hover:bg-warm-600 text-white font-bold rounded-2xl transition shadow-lg shadow-warm-500/20"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {activeMedicine && (
          <AddMedicineModal 
            initialData={activeMedicine}
            onClose={() => setActiveMedicine(null)}
            onSuccess={() => {
              // Find index of medicine with this name to mark as added
              const idx = result?.medicines.findIndex(m => m.name === activeMedicine.name);
              if (idx !== undefined && idx !== -1) {
                setAddedIndices([...addedIndices, idx]);
              }
              setActiveMedicine(null);
              onMedicinesAdded?.();
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}