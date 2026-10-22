import React, { useState } from 'react';
import { X, LogIn, UserPlus, Check, Film, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { api, setActiveProfileId } from '../api/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (displayName: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username or your name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === 'register') {
        const res = await api.register(username.trim(), displayName.trim() || undefined, password || undefined);
        setActiveProfileId(res.user.profile_id);
        onSuccess(res.user.display_name);
        onClose();
      } else {
        // In login mode: if user does not exist, our backend auto-registers them seamlessly!
        const res = await api.login(username.trim(), password || undefined);
        setActiveProfileId(res.user.profile_id);
        onSuccess(res.user.display_name);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSignIn = (presetUser: string, presetName: string) => {
    setLoading(true);
    setError(null);
    api
      .login(presetUser)
      .then((res) => {
        setActiveProfileId(res.user.profile_id);
        onSuccess(presetName);
        onClose();
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#12141D] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-zinc-950 font-black">
            <Film className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-white font-['Space_Grotesk']">
            {mode === 'login' ? 'Sign In to CineMatch' : 'Create Free Account'}
          </h2>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
            Simple & uncomplicated: enter your name to keep your ratings, watchlist, and personalized recommendations saved.
          </p>
        </div>

        {/* Quick One-Click Sign In Presets */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase text-zinc-500 tracking-wider block text-center">
            One-Click Quick Login
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickSignIn('vedant', 'Vedant')}
              className="px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 text-xs font-semibold text-zinc-200 hover:text-amber-300 transition-all flex items-center justify-center gap-2"
            >
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>Vedant</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickSignIn('movie_buff', 'Movie Buff')}
              className="px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 text-xs font-semibold text-zinc-200 hover:text-amber-300 transition-all flex items-center justify-center gap-2"
            >
              <User className="w-3.5 h-3.5 text-rose-400" />
              <span>Movie Buff</span>
            </button>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-white/5 w-full" />
          <span className="bg-[#12141D] px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest absolute">
            Or Use Your Name
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Username or Display Name <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. vedant or Sarah"
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                required
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Full Display Name (Optional)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Vedant Joshi"
                className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-zinc-300">
                Password / PIN <span className="text-zinc-500 font-normal">(Optional)</span>
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank or set a password"
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              />
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">
              You can leave this blank for instant passwordless sign-in!
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            <span>{loading ? 'Processing...' : mode === 'login' ? 'Sign In / Continue' : 'Create Account'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="text-center pt-2">
          {mode === 'login' ? (
            <p className="text-xs text-zinc-400">
              New user?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className="text-amber-400 hover:text-amber-300 font-bold underline"
              >
                Register with a custom display name
              </button>
            </p>
          ) : (
            <p className="text-xs text-zinc-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="text-amber-400 hover:text-amber-300 font-bold underline"
              >
                Switch to Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
