import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/apiService';
import { useRealtimeSignal } from '../services/realtime';
import { Check, Save, Search, Users, Building2, AlertCircle, Network } from 'lucide-react';

type Creator = { id: string; name: string; email: string; workspaceIds: string[] };
type Workspace = { id: string; name: string; code: string };

export const WorkspaceMappingView: React.FC = () => {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [edits, setEdits] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setError('');
    const [ws, people] = await Promise.all([apiService.corporateWorkspaces(), apiService.corporateUsers()]);
    setWorkspaces(ws as Workspace[]);
    setCreators(people);
    setEdits(Object.fromEntries(people.map(p => [p.id, p.workspaceIds])));
  };

  const reload = useCallback(() => {
    void refresh().catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat data penugasan'));
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useRealtimeSignal(reload);

  const toggle = (ids: string[], id: string) => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];

  const save = async (id: string) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const assigned = edits[id] || [];
      await apiService.assignCorporateUser(id, assigned);
      setNotice('Penugasan workspace berhasil disimpan.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan penugasan');
    } finally {
      setBusy(false);
    }
  };

  const visibleCreators = useMemo(() => {
    if (!search.trim()) return creators;
    const q = search.toLowerCase();
    return creators.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }, [creators, search]);

  return (
    <div className="corporate-view-container">
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)' }}>
              BUMD HOLDING • PEMETAAN AKSES WORKSPACE
            </span>
          </div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Network size={28} style={{ color: 'var(--primary)' }} />
            Pengguna Workspace
          </h2>
          <p className="page-subtitle">
            Plotkan setiap kreator ke workspace mana saja yang boleh diaksesnya. Kosongkan semua untuk mencabut akses.
          </p>
        </div>
      </div>

      <div className="scheduling-action-bar">
        <div className="filter-group" style={{ minWidth: '280px' }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="scheduling-filter-select"
            style={{ width: '100%', cursor: 'text' }}
            placeholder="Cari kreator..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="scheduling-stats">
          <div className="stat-pill" style={{ background: 'rgba(99, 102, 241, 0.12)', borderColor: 'rgba(99, 102, 241, 0.35)' }}>
            <span className="stat-dot" style={{ background: '#818cf8' }} />
            <span style={{ color: '#6366f1' }}>{creators.length} Kreator · {workspaces.length} Workspace</span>
          </div>
        </div>
      </div>

      {notice && (
        <div className="card-panel" style={{ borderColor: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.08)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-emerald)' }}>
          <Check size={18} />
          <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{notice}</span>
        </div>
      )}
      {error && (
        <div className="card-panel" style={{ borderColor: 'var(--accent-rose)', background: 'rgba(244, 63, 94, 0.08)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-rose)' }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {workspaces.length === 0 ? (
        <div className="card-panel" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Building2 size={40} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
          <p style={{ fontWeight: 600 }}>Belum ada workspace perusahaan. Buat workspace terlebih dahulu.</p>
        </div>
      ) : visibleCreators.length === 0 ? (
        <div className="card-panel" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Users size={40} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
          <p style={{ fontWeight: 600 }}>{search ? `Tidak ada kreator yang cocok dengan "${search}".` : 'Belum ada kreator. Daftarkan dulu di Kreator Perusahaan.'}</p>
        </div>
      ) : (
        <div className="corporate-table-card">
          <div className="corporate-table-header">
            <div>
              <div className="corporate-table-title">
                <Network size={20} style={{ color: 'var(--primary)' }} />
                <span>Matriks Akses Kreator × Workspace</span>
              </div>
              <p className="corporate-table-subtitle">Centang workspace yang boleh diakses setiap kreator, lalu simpan.</p>
            </div>
          </div>
          {visibleCreators.map(person => {
            const currentAssigned = edits[person.id] || person.workspaceIds || [];
            const hasChanged = JSON.stringify(currentAssigned.slice().sort()) !== JSON.stringify(person.workspaceIds.slice().sort());
            return (
              <div key={person.id} style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="corporate-avatar-box"><Users size={18} /></div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{person.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{person.email}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {hasChanged && <span style={{ fontSize: '0.78rem', color: 'var(--accent-amber)', fontWeight: 600 }}>Belum disimpan</span>}
                    <button className={`btn ${hasChanged ? 'btn-primary' : 'btn-secondary'} btn-sm`} disabled={busy || !hasChanged} onClick={() => void save(person.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Save size={14} /> Simpan
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {workspaces.map(ws => {
                    const isAssigned = currentAssigned.includes(ws.id);
                    return (
                      <button
                        key={ws.id}
                        type="button"
                        onClick={() => setEdits(prev => ({ ...prev, [person.id]: toggle(currentAssigned, ws.id) }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px',
                          fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                          border: isAssigned ? '1px solid var(--primary)' : '1px dashed var(--border-subtle)',
                          background: isAssigned ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                          color: isAssigned ? 'var(--primary)' : 'var(--text-muted)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Building2 size={13} />
                        <span>{ws.name} ({ws.code})</span>
                        {isAssigned && <Check size={13} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};