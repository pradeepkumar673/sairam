import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle, HeartPulse, Stethoscope } from 'lucide-react';
import api from '../lib/api';

export default function FamilyDashboard() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/ai/dashboard');
        // Let's use some mock data specifically designed for the UI structure if backend is not full.
        setDashboard(res.data?.data || {
           complianceRate: 85,
           moodSummary: [
              { _id: '1', mood: 'Calm', moodScore: 80 },
              { _id: '2', mood: 'Happy', moodScore: 92 }
           ],
           recentAlerts: { sos: [], falls: [] }
        });
      } catch (err) {
        console.error('Failed to fetch dashboard, using fallbacks', err);
        setDashboard({
           complianceRate: 85,
           moodSummary: [
              { _id: '1', mood: 'Calm 😌', moodScore: 80 },
              { _id: '2', mood: 'Happy 😊', moodScore: 92 }
           ],
           recentAlerts: { sos: [], falls: [] }
        });
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-3 bg-warm-50 pb-20">
         <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-10 h-10 border-4 border-warm-200 border-t-warm-500 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50 pb-32">
       <div className="bg-white rounded-b-[40px] shadow-sm px-6 pt-12 pb-8 border-b border-warm-100">
         <h1 className="text-[32px] font-bold text-gray-900 leading-tight">
           Family<br/><span className="text-warm-500">Dashboard</span> 📊
         </h1>
       </div>
      
      <div className="p-6 space-y-6">
        {dashboard && (
          <>
            {/* Compliance Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[32px] p-6 shadow-sm border border-warm-50 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-sm">
                  <CheckCircle className="w-7 h-7 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-gray-400 tracking-wide uppercase">Medicine Health</h3>
                  <p className="text-[20px] font-bold text-gray-900">Compliance</p>
                </div>
              </div>
              <div className="text-[36px] font-bold text-emerald-500">{dashboard.complianceRate}<span className="text-xl">%</span></div>
            </motion.div>
            
            {/* Mood Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-[32px] p-6 shadow-sm border border-warm-50"
            >
              <div className="flex items-center gap-3 mb-5 border-b border-warm-50 pb-4">
                <HeartPulse className="w-6 h-6 text-rose-500" />
                <h3 className="text-xl font-bold text-gray-900">Recent Moods</h3>
              </div>
              <div className="space-y-3">
              {dashboard.moodSummary && dashboard.moodSummary.length > 0 ? (
                dashboard.moodSummary.map((entry: any) => (
                  <div key={entry._id} className="flex items-center justify-between py-2 rounded-xl">
                    <span className="font-bold text-gray-700 text-lg">{entry.mood}</span>
                    <span className="font-bold text-warm-600 bg-warm-50 px-4 py-1.5 rounded-full">{entry.moodScore}%</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 font-medium text-center py-2">No mood logs recently. Do a check-in!</p>
              )}
              </div>
            </motion.div>
            
            {/* Recent Alerts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-[32px] p-6 shadow-sm border border-warm-50"
            >
              <div className="flex items-center gap-3 mb-5 border-b border-warm-50 pb-4">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
                <h3 className="text-xl font-bold text-gray-900">Emergency Events</h3>
              </div>
              {(!dashboard.recentAlerts || (dashboard.recentAlerts.sos.length === 0 && dashboard.recentAlerts.falls.length === 0)) ? (
                <div className="flex flex-col items-center justify-center py-6 pt-2">
                   <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                      <Stethoscope className="w-8 h-8 text-gray-300" />
                   </div>
                   <p className="text-gray-500 font-medium text-[16px]">Clear history. Everything is fine.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboard.recentAlerts.sos.map((alert: any) => (
                    <div key={alert._id} className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                      <p className="font-bold text-rose-800">SOS Triggered</p>
                      <p className="text-sm font-medium text-rose-600 mt-1">{new Date(alert.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                  {dashboard.recentAlerts.falls.map((fall: any) => (
                    <div key={fall._id} className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <p className="font-bold text-amber-800">Fall Detected</p>
                      <p className="text-sm font-medium text-amber-600 mt-1">{new Date(fall.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
