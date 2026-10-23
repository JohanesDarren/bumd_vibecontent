import React, { useMemo, useState } from 'react';
import { ContentDraft, Workspace } from '../types';
import { MessageSquare, Search, Trash2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface BriefHistoryRailProps {
  drafts: ContentDraft[];
  activeWorkspace: Workspace;
  selectedDraftId?: string | null;
  onOpenDraft: (draftId: string) => void;
  onDeleteDraft?: (draftId: string) => void;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} menit lalu`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} jam lalu`;
  const day = Math.floor(hour / 24);
  if (day === 1) return 'kemarin';
  if (day < 30) return `${day} hari lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

/**
 * Brief history rail, styled like a chat thread list: newest first, one row per
 * generated brief. Selecting a row opens that draft in the editor.
 */
export const BriefHistoryRail: React.FC<BriefHistoryRailProps> = ({
  drafts,
  activeWorkspace,
  selectedDraftId,
  onOpenDraft,
  onDeleteDraft
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const list = drafts.filter(d => d.status !== 'diarsipkan');
    const filtered = query.trim()
      ? list.filter(d => d.title.toLowerCase().includes(query.trim().toLowerCase()))
      : list;
    return [...filtered].sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
  }, [drafts, query]);

  if (collapsed) {
    return (
      <aside className="brief-rail collapsed" aria-label="Riwayat brief">
        <button
          type="button"
          className="brief-rail-toggle"
          onClick={() => setCollapsed(false)}
          title="Tampilkan riwayat brief"
          aria-label="Tampilkan riwayat brief"
        >
          <PanelLeftOpen size={18} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="brief-rail" aria-label="Riwayat brief">
      <div className="brief-rail-head">
        <div className="brief-rail-title">
          <MessageSquare size={16} />
          <span>Riwayat Brief</span>
        </div>
        <button
          type="button"
          className="brief-rail-toggle"
          onClick={() => setCollapsed(true)}
          title="Sembunyikan riwayat"
          aria-label="Sembunyikan riwayat brief"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      <div className="brief-rail-search">
        <Search size={14} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari brief…"
          aria-label="Cari brief"
        />
      </div>

      <div className="brief-rail-list" role="list">
        {rows.length === 0 ? (
          <p className="brief-rail-empty">
            Belum ada brief di workspace {activeWorkspace.code}.
          </p>
        ) : rows.map(draft => {
          const active = draft.id === selectedDraftId;
          return (
            <div
              key={draft.id}
              role="listitem"
              className={`brief-rail-item ${active ? 'active' : ''}`}
            >
              <button
                type="button"
                className="brief-rail-item-main"
                onClick={() => onOpenDraft(draft.id)}
                title={draft.title}
              >
                <span className="brief-rail-item-title">{draft.title}</span>
                <span className="brief-rail-item-meta">
                  v{draft.currentVersionon} · {relativeTime(draft.updatedAt || draft.createdAt)}
                </span>
              </button>
              {onDeleteDraft && (
                <button
                  type="button"
                  className="brief-rail-item-delete"
                  onClick={() => onDeleteDraft(draft.id)}
                  title="Hapus brief"
                  aria-label={`Hapus ${draft.title}`}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
