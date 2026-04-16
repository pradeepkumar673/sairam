import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn } from 'lucide-react';
import api from '../lib/api';
import { useStore } from '../store';
import { initSocket } from '../lib/socket';

export default function Login() {
  const navigate = useNavigate();
  const { setUser, setToken } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data.data;
      setToken(token);
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      
      try {
        initSocket();
      } catch (err) {
        console.warn('Socket connection failed, will retry');
      }
      
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto w-full bg-white rounded-[40px] p-8 shadow-[0_8px_30px_rgba(249,115,22,0.12)] border border-warm-100"
      >
        <div className="text-center mb-10">
          <div className="inline-flex p-5 bg-warm-100/50 rounded-[28px] mb-6">
            <span className="text-5xl">❤️</span>
          </div>
          <h1 className="text-[36px] font-bold text-gray-900 tracking-tight leading-tight">Welcome Back</h1>
          <p className="text-[18px] text-gray-500 mt-2 font-medium">Sign in to your family circle</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[15px] font-bold text-gray-700 mb-2 px-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-warm-50/50 border-2 border-warm-100 rounded-[24px] py-4 pl-14 pr-4 text-lg font-medium focus:outline-none focus:border-warm-400 focus:bg-white transition-colors"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[15px] font-bold text-gray-700 mb-2 px-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-warm-50/50 border-2 border-warm-100 rounded-[24px] py-4 pl-14 pr-4 text-lg font-medium focus:outline-none focus:border-warm-400 focus:bg-white transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-[24px] text-[15px] font-bold text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-warm-500 hover:bg-warm-600 text-white font-bold text-[22px] py-5 rounded-[32px] shadow-xl shadow-warm-500/20 flex items-center justify-center gap-3 transition-colors disabled:opacity-70 mt-4"
          >
            {loading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-7 h-7 border-[3px] border-white/30 border-t-white rounded-full" />
            ) : (
              <>
                <LogIn className="w-6 h-6" />
                Sign In
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-8 text-gray-500 font-medium text-[16px]">
          Don't have an account?{' '}
          <Link to="/register" className="text-warm-600 font-bold hover:text-warm-700">
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
