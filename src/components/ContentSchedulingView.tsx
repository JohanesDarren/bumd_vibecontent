import React, { useState, useMemo, useEffect } from 'react';
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
  ArrowUpRight,
  X,
  Check,
  Trash2,
  Pencil,
  AlertTriangle,
  Sparkles,
  Inbox,
  ExternalLink,
  FileWarning,
  Bell,
  Star,
  CheckCircle2,
  RefreshCw,
  Upload,
  ImageOff,
  Wand2
} from 'lucide-react';
import type {
  ContentDraft,
  KnowledgeDocument,
  Workspace,
  ScheduleStatus,
  SchedulePlatform as Platform,
  SchedulePillar,
  ScheduledContent
} from '../types';
import { apiService, type PlanSlot } from '../services/apiService';
import { ContentPlanModal } from './ContentPlanModal';
import { ScheduleCover } from './ScheduleCover';
import { STATUS_LABELS as DRAFT_STATUS_LABELS } from '../services/labels';
import { sanitizeRagAnswer } from '../services/ragEngine';
import { normalizeHexColor } from '../services/visualScene';
import {
  CAPTION_STYLE,
  PILLARS,
  SUGGESTED_TIME,
  addDays,
  currentVersion,
  emptyFutureDates,
  factConflicts,
  momentsInMonth,
  weakPillars,
  isOverdue as isOverdueAt,
  pad2,
  parseDateStr,
  startOfWeek,
  toDateStr
} from '../services/scheduling';

interface ContentSchedulingViewProps {
  drafts: ContentDraft[];
  documents: KnowledgeDocument[];
  activeWorkspace: Workspace;
  onOpenEditorDraft?: (draftId: string) => void;
  readOnly?: boolean;
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
const DAYS_ABBR = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const ALL_PLATFORMS: Platform[] = ['instagram', 'facebook', 'twitter', 'linkedin', 'youtube'];

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

const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'X (Twitter)',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
};

const STATUS_COLORS: Record<ScheduleStatus, { bg: string; border: string; text: string; label: string }> = {
  draft: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', text: '#fbbf24', label: 'Draf' },
  scheduled: { bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)', text: '#38bdf8', label: 'Terjadwal' },
  published: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', text: '#34d399', label: 'Terbit' },
};

const DANGER = '#ef4444';
const WARN = '#f59e0b';
const alertBox = (color: string): React.CSSProperties => ({
  display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '10px 12px', borderRadius: '8px',
  background: `${color}14`, border: `1px solid ${color}59`, color, fontSize: '0.82rem'
});

const isPostUrl = (value: string) => /^https?:\/\/\S+$/.test(value.trim());

/** "Jumat, 9 Oktober 2026" from "2026-10-09". */
function formatLongDate(dateStr: string) {
  return parseDateStr(dateStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
const formatShortDate = (dateStr: string) =>
  parseDateStr(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

/* ─── Calendar Helpers ─── */
function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const startIdx = firstDay === 0 ? 6 : firstDay - 1; // Monday-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];
  for (let i = startIdx - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day: d, isCurrentMonth: false, dateStr: `${y}-${pad2(m + 1)}-${pad2(d)}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isCurrentMonth: true, dateStr: `${year}-${pad2(month + 1)}-${pad2(d)}` });
  }
  // Only pad to full weeks: a 6th row of next-month days is wasted space.
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ day: d, isCurrentMonth: false, dateStr: `${y}-${pad2(m + 1)}-${pad2(d)}` });
  }
  return cells;
}

type ViewMode = 'month' | 'week' | 'list';
type Dragged = { kind: 'card' | 'draft'; id: string } | null;

/* ─── Component ─── */
export const ContentSchedulingView: React.FC<ContentSchedulingViewProps> = ({
  activeWorkspace,
  drafts,
  documents,
  onOpenEditorDraft
}) => {
  const today = new Date();
  const todayStr = toDateStr(today);
  const nowTime = `${pad2(today.getHours())}:${pad2(today.getMinutes())}`;
  const isOverdue = (item: ScheduledContent) => isOverdueAt(item, todayStr, nowTime);

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(toDateStr(new Date())));
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ScheduleStatus | 'all'>('all');
  const [filterCampaign, setFilterCampaign] = useState<string>('all');
  const [gridPlatform, setGridPlatform] = useState<Platform | 'all'>('all');
  const [dragged, setDragged] = useState<Dragged>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<ScheduledContent | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [planMode, setPlanMode] = useState<'plan' | 'gap' | null>(null);
  // Browser reminders are a per-viewer preference, so localStorage is the right home.
  const [notifyEnabled, setNotifyEnabled] = useState(() => {
    try { return localStorage.getItem('vc-schedule-notify') === '1' && typeof Notification !== 'undefined' && Notification.permission === 'granted'; }
    catch { return false; }
  });

  // Form state (create and edit share one modal).
  const [editing, setEditing] = useState<ScheduledContent | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formPlatforms, setFormPlatforms] = useState<Platform[]>(['instagram']);
  const [formStatus, setFormStatus] = useState<ScheduleStatus>('draft');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('09:00');
  const [formNotes, setFormNotes] = useState('');
  const [formDraftId, setFormDraftId] = useState('');
  const [formCaption, setFormCaption] = useState('');
  const [formCampaign, setFormCampaign] = useState('');
  const [formPillar, setFormPillar] = useState<SchedulePillar | ''>('');
  const [formPostUrl, setFormPostUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [publishUrl, setPublishUrl] = useState('');
  const [postImageBusy, setPostImageBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState<'upload' | 'ai' | 'remove' | null>(null);
  const uploadInput = React.useRef<HTMLInputElement>(null);

  // Schedule entries are persisted in PostgreSQL (table content_schedules).
  const [schedule, setSchedule] = useState<ScheduledContent[]>([]);

  useEffect(() => {
    let cancelled = false;
    setSchedule([]);
    apiService.listSchedules(activeWorkspace.id)
      .then(rows => { if (!cancelled) setSchedule(rows); })
      .catch(error => { if (!cancelled) setNotice(`Gagal memuat jadwal: ${error instanceof Error ? error.message : error}`); });
    return () => { cancelled = true; };
  }, [activeWorkspace.id]);

  const draftOf = (item: { draftId?: string | null }) => drafts.find(d => d.id === item.draftId);
  // Image priority: published post > team replacement (upload/AI) > draft (Studio Visual) > branded cover.
  const thumbnailOf = (item: ScheduledContent) => item.postImage || item.customImage || draftOf(item)?.visualAsset?.generatedImageUrl;
  const imageSourceLabel = (item: ScheduledContent) =>
    item.postImage ? `Dari post ${PLATFORM_LABELS[item.platform]}`
      : item.customImage ? (item.customImageSource === 'ai' ? 'Gambar AI' : 'Gambar unggahan')
        : 'Dari draf (Studio Visual)';
  const coverFor = (item: ScheduledContent, size: 'thumb' | 'tile' | 'hero') => (
    <ScheduleCover title={item.title} platform={item.platform} pillar={item.pillar} primaryColor={activeWorkspace.primaryColor} accentColor={activeWorkspace.accentColor} orgCode={activeWorkspace.code} size={size} />
  );
  const conflictsOf = (item: ScheduledContent) => factConflicts(item, draftOf(item), documents);

  // Optimistic update; rolls back if the API rejects it.
  const persistSchedule = async (next: ScheduledContent) => {
    const previous = schedule;
    setSchedule(prev => prev.map(item => item.id === next.id ? next : item));
    try {
      const saved = await apiService.saveSchedule(next);
      setSchedule(prev => prev.map(item => item.id === saved.id ? saved : item));
      return saved;
    } catch (error) {
      setSchedule(previous);
      setNotice(`Gagal menyimpan jadwal: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  };

  const handleDeleteSchedule = async (item: ScheduledContent) => {
    if (!confirm(`Hapus jadwal "${item.title}" (${PLATFORM_LABELS[item.platform]})?`)) return;
    try {
      await apiService.deleteSchedule(activeWorkspace.id, item.id);
      setSchedule(prev => prev.filter(s => s.id !== item.id));
      setSelectedCard(null);
    } catch (error) {
      setNotice(`Gagal menghapus jadwal: ${error instanceof Error ? error.message : error}`);
    }
  };

  /* ── Form ── */
  const defaultDate = () => {
    // Today when viewing the current period, else the period's first day; never past.
    const first = viewMode === 'week' ? weekStart : `${viewYear}-${pad2(viewMonth + 1)}-01`;
    return first < todayStr ? todayStr : first;
  };

  const openAddModal = (dateStr?: string, draft?: ContentDraft, presetTitle?: string) => {
    setEditing(null);
    setFormError(null);
    setFormTitle(draft?.title || presetTitle || '');
    setFormPlatforms(['instagram']);
    setFormStatus(draft ? 'scheduled' : 'draft');
    setFormDate(dateStr || defaultDate());
    setFormTime(draft ? SUGGESTED_TIME.instagram : '09:00');
    setFormNotes('');
    setFormDraftId(draft?.id || '');
    setFormCaption('');
    setFormCampaign('');
    setFormPillar('');
    setFormPostUrl('');
    setShowAddModal(true);
  };

  const openEditModal = (item: ScheduledContent) => {
    setEditing(item);
    setFormError(null);
    setFormTitle(item.title);
    setFormPlatforms([item.platform]);
    setFormStatus(item.status);
    setFormDate(item.date);
    setFormTime(item.time);
    setFormNotes(item.notes || '');
    setFormDraftId(item.draftId || '');
    setFormCaption(item.caption || '');
    setFormCampaign(item.campaign || '');
    setFormPillar(item.pillar || '');
    setFormPostUrl(item.postUrl || '');
    setSelectedCard(null);
    setShowAddModal(true);
  };

  const togglePlatform = (platform: Platform) =>
    setFormPlatforms(prev => prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]);

  const handleSaveSchedule = async () => {
    if (!formTitle.trim() || !formDate) return setFormError('Judul konten dan tanggal publikasi wajib diisi.');
    if (!formPlatforms.length) return setFormError('Pilih minimal satu platform.');
    // Mirrors the server rules so the user gets the reason before the round trip.
    if (formDate < todayStr && formDate !== editing?.date) return setFormError('Tanggal publikasi tidak boleh di masa lalu.');
    const linkedDraft = drafts.find(d => d.id === formDraftId);
    const statusOrDraftChanged = !editing || editing.status !== formStatus || (editing.draftId || '') !== formDraftId;
    if (formStatus !== 'draft' && statusOrDraftChanged && linkedDraft?.status !== 'disetujui') {
      return setFormError('Status Terjadwal/Terbit hanya untuk jadwal yang ditautkan ke draf berstatus Disetujui. Simpan sebagai Draf, atau tautkan draf yang sudah disetujui.');
    }
    if (formStatus === 'published' && formPostUrl.trim() && !isPostUrl(formPostUrl)) {
      return setFormError('Link post harus diawali http:// atau https://.');
    }
    const base = {
      workspaceId: activeWorkspace.id,
      title: formTitle.trim(),
      status: formStatus,
      date: formDate,
      time: formTime || '09:00',
      notes: formNotes.trim() || null,
      draftId: formDraftId || null,
      caption: formCaption.trim() || null,
      campaign: formCampaign.trim() || null,
      pillar: formPillar || null,
      postUrl: formStatus === 'published' ? formPostUrl.trim() || null : null
    };
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const saved = await apiService.saveSchedule({ ...base, id: editing.id, platform: formPlatforms[0] });
        setSchedule(prev => prev.map(item => item.id === saved.id ? saved : item));
        if (saved.status === 'published' && saved.postUrl && !saved.postImage) void refreshPostImage(saved);
      } else {
        // One content, many platforms: one row per platform, each editable later.
        const created: ScheduledContent[] = [];
        try {
          for (const platform of formPlatforms) {
            created.push(await apiService.saveSchedule({ ...base, id: `sc-${crypto.randomUUID()}`, platform }));
          }
        } finally {
          if (created.length) setSchedule(prev => [...prev, ...created]);
        }
      }
      setShowAddModal(false);
      setEditing(null);
    } catch (error) {
      setFormError(`Gagal menyimpan jadwal: ${error instanceof Error ? error.message : error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAdaptCaption = async () => {
    const draft = drafts.find(d => d.id === formDraftId);
    const content = currentVersion(draft)?.content;
    if (!content) return setFormError('Tautkan draf yang punya isi teks untuk membuat caption dengan AI.');
    const platform = formPlatforms[0];
    setAiBusy(true);
    setFormError(null);
    try {
      const result = await apiService.ragRefine(activeWorkspace.id, content, `${CAPTION_STYLE[platform]} Pertahankan semua fakta, angka, nama, dan CTA. Hapus label draf seperti [DRAF ...]. Tulis dalam Bahasa Indonesia baku tanpa kata bahasa Inggris.`);
      const caption = sanitizeRagAnswer(result.answer || '');
      if (!caption) throw new Error('AI tidak menghasilkan caption.');
      setFormCaption(caption);
    } catch (error) {
      setFormError(`Gagal membuat caption: ${error instanceof Error ? error.message : error}`);
    } finally {
      setAiBusy(false);
    }
  };

  /** Pulls the preview image from the post link (server-side) and stores it on the schedule. */
  const refreshPostImage = async (item: ScheduledContent) => {
    setPostImageBusy(true);
    setNotice(null);
    try {
      const saved = await apiService.fetchPostImage(activeWorkspace.id, item.id);
      setSchedule(prev => prev.map(s => s.id === saved.id ? saved : s));
      setSelectedCard(current => current?.id === saved.id ? saved : current);
    } catch (error) {
      setNotice(`Gambar post belum bisa diambil: ${error instanceof Error ? error.message : error} Gambar draf tetap dipakai.`);
    } finally {
      setPostImageBusy(false);
    }
  };

  const applyScheduleImage = async (item: ScheduledContent, image: string | null, source?: 'upload' | 'ai') => {
    const saved = await apiService.setScheduleImage(activeWorkspace.id, item.id, image, source);
    setSchedule(prev => prev.map(s => s.id === saved.id ? saved : s));
    setSelectedCard(current => current?.id === saved.id ? saved : current);
  };

  const handleUploadImage = async (item: ScheduledContent, file: File | undefined) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setNotice('Gunakan berkas JPEG, PNG, atau WebP.');
    if (file.size > 3_000_000) return setNotice('Ukuran gambar maksimal 3 MB.');
    setImageBusy('upload');
    setNotice(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Berkas tidak bisa dibaca.'));
        reader.readAsDataURL(file);
      });
      await applyScheduleImage(item, dataUrl, 'upload');
    } catch (error) {
      setNotice(`Gagal mengunggah gambar: ${error instanceof Error ? error.message : error}`);
    } finally {
      setImageBusy(null);
      if (uploadInput.current) uploadInput.current.value = '';
    }
  };

  const handleGenerateImage = async (item: ScheduledContent) => {
    setImageBusy('ai');
    setNotice(null);
    try {
      const pillarHint = item.pillar ? ` Content pillar: ${PILLARS[item.pillar].label} (${item.pillar === 'edukasi' ? 'educational' : item.pillar === 'layanan' ? 'customer service' : 'corporate'}).` : '';
      // No text in the image: FLUX renders letters unreliably; the caption carries the words.
      const result = await apiService.generateVisual({
        workspaceId: activeWorkspace.id,
        prompt: `Professional social media visual for ${activeWorkspace.name}, an Indonesian regional public company (BUMD). Topic: ${item.title}.${pillarHint} Clean, modern, trustworthy corporate photography or illustration, Indonesian context, natural light. Absolutely no text, letters, numbers, or logos.`,
        aspectRatio: item.platform === 'youtube' ? '16:9' : '1:1',
        primaryColor: normalizeHexColor(activeWorkspace.primaryColor),
        accentColor: normalizeHexColor(activeWorkspace.accentColor)
      });
      await applyScheduleImage(item, result.imageUrl, 'ai');
    } catch (error) {
      setNotice(`Gagal membuat gambar AI: ${error instanceof Error ? error.message : error}`);
    } finally {
      setImageBusy(null);
    }
  };

  const handleRemoveImage = async (item: ScheduledContent) => {
    setImageBusy('remove');
    setNotice(null);
    try { await applyScheduleImage(item, null); }
    catch (error) { setNotice(`Gagal menghapus gambar: ${error instanceof Error ? error.message : error}`); }
    finally { setImageBusy(null); }
  };

  const handleMarkPublished = async (item: ScheduledContent) => {
    if (publishUrl.trim() && !isPostUrl(publishUrl)) return setNotice('Link post harus diawali http:// atau https://.');
    setNotice(null);
    const saved = await persistSchedule({ ...item, status: 'published', postUrl: publishUrl.trim() || item.postUrl || null });
    if (saved) {
      setSelectedCard(saved);
      setPublishUrl('');
      if (saved.postUrl) void refreshPostImage(saved);
    }
  };

  // AI proposals enter the calendar as Draf: they still need a content draft and approval.
  const handlePlanAdd = async (slots: PlanSlot[], campaign: string) => {
    const created: ScheduledContent[] = [];
    try {
      for (const slot of slots) {
        created.push(await apiService.saveSchedule({
          id: `sc-${crypto.randomUUID()}`,
          workspaceId: activeWorkspace.id,
          title: slot.title.trim() || 'Usulan konten',
          platform: slot.platform,
          status: 'draft',
          date: slot.date,
          time: slot.time,
          notes: [`Usulan AI: ${slot.angle}`.trim(), slot.source ? `Sumber: ${slot.source}` : ''].filter(Boolean).join('\n'),
          draftId: null,
          caption: null,
          campaign: campaign || null,
          pillar: slot.pillar,
          postUrl: null
        }));
      }
    } finally {
      if (created.length) {
        setSchedule(prev => [...prev, ...created]);
        setInfo(`${created.length} usulan AI ditambahkan sebagai Draf.`);
      }
    }
  };

  const toggleNotifications = async () => {
    if (notifyEnabled) {
      setNotifyEnabled(false);
      try { localStorage.setItem('vc-schedule-notify', '0'); } catch { /* ignore */ }
      return;
    }
    if (typeof Notification === 'undefined') return setNotice('Browser ini tidak mendukung notifikasi.');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return setNotice('Izin notifikasi ditolak. Aktifkan lewat pengaturan situs di browser.');
    setNotifyEnabled(true);
    try { localStorage.setItem('vc-schedule-notify', '1'); } catch { /* ignore */ }
  };

  // ponytail: reminders fire only while this page is open; email/WhatsApp needs a server-side job + provider.
  useEffect(() => {
    if (!notifyEnabled || typeof Notification === 'undefined') return;
    const now = Date.now();
    const timers = schedule
      .filter(item => item.status === 'scheduled')
      .map(item => {
        const at = parseDateStr(item.date);
        const [h, m] = item.time.split(':').map(Number);
        at.setHours(h, m - 10, 0, 0); // 10 minutes before airtime
        return { item, delay: at.getTime() - now };
      })
      .filter(({ delay }) => delay > 0 && delay < 24 * 60 * 60 * 1000)
      .map(({ item, delay }) => window.setTimeout(() => {
        new Notification(`Segera tayang ${item.time}: ${item.title}`, { body: `${PLATFORM_LABELS[item.platform]} · 10 menit lagi. Tandai Terbit setelah dipublikasikan.` });
      }, delay));
    return () => timers.forEach(window.clearTimeout);
  }, [schedule, notifyEnabled]);

  /* ── Navigation ── */
  const syncMonthTo = (dateStr: string) => {
    const date = parseDateStr(dateStr);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
  };
  const goPeriod = (delta: number) => {
    if (viewMode === 'week') {
      const next = addDays(weekStart, delta * 7);
      setWeekStart(next);
      syncMonthTo(next);
      return;
    }
    let newMonth = viewMonth + delta;
    let newYear = viewYear;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    if (newMonth > 11) { newMonth = 0; newYear++; }
    setViewMonth(newMonth);
    setViewYear(newYear);
    setWeekStart(startOfWeek(`${newYear}-${pad2(newMonth + 1)}-01`));
  };
  const goToday = () => {
    setWeekStart(startOfWeek(todayStr));
    syncMonthTo(todayStr);
  };

  /* ── Derived data ── */
  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const campaigns = useMemo(
    () => [...new Set(schedule.map(item => item.campaign).filter((c): c is string => Boolean(c)))].sort(),
    [schedule]
  );

  const filteredSchedule = useMemo(() => schedule.filter(item =>
    (filterPlatform === 'all' || item.platform === filterPlatform) &&
    (filterStatus === 'all' || item.status === filterStatus) &&
    (filterCampaign === 'all' || item.campaign === filterCampaign)
  ), [schedule, filterPlatform, filterStatus, filterCampaign]);

  const contentByDate = useMemo(() => {
    const map: Record<string, ScheduledContent[]> = {};
    filteredSchedule.forEach(item => { (map[item.date] ||= []).push(item); });
    Object.values(map).forEach(items => items.sort((a, b) => a.time.localeCompare(b.time)));
    return map;
  }, [filteredSchedule]);

  // Stats, pillar balance and the list view follow the visible period and filters.
  const monthPrefix = `${viewYear}-${pad2(viewMonth + 1)}-`;
  const periodItems = filteredSchedule
    .filter(item => viewMode === 'week' ? weekDates.includes(item.date) : item.date.startsWith(monthPrefix))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const countBy = (status: ScheduleStatus) => periodItems.filter(s => s.status === status).length;
  const overdueCount = periodItems.filter(isOverdue).length;
  const pillarCounts = (Object.keys(PILLARS) as SchedulePillar[]).map(key => ({ key, count: periodItems.filter(i => i.pillar === key).length }));
  const noPillarCount = periodItems.filter(i => !i.pillar).length;

  const monthMoments = momentsInMonth(viewYear, viewMonth, activeWorkspace.sector || '');
  const monthMomentList = Object.entries(monthMoments).sort().map(([date, names]) => `${formatShortDate(date)}: ${names.join(', ')}`);
  const monthItemsAll = schedule.filter(item => item.date.startsWith(monthPrefix));
  const gapDates = emptyFutureDates(viewYear, viewMonth, todayStr, new Set(monthItemsAll.map(i => i.date)));
  const futureMonthDates = emptyFutureDates(viewYear, viewMonth, todayStr, new Set());
  const lowPillars = weakPillars(monthItemsAll);
  const upcoming = schedule
    .filter(item => item.status === 'scheduled' && !isOverdue(item))
    .filter(item => {
      const at = parseDateStr(item.date);
      const [h, m] = item.time.split(':').map(Number);
      at.setHours(h, m);
      return at.getTime() - today.getTime() < 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  // "Siap Dijadwalkan": only approved drafts can enter the calendar as scheduled.
  const approvedDrafts = drafts
    .filter(d => d.status === 'disetujui')
    .map(d => {
      const slots = schedule.filter(s => s.draftId === d.id);
      // A draft "has an image" if Studio Visual saved one or any of its schedules got one.
      const image = d.visualAsset?.generatedImageUrl || slots.map(s => s.postImage || s.customImage).find(Boolean) || undefined;
      return { draft: d, slots, image, platforms: [...new Set(slots.map(s => s.platform))] };
    });
  const readyQueue = approvedDrafts.filter(entry => !entry.slots.length);
  const scheduledDrafts = approvedDrafts.filter(entry => entry.slots.length);
  const awaitingReviewCount = drafts.filter(d => d.status === 'menunggu_review' || d.status === 'revisi_diminta').length;

  /** Other entries of the same draft on the same platform: a likely double post. */
  const duplicatesOf = (draftId: string | null | undefined, platforms: Platform[], exceptId?: string) =>
    draftId ? schedule.filter(s => s.draftId === draftId && s.id !== exceptId && platforms.includes(s.platform)) : [];

  // Feed preview: newest first, like a profile grid; "all" mixes every platform.
  const feedGrid = useMemo(() => schedule
    .filter(item => (gridPlatform === 'all' || item.platform === gridPlatform) && (item.status === 'scheduled' || item.status === 'published'))
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
    .slice(0, 9), [schedule, gridPlatform]);
  const feedCounts = useMemo(() => {
    const counts: Partial<Record<Platform | 'all', number>> = {};
    for (const item of schedule) {
      if (item.status !== 'scheduled' && item.status !== 'published') continue;
      counts.all = (counts.all || 0) + 1;
      counts[item.platform] = (counts[item.platform] || 0) + 1;
    }
    return counts;
  }, [schedule]);

  /* ── Drag & drop ── */
  const startDrag = (e: React.DragEvent, next: NonNullable<Dragged>) => {
    e.dataTransfer.setData('text/plain', next.id); // Firefox needs data to start a drag
    setDragged(next);
  };
  const dropProps = (dateStr: string) => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOverDate(dateStr); },
    onDragLeave: () => setDragOverDate(null),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOverDate(null);
      const current = dragged;
      setDragged(null);
      if (!current) return;
      if (dateStr < todayStr) return setNotice('Jadwal tidak bisa ditempatkan di tanggal yang sudah lewat.');
      if (current.kind === 'draft') {
        const draft = drafts.find(d => d.id === current.id);
        if (draft) openAddModal(dateStr, draft);
        return;
      }
      const moved = schedule.find(item => item.id === current.id);
      if (moved && moved.date !== dateStr) void persistSchedule({ ...moved, date: dateStr });
    }
  });

  /* ── Pieces ── */
  const renderCard = (item: ScheduledContent) => {
    const overdue = isOverdue(item);
    const conflicts = conflictsOf(item);
    const thumb = thumbnailOf(item);
    return (
      <div
        key={item.id}
        className={`content-card ${dragged?.id === item.id ? 'content-card-dragging' : ''}`}
        style={{
          ...(overdue ? { borderColor: 'rgba(239, 68, 68, 0.6)' } : {}),
          ...(item.pillar ? { borderLeft: `3px solid ${PILLARS[item.pillar].color}` } : {})
        }}
        draggable
        onDragStart={e => startDrag(e, { kind: 'card', id: item.id })}
        onDragEnd={() => setDragged(null)}
        onClick={() => { setPublishUrl(''); setSelectedCard(item); }}
        title={`${item.title} — ${item.time} — ${PLATFORM_LABELS[item.platform]} — ${overdue ? 'Terlewat' : STATUS_COLORS[item.status].label}${conflicts.length ? ' — ada konflik fakta' : ''}`}
      >
        <div className="content-card-grip"><GripVertical size={10} /></div>
        <div className="content-card-thumb" style={thumb ? { backgroundImage: `url(${thumb})` } : { overflow: 'hidden' }}>
          {!thumb && coverFor(item, 'thumb')}
        </div>
        <div className="content-card-info">
          <span className="content-card-title">{item.title}</span>
          <div className="content-card-meta">
            <span style={{ fontSize: '0.6rem', color: overdue ? DANGER : 'var(--text-muted)', fontWeight: 600 }}>{item.time}</span>
            <span className="content-card-platform" style={{ color: PLATFORM_COLORS[item.platform] }}>{PLATFORM_ICONS[item.platform]}</span>
            {conflicts.length > 0 && <FileWarning size={10} style={{ color: WARN }} aria-label="Konflik fakta" />}
            <span className="content-card-status-dot" style={{ background: STATUS_COLORS[item.status].text }} />
          </div>
        </div>
      </div>
    );
  };

  const queueItem = ({ draft, slots, image, platforms }: (typeof approvedDrafts)[number]) => (
    <div
      key={draft.id}
      draggable
      onDragStart={e => startDrag(e, { kind: 'draft', id: draft.id })}
      onDragEnd={() => setDragged(null)}
      onClick={() => openAddModal(undefined, draft)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') openAddModal(undefined, draft); }}
      title="Seret ke kalender atau klik untuk menjadwalkan"
      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color, rgba(0,0,0,0.08))', cursor: 'grab', background: 'var(--bg-card, #fff)' }}
    >
      <GripVertical size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      <div style={{ width: '32px', height: '32px', borderRadius: '6px', flexShrink: 0, overflow: 'hidden', backgroundSize: 'cover', backgroundPosition: 'center', ...(image ? { backgroundImage: `url(${image})` } : {}) }}>
        {!image && <ScheduleCover title={draft.title} platform="instagram" primaryColor={activeWorkspace.primaryColor} accentColor={activeWorkspace.accentColor} orgCode={activeWorkspace.code} size="thumb" />}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{draft.title}</div>
        <div style={{ fontSize: '0.7rem', color: slots.length ? 'var(--text-muted)' : 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {slots.length ? <>{slots.length} jadwal · {platforms.map(pl => <span key={pl} style={{ color: PLATFORM_COLORS[pl], display: 'inline-flex' }}>{PLATFORM_ICONS[pl]}</span>)}</> : 'Belum dijadwalkan'}
          {!image && ' · belum ada gambar'}
        </div>
      </div>
    </div>
  );

  const momentChips = (dateStr: string) => (monthMoments[dateStr] || []).map(name => (
    <button
      key={name}
      type="button"
      onClick={() => dateStr >= todayStr ? openAddModal(dateStr, undefined, name) : undefined}
      title={dateStr >= todayStr ? `Momen: ${name} — klik untuk membuat jadwal` : `Momen: ${name}`}
      style={{ display: 'flex', alignItems: 'center', gap: '3px', width: '100%', fontSize: '0.6rem', fontWeight: 600, color: '#b45309', background: 'rgba(245,158,11,0.12)', border: 'none', borderRadius: '4px', padding: '2px 4px', cursor: dateStr >= todayStr ? 'pointer' : 'default', textAlign: 'left', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
    >
      <Star size={8} style={{ flexShrink: 0 }} /> {name}
    </button>
  ));

  const addButton = (dateStr: string) => dateStr >= todayStr && (
    <button className="cal-cell-add-hint" onClick={() => openAddModal(dateStr)} title="Tambah jadwal di tanggal ini" aria-label={`Tambah jadwal ${formatLongDate(dateStr)}`}>+</button>
  );

  const periodTitle = viewMode === 'week'
    ? `${formatShortDate(weekDates[0])} – ${formatShortDate(weekDates[6])} ${parseDateStr(weekDates[6]).getFullYear()}`
    : null;

  const selectedDraft = selectedCard ? draftOf(selectedCard) : undefined;
  const selectedConflicts = selectedCard ? conflictsOf(selectedCard) : [];
  const formDraft = drafts.find(d => d.id === formDraftId);

  return (
    <div className="scheduling-container">
      {/* ── Page Header ── */}
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)' }}>
              {activeWorkspace.code} • Penjadwalan
            </span>
          </div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CalendarDays size={28} style={{ color: 'var(--primary)' }} />
            Penjadwalan Konten
          </h2>
          <p className="page-subtitle">
            Seret draf yang sudah disetujui dari antrian ke kalender, atur platform dan caption, lalu tandai terbit setelah dipublikasikan.
          </p>
        </div>
      </div>

      {/* ── Action Bar ── */}
      <div className="scheduling-action-bar">
        {!readOnly && <button className="btn btn-primary scheduling-add-btn" onClick={() => openAddModal()}>
          <Plus size={18} />
          <span>Tambah Jadwal Baru</span>
        </button>

        <div className="scheduling-filters">
          <div className="filter-group">
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <select className="scheduling-filter-select" value={filterPlatform} onChange={e => setFilterPlatform(e.target.value as Platform | 'all')} aria-label="Filter platform">
              <option value="all">Semua Platform</option>
              {ALL_PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <select className="scheduling-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value as ScheduleStatus | 'all')} aria-label="Filter status">
              <option value="all">Semua Status</option>
              <option value="draft">Draf</option>
              <option value="scheduled">Terjadwal</option>
              <option value="published">Terbit</option>
            </select>
          </div>
          {campaigns.length > 0 && (
            <div className="filter-group">
              <select className="scheduling-filter-select" value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)} aria-label="Filter kampanye">
                <option value="all">Semua Kampanye</option>
                {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="scheduling-stats">
          {(['draft', 'scheduled', 'published'] as ScheduleStatus[]).map(status => (
            <div key={status} className="stat-pill" style={{ background: STATUS_COLORS[status].bg, borderColor: STATUS_COLORS[status].border }}>
              <span className="stat-dot" style={{ background: STATUS_COLORS[status].text }} />
              <span style={{ color: STATUS_COLORS[status].text }}>{countBy(status)} {STATUS_COLORS[status].label}</span>
            </div>
          ))}
          {overdueCount > 0 && (
            <div className="stat-pill" style={{ background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.4)' }} title="Terjadwal tetapi waktunya sudah lewat dan belum ditandai Terbit">
              <AlertTriangle size={12} style={{ color: DANGER }} />
              <span style={{ color: DANGER }}>{overdueCount} Terlewat</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Grid: Calendar + Sidebar ── */}
      <div className="scheduling-main-grid">
        <div className="scheduling-calendar-section">
          <div className="calendar-header-bar">
            <button className="cal-nav-btn" onClick={() => goPeriod(-1)} aria-label="Periode sebelumnya"><ChevronLeft size={20} /></button>
            <div className="cal-month-title">
              {periodTitle
                ? <span className="cal-month-name" style={{ fontSize: '1.2rem' }}>{periodTitle}</span>
                : <><span className="cal-month-name">{MONTHS[viewMonth]}</span><span className="cal-year">{viewYear}</span></>}
            </div>
            <button className="cal-nav-btn" onClick={() => goPeriod(1)} aria-label="Periode berikutnya"><ChevronRight size={20} /></button>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <div role="tablist" aria-label="Tampilan kalender" style={{ display: 'flex', gap: '2px', padding: '2px', borderRadius: '8px', background: 'var(--bg-secondary, rgba(0,0,0,0.04))' }}>
                {([['month', 'Bulan'], ['week', 'Minggu'], ['list', 'Daftar']] as [ViewMode, string][]).map(([mode, label]) => (
                  <button
                    key={mode}
                    role="tab"
                    aria-selected={viewMode === mode}
                    className={`btn btn-sm ${viewMode === mode ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      setViewMode(mode);
                      if (mode === 'week') setWeekStart(startOfWeek(viewYear === today.getFullYear() && viewMonth === today.getMonth() ? todayStr : `${viewYear}-${pad2(viewMonth + 1)}-01`));
                    }}
                  >{label}</button>
                ))}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={goToday}>Hari Ini</button>
            </div>
          </div>

          {notice && (
            <div className="drag-hint-bar" role="alert" style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.35)', color: DANGER }}>
              <AlertTriangle size={14} />
              <span style={{ flex: 1 }}>{notice}</span>
              <button className="btn btn-sm btn-secondary" style={{ padding: '2px 6px' }} onClick={() => setNotice(null)} aria-label="Tutup pemberitahuan"><X size={12} /></button>
            </div>
          )}
          {info && (
            <div className="drag-hint-bar" role="status" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.35)', color: '#059669' }}>
              <CheckCircle2 size={14} />
              <span style={{ flex: 1 }}>{info}</span>
              <button className="btn btn-sm btn-secondary" style={{ padding: '2px 6px' }} onClick={() => setInfo(null)} aria-label="Tutup pemberitahuan"><X size={12} /></button>
            </div>
          )}
          {viewMode !== 'list' && (
            <div className="drag-hint-bar">
              <Move size={14} />
              <span>{schedule.length === 0
                ? 'Belum ada jadwal — seret draf dari antrian "Siap Dijadwalkan" atau klik "Tambah Jadwal Baru"'
                : 'Geser kartu ke tanggal lain untuk menjadwalkan ulang; seret draf dari antrian untuk menambah jadwal'}</span>
            </div>
          )}

          {/* ── Month view ── */}
          {viewMode === 'month' && (
            <>
              <div className="cal-day-headers">
                {DAYS_ABBR.map(day => <div key={day} className="cal-day-header">{day}</div>)}
              </div>
              <div className="cal-grid">
                {calendarDays.map(cell => {
                  const items = contentByDate[cell.dateStr] || [];
                  const isToday = cell.dateStr === todayStr;
                  return (
                    <div
                      key={cell.dateStr}
                      className={`cal-cell ${!cell.isCurrentMonth ? 'cal-cell-dim' : ''} ${isToday ? 'cal-cell-today' : ''} ${dragOverDate === cell.dateStr ? 'cal-cell-drag-over' : ''}`}
                      {...dropProps(cell.dateStr)}
                    >
                      <div className="cal-cell-header">
                        <span className={`cal-day-num ${isToday ? 'cal-day-today' : ''}`}>{cell.day}</span>
                        {items.length > 1 && <span className="cal-item-count">{items.length}</span>}
                      </div>
                      <div className="cal-cell-content">
                        {cell.isCurrentMonth && momentChips(cell.dateStr)}
                        {cell.isCurrentMonth && addButton(cell.dateStr)}
                        {(expandedDate === cell.dateStr ? items : items.slice(0, 3)).map(renderCard)}
                        {items.length > 3 && (
                          <button
                            type="button"
                            className="cal-more-indicator"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            onClick={() => setExpandedDate(expandedDate === cell.dateStr ? null : cell.dateStr)}
                          >
                            {expandedDate === cell.dateStr ? 'Sembunyikan' : `+${items.length - 3} lainnya`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── Week view: every item visible, no overflow ── */}
          {viewMode === 'week' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '6px' }}>
              {weekDates.map((dateStr, i) => {
                const items = contentByDate[dateStr] || [];
                const isToday = dateStr === todayStr;
                return (
                  <div
                    key={dateStr}
                    className={`cal-cell ${isToday ? 'cal-cell-today' : ''} ${dragOverDate === dateStr ? 'cal-cell-drag-over' : ''}`}
                    style={{ minHeight: '420px' }}
                    {...dropProps(dateStr)}
                  >
                    <div className="cal-cell-header" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{DAYS_ABBR[i]}</span>
                      <span className={`cal-day-num ${isToday ? 'cal-day-today' : ''}`}>{parseDateStr(dateStr).getDate()}</span>
                    </div>
                    <div className="cal-cell-content">
                      {momentChips(dateStr)}
                      {addButton(dateStr)}
                      {items.map(renderCard)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── List view ── */}
          {viewMode === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {periodItems.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '24px 0', textAlign: 'center' }}>Tidak ada jadwal di {MONTHS[viewMonth]} {viewYear} untuk filter ini.</p>
              )}
              {[...new Set(periodItems.map(i => i.date))].map(dateStr => (
                <div key={dateStr}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: dateStr === todayStr ? 'var(--primary)' : 'var(--text-secondary)', marginBottom: '6px' }}>
                    {formatLongDate(dateStr)}{dateStr === todayStr ? ' · Hari ini' : ''}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {periodItems.filter(i => i.date === dateStr).map(item => {
                      const overdue = isOverdue(item);
                      const conflicts = conflictsOf(item);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => { setPublishUrl(''); setSelectedCard(item); }}
                          style={{
                            display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: '12px', alignItems: 'center', textAlign: 'left',
                            padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', background: 'var(--bg-card, #fff)',
                            border: `1px solid ${overdue ? 'rgba(239,68,68,0.5)' : 'var(--border-color, rgba(0,0,0,0.08))'}`,
                            borderLeft: item.pillar ? `4px solid ${PILLARS[item.pillar].color}` : undefined
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: overdue ? DANGER : 'var(--text-primary)' }}>{item.time}</span>
                          <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ color: PLATFORM_COLORS[item.platform], display: 'inline-flex', gap: '4px', alignItems: 'center' }}>{PLATFORM_ICONS[item.platform]} {PLATFORM_LABELS[item.platform]}</span>
                              {item.campaign && <span>· {item.campaign}</span>}
                              {item.pillar && <span>· {PILLARS[item.pillar].label}</span>}
                              {conflicts.length > 0 && <span style={{ color: WARN }}>· {conflicts.length} konflik fakta</span>}
                            </span>
                          </span>
                          <span className="status-pill" style={{ background: overdue ? 'rgba(239,68,68,0.12)' : STATUS_COLORS[item.status].bg, color: overdue ? DANGER : STATUS_COLORS[item.status].text, border: `1px solid ${overdue ? 'rgba(239,68,68,0.4)' : STATUS_COLORS[item.status].border}` }}>
                            {overdue ? 'Terlewat' : STATUS_COLORS[item.status].label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="scheduling-sidebar">
          {/* AI assistant */}
          <div className="sidebar-preview-panel">
            <div className="sidebar-preview-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: 'var(--accent-cyan)' }} />
                <span className="sidebar-preview-title">Asisten Rencana</span>
              </div>
              <span className="sidebar-preview-badge">{MONTHS[viewMonth]}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="btn btn-primary btn-sm" disabled={!futureMonthDates.length} onClick={() => setPlanMode('plan')}>
                <Sparkles size={14} /> Rencana Bulanan dari Knowledge Base
              </button>
              {gapDates.length >= 3 && (
                <button className="btn btn-secondary btn-sm" onClick={() => setPlanMode('gap')}>
                  Isi {gapDates.length} hari kosong dengan ide AI
                </button>
              )}
              {lowPillars.length > 0 && (
                <span style={{ fontSize: '0.75rem', color: WARN }}>Pilar kurang di {MONTHS[viewMonth]}: {lowPillars.map(p => PILLARS[p].label).join(', ')}.</span>
              )}
              {monthMomentList.length > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <strong style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}><Star size={11} style={{ color: '#b45309' }} /> Momen penting</strong>
                  {monthMomentList.map(m => <div key={m}>{m}</div>)}
                </div>
              )}
            </div>
          </div>

          {/* Upcoming + reminders */}
          <div className="sidebar-preview-panel">
            <div className="sidebar-preview-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={18} style={{ color: 'var(--accent-cyan)' }} />
                <span className="sidebar-preview-title">Segera Tayang (24 jam)</span>
              </div>
              <button className={`btn btn-sm ${notifyEnabled ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '0.7rem', padding: '3px 8px' }} onClick={toggleNotifications} title="Notifikasi browser 10 menit sebelum jam tayang, selama halaman ini terbuka">
                {notifyEnabled ? 'Pengingat aktif' : 'Aktifkan pengingat'}
              </button>
            </div>
            {upcoming.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tidak ada konten terjadwal dalam 24 jam ke depan.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {upcoming.map(item => (
                  <button key={item.id} type="button" onClick={() => { setPublishUrl(''); setSelectedCard(item); }} style={{ display: 'flex', gap: '8px', alignItems: 'center', textAlign: 'left', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--border-color, rgba(0,0,0,0.08))', background: 'var(--bg-card, #fff)', cursor: 'pointer' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.78rem' }}>{item.date === todayStr ? item.time : `Besok ${item.time}`}</span>
                    <span style={{ color: PLATFORM_COLORS[item.platform], display: 'flex' }}>{PLATFORM_ICONS[item.platform]}</span>
                    <span style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ready queue */}
          <div className="sidebar-preview-panel">
            <div className="sidebar-preview-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Inbox size={18} style={{ color: 'var(--accent-cyan)' }} />
                <span className="sidebar-preview-title">Siap Dijadwalkan</span>
              </div>
              <span className="sidebar-preview-badge">{readyQueue.length} belum dijadwalkan</span>
            </div>
            <p className="sidebar-preview-desc">Hanya draf berstatus Disetujui. Seret ke tanggal di kalender, atau klik untuk menjadwalkan.</p>
            {approvedDrafts.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Belum ada draf yang disetujui. Setujui draf di Editor & Versi terlebih dahulu.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto' }}>
                {readyQueue.length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: '#059669', display: 'flex', gap: '6px', alignItems: 'center' }}><CheckCircle2 size={14} /> Semua draf yang disetujui sudah dijadwalkan.</p>
                )}
                {readyQueue.map(entry => queueItem(entry))}
                {scheduledDrafts.length > 0 && (
                  <details style={{ marginTop: '4px' }}>
                    <summary style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>
                      Sudah dijadwalkan ({scheduledDrafts.length}) — seret lagi untuk platform lain
                    </summary>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', opacity: 0.85 }}>
                      {scheduledDrafts.map(entry => queueItem(entry))}
                    </div>
                  </details>
                )}
              </div>
            )}
            {awaitingReviewCount > 0 && (
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                {awaitingReviewCount} draf masih menunggu review/revisi dan belum bisa dijadwalkan.
              </p>
            )}
          </div>

          {/* Instagram grid preview */}
          <div className="sidebar-preview-panel">
            <div className="sidebar-preview-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Grid3X3 size={18} style={{ color: 'var(--accent-cyan)' }} />
                <span className="sidebar-preview-title">Pratinjau Grid Visual</span>
              </div>
            </div>
            <div role="tablist" aria-label="Platform pratinjau" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
              {(['all', ...ALL_PLATFORMS] as (Platform | 'all')[]).map(key => {
                const active = gridPlatform === key;
                const color = key === 'all' ? 'var(--accent-cyan)' : PLATFORM_COLORS[key];
                return (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={active}
                    type="button"
                    onClick={() => setGridPlatform(key)}
                    title={key === 'all' ? 'Semua platform' : PLATFORM_LABELS[key]}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${active ? color : 'var(--border-color, rgba(0,0,0,0.12))'}`,
                      background: active ? (key === 'all' ? 'rgba(6,182,212,0.12)' : `${PLATFORM_COLORS[key]}1a`) : 'transparent',
                      color: active ? color : 'var(--text-secondary)'
                    }}
                  >
                    {key === 'all' ? 'Semua' : <span style={{ color: PLATFORM_COLORS[key], display: 'inline-flex' }}>{PLATFORM_ICONS[key]}</span>}
                    <span style={{ opacity: 0.7 }}>{feedCounts[key] || 0}</span>
                  </button>
                );
              })}
            </div>
            <p className="sidebar-preview-desc">
              {gridPlatform === 'all' ? 'Konten terjadwal dan terbit di semua platform, terbaru di depan.' : `Konten ${PLATFORM_LABELS[gridPlatform]} terjadwal dan terbit, terbaru di depan.`}
            </p>
            <div className="ig-profile-header">
              <div className="ig-avatar" style={{ background: `linear-gradient(135deg, ${activeWorkspace.primaryColor}, ${activeWorkspace.accentColor})` }}>
                {activeWorkspace.code.charAt(0)}
              </div>
              <div className="ig-profile-info">
                <span className="ig-username">@{activeWorkspace.code.toLowerCase().replace('-', '_')}</span>
                <span className="ig-bio">{activeWorkspace.tagline}</span>
              </div>
            </div>
            <div className="ig-grid">
              {feedGrid.length === 0 && (
                <div className="ig-grid-empty">
                  <Eye size={24} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                  <span>Belum ada konten {gridPlatform === 'all' ? '' : `${PLATFORM_LABELS[gridPlatform]} `}terjadwal</span>
                </div>
              )}
              {feedGrid.map((item, i) => (
                <div key={item.id} className="ig-grid-cell" style={{ animationDelay: `${i * 60}ms` }} onClick={() => { setPublishUrl(''); setSelectedCard(item); }}>
                  {thumbnailOf(item) ? (
                    <img src={thumbnailOf(item)} alt={item.title} className="ig-grid-img" />
                  ) : (
                    <div className="ig-grid-img">{coverFor(item, 'tile')}</div>
                  )}
                  {gridPlatform === 'all' && (
                    <span aria-label={PLATFORM_LABELS[item.platform]} style={{ position: 'absolute', top: '4px', right: '4px', zIndex: 1, width: '18px', height: '18px', borderRadius: '50%', background: '#fff', color: PLATFORM_COLORS[item.platform], display: 'grid', placeItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }}>
                      {PLATFORM_ICONS[item.platform]}
                    </span>
                  )}
                  <div className="ig-grid-overlay">
                    <span className="ig-grid-title">{item.title}</span>
                    <span className="ig-grid-status" style={{ background: STATUS_COLORS[item.status].bg, color: STATUS_COLORS[item.status].text, border: `1px solid ${STATUS_COLORS[item.status].border}` }}>
                      {STATUS_COLORS[item.status].label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="ig-aesthetics-hint">
              <Info size={14} />
              <span>Tanpa gambar, sampul otomatis bermerek dipakai. Ganti lewat detail jadwal: unggah gambar atau buat dengan AI.</span>
            </div>
          </div>

          {/* Pillar balance + legend */}
          <div className="sidebar-legend-panel">
            <span className="sidebar-legend-title">Keseimbangan Pilar ({viewMode === 'week' ? 'minggu ini' : MONTHS[viewMonth]})</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
              {pillarCounts.map(({ key, count }) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 24px', gap: '8px', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span>{PILLARS[key].label}</span>
                  <span style={{ height: '6px', borderRadius: '3px', background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: `${periodItems.length ? (count / periodItems.length) * 100 : 0}%`, background: PILLARS[key].color }} />
                  </span>
                  <span style={{ textAlign: 'right' }}>{count}</span>
                </div>
              ))}
              {noPillarCount > 0 && (
                <button
                  type="button"
                  onClick={() => { const next = periodItems.find(i => !i.pillar); if (next) { setPublishUrl(''); setSelectedCard(next); } }}
                  style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', textDecoration: 'underline' }}
                >
                  {noPillarCount} jadwal belum diberi pilar — klik untuk mengisi
                </button>
              )}
            </div>
            <span className="sidebar-legend-title">Legenda Status</span>
            <div className="legend-items">
              {Object.entries(STATUS_COLORS).map(([key, val]) => (
                <div key={key} className="legend-item">
                  <span className="legend-dot" style={{ background: val.text, boxShadow: `0 0 6px ${val.text}` }} />
                  <span>{val.label}</span>
                </div>
              ))}
              <div className="legend-item"><FileWarning size={12} style={{ color: WARN }} /><span>Konflik fakta</span></div>
            </div>
            <span className="sidebar-legend-title" style={{ marginTop: '12px' }}>Platform</span>
            <div className="legend-items">
              {ALL_PLATFORMS.map(key => (
                <div key={key} className="legend-item">
                  <span style={{ color: PLATFORM_COLORS[key], display: 'flex', alignItems: 'center' }}>{PLATFORM_ICONS[key]}</span>
                  <span>{PLATFORM_LABELS[key]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)} onKeyDown={e => { if (e.key === 'Escape') setShowAddModal(false); }}>
          <div className="modal-card" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={editing ? 'Ubah jadwal' : 'Tambah jadwal baru'}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                <CalendarDays size={20} style={{ marginRight: '8px', color: 'var(--primary)', verticalAlign: 'middle' }} />
                {editing ? 'Ubah Jadwal' : 'Tambah Jadwal Baru'}
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowAddModal(false)} style={{ padding: '6px' }} aria-label="Tutup"><X size={16} /></button>
            </div>
            <div className="modal-body">
              {formError && <div role="alert" style={alertBox(DANGER)}>{formError}</div>}
              <div className="form-group">
                <label className="form-label">Judul Konten *</label>
                <input className="form-input" placeholder="cth.: Promosi Diskon Sambungan Baru" value={formTitle} onChange={e => setFormTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Tautkan ke Draf Pustaka</label>
                <select className="form-select" value={formDraftId} onChange={e => {
                  const draft = drafts.find(d => d.id === e.target.value);
                  setFormDraftId(e.target.value);
                  if (draft && !formTitle.trim()) setFormTitle(draft.title);
                }}>
                  <option value="">— Tidak ada —</option>
                  {drafts.map(d => <option key={d.id} value={d.id}>{d.title} · {DRAFT_STATUS_LABELS[d.status]}</option>)}
                </select>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Status Terjadwal/Terbit hanya untuk draf berstatus Disetujui.</small>
              </div>

              <div className="form-group">
                <label className="form-label">Platform{editing ? '' : ' (bisa lebih dari satu)'}</label>
                {editing ? (
                  <select className="form-select" value={formPlatforms[0]} onChange={e => setFormPlatforms([e.target.value as Platform])}>
                    {ALL_PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
                  </select>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {ALL_PLATFORMS.map(p => (
                      <label key={p} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '999px', cursor: 'pointer', fontSize: '0.82rem',
                        border: `1px solid ${formPlatforms.includes(p) ? PLATFORM_COLORS[p] : 'var(--border-color, rgba(0,0,0,0.12))'}`,
                        color: formPlatforms.includes(p) ? PLATFORM_COLORS[p] : 'var(--text-secondary)'
                      }}>
                        <input type="checkbox" checked={formPlatforms.includes(p)} onChange={() => togglePlatform(p)} style={{ margin: 0 }} />
                        {PLATFORM_ICONS[p]} {PLATFORM_LABELS[p]}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {duplicatesOf(formDraftId, formPlatforms, editing?.id).length > 0 && (
                <div role="alert" style={alertBox(WARN)}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    Draf ini sudah dijadwalkan di platform yang sama:{' '}
                    {duplicatesOf(formDraftId, formPlatforms, editing?.id).map(d => `${PLATFORM_LABELS[d.platform]} ${formatShortDate(d.date)} (${STATUS_COLORS[d.status].label})`).join(', ')}.
                    Pastikan ini memang unggahan ulang, bukan posting ganda.
                  </span>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">{editing ? 'Status' : 'Status Awal'}</label>
                  <select className="form-select" value={formStatus} onChange={e => setFormStatus(e.target.value as ScheduleStatus)}>
                    <option value="draft">Draf</option>
                    <option value="scheduled">Terjadwal</option>
                    {editing && <option value="published">Terbit</option>}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Pilar Konten</label>
                  <select className="form-select" value={formPillar} onChange={e => setFormPillar(e.target.value as SchedulePillar | '')}>
                    <option value="">— Belum ditentukan —</option>
                    {(Object.keys(PILLARS) as SchedulePillar[]).map(key => <option key={key} value={key}>{PILLARS[key].label}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Tanggal Publikasi *</label>
                  <input className="form-input" type="date" min={editing && editing.date < todayStr ? undefined : todayStr} value={formDate} onChange={e => setFormDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Waktu (WIB)</label>
                  <input className="form-input" type="time" value={formTime} onChange={e => setFormTime(e.target.value)} />
                  {formPlatforms.length === 1 && formTime !== SUGGESTED_TIME[formPlatforms[0]] && (
                    <button type="button" className="btn btn-sm btn-secondary" style={{ marginTop: '4px', fontSize: '0.72rem', padding: '2px 8px', alignSelf: 'flex-start' }} onClick={() => setFormTime(SUGGESTED_TIME[formPlatforms[0]])}>
                      <Clock size={12} /> Saran {PLATFORM_LABELS[formPlatforms[0]]}: {SUGGESTED_TIME[formPlatforms[0]]}
                    </button>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Kampanye</label>
                <input className="form-input" list="schedule-campaigns" placeholder="cth.: Sosialisasi Tarif Baru Okt 2026" value={formCampaign} onChange={e => setFormCampaign(e.target.value)} />
                <datalist id="schedule-campaigns">{campaigns.map(c => <option key={c} value={c} />)}</datalist>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Caption {formPlatforms.length === 1 ? PLATFORM_LABELS[formPlatforms[0]] : 'per platform'}</span>
                  {formPlatforms.length === 1 && formDraft && (
                    <button type="button" className="btn btn-sm btn-secondary" disabled={aiBusy} onClick={handleAdaptCaption} style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                      <Sparkles size={12} /> {aiBusy ? 'Menyusun…' : `Sesuaikan untuk ${PLATFORM_LABELS[formPlatforms[0]]} (AI)`}
                    </button>
                  )}
                </label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder={formDraft ? 'Kosongkan untuk memakai teks draf apa adanya.' : 'Tulis caption, atau tautkan draf untuk membuatnya dengan AI.'}
                  value={formCaption}
                  onChange={e => setFormCaption(e.target.value)}
                />
                {formPlatforms.length > 1 && (
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Caption ini dipakai untuk semua platform terpilih. Setelah disimpan, sesuaikan caption tiap platform lewat tombol Ubah.</small>
                )}
              </div>

              {formStatus === 'published' && (
                <div className="form-group">
                  <label className="form-label">Link Post</label>
                  <input className="form-input" type="url" placeholder="https://www.instagram.com/p/…" value={formPostUrl} onChange={e => setFormPostUrl(e.target.value)} />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Catatan Internal</label>
                <textarea className="form-textarea" placeholder="Catatan untuk tim (tidak dipublikasikan)…" rows={2} value={formNotes} onChange={e => setFormNotes(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSaveSchedule} disabled={saving}>
                <Check size={16} />
                {saving ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : formPlatforms.length > 1 ? `Simpan ${formPlatforms.length} Jadwal` : 'Simpan Jadwal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {planMode && (
        <ContentPlanModal
          mode={planMode}
          workspaceId={activeWorkspace.id}
          monthLabel={`${MONTHS[viewMonth]} ${viewYear}`}
          dates={planMode === 'gap' ? gapDates : futureMonthDates}
          weakPillars={lowPillars}
          moments={monthMomentList}
          existingTitles={monthItemsAll.map(i => i.title)}
          campaigns={campaigns}
          onClose={() => setPlanMode(null)}
          onAdd={handlePlanAdd}
        />
      )}

      {/* ── Detail Modal ── */}
      {selectedCard && (
        <div className="modal-overlay" onClick={() => setSelectedCard(null)} onKeyDown={e => { if (e.key === 'Escape') setSelectedCard(null); }}>
          <div className="modal-card" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={selectedCard.title}>
            {/* flexShrink 0: .modal-card is a capped flex column, so the header would otherwise be squeezed and crop the image. */}
            <div className="modal-header" style={{ padding: '0', overflow: 'hidden', borderBottom: 'none', flexShrink: 0 }}>
              {thumbnailOf(selectedCard) ? (
                <div style={{ position: 'relative', width: '100%', overflow: 'hidden', borderRadius: '20px 20px 0 0', background: '#0f172a' }}>
                  {/* Cover-fit frame: always filled, height follows the viewport (min 220px, max 420px). */}
                  <img src={thumbnailOf(selectedCard)} alt={selectedCard.title} style={{ display: 'block', width: '100%', height: 'clamp(220px, 45vh, 420px)', objectFit: 'cover', objectPosition: 'center' }} />
                  <span style={{ position: 'absolute', left: '12px', bottom: '10px', fontSize: '0.7rem', fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.55)', padding: '3px 8px', borderRadius: '999px', display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                    {selectedCard.postImage && PLATFORM_ICONS[selectedCard.platform]} {imageSourceLabel(selectedCard)}
                  </span>
                </div>
              ) : (
                <div style={{ width: '100%', aspectRatio: '16 / 9', borderRadius: '20px 20px 0 0', overflow: 'hidden' }}>{coverFor(selectedCard, 'hero')}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '10px 20px 0' }}>
              <input ref={uploadInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => handleUploadImage(selectedCard, e.target.files?.[0])} />
              <button className="btn btn-sm btn-secondary" disabled={imageBusy !== null} onClick={() => uploadInput.current?.click()} style={{ fontSize: '0.75rem' }}>
                <Upload size={12} /> {imageBusy === 'upload' ? 'Mengunggah…' : 'Unggah gambar'}
              </button>
              <button className="btn btn-sm btn-secondary" disabled={imageBusy !== null} onClick={() => handleGenerateImage(selectedCard)} style={{ fontSize: '0.75rem' }} title="Cloudflare FLUX · tanpa teks di gambar · memakai kuota gratis">
                <Wand2 size={12} /> {imageBusy === 'ai' ? 'Membuat gambar…' : 'Buat gambar AI'}
              </button>
              {selectedCard.customImage && (
                <button className="btn btn-sm btn-secondary" disabled={imageBusy !== null} onClick={() => handleRemoveImage(selectedCard)} style={{ fontSize: '0.75rem', color: DANGER }}>
                  <ImageOff size={12} /> {imageBusy === 'remove' ? 'Menghapus…' : 'Hapus gambar pengganti'}
                </button>
              )}
              {selectedCard.postImage && selectedCard.customImage && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Gambar dari post tetap diutamakan.</span>
              )}
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{selectedCard.title}</h3>
                <button className="btn btn-sm btn-secondary" onClick={() => setSelectedCard(null)} style={{ padding: '6px' }} aria-label="Tutup"><X size={16} /></button>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="status-pill" style={{ background: STATUS_COLORS[selectedCard.status].bg, color: STATUS_COLORS[selectedCard.status].text, border: `1px solid ${STATUS_COLORS[selectedCard.status].border}` }}>
                  {STATUS_COLORS[selectedCard.status].label}
                </span>
                <span className="status-pill" style={{ background: 'rgba(255,255,255,0.05)', color: PLATFORM_COLORS[selectedCard.platform], border: `1px solid ${PLATFORM_COLORS[selectedCard.platform]}40`, gap: '4px' }}>
                  {PLATFORM_ICONS[selectedCard.platform]} {PLATFORM_LABELS[selectedCard.platform]}
                </span>
                {selectedCard.campaign && <span className="status-pill" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color, rgba(0,0,0,0.12))' }}>{selectedCard.campaign}</span>}
              </div>
              {/* Pillar is saved straight to content_schedules.pillar; clicking the active one clears it. */}
              <div role="group" aria-label="Pilar konten" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pilar</span>
                {(Object.keys(PILLARS) as SchedulePillar[]).map(key => {
                  const active = selectedCard.pillar === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={active}
                      onClick={async () => {
                        const saved = await persistSchedule({ ...selectedCard, pillar: active ? null : key });
                        if (saved) setSelectedCard(saved);
                      }}
                      className="status-pill"
                      style={{ cursor: 'pointer', color: active ? '#fff' : PILLARS[key].color, background: active ? PILLARS[key].color : 'transparent', border: `1px solid ${PILLARS[key].color}${active ? '' : '66'}` }}
                    >
                      {PILLARS[key].label}
                    </button>
                  );
                })}
                {!selectedCard.pillar && <span style={{ fontSize: '0.72rem', color: WARN }}>Belum diberi pilar</span>}
              </div>
              <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CalendarDays size={14} /> {formatLongDate(selectedCard.date)}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> {selectedCard.time} WIB</span>
              </div>

              {notice && <div role="alert" style={alertBox(DANGER)}>{notice}</div>}
              {isOverdue(selectedCard) && (
                <div role="alert" style={alertBox(DANGER)}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>Jadwal terlewat: waktunya sudah lewat tetapi belum ditandai Terbit.</span>
                </div>
              )}
              {duplicatesOf(selectedCard.draftId, [selectedCard.platform], selectedCard.id).length > 0 && (
                <div role="alert" style={alertBox(WARN)}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    Draf yang sama juga dijadwalkan di {PLATFORM_LABELS[selectedCard.platform]}:{' '}
                    {duplicatesOf(selectedCard.draftId, [selectedCard.platform], selectedCard.id).map(d => `${formatShortDate(d.date)} ${d.time} (${STATUS_COLORS[d.status].label})`).join(', ')}.
                    Kemungkinan posting ganda.
                  </span>
                </div>
              )}
              {selectedConflicts.length > 0 && (
                <div role="alert" style={alertBox(WARN)}>
                  <FileWarning size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    <strong>Periksa fakta sebelum tayang:</strong>
                    {selectedConflicts.map(c => <span key={c} style={{ display: 'block' }}>• {c}</span>)}
                  </span>
                </div>
              )}

              {!selectedCard.draftId ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Belum ditautkan ke draf Pustaka.</p>
              ) : !selectedDraft ? (
                <p style={{ color: WARN, fontSize: '0.8rem' }}>Draf yang ditautkan tidak ditemukan.</p>
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Draf: <strong>{selectedDraft.title}</strong> · {DRAFT_STATUS_LABELS[selectedDraft.status]}
                  {selectedCard.status !== 'draft' && selectedDraft.status !== 'disetujui' && (
                    <span style={{ display: 'block', color: WARN, marginTop: '4px' }}>Draf ini tidak lagi berstatus Disetujui. Tinjau ulang sebelum dipublikasikan.</span>
                  )}
                </p>
              )}

              {(selectedCard.caption || currentVersion(selectedDraft)?.content) && (
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {selectedCard.caption ? `Caption ${PLATFORM_LABELS[selectedCard.platform]}` : 'Teks draf (belum ada caption khusus platform)'}
                  </div>
                  <p style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap', maxHeight: '160px', overflowY: 'auto', padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.03)' }}>
                    {selectedCard.caption || currentVersion(selectedDraft)?.content}
                  </p>
                </div>
              )}

              {selectedCard.notes && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}><strong>Catatan:</strong> {selectedCard.notes}</p>
              )}

              {selectedCard.status === 'published' && selectedCard.postUrl && isPostUrl(selectedCard.postUrl) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <a href={selectedCard.postUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                    <ExternalLink size={14} /> Lihat post
                  </a>
                  <button className="btn btn-sm btn-secondary" disabled={postImageBusy} onClick={() => refreshPostImage(selectedCard)} style={{ fontSize: '0.75rem' }}>
                    <RefreshCw size={12} /> {postImageBusy ? 'Mengambil gambar…' : selectedCard.postImage ? 'Ambil ulang gambar post' : 'Ambil gambar dari post'}
                  </button>
                </div>
              )}
              {selectedCard.status === 'published' && !selectedCard.postUrl && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Tambahkan link post lewat tombol Ubah untuk menampilkan gambar dari {PLATFORM_LABELS[selectedCard.platform]}.</p>
              )}

              {selectedCard.status === 'scheduled' && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px', borderRadius: '10px', border: '1px dashed var(--border-color, rgba(0,0,0,0.15))' }}>
                  <input className="form-input" type="url" placeholder="Tempel link post (opsional)" value={publishUrl} onChange={e => setPublishUrl(e.target.value)} style={{ flex: 1 }} aria-label="Link post" />
                  <button className="btn btn-primary btn-sm" onClick={() => handleMarkPublished(selectedCard)}><Check size={14} /> Tandai Terbit</button>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => handleDeleteSchedule(selectedCard)} style={{ marginRight: 'auto', color: DANGER }}>
                <Trash2 size={16} /> Hapus
              </button>
              <button className="btn btn-secondary" onClick={() => openEditModal(selectedCard)}>
                <Pencil size={16} /> Ubah
              </button>
              {selectedCard.draftId && onOpenEditorDraft && (
                <button className="btn btn-primary" onClick={() => { onOpenEditorDraft(selectedCard.draftId!); setSelectedCard(null); }}>
                  <ArrowUpRight size={16} /> Buka di Editor
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
