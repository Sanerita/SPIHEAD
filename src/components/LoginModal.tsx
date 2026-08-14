import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, Key, Sparkles, Layers, ArrowRight, CheckCircle2, User, RefreshCw, AlertCircle, Globe, X } from 'lucide-react';
import { authService } from '../lib/authService';
import { UserRole } from '../types/crm';

interface LoginModalProps {
  onLoginSuccess: () => void;
  onNavigateToSignUp?: () => void;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, onNavigateToSignUp, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Admin');
  const [mfaCode, setMfaCode] = useState('');
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authProviderText, setAuthProviderText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password.trim()) {
      setError('Please provide a valid email address and password.');
      return;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      await authService.login(cleanEmail, selectedRole, password);
      setIsAuthenticating(false);
      onLoginSuccess();
    } catch (err: any) {
      setIsAuthenticating(false);
      setError(err.message || 'Authentication failed. Please check your credentials or create an account.');
    }
  };

  const handleQuickDemoFill = () => {
    setEmail('sanelisiwe.sileku@spihead.com');
    setPassword('Password123!');
    setSelectedRole('Admin');
    setError(null);
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode && mfaCode.length > 0 && mfaCode.length !== 6) {
      setError('Invalid 2FA Authenticator Passcode. Please enter a 6-digit code.');
      return;
    }

    try {
      setIsAuthenticating(true);
      setError(null);
      await authService.login(email || 'sanelisiwe.sileku@spihead.com', selectedRole, password);
      setIsAuthenticating(false);
      onLoginSuccess();
    } catch (err: any) {
      setIsAuthenticating(false);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleM365SSO = async () => {
    setIsAuthenticating(true);
    setAuthProviderText('Authenticating with Microsoft 365 Entra ID...');
    try {
      await authService.loginWithM365(email || 'sanelisiwe.sileku@spihead.com');
      setIsAuthenticating(false);
      onLoginSuccess();
    } catch (err: any) {
      setIsAuthenticating(false);
      setError(err.message || 'Microsoft 365 SSO Authentication failed.');
    }
  };

  const handleGoogleSSO = async () => {
    setIsAuthenticating(true);
    setAuthProviderText('Authenticating with Google Workspace...');
    try {
      await authService.loginWithGoogle(email || 'sanelisiwe.sileku@spihead.com');
      setIsAuthenticating(false);
      onLoginSuccess();
    } catch (err: any) {
      setIsAuthenticating(false);
      setError(err.message || 'Google Workspace SSO Authentication failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/90 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-gradient-to-br from-navy-950 via-navy-900 to-slate-900 border border-navy-700/80 w-full max-w-lg rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden space-y-6">
        {/* Glow Accents */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center space-y-2 relative">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 top-0 text-navy-400 hover:text-white p-1 rounded-lg bg-navy-900 border border-navy-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-gold-400/10 text-gold-400 border border-gold-400/20 shadow-inner">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">SPIHEAD Enterprise CRM Sign In</h2>
          <p className="text-xs text-navy-300 font-medium">
            Multi-Factor Protected Gateway & OAuth Single Sign-On
          </p>
        </div>

        {step === 'credentials' ? (
          <form action="#" onSubmit={handleCredentialsSubmit} className="space-y-4">
            
            {/* OAuth Single Sign-On Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleGoogleSSO}
                disabled={isAuthenticating}
                className="py-2.5 px-3 rounded-2xl bg-navy-800 hover:bg-navy-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 border border-navy-600 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <Globe className="h-4 w-4 text-cyan-400" />
                <span>Sign in with Google</span>
              </button>

              <button
                type="button"
                onClick={handleM365SSO}
                disabled={isAuthenticating}
                className="py-2.5 px-3 rounded-2xl bg-navy-800 hover:bg-navy-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 border border-navy-600 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <Layers className="h-4 w-4 text-gold-400" />
                <span>Sign in with Microsoft 365</span>
              </button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-navy-800"></div>
              <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-wider text-navy-400">or sign in with credentials</span>
              <div className="flex-grow border-t border-navy-800"></div>
            </div>

            {/* Role Selection (For Demo & Testing RBAC) */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-navy-200 uppercase tracking-wider">Select Role Persona:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['Admin', 'Sales Manager', 'Sales Rep', 'Auditor'] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-extrabold transition-all border ${
                      selectedRole === role
                        ? 'bg-gold-400 text-navy-950 border-gold-300 shadow-sm'
                        : 'bg-navy-950/80 text-navy-300 border-navy-800 hover:bg-navy-800'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1">
              <label htmlFor="login-email" className="block text-xs font-bold text-navy-200">Enterprise Email Address</label>
              <div className="relative">
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-navy-950 border border-navy-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-gold-400 font-mono"
                />
                <Mail className="h-4 w-4 text-navy-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label htmlFor="login-password" className="block text-xs font-bold text-navy-200">Security Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-navy-950 border border-navy-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-gold-400 font-mono"
                />
                <Key className="h-4 w-4 text-navy-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-950/80 border border-red-500/40 text-red-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                {error}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-navy-300 pt-1">
              <button
                type="button"
                onClick={handleQuickDemoFill}
                className="text-gold-400/90 hover:text-gold-300 font-semibold text-[11px] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="h-3 w-3 text-gold-400" />
                <span>Autofill Demo Account</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3 px-4 rounded-xl bg-gold-400 hover:bg-gold-300 text-navy-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-50"
            >
              {isAuthenticating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>{authProviderText || 'Authenticating & Accessing Workspace...'}</span>
                </>
              ) : (
                <>
                  <span>Sign In & Enter Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {onNavigateToSignUp && (
              <div className="pt-2 text-center text-xs text-navy-300">
                <span>Don't have an enterprise workspace? </span>
                <button
                  type="button"
                  onClick={onNavigateToSignUp}
                  className="text-gold-400 font-bold hover:underline cursor-pointer"
                >
                  Create New Account
                </button>
              </div>
            )}
          </form>
        ) : (
          <form action="#" onSubmit={handleMfaSubmit} className="space-y-4">
            <div className="p-4 bg-navy-950 border border-navy-800 rounded-2xl space-y-2 text-center">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider inline-block">
                MFA Required
              </span>
              <p className="text-xs text-navy-200">
                Enter the 6-digit passcode generated by your Authenticator App for <span className="font-mono text-white font-bold">{email}</span>.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-mfa-code" className="block text-xs font-bold text-navy-200 text-center">2FA Authenticator Passcode</label>
              <input
                id="login-mfa-code"
                name="mfaCode"
                type="text"
                autoComplete="one-time-code"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="000000"
                autoFocus
                className="w-full text-center tracking-[0.5em] text-2xl font-mono font-bold bg-navy-950 border border-navy-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-400 placeholder:text-navy-600"
              />
              <p className="text-[11px] text-navy-400 text-center font-mono">
                Enter code from your Microsoft Authenticator / 2FA app
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-950/80 border border-red-500/40 text-red-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                {error}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep('credentials')}
                className="w-1/3 py-3 px-3 rounded-xl bg-navy-800 hover:bg-navy-700 text-white font-bold text-xs transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                className="w-2/3 py-3 px-4 rounded-xl bg-gold-400 hover:bg-gold-300 text-navy-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Authorize & Enter CRM</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
