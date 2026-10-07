import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { apiService } from '../services/apiService';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Lock, 
  CheckCircle2, 
  Clock, 
  User, 
  Building2, 
  FileText, 
  AlertCircle 
} from 'lucide-react';

type AuditRow = { 
  id: string; 
  createdAt: string; 
  action: string; 
  actorName: string; 
  objectType: string; 
  objectName: string; 
  workspaceName: string 
};

export const AdminAuditView: React.FC = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await apiService.adminAudit());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat jejak audit');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    return rows.filter(row => {
      const matchesType = filterType === 'all' || row.objectType.toLowerCase() === filterType.toLowerCase();
      const q = query.trim().toLowerCase();
      const matchesQuery = !q || [
        row.action, 
        row.actorName, 
        row.objectName, 
        row.objectType, 
        row.workspaceName
      ].some(val => val?.toLowerCase().includes(q));

      return matchesType && matchesQuery;
    });
  }, [rows, query, filterType]);

  const formatTime = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) 
      ? '—' 
      : date.toLocaleString('id-ID', { 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
  };

  return (
    <div className="corporate-view-container">
      {/* ── Page Header Row ── */}
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)' }}>
              SUPERADMIN • AKUNTABILITAS DAN COMPLIANCE
            </span>
          </div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldCheck size={28} style={{ color: 'var(--primary)' }} />
            Jejak Audit Sistem
          </h2>
          <p className="page-subtitle">
            Rekaman aktivitas mutasi konten, perubahan entitas, dan keputusan editorial untuk kepatuhan tata kelola BUMD.
          </p>
        </div>
      </div>

      {/* ── Compliance Security Banner ── */}
      <div 
        style={{
          padding: '16px 20px',
          borderRadius: '14px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Lock size={18} style={{ color: '#10b981' }} />
          <span style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>
            <strong>Integritas Audit Global Terjamin:</strong> Seluruh event mutasi dicatat secara terenkripsi dengan penanda waktu presisi untuk transparansi pengawasan korporat.
          </span>
        </div>
        <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle2 size={14} />
          Status: Sistem Aman &amp; Terisolasi
        </span>
      </div>

      {/* ── Action Bar ── */}
      <div className="scheduling-action-bar">
        <div className="filter-group" style={{ minWidth: '280px' }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="scheduling-filter-select"
            style={{ width: '100%', cursor: 'text' }}
            placeholder="Cari aksi, staf, objek, atau workspace..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          <select 
            className="scheduling-filter-select"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="all">Semua Tipe Objek</option>
            <option value="draft">Draf Konten</option>
            <option value="brief">Brief</option>
            <option value="workspace">Workspace</option>
            <option value="company">Perusahaan</option>
            <option value="user">Pengguna</option>
          </select>
        </div>

        <div className="scheduling-stats">
          <div className="stat-pill" style={{ background: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.35)' }}>
            <span className="stat-dot" style={{ background: '#10b981' }} />
            <span style={{ color: '#059669' }}>{rows.length} Event Terekam</span>
          </div>
        </div>
      </div>

      {/* ── Status Alerts ── */}
      {error && (
        <div className="card-panel" style={{ borderColor: 'var(--accent-rose)', background: 'rgba(244, 63, 94, 0.08)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-rose)' }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{error}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => void load()}>Coba lagi</button>
        </div>
      )}

      {/* ── Audit Table Card ── */}
      <div className="corporate-table-card">
        <div className="corporate-table-header">
          <div>
            <div className="corporate-table-title">
              <ShieldCheck size={20} style={{ color: 'var(--primary)' }} />
              <span>Log Peristiwa Sistem &amp; Transaksi Data</span>
            </div>
            <p className="corporate-table-subtitle">100 catatan transaksi data paling mutakhir dari seluruh entitas BUMD.</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spin-animation" style={{ width: 24, height: 24, border: '3px solid var(--border-subtle)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 10px' }} />
            <span>Memuat jejak audit…</span>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ShieldCheck size={44} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Belum Ada Aktivitas Tercatat</p>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Search size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <p style={{ fontSize: '0.9rem' }}>Tidak ada rekaman audit yang cocok dengan filter atau kata kunci "{query}".</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="corporate-table">
              <thead>
                <tr>
                  <th>Waktu Event</th>
                  <th>Aktor</th>
                  <th>Aksi Dilakukan</th>
                  <th>Objek Terkait</th>
                  <th>Workspace Target</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(row => (
                  <tr key={row.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ 
                          fontFamily: 'var(--font-mono)', 
                          fontSize: '0.78rem', 
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap'
                        }}>
                          {formatTime(row.createdAt)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.74rem', color: 'var(--primary)' }}>
                          {row.actorName.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                          {row.actorName}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '2px 8px', 
                        borderRadius: '6px', 
                        background: 'var(--bg-tertiary)', 
                        fontSize: '0.78rem', 
                        fontWeight: 600,
                        color: 'var(--text-primary)' 
                      }}>
                        {row.action}
                      </span>
                    </td>
                    <td>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--accent-cyan)', fontSize: '0.84rem', display: 'block' }}>
                          {row.objectName}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          {row.objectType}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {row.workspaceName || 'Global'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="corporate-table-footer">
          <span>Menampilkan {visible.length} dari {rows.length} aktivitas terbaru</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} style={{ color: 'var(--accent-emerald)' }} />
            Audit Trail Immutable
          </span>
        </div>
      </div>
    </div>
  );
};
