import React, { useEffect, useState, useMemo } from 'react';
import { apiService, type CompanyDashboard } from '../services/apiService';
import type { ActiveTab } from '../types';
import { 
  Building2, 
  Users, 
  FileEdit, 
  Clock, 
  CheckCircle2, 
  Database, 
  ShieldAlert, 
  ArrowUpRight, 
  Filter, 
  Search, 
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';

type Props = { 
  onNavigate: (tab: ActiveTab) => void; 
  onOpenWorkspace: (id: string) => void; 
};

export const CorporateDashboardView: React.FC<Props> = ({ onNavigate, onOpenWorkspace }) => {
  const [data, setData] = useState<CompanyDashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [wsSearch, setWsSearch] = useState('');

  useEffect(() => {
    let active = true;
    apiService.corporateDashboard()
      .then(result => { if (active) setData(result); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Gagal memuat dasbor korporat'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const sum = (key: 'creatorCount' | 'draftCount' | 'approvedCount' | 'reviewCount' | 'sourceCount' | 'briefCount' | 'auditCount') => 
    data?.workspaces.reduce((total, ws) => total + ws[key], 0) ?? 0;

  const filteredWorkspaces = useMemo(() => {
    if (!data?.workspaces) return [];
    if (!wsSearch.trim()) return data.workspaces;
    const q = wsSearch.toLowerCase();
    return data.workspaces.filter(ws => 
      ws.name.toLowerCase().includes(q) || 
      ws.code.toLowerCase().includes(q) || 
      ws.city.toLowerCase().includes(q) || 
      ws.sector.toLowerCase().includes(q)
    );
  }, [data?.workspaces, wsSearch]);

  if (loading) {
    return (
      <div className="corporate-view-container">
        <div className="card-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
          <div className="spin-animation" style={{ width: 24, height: 24, border: '3px solid var(--border-subtle)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Memuat ringkasan eksekutif perusahaan…</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="corporate-view-container">
        <div className="card-panel" style={{ borderColor: 'var(--accent-rose)', background: 'rgba(244, 63, 94, 0.05)', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent-rose)', marginBottom: '8px' }}>
            <ShieldAlert size={22} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Gagal Memuat Dasbor Korporat</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{error || 'Data perusahaan tidak ditemukan.'}</p>
        </div>
      </div>
    );
  }

  const reviewTotal = sum('reviewCount');
  const approvedTotal = sum('approvedCount');
  const draftTotal = sum('draftCount');

  return (
    <div className="corporate-view-container">
      {/* ── Page Header Row ── */}
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)' }}>
              BUMD HOLDING • RINGKASAN EKSEKUTIF
            </span>
          </div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Building2 size={28} style={{ color: 'var(--primary)' }} />
            Dasbor Eksekutif: {data.company.name}
          </h2>
          <p className="page-subtitle">
            Pemantauan holistik aktivitas produksi konten, status disposisi review, dan tata kelola unit kerja BUMD lintas cabang.
          </p>
        </div>
      </div>

      {/* ── Corporate Action Bar ── */}
      <div className="scheduling-action-bar">
        <button 
          className="btn btn-primary" 
          onClick={() => onNavigate('corporate_management')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Building2 size={16} />
          <span>Kelola Workspace</span>
        </button>

        <button 
          className="btn btn-secondary" 
          onClick={() => onNavigate('corporate_users')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Users size={16} />
          <span>Kelola Kreator</span>
        </button>

        {/* Live Stat Pills */}
        <div className="scheduling-stats">
          <div className="stat-pill" style={{ background: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.35)' }}>
            <span className="stat-dot" style={{ background: '#38bdf8' }} />
            <span style={{ color: '#0284c7' }}>{data.workspaces.length} Workspace</span>
          </div>
          <div className="stat-pill" style={{ background: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.35)' }}>
            <span className="stat-dot" style={{ background: '#f59e0b' }} />
            <span style={{ color: '#d97706' }}>{reviewTotal} Review</span>
          </div>
          <div className="stat-pill" style={{ background: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.35)' }}>
            <span className="stat-dot" style={{ background: '#10b981' }} />
            <span style={{ color: '#059669' }}>{approvedTotal} Disetujui</span>
          </div>
        </div>
      </div>

      {/* ── KPI Metric Cards Grid ── */}
      <div className="corporate-kpi-grid">
        <div className="corporate-kpi-card">
          <div className="corporate-kpi-header">
            <span className="corporate-kpi-label">Total Workspace</span>
            <div className="corporate-kpi-icon-wrap" style={{ background: 'rgba(2, 132, 199, 0.12)', color: 'var(--primary)' }}>
              <Layers size={20} />
            </div>
          </div>
          <div className="corporate-kpi-value">{data.workspaces.length}</div>
          <div className="corporate-kpi-hint">Unit kerja aktif terdaftar</div>
        </div>

        <div className="corporate-kpi-card">
          <div className="corporate-kpi-header">
            <span className="corporate-kpi-label">Pengguna & Staf</span>
            <div className="corporate-kpi-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-indigo)' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="corporate-kpi-value">{data.userCount}</div>
          <div className="corporate-kpi-hint">{sum('creatorCount')} penugasan kreator</div>
        </div>

        <div className="corporate-kpi-card">
          <div className="corporate-kpi-header">
            <span className="corporate-kpi-label">Draf Konten</span>
            <div className="corporate-kpi-icon-wrap" style={{ background: 'rgba(6, 182, 212, 0.12)', color: 'var(--accent-cyan)' }}>
              <FileEdit size={20} />
            </div>
          </div>
          <div className="corporate-kpi-value">{draftTotal}</div>
          <div className="corporate-kpi-hint">{sum('briefCount')} brief telah dirumuskan</div>
        </div>

        <div className="corporate-kpi-card">
          <div className="corporate-kpi-header">
            <span className="corporate-kpi-label">Menunggu Review</span>
            <div className="corporate-kpi-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.12)', color: 'var(--accent-amber)' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="corporate-kpi-value">{reviewTotal}</div>
          <div className="corporate-kpi-hint">Memerlukan disposisi korporat</div>
        </div>

        <div className="corporate-kpi-card">
          <div className="corporate-kpi-header">
            <span className="corporate-kpi-label">Konten Disetujui</span>
            <div className="corporate-kpi-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent-emerald)' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="corporate-kpi-value">{approvedTotal}</div>
          <div className="corporate-kpi-hint">Siap rilis &amp; terpublikasi</div>
        </div>

        <div className="corporate-kpi-card">
          <div className="corporate-kpi-header">
            <span className="corporate-kpi-label">Dokumen Pengetahuan</span>
            <div className="corporate-kpi-icon-wrap" style={{ background: 'rgba(147, 51, 234, 0.12)', color: '#9333ea' }}>
              <Database size={20} />
            </div>
          </div>
          <div className="corporate-kpi-value">{sum('sourceCount')}</div>
          <div className="corporate-kpi-hint">Arsip RAG grounded BUMD</div>
        </div>
      </div>

      {/* ── Section: Workspaces Table ── */}
      <div className="corporate-table-card">
        <div className="corporate-table-header">
          <div>
            <div className="corporate-table-title">
              <Building2 size={20} style={{ color: 'var(--primary)' }} />
              <span>Unit Kerja &amp; Workspace BUMD</span>
            </div>
            <p className="corporate-table-subtitle">
              Distribusi indikator konten dan operasional per unit kerja dalam naungan {data.company.name}.
            </p>
          </div>
          
          <div className="filter-group" style={{ minWidth: '240px' }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="scheduling-filter-select" 
              style={{ width: '100%', cursor: 'text' }}
              placeholder="Cari workspace, kode, kota..." 
              value={wsSearch}
              onChange={e => setWsSearch(e.target.value)}
            />
          </div>
        </div>

        {data.workspaces.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Building2 size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Belum ada workspace terdaftar pada perusahaan ini.</p>
            <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>Buka menu Workspace Perusahaan untuk mendaftarkan unit kerja pertama Anda.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="corporate-table">
              <thead>
                <tr>
                  <th>Unit Kerja &amp; Kode</th>
                  <th>Lokasi / Sektor</th>
                  <th>Kreator</th>
                  <th>Total Draf</th>
                  <th>Review</th>
                  <th>Disetujui</th>
                  <th>Dokumen</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkspaces.map(ws => (
                  <tr key={ws.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="corporate-avatar-box">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                            {ws.name}
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {ws.code}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {ws.city || 'Indonesia'}
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {ws.sector || 'Umum'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ws.creatorCount}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>staf</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ws.draftCount}</span>
                    </td>
                    <td>
                      {ws.reviewCount > 0 ? (
                        <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', fontWeight: 700, fontSize: '0.78rem' }}>
                          {ws.reviewCount} butuh aksi
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>0</span>
                      )}
                    </td>
                    <td>
                      <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>{ws.approvedCount}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)' }}>{ws.sourceCount}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => onOpenWorkspace(ws.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span>Buka</span>
                        <ExternalLink size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="corporate-table-footer">
          <span>Menampilkan {filteredWorkspaces.length} dari {data.workspaces.length} unit kerja terdaftar</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>Holding ID: {data.company.id}</span>
        </div>
      </div>

      {/* ── Section: Recent Content Activity & Corporate Users (Side-by-side or stacked) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
        
        {/* Recent Content */}
        <div className="corporate-table-card">
          <div className="corporate-table-header">
            <div>
              <div className="corporate-table-title">
                <FileEdit size={18} style={{ color: 'var(--accent-cyan)' }} />
                <span>Aktivitas Konten Terkini</span>
              </div>
              <p className="corporate-table-subtitle">Draf dan materi publikasi terbaru dari seluruh unit kerja.</p>
            </div>
          </div>

          {data.recentDrafts.length === 0 ? (
            <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Belum ada materi konten dibuat di workspace mana pun.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="corporate-table">
                <thead>
                  <tr>
                    <th>Judul Konten</th>
                    <th>Workspace</th>
                    <th>Status</th>
                    <th>Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentDrafts.slice(0, 6).map(draft => {
                    const isApproved = draft.status === 'disetujui';
                    const isReview = draft.status === 'menunggu_review';
                    return (
                      <tr key={draft.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.86rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {draft.title}
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            {draft.format}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {draft.workspaceName}
                          </span>
                        </td>
                        <td>
                          <span 
                            style={{ 
                              padding: '2px 8px', 
                              borderRadius: '9999px', 
                              fontSize: '0.72rem', 
                              fontWeight: 700,
                              background: isApproved ? 'rgba(16, 185, 129, 0.12)' : isReview ? 'rgba(245, 158, 11, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                              color: isApproved ? '#10b981' : isReview ? '#d97706' : 'var(--text-secondary)'
                            }}
                          >
                            {draft.status.replaceAll('_', ' ')}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(draft.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Corporate Team Members */}
        <div className="corporate-table-card">
          <div className="corporate-table-header">
            <div>
              <div className="corporate-table-title">
                <Users size={18} style={{ color: 'var(--accent-indigo)' }} />
                <span>Pengguna Korporat ({data.users.length})</span>
              </div>
              <p className="corporate-table-subtitle">Akun pengawas dan kreator terdaftar dalam holding.</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('corporate_users')}>
              Kelola
            </button>
          </div>

          {data.users.length === 0 ? (
            <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Belum ada staf terdaftar dalam perusahaan.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="corporate-table">
                <thead>
                  <tr>
                    <th>Nama &amp; Peran</th>
                    <th>Penugasan Unit Kerja</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.slice(0, 6).map(user => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary)' }}>
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                              {user.name}
                            </div>
                            <span className={`corporate-role-pill ${user.role}`}>
                              {user.role}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {user.workspaces.length ? user.workspaces.join(', ') : 'Semua unit kerja perusahaan'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
