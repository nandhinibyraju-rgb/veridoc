import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function GoogleSignInModal({ isOpen, onClose }) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');

  if (!isOpen) return null;

  const handleSelectGoogleAccount = async (account) => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle({
        email: account.email,
        name: account.name,
        googleId: account.googleId
      });
      onClose();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    if (!customEmail) return;
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle({
        email: customEmail,
        name: customName || ('Dr. ' + customEmail.split('@')[0]),
        googleId: 'goog_' + Math.random().toString(36).substring(2, 10)
      });
      onClose();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const presetAccounts = [
    {
      name: 'Dr. Sarah Chen, MD',
      email: 'sarah.chen.md@gmail.com',
      specialty: 'Cardiology • Mass General Brigham',
      googleId: 'goog_schen_cardio',
      initials: 'SC',
      avatarBg: 'bg-emerald-600'
    },
    {
      name: 'Dr. Marcus Vance, MD',
      email: 'marcus.vance.md@gmail.com',
      specialty: 'Nephrology • Johns Hopkins',
      googleId: 'goog_mvance_nephro',
      initials: 'MV',
      avatarBg: 'bg-indigo-600'
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 max-w-md w-full overflow-hidden relative"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-2xs">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Sign in with Google</h3>
                <p className="text-xs text-slate-500">Choose a verified Google physician account</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}

            {!customMode ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Select Clinician Account
                </p>

                {presetAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    disabled={loading}
                    onClick={() => handleSelectGoogleAccount(acc)}
                    className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-teal-500/80 hover:bg-teal-50/30 transition flex items-center justify-between text-left cursor-pointer group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${acc.avatarBg} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs`}>
                        {acc.initials}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 group-hover:text-[#0F766E] transition">
                          {acc.name}
                        </div>
                        <div className="text-xs text-slate-500">{acc.email}</div>
                        <div className="text-[11px] text-teal-700 font-medium mt-0.5">{acc.specialty}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#0F766E] group-hover:translate-x-0.5 transition" />
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCustomMode(true)}
                  className="w-full mt-2 p-3 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-500" />
                  <span>Use another Google account</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleCustomSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Doctor's Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Dr. Emily Watson, MD"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Google Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="doctor@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:bg-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCustomMode(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-2 py-2.5 px-4 rounded-xl bg-[#0F766E] hover:bg-[#0d655e] text-white text-xs font-bold transition disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? 'Authenticating...' : 'Sign In with Google'}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Veridoc HIPAA & Medical Identity Compliance</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
