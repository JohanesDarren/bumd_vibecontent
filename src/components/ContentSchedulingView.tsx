import React, { useState, useMemo, useCallback } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Filter,
  Grid3X3,
  Eye,
  Move,
  Info,
  Clock,
  CalendarDays,
  Sparkles,
  ArrowUpRight,
  X,
  Check
} from 'lucide-react';
import type { ContentDraft, Workspace } from '../types';

/* ─── Types ─── */
type ScheduleStatus = 'draft' | 'scheduled' | 'published';
type Platform = 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'youtube';

interface ScheduledContent {
  id: string;
  title: string;
  thumbnail: string;
  platform: Platform;
  status: ScheduleStatus;
  date: string; // ISO date string YYYY-MM-DD
  time: string; // HH:mm
}

interface ContentSchedulingViewProps {
  drafts: ContentDraft[];
  activeWorkspace: Workspace;
}

/* ─── Mini SVG Social Icons ─── */
const IgIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const FbIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const TwIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const LiIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const YtIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

/* ─── Helper data ─── */
const DAYS_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
  instagram: <IgIcon size={12} />,
  facebook: <FbIcon size={12} />,
  twitter: <TwIcon size={12} />,
  linkedin: <LiIcon size={12} />,
  youtube: <YtIcon size={12} />,
};

const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: '#E1306C',
  facebook: '#1877F2',
  twitter: '#1DA1F2',
  linkedin: '#0A66C2',
  youtube: '#FF0000',
};

const STATUS_COLORS: Record<ScheduleStatus, { bg: string; border: string; text: string; label: string }> = {
  draft: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', text: '#fbbf24', label: 'Draft' },
  scheduled: { bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)', text: '#38bdf8', label: 'Scheduled' },
  published: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', text: '#34d399', label: 'Published' },
};

const SAMPLE_THUMBNAILS = [
  'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1560264280-88b68371db39?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1553484771-047a44eee27b?auto=format&fit=crop&w=200&q=80',
];

function generateMockSchedule(year: number, month: number): ScheduledContent[] {
  const titles = [
    'Promo Layanan Air Bersih', 'Info Tarif Baru Q4', 'Tips Hemat Air Harian',
    'Event Peduli Lingkungan', 'Kampanye Sambungan Baru', 'Laporan Kualitas Air',
    'CSR Tandon Air Gratis', 'Edukasi Sanitasi Sehat', 'Behind the Scenes WTP',
    'Testimoni Pelanggan', 'Infografis Distribusi', 'Reels: Proses Filtrasi',
    'Story: Hari Air Sedunia', 'Poster Digital Inovasi', 'FAQ Layanan Pelanggan',
    'Reminder Bayar Tagihan', 'Workshop Sanitasi Warga', 'Partnership Highlight',
  ];
  const platforms: Platform[] = ['instagram', 'facebook', 'twitter', 'linkedin', 'youtube'];
  const statuses: ScheduleStatus[] = ['draft', 'scheduled', 'published'];
  const items: ScheduledContent[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < 18; i++) {
    const day = Math.floor(Math.random() * daysInMonth) + 1;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    items.push({
      id: `sc-${i}-${Date.now()}`,
      title: titles[i % titles.length],
      thumbnail: SAMPLE_THUMBNAILS[i % SAMPLE_THUMBNAILS.length],
      platform: platforms[i % platforms.length],
      status: day < 15 ? statuses[2] : (day < 22 ? statuses[1] : statuses[0]),
      date: dateStr,
      time: `${String(8 + Math.floor(Math.random() * 12)).padStart(2, '0')}:${Math.random() > 0.5 ? '00' : '30'}`,
    });
  }
  return items;
}

/* ─── Calendar Helpers ─── */
function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const startIdx = firstDay === 0 ? 6 : firstDay - 1; // Monday-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];

  // Previous month padding
  for (let i = startIdx - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day: d, isCurrentMonth: false, dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isCurrentMonth: true, dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
  }

  // Next month padding
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ day: d, isCurrentMonth: false, dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
  }

  return cells;
}

/* ─── Component ─── */
export const ContentSchedulingView: React.FC<ContentSchedulingViewProps> = ({
  activeWorkspace,
}) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ScheduleStatus | 'all'>('all');
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<ScheduledContent | null>(null);

  // Generate schedule data
  const [schedule, setSchedule] = useState<ScheduledContent[]>(() => generateMockSchedule(viewYear, viewMonth));

  // Regenerate schedule when month changes
  const handleMonthChange = useCallback((delta: number) => {
    let newMonth = viewMonth + delta;
    let newYear = viewYear;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    if (newMonth > 11) { newMonth = 0; newYear++; }
    setViewMonth(newMonth);
    setViewYear(newYear);
    setSchedule(generateMockSchedule(newYear, newMonth));
  }, [viewMonth, viewYear]);

  // Calendar grid
  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  // Filtered schedule
  const filteredSchedule = useMemo(() => {
    return schedule.filter(item => {
      if (filterPlatform !== 'all' && item.platform !== filterPlatform) return false;
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      return true;
    });
  }, [schedule, filterPlatform, filterStatus]);

  // Contents grouped by date
  const contentByDate = useMemo(() => {
    const map: Record<string, ScheduledContent[]> = {};
    filteredSchedule.forEach(item => {
      if (!map[item.date]) map[item.date] = [];
      map[item.date].push(item);
    });
    return map;
  }, [filteredSchedule]);

  // Instagram grid items (scheduled + published only)
  const instagramGrid = useMemo(() => {
    return schedule
      .filter(item => item.platform === 'instagram' && (item.status === 'scheduled' || item.status === 'published'))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 9);
  }, [schedule]);

  // Today string
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Drag handlers
  const handleDragStart = (cardId: string) => {
    setDraggedCard(cardId);
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDragOverDate(dateStr);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    if (draggedCard) {
      setSchedule(prev => prev.map(item =>
        item.id === draggedCard ? { ...item, date: targetDate } : item
      ));
    }
    setDraggedCard(null);
    setDragOverDate(null);
  };

  // Stats
  const draftCount = schedule.filter(s => s.status === 'draft').length;
  const scheduledCount = schedule.filter(s => s.status === 'scheduled').length;
  const publishedCount = schedule.filter(s => s.status === 'published').length;

  return (
    <div className="scheduling-container">
      {/* ── Page Header ── */}
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)' }}>
              {activeWorkspace.code} • Scheduling
            </span>
          </div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CalendarDays size={28} style={{ color: 'var(--primary)' }} />
            Content Scheduling
          </h2>
          <p className="page-subtitle">
            Plan content publication visually. Drag content cards between dates to reschedule, and monitor your Instagram feed aesthetics in real time.
          </p>
        </div>
      </div>

      {/* ── Action Bar ── */}
      <div className="scheduling-action-bar">
        <button className="btn btn-primary scheduling-add-btn" onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          <span>Add New Schedule</span>

        </button>

        <div className="scheduling-filters">
          <div className="filter-group">
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <select
              className="scheduling-filter-select"
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value as Platform | 'all')}
            >
              <option value="all">All Platforms</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="twitter">Twitter / X</option>
              <option value="linkedin">LinkedIn</option>
              <option value="youtube">YouTube</option>
            </select>
          </div>
          <div className="filter-group">
            <select
              className="scheduling-filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ScheduleStatus | 'all')}
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        {/* Stats pills */}
        <div className="scheduling-stats">
          <div className="stat-pill" style={{ background: STATUS_COLORS.draft.bg, borderColor: STATUS_COLORS.draft.border }}>
            <span className="stat-dot" style={{ background: STATUS_COLORS.draft.text }} />
            <span style={{ color: STATUS_COLORS.draft.text }}>{draftCount} Draft</span>
          </div>
          <div className="stat-pill" style={{ background: STATUS_COLORS.scheduled.bg, borderColor: STATUS_COLORS.scheduled.border }}>
            <span className="stat-dot" style={{ background: STATUS_COLORS.scheduled.text }} />
            <span style={{ color: STATUS_COLORS.scheduled.text }}>{scheduledCount} Scheduled</span>
          </div>
          <div className="stat-pill" style={{ background: STATUS_COLORS.published.bg, borderColor: STATUS_COLORS.published.border }}>
            <span className="stat-dot" style={{ background: STATUS_COLORS.published.text }} />
            <span style={{ color: STATUS_COLORS.published.text }}>{publishedCount} Published</span>
          </div>
        </div>
      </div>

      {/* ── Main Grid: Calendar + Sidebar ── */}
      <div className="scheduling-main-grid">

        {/* ── Calendar Section ── */}
        <div className="scheduling-calendar-section">
          {/* Calendar Header */}
          <div className="calendar-header-bar">
            <button className="cal-nav-btn" onClick={() => handleMonthChange(-1)}>
              <ChevronLeft size={20} />
            </button>
            <div className="cal-month-title">
              <span className="cal-month-name">{MONTHS[viewMonth]}</span>
              <span className="cal-year">{viewYear}</span>
            </div>
            <button className="cal-nav-btn" onClick={() => handleMonthChange(1)}>
              <ChevronRight size={20} />
            </button>
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => {
                setViewMonth(today.getMonth());
                setViewYear(today.getFullYear());
                setSchedule(generateMockSchedule(today.getFullYear(), today.getMonth()));
              }}
            >
              Today
            </button>
          </div>

          {/* Drag hint */}
          <div className="drag-hint-bar">
            <Move size={14} />
            <span>Drag content cards to another date to reschedule — changes automatically update the Visual Grid Preview</span>
          </div>

          {/* Day headers */}
          <div className="cal-day-headers">
            {DAYS_ABBR.map(day => (
              <div key={day} className="cal-day-header">{day}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="cal-grid">
            {calendarDays.map((cell, idx) => {
              const items = contentByDate[cell.dateStr] || [];
              const isToday = cell.dateStr === todayStr;
              const isDragOver = dragOverDate === cell.dateStr;

              return (
                <div
                  key={idx}
                  className={`cal-cell ${!cell.isCurrentMonth ? 'cal-cell-dim' : ''} ${isToday ? 'cal-cell-today' : ''} ${isDragOver ? 'cal-cell-drag-over' : ''}`}
                  onDragOver={(e) => handleDragOver(e, cell.dateStr)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, cell.dateStr)}
                >
                  <div className="cal-cell-header">
                    <span className={`cal-day-num ${isToday ? 'cal-day-today' : ''}`}>{cell.day}</span>
                    {items.length > 0 && (
                      <span className="cal-item-count">{items.length}</span>
                    )}
                  </div>
                  <div className="cal-cell-content">
                    {items.slice(0, 3).map(item => (
                      <div
                        key={item.id}
                        className={`content-card ${draggedCard === item.id ? 'content-card-dragging' : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(item.id)}
                        onClick={() => setSelectedCard(item)}
                        title={`${item.title} — ${STATUS_COLORS[item.status].label}`}
                      >
                        <div className="content-card-grip">
                          <GripVertical size={10} />
                        </div>
                        <div
                          className="content-card-thumb"
                          style={{ backgroundImage: `url(${item.thumbnail})` }}
                        />
                        <div className="content-card-info">
                          <span className="content-card-title">{item.title}</span>
                          <div className="content-card-meta">
                            <span
                              className="content-card-platform"
                              style={{ color: PLATFORM_COLORS[item.platform] }}
                            >
                              {PLATFORM_ICONS[item.platform]}
                            </span>
                            <span
                              className="content-card-status-dot"
                              style={{ background: STATUS_COLORS[item.status].text }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <div className="cal-more-indicator">+{items.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Sidebar: Visual Grid Preview ── */}
        <div className="scheduling-sidebar">
          <div className="sidebar-preview-panel">
            <div className="sidebar-preview-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Grid3X3 size={18} style={{ color: 'var(--accent-cyan)' }} />
                <span className="sidebar-preview-title">Visual Grid Preview</span>
              </div>
              <span className="sidebar-preview-badge">
                <IgIcon size={12} /> Instagram Feed
              </span>
            </div>

            <p className="sidebar-preview-desc">
              Preview of your Instagram feed grid layout. Scheduled and published content appears here.
            </p>

            {/* Instagram-style profile header */}
            <div className="ig-profile-header">
              <div className="ig-avatar" style={{ background: `linear-gradient(135deg, ${activeWorkspace.primaryColor}, ${activeWorkspace.accentColor})` }}>
                {activeWorkspace.code.charAt(0)}
              </div>
              <div className="ig-profile-info">
                <span className="ig-username">@{activeWorkspace.code.toLowerCase().replace('-', '_')}</span>
                <span className="ig-bio">{activeWorkspace.tagline}</span>
              </div>
            </div>

            {/* 3-column grid */}
            <div className="ig-grid">
              {instagramGrid.length === 0 && (
                <div className="ig-grid-empty">
                  <Eye size={24} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                  <span>No Instagram content scheduled for this month yet</span>
                </div>
              )}
              {instagramGrid.map((item, i) => (
                <div
                  key={item.id}
                  className="ig-grid-cell"
                  style={{ animationDelay: `${i * 60}ms` }}
                  onClick={() => setSelectedCard(item)}
                >
                  <img src={item.thumbnail} alt={item.title} className="ig-grid-img" />
                  <div className="ig-grid-overlay">
                    <span className="ig-grid-title">{item.title}</span>
                    <span
                      className="ig-grid-status"
                      style={{ background: STATUS_COLORS[item.status].bg, color: STATUS_COLORS[item.status].text, border: `1px solid ${STATUS_COLORS[item.status].border}` }}
                    >
                      {STATUS_COLORS[item.status].label}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Feed aesthetics hint */}
            <div className="ig-aesthetics-hint">
              <Info size={14} />
              <span>Drag content on the calendar to change its order in this grid. Keep the visual variety consistent!</span>
            </div>
          </div>

          {/* Legend */}
          <div className="sidebar-legend-panel">
            <span className="sidebar-legend-title">Status Legend</span>
            <div className="legend-items">
              {Object.entries(STATUS_COLORS).map(([key, val]) => (
                <div key={key} className="legend-item">
                  <span className="legend-dot" style={{ background: val.text, boxShadow: `0 0 6px ${val.text}` }} />
                  <span>{val.label}</span>
                </div>
              ))}
            </div>
            <span className="sidebar-legend-title" style={{ marginTop: '12px' }}>Platform</span>
            <div className="legend-items">
              {Object.entries(PLATFORM_COLORS).map(([key, color]) => (
                <div key={key} className="legend-item">
                  <span style={{ color, display: 'flex', alignItems: 'center' }}>
                    {PLATFORM_ICONS[key as Platform]}
                  </span>
                  <span style={{ textTransform: 'capitalize' }}>{key}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Schedule Modal ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                <CalendarDays size={20} style={{ marginRight: '8px', color: 'var(--primary)', verticalAlign: 'middle' }} />
                Add New Schedule
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowAddModal(false)} style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Content Title</label>
                <input className="form-input" placeholder="e.g.: New Connection Discount Promotion" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Platform</label>
                  <select className="form-select">
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="twitter">Twitter / X</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Initial Status</label>
                  <select className="form-select">
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Publication Date</label>
                  <input className="form-input" type="date" />
                </div>
                <div className="form-group">
                  <label className="form-label">Time</label>
                  <input className="form-input" type="time" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <textarea className="form-textarea" placeholder="Add a note or short brief for this content..." rows={3} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => setShowAddModal(false)}>
                <Check size={16} />
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Card Detail Popover ── */}
      {selectedCard && (
        <div className="modal-overlay" onClick={() => setSelectedCard(null)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '0', overflow: 'hidden', borderBottom: 'none' }}>
              <img
                src={selectedCard.thumbnail}
                alt={selectedCard.title}
                style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '20px 20px 0 0' }}
              />
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{selectedCard.title}</h3>
                <button className="btn btn-sm btn-secondary" onClick={() => setSelectedCard(null)} style={{ padding: '6px' }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <span
                  className="status-pill"
                  style={{
                    background: STATUS_COLORS[selectedCard.status].bg,
                    color: STATUS_COLORS[selectedCard.status].text,
                    border: `1px solid ${STATUS_COLORS[selectedCard.status].border}`,
                  }}
                >
                  {STATUS_COLORS[selectedCard.status].label}
                </span>
                <span
                  className="status-pill"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: PLATFORM_COLORS[selectedCard.platform],
                    border: `1px solid ${PLATFORM_COLORS[selectedCard.platform]}40`,
                    gap: '4px'
                  }}
                >
                  {PLATFORM_ICONS[selectedCard.platform]}
                  <span style={{ textTransform: 'capitalize' }}>{selectedCard.platform}</span>
                </span>
              </div>
              <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CalendarDays size={14} /> {selectedCard.date}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} /> {selectedCard.time}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedCard(null)}>Close</button>
              <button className="btn btn-primary">
                <ArrowUpRight size={16} />
                Open in Editor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
