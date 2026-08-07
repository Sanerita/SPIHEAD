import React from 'react';
import { Activity } from '../types/crm';
import { 
  UserPlus, 
  RefreshCw, 
  Calendar, 
  Mail, 
  Layers, 
  FileText, 
  Sparkles,
  Clock
} from 'lucide-react';

interface RecentActivityProps {
  activities: Activity[];
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => {
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'lead_added':
        return <UserPlus className="h-4 w-4 text-blue-600" />;
      case 'status_changed':
        return <RefreshCw className="h-4 w-4 text-amber-600" />;
      case 'meeting_scheduled':
        return <Calendar className="h-4 w-4 text-purple-600" />;
      case 'email_sent':
        return <Mail className="h-4 w-4 text-teal-600" />;
      case 'm365_synced':
        return <Layers className="h-4 w-4 text-emerald-600" />;
      case 'score_updated':
        return <Sparkles className="h-4 w-4 text-gold-500" />;
      default:
        return <FileText className="h-4 w-4 text-slate-500" />;
    }
  };

  const formatRelativeTime = (timestampStr: string) => {
    const diffMs = new Date().getTime() - new Date(timestampStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 3600));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-3">
      {activities.length > 0 ? (
        activities.slice(0, 7).map((act) => (
          <div
            key={act.id}
            className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50/80 transition-colors"
          >
            <div className="p-2 rounded-lg bg-slate-100 shrink-0 mt-0.5">
              {getActivityIcon(act.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-navy-900 leading-snug">
                {act.message}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                <span>{act.user.name}</span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(act.timestamp)}
                </span>
              </div>
            </div>
          </div>
        ))
      ) : (
        <p className="text-center text-xs text-slate-400 py-6">No recent activity recorded.</p>
      )}
    </div>
  );
};
