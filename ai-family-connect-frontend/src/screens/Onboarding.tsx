import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, UserPlus, Phone, User as UserIcon, Trash2, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import { useStore } from '../store';
import type { FamilyMember } from '../types';

export default function Onboarding() {
  const navigate = useNavigate();
  const { familyMembers, setFamilyMembers } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Son');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await api.get('/family/members');
        setFamilyMembers(res.data.data.familyMembers || []);
      } catch (err) {
        console.error('Failed to fetch family members', err);
      }
    };
    fetchMembers();
  }, [setFamilyMembers]);

  const handleAdd = async () => {
    if (!name || !phone) return;
    setLoading(true);
    setError('');
    try {
      const email = `${phone.replace(/\\D/g, '')}@family.connect`;
      await api.post('/family/invite-by-email', { email });
      // In a real app we wait for acceptance, but here we just refetch
      const res = await api.get('/family/members');
      setFamilyMembers(res.data.data.familyMembers || []);
      setName('');
      setPhone('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add family member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (linkId: string) => {
    try {
      await api.delete(`/family/remove/${linkId}`);
      const res = await api.get('/family/members');
      setFamilyMembers(res.data.data.familyMembers || []);
    } catch (err) {
      console.error('Failed to remove', err);
    }
  };

  const handleContinue = () => {
    localStorage.setItem('onboardingComplete', 'true');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col p-6 pt-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 max-w-sm mx-auto w-full">
        <div className="w-20 h-20 bg-white border-4 border-warm-100 rounded-[32px] flex items-center justify-center mb-8 shadow-sm">
          <Heart className="w-10 h-10 text-warm-500" fill="currentColor" />
        </div>

        <h1 className="text-[36px] font-bold text-gray-900 mb-3 leading-tight tracking-tight">Add your family</h1>
        <p className="text-[18px] text-gray-600 mb-10 font-medium">They'll be notified automatically if you ever need help.</p>

        <div className="bg-white rounded-[36px] p-7 shadow-sm border-[3px] border-warm-50 space-y-6">
          <div>
            <label className="block text-[15px] font-bold text-gray-700 mb-2 px-1">Member's Name</label>
            <div className="relative">
              <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh"
                className="w-full bg-warm-50/50 border-2 border-warm-100 rounded-[24px] py-4 pl-14 pr-4 text-lg font-medium focus:outline-none focus:border-warm-400 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[15px] font-bold text-gray-700 mb-2 px-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full bg-warm-50/50 border-2 border-warm-100 rounded-[24px] py-4 pl-14 pr-4 text-lg font-medium focus:outline-none focus:border-warm-400 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[15px] font-bold text-gray-700 mb-2 px-1">Relationship</label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full bg-warm-50/50 border-2 border-warm-100 rounded-[24px] py-4 px-5 text-lg font-medium focus:outline-none focus:border-warm-400 focus:bg-white transition-colors appearance-none"
            >
              <option>Son</option>
              <option>Daughter</option>
              <option>Spouse</option>
              <option>Grandchild</option>
              <option>Other</option>
            </select>
          </div>

          {error && <div className="text-rose-500 text-sm font-bold bg-rose-50 p-3 rounded-2xl">{error}</div>}

          <button
            onClick={handleAdd}
            disabled={!name || !phone || loading}
            className="w-full py-4 bg-warm-100 text-warm-900 font-bold text-lg rounded-[24px] flex items-center justify-center gap-2 hover:bg-warm-200 transition-colors disabled:opacity-50"
          >
            <UserPlus className="w-6 h-6" />
            {loading ? 'Adding...' : 'Add Family Member'}
          </button>
        </div>

        <AnimatePresence>
          {familyMembers.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-8 space-y-3">
              <h3 className="font-bold text-gray-900 px-2 text-xl mb-4">Added Members</h3>
              {familyMembers.map((member) => (
                <motion.div
                  key={member.linkId || member.member._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white flex items-center justify-between p-4 px-5 rounded-[24px] shadow-sm border border-warm-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 font-bold text-[24px] border border-emerald-100">
                      {member.member.firstName?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-[18px]">
                        {member.member.firstName} {member.member.lastName}
                      </p>
                      <p className="text-gray-500 font-medium text-sm">{member.member.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => member.linkId && handleRemove(member.linkId)}
                    className="p-3 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-2xl transition-colors"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-auto pt-8 pb-4 max-w-sm mx-auto w-full">
        <button
          onClick={handleContinue}
          className="w-full bg-warm-500 text-white font-bold text-[22px] py-5 rounded-[32px] shadow-xl shadow-warm-500/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
        >
          {familyMembers.length > 0 ? "Continue to Home" : "Skip for now"}
          <ArrowRight className="w-6 h-6" />
        </button>
      </motion.div>
    </div>
  );
}
