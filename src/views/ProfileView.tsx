// src/views/ProfileView.tsx
import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Building,
  ShieldCheck,
  Target,
  Layers,
  Edit3,
  Save,
  CheckCircle2,
  Lock,
  LogOut,
  Key,
  RefreshCw,
  Download,
  Globe,
  DollarSign,
  FileText,
  AlertCircle,
  X,
  CreditCard,
  Sparkles,
  Users,
  Briefcase,
  Calendar,
  Trophy
} from 'lucide-react';
import { M365Account, Lead, Meeting } from '../types/crm';
import { m365Service } from '../lib/m365Service';
import { authService } from '../lib/authService';
import { subscriptionService } from '../lib/subscriptionService';
import { currencyService } from '../lib/currencyService';
import { UpgradePlanModal } from '../components/UpgradePlanModal';
import { UserSubscription, Invoice } from '../types/subscription';

interface ProfileViewProps {
  account: M365Account;
  leads?: Lead[];
  meetings?: Meeting[];
  onAccountUpdate?: (updated: M365Account) => void;
  onSyncM365?: () => void;
  showToast?: (message: string, type?: 'success' | 'info') => void;
  onLogout?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  account,
  leads = [],
  meetings = [],
  onAccountUpdate,
  onSyncM365,
  showToast,
  onLogout,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'billing'>('profile');

  // Get real user data from auth service
  const currentUser = authService.getCurrentUser();

  // Subscription & Invoices State
  const [sub, setSub] = useState<UserSubscription>(subscriptionService.getSubscription());
  const [invoices, setInvoices] = useState<Invoice[]>(subscriptionService.getInvoices());
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  useEffect(() => {
    const unsubSub = subscriptionService.subscribe(() => {
      setSub(subscriptionService.getSubscription());
      setInvoices(subscriptionService.getInvoices());
    });
    return () => unsubSub();
  }, []);

  // Form state - use real data
  const [displayName, setDisplayName] = useState(currentUser?.name || account.displayName || '');
  const [email, setEmail] = useState(currentUser?.email || account.email || '');
  const [jobTitle, setJobTitle] = useState(account.jobTitle || currentUser?.jobTitle || '');
  const [companyName, setCompanyName] = useState(account.companyName || currentUser?.companyName || '');
  const [department, setDepartment] = useState(account.department || currentUser?.department || '');
  const [phoneNumber, setPhoneNumber] = useState(account.phoneNumber || '');
  const [salesTarget, setSalesTarget] = useState<number>(account.salesTarget || 500000);
  const [bio, setBio] = useState(account.bio || '');

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Get user initials
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  // Performance Metrics
  const totalLeads = leads.length;
  const closedLeads = leads.filter((l) => l.status === 'Closed');
  const closedRevenue = closedLeads.reduce((sum, l) => sum + (l.budget || 0), 0);
  const activePipeline = leads.filter((l) => l.status !== 'Closed').reduce((sum, l) => sum + (l.budget || 0), 0);
  const target = Number(salesTarget) || 500000;
  const quotaProgress = target > 0 ? Math.min(100, Math.round((closedRevenue / target) * 100)) : 0;
  const winRate = totalLeads > 0 ? Math.round((closedLeads.length / totalLeads) * 100) : 0;
  const avgDealSize = closedLeads.length > 0 ? Math.round(closedRevenue / closedLeads.length) : 0;

  // Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedAccount: M365Account = {
      ...account,
      displayName,
      email,
      jobTitle,
      companyName,
      department,
      phoneNumber,
      salesTarget: Number(salesTarget),
      bio,
    };

    m365Service.saveAccount(updatedAccount);
    if (onAccountUpdate) onAccountUpdate(updatedAccount);

    if (currentUser) {
      try {
        const res = await fetch('/api/auth/update-profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authService.getSessionToken()}`
          },
          body: JSON.stringify({
            name: displayName,
            jobTitle,
            companyName,
            department,
            phoneNumber,
          })
        });
        if (res.ok) {
          await authService.refreshUser();
        }
      } catch (err) {
        console.warn('Failed to update profile on server:', err);
      }
    }

    setIsEditing(false);
    if (showToast) showToast('Profile updated successfully!');
  };

  // Change Password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authService.getSessionToken()}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (res.ok) {
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (showToast) showToast('Password updated successfully!');
        setTimeout(() => setPasswordSuccess(false), 3000);
      } else {
        const data = await res.json();
        setPasswordError(data.error || 'Failed to update password.');
      }
    } catch (err) {
      setPasswordError('Failed to update password.');
    }
  };

  // Export Data
  const handleExport = () => {
    const data = {
      user: { displayName, email, jobTitle, companyName, department, phoneNumber },
      metrics: { totalLeads, closedRevenue, activePipeline, quotaProgress, winRate, avgDealSize },
      pipeline: leads.map(l => ({ name: l.name, company: l.company, status: l.status, budget: l.budget, score: l.score })),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `profile_${displayName.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    if (showToast) showToast('Profile data exported!');
  };

  const userRole = currentUser?.authRole || currentUser?.role || 'User';

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* Profile Header */}
      <div className="bg-navy-900 text-white rounded-2xl border border-navy-700 shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-navy-950 to-navy-800 border-b border-navy-800 flex justify-end items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3.5 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" />
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>

          <button
            onClick={handleExport}
            className="px-3.5 py-1.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/80 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          )}
        </div>

        <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-10">
          <div className="h-24 w-24 rounded-2xl bg-gold-500 text-navy-950 flex items-center justify-center font-extrabold text-3xl shadow-xl border-4 border-navy-900 shrink-0">
            {initials}
          </div>

          <div className="space-y-1 text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-2xl font-bold text-gold-400">{displayName || 'User'}</h1>
              {jobTitle && (
                <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-navy-800 text-gold-300 border border-gold-400/30">
                  {jobTitle}
                </span>
              )}
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-gold-500 text-navy-950">
                {userRole}
              </span>
            </div>
            <p className="text-xs text-navy-200 font-mono">{email}</p>
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-navy-300">
              {companyName && (
                <span className="flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-gold-400" />
                  {companyName} {department ? `• ${department}` : ''}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                {account.subscriptionType || 'Free'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-navy-950 px-6 py-2 border-t border-navy-800 flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'security', label: 'Security', icon: Lock },
            { id: 'billing', label: 'Billing', icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-navy-800 text-gold-400 border border-gold-400/30'
                    : 'text-navy-300 hover:text-white hover:bg-navy-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Edit Mode */}
      {isEditing && (
        <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-2xl border border-gold-300/80 shadow-md space-y-4 mt-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-navy-900 text-lg flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-gold-500" />
              Edit Profile
            </h3>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Full Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Job Title</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Company</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Phone</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Quota Target ($)</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={salesTarget}
                onChange={(e) => setSalesTarget(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-gold-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Bio</label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 focus:outline-none"
                placeholder="Brief professional summary..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-gold-400 font-bold text-sm flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
          </div>
        </form>
      )}

      {/* TAB: Profile Overview */}
      {activeTab === 'profile' && (
        <div className="space-y-6 mt-6">
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Quota Progress</span>
                <Target className="h-4 w-4 text-gold-500" />
              </div>
              <div className="text-2xl font-bold text-navy-900 mt-1">
                {quotaProgress}%
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                <div className="bg-gold-500 h-full transition-all" style={{ width: `${quotaProgress}%` }} />
              </div>
              <div className="text-xs text-slate-500 mt-1">
                ${closedRevenue.toLocaleString()} / ${target.toLocaleString()}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Win Rate</span>
                <Trophy className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-navy-900 mt-1">{winRate}%</div>
              <div className="text-xs text-slate-500 mt-1">
                {closedLeads.length} closed · {totalLeads} total
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Active Pipeline</span>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-navy-900 mt-1">
                ${activePipeline.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {totalLeads - closedLeads.length} open opportunities
              </div>
            </div>
          </div>

          {/* Bio & Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-navy-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-gold-500" />
                Professional Summary
              </h3>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                {bio || 'No bio provided yet.'}
              </p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Phone</span>
                  <span className="font-bold text-navy-900 text-sm">{phoneNumber || 'Not set'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Email</span>
                  <span className="font-bold text-navy-900 text-sm truncate">{email || 'Not set'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-navy-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-600" />
                M365 Connection
              </h3>
              <div className="space-y-3 mt-3">
                <div className="flex justify-between text-sm py-1 border-b border-slate-50">
                  <span className="text-slate-500">Status</span>
                  <span className={`font-bold ${account.isConnected ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {account.isConnected ? 'Connected' : 'Offline'}
                  </span>
                </div>
                <div className="flex justify-between text-sm py-1 border-b border-slate-50">
                  <span className="text-slate-500">Tenant</span>
                  <span className="font-bold text-navy-900">{account.tenantName || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm py-1 border-b border-slate-50">
                  <span className="text-slate-500">Plan</span>
                  <span className="font-bold text-navy-900">{account.subscriptionType || 'Free'}</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-slate-500">Last Sync</span>
                  <span className="font-mono text-sm">
                    {account.lastSyncedAt ? new Date(account.lastSyncedAt).toLocaleString() : 'Never'}
                  </span>
                </div>
                {onSyncM365 && (
                  <button
                    onClick={onSyncM365}
                    className="w-full mt-2 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-gold-400 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Sync Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Security */}
      {activeTab === 'security' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-6">
          <h3 className="font-bold text-navy-900 text-lg flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="h-5 w-5 text-gold-500" />
            Security
          </h3>

          <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-4 mt-4">
            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                Password changed successfully!
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Current Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 pl-9 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 focus:outline-none"
                />
                <Key className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">New Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full px-3 py-2 pl-9 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 focus:outline-none"
                />
                <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 pl-9 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 focus:outline-none"
                />
                <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-gold-400 font-bold text-sm flex items-center gap-2 transition-colors"
            >
              <ShieldCheck className="h-4 w-4" />
              Update Password
            </button>
          </form>
        </div>
      )}

      {/* TAB: Billing */}
      {activeTab === 'billing' && (
        <div className="space-y-6 mt-6">
          {/* Current Plan */}
          <div className="bg-slate-950 rounded-2xl p-6 text-white border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                    {sub.status.toUpperCase()}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-gold-400 text-xs font-bold border border-slate-700">
                    {sub.billingInterval === 'annual' ? 'Annual' : 'Monthly'}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mt-2 flex items-center gap-2">
                  {subscriptionService.getPlanById(sub.planId).name}
                  <Sparkles className="h-4 w-4 text-gold-400" />
                </h3>
                <p className="text-sm text-slate-400">{subscriptionService.getPlanById(sub.planId).tagline}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white font-mono">
                  {currencyService.getPriceForPlan(sub.planId, sub.billingInterval).formattedMonthly}
                  <span className="text-sm font-normal text-slate-400">/mo</span>
                </div>
                <div className="text-xs text-gold-400 mt-1">
                  Renews: {new Date(sub.nextBillingDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">Seats</div>
                <div className="font-bold text-white">{sub.seatsCount} / {subscriptionService.getPlanById(sub.planId).maxSeats}</div>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">AI Credits</div>
                <div className="font-bold text-gold-400">{sub.planId === 'enterprise' ? '∞' : sub.aiCreditsRemaining}</div>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">Payment</div>
                <div className="font-bold text-white text-sm">{sub.paymentMethod?.brand || 'Visa'} •••• {sub.paymentMethod?.last4 || '4242'}</div>
              </div>
            </div>

            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="mt-4 px-5 py-2 rounded-xl bg-gold-400 hover:bg-gold-300 text-slate-950 font-bold text-sm transition-colors flex items-center gap-2"
            >
              <Zap className="h-4 w-4 fill-current" />
              Upgrade Plan
            </button>
          </div>

          {/* Invoices */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-navy-900 text-lg border-b border-slate-100 pb-3">Billing History</h3>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                    <th className="pb-2 pr-4">Invoice</th>
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Plan</th>
                    <th className="pb-2 pr-4 text-right">Amount</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">No invoices yet</td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-3 font-mono font-bold text-navy-900">{inv.number}</td>
                        <td className="py-3 text-slate-600">{new Date(inv.date).toLocaleDateString()}</td>
                        <td className="py-3 text-slate-600">{inv.planName}</td>
                        <td className="py-3 text-right font-mono font-bold text-navy-900">
                          {currencyService.formatCustomAmount(inv.amountUSD)}
                        </td>
                        <td className="py-3 text-right">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradePlanModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        showToast={showToast}
      />
    </div>
  );
};

export default ProfileView;
