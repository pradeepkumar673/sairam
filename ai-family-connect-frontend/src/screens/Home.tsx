import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Smile, Bell, FileText, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MoodAnalyzer from '../components/MoodAnalyzer';
import MedicineCard from '../components/MedicineCard';
import { initSocket } from '../lib/socket';

import DoctorSlipScanner from '../components/DoctorSlipScanner';
import AddMedicineModal from '../components/AddMedicineModal';
import PharmacyFinderModal from '../components/PharmacyFinderModal';
import api from '../lib/api';

export default function Home() {
  const { user, medicines, setMedicines, notifications } = useStore();
  const [showMoodAnalyzer, setShowMoodAnalyzer] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showAddMed, setShowAddMed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [findingPharmacyFor, setFindingPharmacyFor] = useState<string | null>(null);
  const [refillAlerts, setRefillAlerts] = useState<any[]>([]);

  useEffect(() => {
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Initialize socket
    try {
      initSocket();
    } catch (err) {
      console.warn('Socket init failed');
    }

    fetchMedicines();
    fetchRefillAlerts();
  }, []);

  const fetchMedicines = async () => {
    try {
      const res = await api.get('/medicine');
      setMedicines(res.data.data.medicines || []);
    } catch (err) {
      console.error('Failed to fetch medicines', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRefillAlerts = async () => {
    try {
      const res = await api.get('/medicine/refill-alerts');
      setRefillAlerts(res.data.data.refillAlerts || []);
    } catch (err) {
      console.error('Failed to fetch refill alerts', err);
    }
  };

  const handleScanPrescription = () => {
    setShowScanner(true);
  };
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-warm-50 pb-8">
      {/* Header */}
      <div className="bg-white rounded-b-[40px] shadow-sm px-6 pt-12 pb-8 border-b border-warm-100 relative z-20">
        <div className="flex justify-between items-center mb-6">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center border-[3px] border-emerald-50 shadow-sm overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-emerald-600">{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
            )}
          </div>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-14 h-14 bg-white border-2 border-warm-100 hover:bg-warm-50 transition-colors rounded-full flex items-center justify-center shadow-sm"
          >
            <Bell className="w-6 h-6 text-gray-700" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
        <h1 className="text-[32px] font-bold text-gray-900 leading-tight tracking-tight">
          Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'},<br />
          <span className="text-warm-500">{user?.name?.split(' ')[0] || 'Dear'} ❤️</span>
        </h1>
      </div>

      {/* Notifications panel */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="mx-6 mt-4 bg-white rounded-3xl shadow-xl border border-warm-100 overflow-hidden relative z-10"
          >
            <div className="p-5 border-b border-warm-100 bg-warm-50/50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-lg">Notifications</h3>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center text-gray-400">
                  <Bell className="w-10 h-10 mb-3 opacity-20" />
                  <p className="font-medium">All caught up!</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className={`p-5 border-b border-gray-50 ${n.read ? 'opacity-50' : 'bg-white'}`}>
                    <p className="font-bold text-gray-900">{n.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-6 py-8 space-y-8">
        {/* Mood Section */}
        <section>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowMoodAnalyzer(true)}
            className="w-full bg-gradient-to-br from-warm-400 via-warm-500 to-warm-600 text-white rounded-[32px] p-8 shadow-xl shadow-warm-500/30 relative overflow-hidden flex flex-col items-center justify-center min-h-[180px]"
          >
            <motion.div 
               animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
               transition={{ repeat: Infinity, duration: 4 }}
               className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none" 
            />
            <Smile className="w-14 h-14 mb-3 text-white shadow-sm" strokeWidth={2.5} />
            <h2 className="text-[26px] font-bold tracking-tight mb-1">How are you feeling?</h2>
            <p className="text-warm-100 font-semibold mt-1">Tap to check your mood</p>
          </motion.button>
        </section>

        {/* Refill Alerts */}
        {refillAlerts.length > 0 && (
          <section>
            <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="font-bold text-amber-900 text-lg">Low Stock Alert</h3>
              </div>
              <div className="space-y-3 mt-2">
              {refillAlerts.map((alert) => (
                <div key={alert._id} className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100/50 flex flex-col gap-3 text-amber-900">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">{alert.name}</span>
                    <span className="text-sm font-bold bg-amber-100 px-3 py-1 rounded-full">{alert.currentStock} left</span>
                  </div>
                  <button 
                    onClick={() => setFindingPharmacyFor(alert.name)} 
                    className="w-full bg-amber-50 hover:bg-amber-100 border border-amber-200/50 text-amber-700 py-3 rounded-[14px] text-[15px] font-bold transition-colors shadow-sm active:scale-95"
                  >
                    📍 Find Local Pharmacy
                  </button>
                </div>
              ))}
              </div>
            </div>
          </section>
        )}

        {/* Medicines */}
        <section>
          <div className="flex justify-between items-center mb-5 px-1">
             <h3 className="text-2xl font-bold text-gray-900">Today's Medicines</h3>
             <button
               onClick={() => setShowAddMed(true)}
               className="w-10 h-10 bg-emerald-100 hover:bg-emerald-200 text-emerald-600 rounded-xl flex items-center justify-center transition-colors shadow-sm"
             >
               <span className="text-2xl leading-none font-bold mb-1">+</span>
             </button>
          </div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-8 h-8 border-4 border-warm-200 border-t-warm-500 rounded-full" />
              <div className="text-gray-500 font-medium">Fetching your schedule...</div>
            </div>
          ) : medicines.length === 0 ? (
            <div className="bg-white rounded-[32px] p-8 text-center border border-gray-100 shadow-sm">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium text-lg">No medicines scheduled for today.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {medicines.map((med) => (
                <MedicineCard key={med._id} medicine={med} onUpdate={fetchMedicines} />
              ))}
            </div>
          )}
        </section>

        {/* Prescription Scanner */}
        <section>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleScanPrescription}
            className="w-full bg-white rounded-[32px] p-6 shadow-sm border-2 border-emerald-100 hover:border-emerald-200 transition-colors flex items-center gap-5 group"
          >
            <div className="w-16 h-16 bg-emerald-50 group-hover:bg-emerald-100 transition-colors text-emerald-500 rounded-3xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-8 h-8" />
            </div>
            <div className="text-left">
              <h3 className="text-[20px] font-bold text-gray-900 mb-1 leading-tight">Scan Prescription</h3>
              <p className="text-gray-500 font-medium text-[15px] leading-snug">Add medicines automatically from doctor's slip</p>
            </div>
          </motion.button>
        </section>
      </div>

      <AnimatePresence>
        {showMoodAnalyzer && (
          <MoodAnalyzer onClose={() => setShowMoodAnalyzer(false)} />
        )}
        {showScanner && (
          <DoctorSlipScanner 
            onClose={() => setShowScanner(false)} 
            onSuccess={() => {
              setShowScanner(false);
              fetchMedicines();
            }} 
          />
        )}
        {showAddMed && (
          <AddMedicineModal 
            onClose={() => setShowAddMed(false)} 
            onSuccess={() => {
              setShowAddMed(false);
              fetchMedicines();
            }} 
          />
        )}
        {findingPharmacyFor && (
          <PharmacyFinderModal 
            medicineName={findingPharmacyFor} 
            onClose={() => setFindingPharmacyFor(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
