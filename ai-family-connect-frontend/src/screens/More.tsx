import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Cloud, ShieldAlert, LogOut, Loader2, Heart, Check, X, Camera, Coffee, Moon, Pill, Mic, Compass
} from 'lucide-react';
import { useRef } from 'react';
import { useStore } from '../store';
import { disconnectSocket } from '../lib/socket';
import api from '../lib/api';

export default function More() {
  const navigate = useNavigate();
  const { logout } = useStore();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [modalContent, setModalContent] = useState<{ title: string; content: string } | null>(null);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPendingInvites();
  }, []);

  const fetchPendingInvites = async () => {
    try {
      const res = await api.get('/family/pending');
      setPendingInvites(res.data.data.pendingRequests || []);
    } catch (err) {
      console.error('Failed to fetch invites', err);
    }
  };

  const handleRespondInvite = async (linkId: string, status: 'accepted' | 'rejected') => {
    try {
      const action = status === 'accepted' ? 'accept' : 'reject';
      await api.put(`/family/respond/${linkId}`, { action });
      fetchPendingInvites();
    } catch (err) {
      console.error('Failed to respond', err);
    }
  };

  const handleSOS = async () => {
    setLoadingAction('sos');
    try {
      await api.post('/safety/sos', { message: '🚨 Emergency SOS Triggered manually from app!' });
      setModalContent({ title: 'SOS Triggered', content: 'Your family members have been notified immediately with your location alert.' });
    } catch (err: any) {
      console.error('SOS failed', err);
      setModalContent({ title: 'SOS Failed', content: err.response?.data?.message || 'Could not trigger SOS.' });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleWeatherNudge = async () => {
    setLoadingAction('weather');
    try {
      const res = await api.get('/ai/weather-nudge');
      setModalContent({ title: 'Daily Weather Health Nudge', content: res.data.data.nudge });
    } catch (err) {
      setModalContent({ title: 'Weather Info', content: 'Could not fetch weather nudge right now.' });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleInjuryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setLoadingAction('wound');
    const formData = new FormData();
    formData.append('injuryImage', file);
    
    try {
      const res = await api.post('/ai/analyze-injury', formData);
      const data = res.data.data;
      setModalContent({
        title: `Severity: ${data.severity?.toUpperCase() || 'UNKNOWN'}`,
        content: `Possible Injury: ${data.possibleInjury}\n\nImmediate Action: ${data.immediateAction}\n\nRequires Doctor: ${data.requiresDoctor ? "Yes" : "No"}\n\nInstructions:\n- ${data.careInstructions?.join('\n- ')}`
      });
    } catch (err) {
      setModalContent({ title: 'Analysis Failed', content: 'Could not analyze injury photo.' });
    } finally {
      setLoadingAction(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleMockFeature = (title: string) => {
    setModalContent({ title, content: 'This premium feature is currently being fine-tuned by our AI team and will be available in the next app update! 💛' });
  };

  const features = [
    { title: 'Family Dashboard', icon: Activity, color: 'text-emerald-500', shadow: 'shadow-emerald-100/50', bg: 'bg-emerald-50', action: () => navigate('/dashboard') },
    { title: 'SOS Button', icon: ShieldAlert, color: 'text-red-500', shadow: 'shadow-red-100/50', bg: 'bg-red-50', action: handleSOS, loadingId: 'sos' },
    { title: 'Wound Identifier', icon: Camera, color: 'text-purple-500', shadow: 'shadow-purple-100/50', bg: 'bg-purple-50', action: () => fileInputRef.current?.click(), loadingId: 'wound' },
    { title: 'Weather Nudge', icon: Cloud, color: 'text-sky-500', shadow: 'shadow-sky-100/50', bg: 'bg-sky-50', action: handleWeatherNudge, loadingId: 'weather' },
    { title: 'Voice Emotion', icon: Mic, color: 'text-indigo-500', shadow: 'shadow-indigo-100/50', bg: 'bg-indigo-50', action: () => handleMockFeature('Voice Emotion Analyzer') },
    { title: 'Recipe Suggester', icon: Coffee, color: 'text-orange-500', shadow: 'shadow-orange-100/50', bg: 'bg-orange-50', action: () => handleMockFeature('Smart Recipe Suggester') },
    { title: 'Sleep Stories', icon: Moon, color: 'text-blue-500', shadow: 'shadow-blue-100/50', bg: 'bg-blue-50', action: () => handleMockFeature('AI Sleep Stories') },
    { title: 'Check Interaction', icon: Pill, color: 'text-rose-500', shadow: 'shadow-rose-100/50', bg: 'bg-rose-50', action: () => handleMockFeature('Medicine Interaction Checker') },
  ];

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-warm-50 pb-[100px]">
       <div className="bg-white rounded-b-[40px] shadow-sm px-6 pt-12 pb-8 border-b border-warm-100 flex justify-between items-center relative z-10 w-full mb-6">
         <h1 className="text-[32px] font-bold text-gray-900 leading-tight">
           More<br/><span className="text-warm-500">Exploration</span> ✨
         </h1>
        <button
          onClick={handleLogout}
          className="w-14 h-14 bg-rose-50 hover:bg-rose-100 text-rose-500 text-sm font-bold rounded-full shadow-sm transition-colors flex items-center justify-center shrink-0"
        >
          <LogOut className="w-6 h-6 mr-1" />
        </button>
      </div>

      {pendingInvites.length > 0 && (
        <div className="px-6 mb-6">
          <div className="bg-white rounded-[24px] p-5 border-2 border-indigo-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
               <Heart className="w-5 h-5 text-indigo-500" /> Pending Family Requests
            </h3>
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div key={invite._id} className="flex items-center justify-between bg-indigo-50/50 p-3 rounded-2xl">
                  <div>
                    <p className="font-bold text-indigo-900">{invite.requester.firstName} {invite.requester.lastName}</p>
                    <p className="text-sm font-medium text-indigo-600">Wants to link family account</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRespondInvite(invite._id, 'accepted')} className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md active:scale-95">
                      <Check className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleRespondInvite(invite._id, 'rejected')} className="w-10 h-10 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center active:scale-95">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4 px-6">
        {features.map((item, i) => (
          <motion.button
            key={item.title}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.04, type: 'spring' }}
            whileTap={{ scale: 0.94 }}
            onClick={item.action}
            disabled={loadingAction === item.loadingId}
            className="rounded-[32px] p-6 border-2 border-white shadow-sm flex flex-col items-center justify-center text-center aspect-square bg-white hover:border-warm-100 transition-colors relative"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg ${item.shadow} ${item.bg} ${item.color}`}>
               {loadingAction === item.loadingId ? (
                 <Loader2 className="w-6 h-6 animate-spin" />
               ) : (
                 <item.icon className="w-7 h-7" strokeWidth={2.5}/>
               )}
            </div>
            <h3 className="font-bold text-gray-800 text-[15px] leading-tight px-1">{item.title}</h3>
          </motion.button>
        ))}
      </div>

      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleInjuryUpload} 
      />

      <AnimatePresence>
        {modalContent && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white max-w-sm w-full p-8 rounded-[36px] shadow-2xl text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">{modalContent.title}</h2>
              <p className="text-lg font-medium text-gray-600 mb-8 leading-relaxed whitespace-pre-wrap">{modalContent.content}</p>
              <button
                onClick={() => setModalContent(null)}
                className="w-full py-4 bg-warm-100 hover:bg-warm-200 text-warm-900 font-bold text-lg rounded-full transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
