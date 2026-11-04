import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, FileText, Search } from 'lucide-react';
import type { ContentDraft } from '../../types';
import { statusLabel } from '../../services/labels';

/**
 * One draft chooser for every screen that needs it.
 *
 * The Editor and the Visual Studio each used a raw <select>. That control cannot
 * show a status, cannot be searched, and its native popup rendered long titles as
 * a wall of text — the reported "looks crashed". Both screens now share this
 * component, so the choice looks and behaves the same everywhere.
 */

const STATUS_TONE: Record<string, string> = {
  draft: 'draft',
  menunggu_review: 'review',
  revisi_diminta: 'revisi',
  disetujui: 'disetujui',
  ditolak: 'ditolak',
  diarsipkan: 'arsip'
};

export interface DraftPickerProps {
  drafts: ContentDraft[];
  value?: string | null;
  onChange: (draftId: string) => void;
  label?: string;
  /** Shown inside the closed field when nothing is selected. */
  placeholder?: string;
  /** Hide archived drafts (default) — they are not work in progress. */
  excludeArchived?: boolean;
  disabled?: boolean;
}

/** Archived drafts out of the way, and duplicates collapsed by title+format. */
function useChoices(drafts: ContentDraft[], excludeArchived: boolean) {
  return useMemo(() => {
    const seen = new Set<string>();
    const list = drafts.filter(draft => {
      if (excludeArchived && draft.status === 'diarsipkan') return false;
      const key = `${draft.title.trim().toLowerCase()}::${draft.format}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return list.sort((a, b) => {
      const at = new Date(a.updatedAt || a.createdAt).getTime();
      const bt = new Date(b.updatedAt || b.createdAt).getTime();
      return bt - at;
    });
  }, [drafts, excludeArchived]);
}

export const DraftPicker: React.FC<DraftPickerProps> = ({
  drafts,
  value,
  onChange,
  label = 'Brief Hasil Generasi',
  placeholder = 'Pilih draf konten',
  excludeArchived = true,
  disabled
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const choices = useChoices(drafts, excludeArchived);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return choices;
    return choices.filter(d =>
      `${d.title} ${statusLabel(d.status)}`.toLowerCase().includes(q)
    );
  }, [choices, query]);

  const selected = choices.find(d => d.id === value) || null;

  // Close on outside click and on Escape: the native select did this for free.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => { if (!open) setQuery(''); }, [open]);

  return (
    <div className="draft-picker" ref={wrapRef}>
      {label ? <label className="form-label" id={`${listId}-label`}>{label}</label> : null}

      <button
        type="button"
        className={`draft-picker-trigger ${open ? 'is-open' : ''}`}
        onClick={() => !disabled && setOpen(v => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? `${listId}-label` : undefined}
      >
        <FileText size={15} className="draft-picker-icon" />
        <span className={`draft-picker-value ${selected ? '' : 'is-placeholder'}`}>
          {selected ? selected.title : placeholder}
        </span>
        {selected ? (
          <span className={`draft-status draft-status-${STATUS_TONE[selected.status] || 'draft'}`}>
            {statusLabel(selected.status)}
          </span>
        ) : null}
        <ChevronDown size={15} className={`draft-picker-chevron ${open ? 'is-open' : ''}`} />
      </button>

      {open && (
        <div className="draft-picker-menu" role="dialog" aria-label="Pilih draf">
          {choices.length > 6 && (
            <div className="draft-picker-search">
              <Search size={13} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Cari judul draf…"
                aria-label="Cari draf"
                autoFocus
              />
            </div>
          )}

          <ul className="draft-picker-list" role="listbox" id={listId} aria-labelledby={label ? `${listId}-label` : undefined}>
            {filtered.length === 0 && (
              <li className="draft-picker-empty">Tidak ada draf yang cocok.</li>
            )}
            {filtered.map(draft => {
              const active = draft.id === value;
              return (
                <li key={draft.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={`draft-picker-option ${active ? 'is-active' : ''}`}
                    onClick={() => { onChange(draft.id); setOpen(false); }}
                  >
                    <span className="draft-picker-option-main">
                      <span className="draft-picker-option-title">{draft.title}</span>
                      <span className="draft-picker-option-meta">
                        <span className={`draft-status draft-status-${STATUS_TONE[draft.status] || 'draft'}`}>
                          {statusLabel(draft.status)}
                        </span>
                        <span className="draft-picker-option-version">v{draft.currentVersion}</span>
                      </span>
                    </span>
                    {active ? <Check size={15} className="draft-picker-check" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
