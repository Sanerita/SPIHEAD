import React, { useState } from 'react';
import { ShieldAlert, Lock, KeyRound, LogOut, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { authService } from '../lib/authService';

interface LockScreenModalProps {
  onUnlocked: () => void;
}

export const LockScreenModal: React.FC<LockScreenModalProps> = ({ onUnlocked }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const user = authService.getCurrentUser();

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const success = authService.unlockSession(pin);
    if (success) {
      onUnlocked();
    } else {
      setError('Invalid Security PIN. Access denied. (Default PIN: 1234)');
      setPin('');
    }
  };

  const handleLogout = () => {
    authService.logout();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/90 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-gradient-to-br from-navy-950 via-navy-900 to-slate-900 border border-navy-700/80 w-full max-w-md rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden space-y-6">
        {/* Glow Effects */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & Lock Badge */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-4 rounded-2xl bg-gold-400/10 text-gold-400 border border-gold-400/20 shadow-inner">
            <Lock className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">SPIHEAD CRM Secured Workspace</h2>
            <p className="text-xs text-navy-300 font-medium mt-1">
              Session locked for compliance & data protection
            </p>
          </div>
        </div>

        {/* User Card */}
        <div className="bg-navy-950/80 p-4 rounded-2xl border border-navy-800 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gold-400 text-navy-950 font-black flex items-center justify-center text-sm shadow-md">
            {user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'SS'}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-extrabold text-white truncate">{user?.name || 'Sanelisiwe Sileku'}</h4>
            <p className="text-xs text-navy-300 truncate">{user?.email || 'sanelisiwe.sileku@spihead.com'}</p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gold-400/10 text-gold-400 border border-gold-400/20 uppercase tracking-wider">
            {user?.role || 'Admin'}
          </span>
        </div>

        {/* PIN Input Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-navy-200 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-gold-400" />
              Enter 4-Digit Security PIN
            </label>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              autoFocus
              className="w-full text-center tracking-[0.5em] text-2xl font-mono font-bold bg-navy-950 border border-navy-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-400 placeholder:text-navy-600"
            />
            <p className="text-[11px] text-navy-400 text-center font-mono">
              Default Security PIN: <span className="text-gold-300 font-bold">1234</span>
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-950/80 border border-red-500/40 text-red-300 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-gold-400 hover:bg-gold-300 text-navy-950 font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Unlock Workspace</span>
          </button>
        </form>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-navy-800 text-xs">
          <span className="text-[11px] text-navy-400 flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5 text-emerald-400" /> AES-256 TLS Protected
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
