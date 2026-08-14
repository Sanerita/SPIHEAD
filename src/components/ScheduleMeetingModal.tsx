import React, { useState, useEffect } from 'react';
import { Lead, Meeting } from '../types/crm';
import { sanitizeInput } from '../lib/authService';
import { X, Calendar, Video, Clock, MapPin, Layers, CheckCircle2 } from 'lucide-react';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (meetingData: Omit<Meeting, 'id' | 'createdAt' | 'teamsJoinUrl'>) => void;
  leads: Lead[];
  preselectedLeadId?: string;
}

export const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  leads,
  preselectedLeadId,
}) => {
  const [selectedLeadId, setSelectedLeadId] = useState(preselectedLeadId || (leads[0]?.id || ''));
  const [title, setTitle] = useState('SPIHEAD Enterprise CRM & M365 Discovery Call');
  const [date, setDate] = useState(
    new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [time, setTime] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [isTeamsMeeting, setIsTeamsMeeting] = useState(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedLeadId(preselectedLeadId || leads[0]?.id || '');
    }
  }, [isOpen, preselectedLeadId, leads]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lead = leads.find((l) => l.id === selectedLeadId) || leads[0];

    onSubmit({
      leadId: lead?.id || 'lead-custom',
      leadName: `${lead?.name || 'Client'} (${lead?.company || 'Organization'})`,
      leadEmail: lead?.email || '',
      title: sanitizeInput(title),
      date,
      time,
      durationMinutes: Number(durationMinutes),
      location: isTeamsMeeting ? 'Microsoft Teams Video Meeting' : 'In-Person / Phone Call',
      isTeamsMeeting,
      notes: sanitizeInput(notes),
      status: 'Scheduled',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden my-8">
        {/* Header */}
        <div className="bg-navy-900 text-white p-5 flex items-center justify-between border-b border-navy-700">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-950 border border-purple-500/30">
              <Calendar className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gold-400">Schedule Meeting</h3>
              <p className="text-xs text-navy-200">Generates Microsoft Teams meeting link & Outlook Calendar event</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-navy-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form action="#" onSubmit={handleSubmit} className="p-6 space-y-4 text-sm text-slate-700">
          <div>
            <label htmlFor="meeting-lead" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Select Lead / Participant *
            </label>
            <select
              id="meeting-lead"
              name="leadId"
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:outline-none bg-white font-medium text-navy-900"
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.company} ({l.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="meeting-title" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Meeting Title *
            </label>
            <input
              id="meeting-title"
              name="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:outline-none font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="meeting-date" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Date *
              </label>
              <input
                id="meeting-date"
                name="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:outline-none font-mono text-xs"
              />
            </div>

            <div>
              <label htmlFor="meeting-time" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Start Time *
              </label>
              <input
                id="meeting-time"
                name="time"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:outline-none font-mono text-xs"
              />
            </div>

            <div>
              <label htmlFor="meeting-duration" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Duration
              </label>
              <select
                id="meeting-duration"
                name="durationMinutes"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:outline-none bg-white text-xs"
              >
                <option value={15}>15 mins</option>
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>60 mins</option>
              </select>
            </div>
          </div>

          {/* Microsoft Teams Option Toggle */}
          <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="isTeams" className="flex items-center gap-2 cursor-pointer">
                <Video className="h-4 w-4 text-purple-700" />
                <span className="font-bold text-xs text-purple-900">
                  Microsoft Teams Meeting
                </span>
              </label>
              <input
                type="checkbox"
                id="isTeams"
                name="isTeams"
                checked={isTeamsMeeting}
                onChange={(e) => setIsTeamsMeeting(e.target.checked)}
                className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
              />
            </div>
            <p className="text-xs text-purple-800">
              Automatically creates a Microsoft Teams join URL and sends an Outlook invitation to the lead.
            </p>
          </div>

          <div>
            <label htmlFor="meeting-notes" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Agenda & Meeting Notes
            </label>
            <textarea
              id="meeting-notes"
              name="notes"
              rows={2}
              placeholder="Outline call agenda items..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:outline-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Layers className="h-4 w-4 text-emerald-600" />
              <span>Outlook Calendar Sync Active</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold shadow-sm"
              >
                Schedule & Sync
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
