import React, { useState, useMemo, useEffect } from 'react';
import { Meeting, Lead, M365Account } from '../types/crm';
import { crmStore } from '../lib/store';
import { m365Service } from '../lib/m365Service';
import {
  Calendar as CalendarIcon,
  Video,
  Clock,
  Plus,
  ExternalLink,
  CheckCircle2,
  Layers,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Check,
  Copy,
  X,
  Mic,
  MicOff,
  VideoOff,
  Monitor,
  Hand,
  MessageSquare,
  Sparkles,
  FileText,
  AlertCircle,
  Edit,
  Trash2,
  RefreshCw,
  Phone,
  ShieldCheck,
  List,
  Grid,
  Sun,
  Send
} from 'lucide-react';

interface CalendarViewProps {
  meetings: Meeting[];
  leads: Lead[];
  m365Account?: M365Account;
  showToast?: (text: string, type?: 'success' | 'info') => void;
  onOpenScheduleModal: (lead?: Lead) => void;
  onSyncM365Calendar: () => void;
  onSelectLead?: (leadId: string) => void;
  onNavigate?: (view: string) => void;
}

type CalendarDisplayMode = 'month' | 'week' | 'day' | 'agenda';

export const CalendarView: React.FC<CalendarViewProps> = ({
  meetings,
  leads,
  m365Account,
  showToast,
  onOpenScheduleModal,
  onSyncM365Calendar,
  onSelectLead,
  onNavigate,
}) => {
  // Navigation & View State
  const [displayMode, setDisplayMode] = useState<CalendarDisplayMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 7, 7)); // Default August 2026
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date(2026, 7, 7).toISOString().slice(0, 10)
  );

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  // Interactive Action States
  const [copiedMeetingId, setCopiedMeetingId] = useState<string | null>(null);
  
  // Microsoft Teams Room Simulator State
  const [activeTeamsRoomMeeting, setActiveTeamsRoomMeeting] = useState<Meeting | null>(null);
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [isVideoOn, setIsVideoOn] = useState<boolean>(true);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);
  const [teamsChatTab, setTeamsChatTab] = useState<'notes' | 'chat'>('notes');
  const [callNotesText, setCallNotesText] = useState<string>('');
  const [callDurationSeconds, setCallDurationSeconds] = useState<number>(0);
  const [teamsChatMessages, setTeamsChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'SPIHEAD Copilot', text: 'Welcome to your Microsoft Teams sales call! Agenda and transcript notes are live.', time: '10:00 AM' }
  ]);
  const [newChatMessage, setNewChatMessage] = useState<string>('');

  // Reschedule / Edit Meeting Modal State
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editDuration, setEditDuration] = useState(30);
  const [editNotes, setEditNotes] = useState('');

  // Live Timer Effect for Teams Room Simulator
  useEffect(() => {
    let timer: any = null;
    if (activeTeamsRoomMeeting) {
      timer = setInterval(() => {
        setCallDurationSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDurationSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeTeamsRoomMeeting]);

  // Format Call Timer (MM:SS)
  const formattedCallTime = useMemo(() => {
    const mins = Math.floor(callDurationSeconds / 60);
    const secs = callDurationSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [callDurationSeconds]);

  // Toast trigger helper
  const triggerToast = (msg: string, type: 'success' | 'info' = 'success') => {
    if (showToast) showToast(msg, type);
  };

  // Month navigation handlers
  const handlePrevMonth = () => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(next);
  };

  const handleNextMonth = () => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    const now = new Date(2026, 7, 7);
    setCurrentDate(now);
    setSelectedDateStr(now.toISOString().slice(0, 10));
  };

  // Copy Teams Join URL
  const handleCopyTeamsUrl = (mtg: Meeting) => {
    const url = mtg.teamsJoinUrl || m365Service.generateTeamsMeetingUrl(mtg.id, mtg.title);
    navigator.clipboard.writeText(url);
    setCopiedMeetingId(mtg.id);
    setTimeout(() => setCopiedMeetingId(null), 2000);
    triggerToast('Copied Microsoft Teams Join Link to clipboard!', 'info');
  };

  // Launch Teams Room Call Simulator
  const handleLaunchTeamsRoom = (mtg: Meeting) => {
    setActiveTeamsRoomMeeting(mtg);
    setCallNotesText(mtg.notes || `Discussion with ${mtg.leadName} regarding enterprise proposal and Microsoft 365 licensing.`);
    setTeamsChatMessages([
      { sender: 'Microsoft Teams System', text: `Call started with ${mtg.leadName}. Encrypted via TLS 1.3.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      { sender: 'SPIHEAD Assistant', text: `Key Lead Context: Industry - ${mtg.leadName}. Target Budget: $${(leads.find(l => l.id === mtg.leadId)?.budget || 0).toLocaleString()} USD.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    triggerToast(`Joining Microsoft Teams Video Call: "${mtg.title}"`);
  };

  // End Teams Call & Save Notes
  const handleEndTeamsCall = () => {
    if (activeTeamsRoomMeeting) {
      // Mark completed in store
      crmStore.updateMeetingStatus(activeTeamsRoomMeeting.id, 'Completed');
      if (callNotesText.trim()) {
        crmStore.updateMeeting(activeTeamsRoomMeeting.id, {
          notes: `${callNotesText}\n\n[Teams Call Duration: ${formattedCallTime}]`,
        });
      }
      triggerToast(`Teams call ended. Saved meeting summary to ${activeTeamsRoomMeeting.leadName}'s CRM timeline!`);
    }
    setActiveTeamsRoomMeeting(null);
  };

  // Send message in Teams Room chat simulator
  const handleSendTeamsChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim()) return;
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTeamsChatMessages((prev) => [
      ...prev,
      { sender: 'Sanelisiwe Sileku (You)', text: newChatMessage, time: nowStr }
    ]);
    const msg = newChatMessage;
    setNewChatMessage('');

    // AI automated response simulation
    setTimeout(() => {
      setTeamsChatMessages((prev) => [
        ...prev,
        { sender: activeTeamsRoomMeeting?.leadName || 'Participant', text: `Thanks! Received your message regarding: "${msg}"`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    }, 1500);
  };

  // Mark Completed
  const handleMarkCompleted = (mtg: Meeting) => {
    crmStore.updateMeetingStatus(mtg.id, 'Completed');
    triggerToast(`Marked meeting "${mtg.title}" as Completed!`);
  };

  // Cancel Meeting
  const handleCancelMeeting = (mtg: Meeting) => {
    crmStore.cancelMeeting(mtg.id);
    triggerToast(`Canceled meeting "${mtg.title}"`, 'info');
  };

  // Open Edit Meeting Modal
  const handleOpenEditModal = (mtg: Meeting) => {
    setEditingMeeting(mtg);
    setEditTitle(mtg.title);
    setEditDate(mtg.date);
    setEditTime(mtg.time);
    setEditDuration(mtg.durationMinutes);
    setEditNotes(mtg.notes || '');
  };

  // Submit Reschedule / Edit
  const handleSaveMeetingEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting) return;
    crmStore.updateMeeting(editingMeeting.id, {
      title: editTitle,
      date: editDate,
      time: editTime,
      durationMinutes: editDuration,
      notes: editNotes,
    });
    setEditingMeeting(null);
    triggerToast(`Updated and rescheduled meeting "${editTitle}"!`);
  };

  // Filtered Meetings Calculation
  const filteredMeetings = useMemo(() => {
    return meetings.filter((mtg) => {
      // Status Filter
      if (statusFilter !== 'All' && mtg.status !== statusFilter) return false;
      // Type Filter
      if (typeFilter === 'teams' && !mtg.isTeamsMeeting) return false;
      if (typeFilter === 'in-person' && mtg.isTeamsMeeting) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = mtg.title.toLowerCase().includes(q);
        const matchLead = mtg.leadName.toLowerCase().includes(q);
        const matchNotes = (mtg.notes || '').toLowerCase().includes(q);
        if (!matchTitle && !matchLead && !matchNotes) return false;
      }
      return true;
    });
  }, [meetings, statusFilter, typeFilter, searchQuery]);

  // Selected Date Meetings
  const selectedDateMeetings = useMemo(() => {
    return filteredMeetings.filter((m) => m.date === selectedDateStr);
  }, [filteredMeetings, selectedDateStr]);

  // Calendar Month Grid Generator
  const monthCalendarGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous Month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const pDay = daysInPrevMonth - i;
      const prevMonthDate = new Date(year, month - 1, pDay);
      const dateStr = prevMonthDate.toISOString().slice(0, 10);
      days.push({
        dayNumber: pDay,
        dateStr,
        isCurrentMonth: false,
        isToday: false,
        dateObj: prevMonthDate,
      });
    }

    // Current Month days
    const todayStr = new Date(2026, 7, 7).toISOString().slice(0, 10);
    for (let d = 1; d <= daysInMonth; d++) {
      const cDate = new Date(year, month, d);
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        dateObj: cDate,
      });
    }

    // Next Month padding to fill 35 or 42 cells
    const remainingCells = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let n = 1; n <= remainingCells; n++) {
      const nextMonthDate = new Date(year, month + 1, n);
      const dateStr = nextMonthDate.toISOString().slice(0, 10);
      days.push({
        dayNumber: n,
        dateStr,
        isCurrentMonth: false,
        isToday: false,
        dateObj: nextMonthDate,
      });
    }

    return days;
  }, [currentDate]);

  // Week View Days Generator
  const weekDaysList = useMemo(() => {
    const curr = new Date(selectedDateStr);
    const dayOfWeek = curr.getDay(); // 0 = Sun
    const sunday = new Date(curr);
    sunday.setDate(curr.getDate() - dayOfWeek);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      week.push({
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        dateStr,
        isToday: dateStr === new Date(2026, 7, 7).toISOString().slice(0, 10),
      });
    }
    return week;
  }, [selectedDateStr]);

  const monthNameYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Top Banner Header & Sync Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-black text-navy-900 tracking-tight">
                Calendar & Microsoft Teams Meetings
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-purple-700" />
                M365 Graph Sync
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Synchronized in real-time with Microsoft 365 Outlook Calendar & Microsoft Teams Video Conference API.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSyncM365Calendar}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-extrabold cursor-pointer transition-all"
            >
              <RefreshCw className="h-4 w-4 text-purple-700" />
              Sync Outlook Calendar
            </button>

            <button
              type="button"
              onClick={() => onOpenScheduleModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-sm cursor-pointer transition-transform active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Schedule Teams Meeting
            </button>
          </div>
        </div>

        {/* Calendar View Switcher & Month Navigation Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
          {/* Month / Date Nav */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <h2 className="text-base font-black text-navy-900 min-w-40 text-center font-sans">
              {monthNameYear}
            </h2>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy-900 text-xs font-bold border border-slate-200 cursor-pointer ml-1"
            >
              Today
            </button>
          </div>

          {/* View Mode Buttons */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
            <button
              type="button"
              onClick={() => setDisplayMode('month')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                displayMode === 'month' ? 'bg-white text-navy-900 shadow-2xs font-extrabold' : 'hover:text-navy-900'
              }`}
            >
              Month Grid
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('week')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                displayMode === 'week' ? 'bg-white text-navy-900 shadow-2xs font-extrabold' : 'hover:text-navy-900'
              }`}
            >
              Week View
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('day')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                displayMode === 'day' ? 'bg-white text-navy-900 shadow-2xs font-extrabold' : 'hover:text-navy-900'
              }`}
            >
              Day Schedule
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('agenda')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                displayMode === 'agenda' ? 'bg-white text-navy-900 shadow-2xs font-extrabold' : 'hover:text-navy-900'
              }`}
            >
              Agenda List
            </button>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <label htmlFor="calendar-search-input" className="sr-only">Search meetings</label>
          <input
            id="calendar-search-input"
            name="searchQuery"
            aria-label="Search meetings by lead, title, or agenda"
            type="text"
            placeholder="Search meetings by lead, title, or agenda..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-slate-50 font-medium"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Status Filter */}
          <label htmlFor="calendar-status-filter" className="sr-only">Filter by status</label>
          <select
            id="calendar-status-filter"
            name="statusFilter"
            aria-label="Filter by meeting status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold text-navy-900 focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
          >
            <option value="All">All Statuses ({meetings.length})</option>
            <option value="Scheduled">📅 Scheduled</option>
            <option value="Completed">✅ Completed</option>
            <option value="Cancelled">❌ Cancelled</option>
          </select>

          {/* Type Filter */}
          <label htmlFor="calendar-type-filter" className="sr-only">Filter by type</label>
          <select
            id="calendar-type-filter"
            name="typeFilter"
            aria-label="Filter by meeting type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold text-navy-900 focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
          >
            <option value="All">All Meeting Types</option>
            <option value="teams">📹 Microsoft Teams Call</option>
            <option value="in-person">🏢 In-Person / Phone</option>
          </select>
        </div>
      </div>

      {/* MAIN CALENDAR DISPLAY RENDERER */}
      {displayMode === 'month' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          {/* Day Headers (Sun-Sat) */}
          <div className="grid grid-cols-7 gap-1 text-center font-black text-xs text-slate-500 border-b border-slate-100 pb-2">
            <span>SUN</span>
            <span>MON</span>
            <span>TUE</span>
            <span>WED</span>
            <span>THU</span>
            <span>FRI</span>
            <span>SAT</span>
          </div>

          {/* Month Cells Grid */}
          <div className="grid grid-cols-7 gap-2">
            {monthCalendarGrid.map((cell, idx) => {
              const cellMeetings = filteredMeetings.filter((m) => m.date === cell.dateStr);
              const isSelected = cell.dateStr === selectedDateStr;

              return (
                <div
                  key={`${cell.dateStr}-${idx}`}
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  className={`min-h-28 p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-500 shadow-xs'
                      : cell.isCurrentMonth
                      ? 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                      : 'border-slate-100 bg-slate-50/20 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black h-6 w-6 rounded-full flex items-center justify-center ${
                        cell.isToday
                          ? 'bg-purple-600 text-white font-extrabold'
                          : cell.isCurrentMonth
                          ? 'text-navy-900'
                          : 'text-slate-300'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {cellMeetings.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                        {cellMeetings.length} {cellMeetings.length === 1 ? 'call' : 'calls'}
                      </span>
                    )}
                  </div>

                  {/* Meeting Chips in Cell */}
                  <div className="space-y-1 mt-1 max-h-16 overflow-y-auto pr-0.5">
                    {cellMeetings.slice(0, 2).map((mtg) => (
                      <div
                        key={mtg.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDateStr(cell.dateStr);
                          if (mtg.isTeamsMeeting) {
                            handleLaunchTeamsRoom(mtg);
                          }
                        }}
                        className={`p-1.5 rounded-lg text-[10px] font-bold truncate flex items-center gap-1 cursor-pointer transition-transform hover:scale-98 ${
                          mtg.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : mtg.status === 'Cancelled'
                            ? 'bg-red-50 text-red-700 border border-red-200 line-through'
                            : 'bg-purple-900 text-gold-300 border border-purple-800'
                        }`}
                        title={`${mtg.title} (${mtg.time})`}
                      >
                        <Video className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{mtg.time} {mtg.leadName}</span>
                      </div>
                    ))}

                    {cellMeetings.length > 2 && (
                      <span className="text-[9px] font-extrabold text-purple-700 block text-right">
                        +{cellMeetings.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW DISPLAY */}
      {displayMode === 'week' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {weekDaysList.map((day) => {
              const dayMtgs = filteredMeetings.filter((m) => m.date === day.dateStr);
              const isSelected = day.dateStr === selectedDateStr;

              return (
                <div
                  key={day.dateStr}
                  onClick={() => setSelectedDateStr(day.dateStr)}
                  className={`p-3 rounded-2xl border min-h-80 cursor-pointer transition-all space-y-3 ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-500'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-center border-b border-slate-200/80 pb-2">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 block">
                      {day.dayName}
                    </span>
                    <span
                      className={`text-lg font-black inline-block mt-0.5 ${
                        day.isToday ? 'text-purple-600' : 'text-navy-900'
                      }`}
                    >
                      {day.dayNum}
                    </span>
                  </div>

                  {/* Day Meetings List */}
                  <div className="space-y-2">
                    {dayMtgs.length > 0 ? (
                      dayMtgs.map((mtg) => (
                        <div
                          key={mtg.id}
                          className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="font-mono text-purple-700">{mtg.time}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] ${
                                mtg.status === 'Completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {mtg.status}
                            </span>
                          </div>

                          <div className="font-extrabold text-navy-900 text-xs truncate">
                            {mtg.title}
                          </div>
                          <div className="text-[11px] text-slate-600 truncate">{mtg.leadName}</div>

                          <button
                            type="button"
                            onClick={() => handleLaunchTeamsRoom(mtg)}
                            className="w-full mt-1 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Video className="h-3 w-3" />
                            Teams Room
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-400 text-[11px] font-medium">
                        No events
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DAY SCHEDULE & SELECTED DATE DETAILED EVENT PANEL */}
      {(displayMode === 'day' || displayMode === 'month') && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-navy-900 text-base flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                Schedule for {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </h3>
              <p className="text-xs text-slate-500">
                {selectedDateMeetings.length} event(s) scheduled for this date.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenScheduleModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-2xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Schedule Event for Date
            </button>
          </div>

          <div className="space-y-3">
            {selectedDateMeetings.length > 0 ? (
              selectedDateMeetings.map((mtg) => (
                <div
                  key={mtg.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-purple-300 transition-all shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                          <Video className="h-4 w-4" />
                        </span>
                        <h4 className="font-extrabold text-navy-900 text-base">{mtg.title}</h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          {mtg.leadName}
                        </span>
                        <span>•</span>
                        <span>{mtg.durationMinutes} mins</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-purple-950 text-gold-300 px-3 py-1.5 rounded-xl border border-purple-800">
                        {mtg.time}
                      </span>

                      <span
                        className={`font-extrabold text-xs px-2.5 py-1 rounded-xl border ${
                          mtg.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : mtg.status === 'Cancelled'
                            ? 'bg-red-100 text-red-800 border-red-300 line-through'
                            : 'bg-purple-100 text-purple-900 border-purple-200'
                        }`}
                      >
                        {mtg.status}
                      </span>
                    </div>
                  </div>

                  {mtg.notes && (
                    <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200/80">
                      {mtg.notes}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/80 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyTeamsUrl(mtg)}
                        className="inline-flex items-center gap-1 text-slate-700 hover:text-navy-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-200 font-bold text-[11px] cursor-pointer"
                      >
                        {copiedMeetingId === mtg.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
                        {copiedMeetingId === mtg.id ? 'Copied Teams Link!' : 'Copy Join Link'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(mtg)}
                        className="inline-flex items-center gap-1 text-slate-700 hover:text-navy-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-200 font-bold text-[11px] cursor-pointer"
                      >
                        <Edit className="h-3.5 w-3.5 text-slate-500" />
                        Reschedule / Edit
                      </button>

                      {mtg.status !== 'Completed' && (
                        <button
                          type="button"
                          onClick={() => handleMarkCompleted(mtg)}
                          className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 font-bold text-[11px] cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Mark Completed
                        </button>
                      )}

                      {mtg.status !== 'Cancelled' && (
                        <button
                          type="button"
                          onClick={() => handleCancelMeeting(mtg)}
                          className="inline-flex items-center gap-1 text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 font-bold text-[11px] cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5 text-red-600" />
                          Cancel
                        </button>
                      )}
                    </div>

                    {mtg.isTeamsMeeting && mtg.status !== 'Cancelled' && (
                      <button
                        type="button"
                        onClick={() => handleLaunchTeamsRoom(mtg)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-xs cursor-pointer transition-transform active:scale-95"
                      >
                        <Video className="h-3.5 w-3.5" />
                        Join Microsoft Teams Video Call
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-slate-500 space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CalendarIcon className="h-10 w-10 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700">No events scheduled for {selectedDateStr}</p>
                <p className="text-xs text-slate-400">Click "Schedule Event for Date" to add a new call.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AGENDA ALL MEETINGS LIST VIEW */}
      {displayMode === 'agenda' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-navy-900 text-base">
              Full Agenda & Scheduled Meetings ({filteredMeetings.length})
            </h3>
            <span className="text-xs text-slate-500 font-bold">
              Sorted Chronologically
            </span>
          </div>

          <div className="space-y-3">
            {filteredMeetings.map((mtg) => (
              <div
                key={mtg.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white transition-all space-y-2"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-xl bg-purple-100 text-purple-700 font-bold">
                      <Video className="h-4 w-4" />
                    </span>
                    <div>
                      <h4 className="font-extrabold text-navy-900 text-sm">{mtg.title}</h4>
                      <p className="text-xs text-slate-600">{mtg.leadName} ({mtg.leadEmail || 'N/A'})</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold bg-navy-950 text-gold-300 px-3 py-1 rounded-xl">
                      {mtg.date} at {mtg.time}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleLaunchTeamsRoom(mtg)}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Video className="h-3.5 w-3.5" />
                      Teams Room
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MICROSOFT TEAMS VIDEO CALL ROOM SIMULATOR OVERLAY */}
      {activeTeamsRoomMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/90 backdrop-blur-md p-2 sm:p-6 overflow-hidden">
          <div className="bg-navy-900 border border-navy-700 rounded-3xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden text-white relative">
            {/* Teams Room Top Header Bar */}
            <div className="p-4 bg-navy-950 border-b border-navy-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-900/80 text-gold-400 border border-purple-700">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-white text-base">
                      {activeTeamsRoomMeeting.title}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1 font-mono">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      LIVE ({formattedCallTime})
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium">
                    Microsoft Teams Sales Call with {activeTeamsRoomMeeting.leadName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTeamsChatTab(teamsChatTab === 'notes' ? 'chat' : 'notes')}
                  className="px-3 py-1.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-navy-700 cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4 text-purple-400" />
                  {teamsChatTab === 'notes' ? 'Teams Live Chat' : 'AI Call Notes'}
                </button>

                <button
                  type="button"
                  onClick={handleEndTeamsCall}
                  className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Phone className="h-4 w-4 rotate-[135deg]" />
                  End Call & Save
                </button>
              </div>
            </div>

            {/* Teams Video Grid & Side Drawer */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden bg-navy-950">
              {/* Left 2 Cols: Video Stream Simulation */}
              <div className="lg:col-span-2 p-4 flex flex-col justify-between relative bg-slate-950/80">
                {/* Main Participant Video Stage */}
                <div className="flex-1 bg-navy-900 rounded-2xl border border-navy-800 overflow-hidden relative flex items-center justify-center">
                  {isVideoOn ? (
                    <div className="text-center space-y-4 p-6">
                      <div className="h-28 w-28 rounded-full bg-gradient-to-tr from-purple-600 to-gold-400 mx-auto flex items-center justify-center text-4xl font-black text-navy-950 shadow-xl border-4 border-gold-400/30 animate-pulse">
                        {activeTeamsRoomMeeting.leadName.charAt(0)}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-white text-lg">{activeTeamsRoomMeeting.leadName}</h4>
                        <p className="text-xs text-purple-300 font-mono">Connected via Microsoft Teams Video (720p HD)</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 space-y-2">
                      <VideoOff className="h-12 w-12 mx-auto text-slate-600" />
                      <p className="text-xs font-bold">Camera Turned Off</p>
                    </div>
                  )}

                  {/* Active Speaker Badge */}
                  <div className="absolute bottom-4 left-4 bg-navy-950/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-navy-800 flex items-center gap-2 text-xs font-bold text-white">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>{activeTeamsRoomMeeting.leadName} (Active Speaker)</span>
                  </div>

                  {/* User PiP Avatar */}
                  <div className="absolute top-4 right-4 h-24 w-32 bg-navy-950 rounded-xl border border-purple-500/50 overflow-hidden flex items-center justify-center shadow-lg">
                    <div className="text-center">
                      <div className="h-10 w-10 rounded-full bg-gold-500 text-navy-950 font-black text-sm flex items-center justify-center mx-auto">
                        SS
                      </div>
                      <span className="text-[10px] text-slate-300 font-bold block mt-1">Sanelisiwe (You)</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Video Controls Bar */}
                <div className="mt-4 p-3 bg-navy-900/90 rounded-2xl border border-navy-800 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsMicOn(!isMicOn)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      isMicOn ? 'bg-navy-800 text-white hover:bg-navy-700' : 'bg-red-600 text-white'
                    }`}
                    title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
                  >
                    {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsVideoOn(!isVideoOn)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      isVideoOn ? 'bg-navy-800 text-white hover:bg-navy-700' : 'bg-red-600 text-white'
                    }`}
                    title={isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'}
                  >
                    {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsScreenSharing(!isScreenSharing)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      isScreenSharing ? 'bg-purple-600 text-white' : 'bg-navy-800 text-white hover:bg-navy-700'
                    }`}
                    title="Share Screen"
                  >
                    <Monitor className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsHandRaised(!isHandRaised)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      isHandRaised ? 'bg-gold-500 text-navy-950' : 'bg-navy-800 text-white hover:bg-navy-700'
                    }`}
                    title="Raise Hand"
                  >
                    <Hand className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Right Col: Teams Side Drawer (Call Notes & Chat) */}
              <div className="p-4 bg-navy-900 border-l border-navy-800 flex flex-col justify-between overflow-hidden">
                {teamsChatTab === 'notes' ? (
                  <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-navy-800 pb-2">
                      <span className="text-xs font-black text-gold-400 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-gold-400" />
                        AI Call Notes & Summary
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">Auto-Saving to CRM</span>
                    </div>

                    <p className="text-[11px] text-slate-300">
                      Type call notes or action items below. They will be logged directly to the lead timeline when you end the call.
                    </p>

                    <label htmlFor="incall-notes" className="sr-only">In-Call Notes</label>
                    <textarea
                      id="incall-notes"
                      name="callNotesText"
                      aria-label="Record call key takeaways and action items"
                      rows={12}
                      value={callNotesText}
                      onChange={(e) => setCallNotesText(e.target.value)}
                      placeholder="Record call key takeaways, action items, next steps..."
                      className="w-full flex-1 p-3 rounded-xl bg-navy-950 border border-navy-700 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono resize-none"
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-navy-800 pb-2">
                      <span className="text-xs font-black text-purple-400 flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4 text-purple-400" />
                        Teams In-Call Chat
                      </span>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                      {teamsChatMessages.map((msg, index) => (
                        <div key={index} className="p-2.5 rounded-xl bg-navy-950 border border-navy-800 space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-gold-400">
                            <span>{msg.sender}</span>
                            <span className="text-slate-500">{msg.time}</span>
                          </div>
                          <p className="text-slate-200 text-xs">{msg.text}</p>
                        </div>
                      ))}
                    </div>

                    {/* Chat Input */}
                    <form onSubmit={handleSendTeamsChatMessage} className="flex items-center gap-2 pt-2">
                      <label htmlFor="incall-chat-msg" className="sr-only">In-Call Chat Message</label>
                      <input
                        id="incall-chat-msg"
                        name="newChatMessage"
                        aria-label="Type a Teams chat message"
                        type="text"
                        placeholder="Type a message..."
                        value={newChatMessage}
                        onChange={(e) => setNewChatMessage(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-navy-950 border border-navy-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="submit"
                        className="p-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT / RESCHEDULE MEETING MODAL */}
      {editingMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="bg-navy-900 text-white p-5 flex items-center justify-between border-b border-navy-700">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-gold-400" />
                <h3 className="font-bold text-lg text-gold-400">Reschedule & Edit Meeting</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingMeeting(null)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-navy-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMeetingEdit} className="p-6 space-y-4 text-sm text-slate-700">
              <div>
                <label htmlFor="edit-meeting-title" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Meeting Title
                </label>
                <input
                  id="edit-meeting-title"
                  name="editTitle"
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold-400 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="edit-meeting-date" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Date
                  </label>
                  <input
                    id="edit-meeting-date"
                    name="editDate"
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs"
                  />
                </div>

                <div>
                  <label htmlFor="edit-meeting-time" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Time
                  </label>
                  <input
                    id="edit-meeting-time"
                    name="editTime"
                    type="time"
                    required
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs"
                  />
                </div>

                <div>
                  <label htmlFor="edit-meeting-duration" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Duration
                  </label>
                  <select
                    id="edit-meeting-duration"
                    name="editDuration"
                    value={editDuration}
                    onChange={(e) => setEditDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value={15}>15 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>60 mins</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="edit-meeting-notes" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Meeting Notes / Agenda
                </label>
                <textarea
                  id="edit-meeting-notes"
                  name="editNotes"
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-medium"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMeeting(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
