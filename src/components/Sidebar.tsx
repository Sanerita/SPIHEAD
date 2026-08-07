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
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  Zap,
  Sparkles,
  LogOut,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { m365Service } from '../lib/m365Service';
import { crmStore } from '../lib/store';
import { M365Account } from '../types/crm';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onOpenM365Hub?: () => void;
  onSyncAllM365?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setCurrentView, 
  onOpenM365Hub,
  onSyncAllM365
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [m365Account, setM365Account] = useState<M365Account>(m365Service.getAccount());
  const [isSyncing, setIsSyncing] = useState(false);

  // Live stats for badges
  const leadsCount = crmStore.getLeads().length;
  const meetingsCount = crmStore.getMeetings().filter(m => m.status === 'Scheduled').length;

  useEffect(() => {
    const account = m365Service.getAccount();
    setM365Account(account);
  }, [currentView]);

  const handleQuickSync = () => {
    setIsSyncing(true);
    if (onSyncAllM365) {
      onSyncAllM365();
    } else {
      crmStore.syncAllM365();
    }
    setTimeout(() => {
      setM365Account(m365Service.getAccount());
      setIsSyncing(false);
    }, 1000);
  };

  const navGroups = [
    {
      title: 'CORE PLATFORM',
      items: [
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
        { id: 'leads', name: 'Leads & Pipeline', icon: Users, badge: leadsCount },
        { id: 'calendar', name: 'Calendar & Teams', icon: Calendar, badge: meetingsCount > 0 ? meetingsCount : undefined },
        { id: 'analytics', name: 'Analytics', icon: BarChart3 },
      ]
    },
    {
      title: 'INTEGRATIONS & SYSTEM',
      items: [
        { 
          id: 'm365', 
          name: 'Microsoft 365 Hub', 
          icon: Layers, 
          statusDot: m365Account.isConnected ? 'emerald' : 'amber' 
        },
        { id: 'settings', name: 'Settings', icon: Settings },
      ]
    }
  ];

  return (
    <>
      {/* MOBILE TOP BAR (visible on screens smaller than lg) */}
      <header className="lg:hidden bg-navy-900 border-b border-navy-700 sticky top-0 z-40 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <button 
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center gap-2 focus:outline-none"
        >
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-white">
              SPI<span style={{ color: 'var(--brand-luxury-gold, #DCAE3E)' }}>HEAD</span>
            </span>
            <span className="text-[9px] text-navy-200 font-bold uppercase tracking-wider -mt-1 opacity-90">
              Enterprise CRM
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {/* M365 Badge Pill */}
          <button
            onClick={() => {
              if (onOpenM365Hub) onOpenM365Hub();
              else setCurrentView('m365');
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border transition-all ${
              m365Account.isConnected
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${m365Account.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>M365</span>
          </button>

          {/* Mobile Drawer Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-navy-800 text-gold-400 hover:bg-navy-700 border border-navy-700 focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* MOBILE SLIDE-OUT OVERLAY DRAWER */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-navy-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Menu Content */}
          <div className="relative w-72 max-w-[80vw] bg-navy-900 border-r border-navy-700 text-white flex flex-col h-full z-10 shadow-2xl p-4">
            <div className="flex items-center justify-between pb-4 border-b border-navy-800">
              <div className="flex flex-col">
                <span className="text-xl font-black text-white">
                  SPI<span style={{ color: 'var(--brand-luxury-gold, #DCAE3E)' }}>HEAD</span>
                </span>
                <span className="text-[9px] text-navy-200 font-bold uppercase tracking-wider">
                  Enterprise CRM
                </span>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-6">
              {navGroups.map((group, idx) => (
                <div key={idx} className="space-y-2">
                  <span className="text-[10px] font-bold tracking-wider text-navy-300 uppercase px-2">
                    {group.title}
                  </span>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentView === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setCurrentView(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                            isActive
                              ? 'bg-navy-800 text-gold-400 border-l-4 border-gold-400 shadow-sm'
                              : 'text-navy-100 hover:bg-navy-800/60 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`h-4 w-4 ${isActive ? 'text-gold-400' : 'text-navy-300'}`} />
                            <span>{item.name}</span>
                          </div>
                          {item.badge !== undefined && (
                            <span className="text-xs font-mono font-bold bg-navy-950 px-2 py-0.5 rounded-full text-gold-400 border border-gold-400/20">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Footer Profile */}
            <div className="pt-4 border-t border-navy-800 space-y-2">
              <button
                onClick={() => {
                  setCurrentView('profile');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 border border-navy-700 text-left transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-gold-500 text-navy-950 font-black flex items-center justify-center text-xs">
                  {m365Account.displayName.split(' ').map(n => n[0]).join('') || 'SS'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{m365Account.displayName}</p>
                  <p className="text-[10px] text-navy-200 truncate">{m365Account.accountEmail}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP FIXED/PERSISTENT SIDEBAR */}
      <aside 
        className={`hidden lg:flex flex-col bg-navy-900 border-r border-navy-700/80 text-white min-h-screen sticky top-0 h-screen transition-all duration-300 z-30 select-none ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-navy-800 flex items-center justify-between">
          {!isCollapsed && (
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="flex items-center gap-2 group text-left focus:outline-none"
            >
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-white flex items-center">
                  SPI<span style={{ color: 'var(--brand-luxury-gold, #DCAE3E)' }}>HEAD</span>
                </span>
                <span className="text-[9px] text-navy-200 font-semibold tracking-wider uppercase -mt-0.5 opacity-90">
                  Enterprise CRM
                </span>
              </div>
            </button>
          )}

          {isCollapsed && (
            <div className="mx-auto text-gold-400 font-black text-xl tracking-tighter">
              SPI
            </div>
          )}

          {/* Toggle Sidebar Collapse Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-navy-200 hover:text-gold-400 border border-navy-700 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Section Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-navy-700">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1.5">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-extrabold tracking-wider text-navy-300 uppercase">
                  {group.title}
                </div>
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-3'} py-2.5 rounded-xl text-xs font-bold transition-all group relative cursor-pointer ${
                      isActive
                        ? 'bg-navy-800 text-gold-400 border-l-4 border-gold-400 shadow-md'
                        : 'text-navy-100 hover:bg-navy-800/60 hover:text-gold-300'
                    }`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-gold-400' : 'text-navy-300'}`} />
                      {!isCollapsed && <span className="truncate">{item.name}</span>}
                    </div>

                    {!isCollapsed && item.badge !== undefined && (
                      <span className="text-[10px] font-mono font-bold bg-navy-950 px-2 py-0.5 rounded-full text-gold-400 border border-gold-400/20">
                        {item.badge}
                      </span>
                    )}

                    {!isCollapsed && item.statusDot && (
                      <span className={`h-2 w-2 rounded-full ${m365Account.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    )}

                    {/* Tooltip for Collapsed Sidebar */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2.5 py-1 bg-navy-950 text-white text-xs font-medium rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-navy-700">
                        {item.name}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* M365 Status Card Widget (When Expanded) */}
        {!isCollapsed && (
          <div className="mx-3 mb-3 p-3 rounded-xl bg-navy-950/80 border border-navy-700/80 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-navy-200">
                <span className={`h-2 w-2 rounded-full ${m365Account.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="font-semibold text-white">M365 Integration</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-400">
                {m365Account.isConnected ? 'Connected' : 'Offline'}
              </span>
            </div>

            <p className="text-[10px] text-navy-300 leading-tight">
              Outlook emails & Teams calls automatically synced.
            </p>

            <button
              onClick={handleQuickSync}
              disabled={isSyncing}
              className="w-full py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-600 text-gold-400 hover:text-gold-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync M365 Data'}</span>
            </button>
          </div>
        )}

        {/* User Profile Footer Widget */}
        <div className="p-3 border-t border-navy-800 bg-navy-950/60">
          <button
            onClick={() => setCurrentView('profile')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} p-2 rounded-xl hover:bg-navy-800/80 transition-all text-left group cursor-pointer`}
            title={isCollapsed ? m365Account.displayName : undefined}
          >
            <div className="h-9 w-9 rounded-xl bg-gold-500 text-navy-950 font-black flex items-center justify-center text-xs shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              {m365Account.displayName.split(' ').map(n => n[0]).join('') || 'SS'}
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-extrabold text-white truncate group-hover:text-gold-300 transition-colors">
                  {m365Account.displayName}
                </p>
                <p className="text-[10px] text-navy-300 truncate">
                  {m365Account.accountEmail}
                </p>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
