import { useState } from 'react';
import { useStore } from '../store';
import { Smile, CheckCircle2, FileText, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MoodAnalyzer from '../components/MoodAnalyzer';

export default function Home() {
  const { user } = useStore();
  const [showMoodAnalyzer, setShowMoodAnalyzer] = useState(false);
  const [medicines, setMedicines] = useState([
    { id: 1, name: 'Amlodipine (Blood Pressure)', time: '09:00 AM', taken: false },
    { id: 2, name: 'Vitamin D3', time: '09:00 AM', taken: false }
  ]);

  const toggleMedicine = (id: number) => {
    setMedicines(meds => meds.map(m => m.id === id ? { ...m, taken: !m.taken } : m));
  };

  return (
    <div className="min-h-screen bg-warm-50 pb-8">
      {/* Header */}
      <div className="bg-white rounded-b-[40px] shadow-sm px-6 pt-12 pb-8 border-b border-warm-100">
        <div className="flex justify-between items-center mb-6">
          <div className="w-12 h-12 bg-warm-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            <span className="text-xl font-bold text-warm-600">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <button className="w-12 h-12 bg-white border border-warm-100 rounded-full flex items-center justify-center shadow-sm relative">
            <Bell className="w-6 h-6 text-gray-600" />
            <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 leading-tight">
          Good morning,<br/>
          <span className="text-warm-500">{user?.name || 'Dear'} ❤️</span>
        </h1>
      </div>

      <div className="px-6 py-8 space-y-8">
        
        {/* Mood Section */}
        <section>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowMoodAnalyzer(true)}
            className="w-full bg-gradient-to-br from-warm-500 to-warm-600 text-white rounded-[32px] p-8 shadow-xl shadow-warm-500/20 relative overflow-hidden flex flex-col items-center justify-center min-h-[160px]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-6 -mb-6"></div>
            
            <Smile className="w-12 h-12 mb-3 text-white/90" strokeWidth={2.5}/>
            <h2 className="text-2xl font-bold tracking-tight">Check My Mood Now</h2>
            <p className="text-warm-100 mt-1 font-medium">Takes only 5 seconds</p>
          </motion.button>
        </section>

        {/* Medicines */}
        <section>
          <h3 className="text-xl font-bold text-gray-900 mb-4 px-2">Today's Medicines</h3>
          <div className="space-y-4">
            {medicines.map((med) => (
              <div key={med.id} className={`bg-white rounded-3xl p-5 flex items-center justify-between border ${med.taken ? 'border-emerald-200 bg-emerald-50/30' : 'border-warm-100 shadow-sm'}`}>
                <div>
                  <p className={`text-lg font-bold ${med.taken ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{med.name}</p>
                  <p className="text-gray-500 font-medium">{med.time}</p>
                </div>
                <button 
                  onClick={() => toggleMedicine(med.id)}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${med.taken ? 'bg-emerald-100 text-emerald-600' : 'bg-warm-100 text-warm-600'}`}
                >
                  <CheckCircle2 className="w-7 h-7" strokeWidth={med.taken ? 3 : 2} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Prescription Scanner */}
        <section>
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-warm-100 flex items-center gap-5">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Doctor Prescription</h3>
              <p className="text-gray-500 font-medium text-sm">Scan paper slip to add medicines automatically</p>
            </div>
          </div>
        </section>

      </div>

      {/* Modals */}
      <AnimatePresence>
        {showMoodAnalyzer && <MoodAnalyzer onClose={() => setShowMoodAnalyzer(false)} />}
      </AnimatePresence>

    </div>
  );
}
