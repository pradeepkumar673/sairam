import { useState } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, UserPlus, Phone, User as UserIcon } from 'lucide-react';

export default function Onboarding() {
  const { addFamilyMember, familyMembers } = useStore();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Son');

  const handleAdd = () => {
    if (!name || !phone) return;
    addFamilyMember({
      id: Math.random().toString(),
      name,
      phone,
      relationship
    });
    setName('');
    setPhone('');
  };

  const relationships = ['Son', 'Daughter', 'Grandchild', 'Spouse', 'Other'];

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col p-6 pt-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col"
      >
        <div className="w-16 h-16 bg-warm-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
          <Heart className="w-8 h-8 text-warm-500" fill="currentColor" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight leading-tight">
          Add your close family members for safety alerts
        </h1>
        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
          We'll keep them updated on your health and send them an SMS during an emergency.
        </p>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-warm-100/50 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh"
                className="w-full bg-warm-50/50 border border-warm-100 rounded-2xl py-4 pl-12 pr-4 text-lg focus:outline-none focus:ring-2 focus:ring-warm-500/30 transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full bg-warm-50/50 border border-warm-100 rounded-2xl py-4 pl-12 pr-4 text-lg focus:outline-none focus:ring-2 focus:ring-warm-500/30 transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Relationship</label>
            <select 
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full bg-warm-50/50 border border-warm-100 rounded-2xl py-4 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-warm-500/30 transition-all appearance-none"
            >
              {relationships.map(rel => (
                <option key={rel} value={rel}>{rel}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleAdd}
            disabled={!name || !phone}
            className="w-full py-4 mt-2 bg-warm-100 text-warm-900 font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-warm-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-5 h-5" />
            Add Family Member
          </button>
        </div>

        <AnimatePresence>
          {familyMembers.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 space-y-3"
            >
              <h3 className="font-semibold text-gray-900 px-2">Added Members</h3>
              {familyMembers.map((member) => (
                <motion.div 
                  key={member.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white flex items-center justify-between p-4 rounded-2xl shadow-sm border border-warm-100/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-xl">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-lg">{member.name}</p>
                      <p className="text-gray-500 text-sm">{member.relationship}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>

      {familyMembers.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-auto pt-8 pb-4"
        >
          <button 
            className="w-full bg-warm-500 text-white font-bold text-xl py-5 rounded-3xl shadow-xl shadow-warm-500/20 active:scale-[0.98] transition-transform"
            onClick={() => window.location.href = '/'}
          >
            Continue
          </button>
        </motion.div>
      )}
    </div>
  );
}
