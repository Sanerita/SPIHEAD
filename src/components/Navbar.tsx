import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  BarChart3, 
  Settings, 
  User, 
  Menu, 
  X, 
  Layers, 
  RefreshCw,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { m365Service } from '../lib/m365Service';
import { M365Account } from '../types/crm';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onOpenM365Hub?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView, onOpenM365Hub }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [m365Account, setM365Account] = useState<M365Account>(m365Service.getAccount());

  useEffect(() => {
    const account = m365Service.getAccount();
    setM365Account(account);
  }, [currentView]);

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', name: 'Leads & Pipeline', icon: Users },
    { id: 'calendar', name: 'Calendar & Teams', icon: Calendar },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
    { id: 'm365', name: 'Microsoft 365 Hub', icon: Layers },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  return (
    <header className="bg-navy-900 shadow-md border-b border-navy-700 sticky top-0 z-40">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 w-full items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="flex items-center gap-2 group text-left focus:outline-none"
            >
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tight text-white flex items-center">
                  SPI<span style={{ color: 'var(--brand-luxury-gold, #DCAE3E)' }} className="transition-colors duration-300">HEAD</span>
                </span>
                <span className="text-[10px] text-navy-200 font-semibold tracking-wider uppercase -mt-0.5 opacity-90">
                  Enterprise CRM
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-navy-700 text-gold-400 shadow-sm border border-gold-400/20'
                      : 'text-navy-100 hover:text-gold-300 hover:bg-navy-800'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-gold-400' : 'text-navy-300'}`} />
                  {item.name}
                </button>
              );
            })}
          </div>

          {/* Right Action Controls & M365 Badge */}
          <div className="hidden md:flex items-center gap-3">
            {/* Microsoft 365 Status Badge */}
            <button
              onClick={() => {
                if (onOpenM365Hub) onOpenM365Hub();
                else setCurrentView('m365');
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                m365Account.isConnected
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30 hover:border-emerald-400'
                  : 'bg-amber-950/60 text-amber-300 border-amber-500/30 hover:border-amber-400'
              }`}
              title="Microsoft 365 Outlook & Teams Sync Status"
            >
              <span className={`h-2 w-2 rounded-full ${m365Account.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-mono">{m365Account.isConnected ? 'M365 Connected' : 'Connect M365'}</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            </button>

            {/* Profile Link */}
            <button
              onClick={() => setCurrentView('profile')}
              className="inline-flex items-center gap-2 rounded-md bg-gold-500 px-3.5 py-1.5 text-sm font-semibold text-navy-950 hover:bg-gold-400 transition-colors shadow-sm"
            >
              <User className="h-4 w-4" />
              <span>My Profile</span>
            </button>
          </div>

          {/* Mobile menu toggle */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setCurrentView('m365')}
              className="p-1.5 text-gold-400 bg-navy-800 rounded-md border border-gold-400/20"
              title="M365 Status"
            >
              <Layers className="h-5 w-5" />
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-gold-400 hover:bg-navy-800 focus:outline-none"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-navy-700 bg-navy-900 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-navy-700 text-gold-400 border-l-4 border-gold-400'
                      : 'text-white hover:bg-navy-800'
                  }`}
                >
                  <Icon className="h-5 w-5 text-gold-400" />
                  {item.name}
                </button>
              );
            })}

            <div className="pt-2 border-t border-navy-800 px-4">
              <button
                onClick={() => {
                  setCurrentView('profile');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-gold-500 py-2.5 text-navy-950 font-bold hover:bg-gold-400"
              >
                <User className="h-5 w-5" />
                My Profile
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
