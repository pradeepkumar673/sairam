import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, LogIn } from 'lucide-react';
import api from '../lib/api';
import { useStore } from '../store';

export default function Register() {
  const navigate = useNavigate();
  const { setUser, setToken } = useStore();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'elder' as 'elder' | 'student' | 'family',
    dateOfBirth: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/register', form);
      const { token, user } = res.data.data;
      setToken(token);
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/onboarding');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-50 py-10 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto bg-white rounded-[40px] p-8 shadow-[0_8px_30px_rgba(249,115,22,0.12)] border border-warm-100"
      >
        <div className="text-center mb-8">
          <h1 className="text-[32px] font-bold text-gray-900 tracking-tight leading-tight">Create Account</h1>
          <p className="text-[17px] text-gray-500 font-medium mt-2">Join your family circle</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[15px] font-bold text-gray-700 mb-2 px-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full bg-warm-50/50 border-2 border-warm-100 rounded-[24px] py-4 pl-14 pr-4 text-lg font-medium focus:outline-none focus:border-warm-400 focus:bg-white transition-colors"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-[15px] font-bold text-gray-700 mb-2 px-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full bg-warm-50/50 border-2 border-warm-100 rounded-[24px] py-4 pl-14 pr-4 text-lg font-medium focus:outline-none focus:border-warm-400 focus:bg-white transition-colors"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[15px] font-bold text-gray-700 mb-2 px-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                className="w-full bg-warm-50/50 border-2 border-warm-100 rounded-[24px] py-4 pl-14 pr-4 text-lg font-medium focus:outline-none focus:border-warm-400 focus:bg-white transition-colors"
                placeholder="Minimum 8 characters"
              />
            </div>
          </div>

          <div>
            <label className="block text-[15px] font-bold text-gray-700 mb-2 px-1">Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full bg-warm-50/50 border-2 border-warm-100 rounded-[24px] py-4 px-5 text-lg font-medium focus:outline-none focus:border-warm-400 focus:bg-white transition-colors appearance-none"
            >
              <option value="elder">Elder (Senior)</option>
              <option value="student">Student</option>
              <option value="family">Family Member</option>
            </select>
          </div>

          {error && <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-[24px] text-[15px] font-bold text-center">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-warm-500 hover:bg-warm-600 text-white font-bold text-[22px] py-5 rounded-[32px] shadow-xl shadow-warm-500/20 flex items-center justify-center gap-3 transition-colors mt-8 disabled:opacity-70"
          >
            {loading ? 'Creating...' : (
              <>
                <LogIn className="w-6 h-6" />
                Sign Up
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-8 text-gray-500 font-medium text-[16px]">
          Already have an account?{' '}
          <Link to="/login" className="text-warm-600 font-bold hover:text-warm-700">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
