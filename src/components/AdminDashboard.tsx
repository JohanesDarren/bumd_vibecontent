import React, { useCallback, useEffect, useState } from 'react';
import { apiService, type AdminOverview } from '../services/apiService';
import { SuperadminView } from './SuperadminView';
import { AdminWorkspacesView } from './AdminWorkspacesView';
import { AdminAccountsView } from './AdminAccountsView';
import { AdminCreatorsView } from './AdminCreatorsView';
import { AdminAuditView } from './AdminAuditView';
import { 
  LayoutDashboard, 
  Building2, 
  Layers, 
  Users, 
  UserCheck, 
  ShieldCheck, 
  LogOut, 
  ShieldAlert, 
  ArrowUpRight, 
  ExternalLink,
  FileEdit,
  Database,
  Lock,
  CheckCircle2
} from 'lucide-react';

type Tab = 'ringkasan' | 'perusahaan' | 'workspace' | 'pengguna' | 'kreator' | 'audit';

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'ringkasan', label: 'Ringkasan Admin', icon: LayoutDashboard },
  { id: 'perusahaan', label: 'Data Master BUMD', icon: Building2 },
  { id: 'workspace', label: 'Manajemen Workspace', icon: Layers },
  { id: 'pengguna', label: 'Pengguna & Peran', icon: Users },
  { id: 'kreator', label: 'Kreator Perusahaan', icon: UserCheck },
  { id: 'audit', label: 'Jejak Audit', icon: ShieldCheck },
];

export const AdminDashboard: React.FC<{ onOpen: (id: string) => void; onLogout: () => void; embedded?: boolean }> = ({ onOpen, onLogout, embedded = false }) => {
  const [activeTab, setActiveTab] = useState<Tab>('ringkasan');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOverview(await apiService.adminOverview());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat ringkasan sistem');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = overview
    ? [
        { label: 'Total Perusahaan', value: overview.companies.length, hint: 'Entitas induk terdaftar', icon: Building2, color: 'var(--primary)', bg: 'rgba(2, 132, 199, 0.12)' },
        { label: 'Total Workspace', value: overview.workspaces, hint: 'Unit kerja operasional aktif', icon: Layers, color: 'var(--accent-cyan)', bg: 'rgba(6, 182, 212, 0.12)' },
        { label: 'Total Pengguna', value: overview.users.total, hint: `${overview.users.superadmins} superadmin · ${overview.users.corporate} korporat · ${overview.users.creators} kreator`, icon: Users, color: 'var(--accent-indigo)', bg: 'rgba(99, 102, 241, 0.12)' },
        { label: 'Draf Konten & Aset', value: overview.drafts, hint: `${overview.knowledgeSources} dokumen knowledge base RAG`, icon: FileEdit, color: 'var(--accent-amber)', bg: 'rgba(245, 158, 11, 0.12)' },
      ]
    : [];

  const mainContent = (
    <div className="w-full">
      {embedded && (
        <nav aria-label="Menu administrasi" className="scheduling-action-bar" style={{ marginBottom: 24 }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab(tab.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {activeTab === 'ringkasan' && (
        <div className="corporate-view-container">
          {/* Header */}
          <div className="page-header-row">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)' }}>
                  SUPERADMIN • KONTROL SISTEM KORPORAT
                </span>
              </div>
              <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <LayoutDashboard size={28} style={{ color: 'var(--primary)' }} />
                Ringkasan Sistem &amp; Tata Kelola
              </h2>
              <p className="page-subtitle">
                Kondisi terkini seluruh perusahaan induk, unit kerja workspace BUMD, dan akun pengguna pada platform.
              </p>
            </div>

            <button 
              type="button" 
              className="btn btn-primary"
              onClick={() => setActiveTab('perusahaan')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Building2 size={16} />
              <span>Kelola Entitas</span>
            </button>
          </div>

          {/* Error banner */}
          {error && (
            <div className="card-panel" style={{ borderColor: 'var(--accent-rose)', background: 'rgba(244, 63, 94, 0.06)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-rose)' }}>
                <ShieldAlert size={18} />
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{error}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => void load()}>Coba lagi</button>
            </div>
          )}

          {/* KPI Cards Grid */}
          <div className="corporate-kpi-grid">
            {stats.map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="corporate-kpi-card">
                  <div className="corporate-kpi-header">
                    <span className="corporate-kpi-label">{stat.label}</span>
                    <div className="corporate-kpi-icon-wrap" style={{ background: stat.bg, color: stat.color }}>
                      <Icon size={20} />
                    </div>
                  </div>
                  <div className="corporate-kpi-value">{loading ? '—' : stat.value}</div>
                  <div className="corporate-kpi-hint">{stat.hint}</div>
                </div>
              );
            })}
          </div>

          {/* Companies Master Table Card */}
          <div className="corporate-table-card">
            <div className="corporate-table-header">
              <div>
                <div className="corporate-table-title">
                  <Building2 size={20} style={{ color: 'var(--primary)' }} />
                  <span>Data Master Entitas BUMD</span>
                </div>
                <p className="corporate-table-subtitle">Perusahaan induk beserta jumlah unit kerja workspace dan akun terhubung.</p>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveTab('perusahaan')}
              >
                Buka Menu Data Master
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="corporate-table">
                <thead>
                  <tr>
                    <th>Entitas Induk</th>
                    <th>Jumlah Workspace</th>
                    <th>Akun Terhubung</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.companies || []).map(company => (
                    <tr key={company.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="corporate-avatar-box">
                            <Building2 size={18} />
                          </div>
                          <div>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem', display: 'block' }}>
                              {company.name}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              ID: {company.id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{company.workspaceCount}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>workspace</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{company.userCount}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>pengguna</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          type="button" 
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => setActiveTab('perusahaan')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <span>Kelola</span>
                          <ArrowUpRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="corporate-table-footer">
              <span>
                {loading ? 'Memuat ringkasan…' : !overview?.companies.length ? 'Belum ada perusahaan terdaftar.' : `Total ${overview.companies.length} entitas induk BUMD terdaftar.`}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} style={{ color: 'var(--accent-emerald)' }} />
                Database Terhubung
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'perusahaan' && <SuperadminView />}
      {activeTab === 'workspace' && <AdminWorkspacesView onOpen={onOpen} />}
      {activeTab === 'pengguna' && <AdminAccountsView />}
      {activeTab === 'kreator' && <AdminCreatorsView />}
      {activeTab === 'audit' && <AdminAuditView />}
    </div>
  );

  if (embedded) {
    return mainContent;
  }

  return (
    <div className="flex flex-col md:flex-row w-full min-h-screen bg-[var(--bg-primary)]">
      {/* ── Sticky Full-Height Corporate Admin Sidebar ── */}
      <aside 
        className="w-full md:w-64 shrink-0 md:sticky md:top-0 h-auto md:h-screen bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] flex flex-col justify-between p-4 z-40 overflow-y-auto"
      >
        <div>
          {/* Header Brand */}
          <div className="flex items-center gap-3 px-2 py-3 mb-4 border-b border-[var(--border-subtle)]">
            <div className="brand-icon-gem" style={{ width: 36, height: 36, borderRadius: 10 }}>
              V
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                VibeContent
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Admin &amp; Korporat
              </span>
            </div>
          </div>

          <div className="nav-section-title" style={{ paddingLeft: '8px', marginBottom: '8px' }}>
            Menu Administrasi
          </div>

          {/* Nav Tab Buttons */}
          <nav className="flex flex-col gap-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={isActive}
                  className={`nav-item-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  style={{ width: '100%' }}
                >
                  <span className="nav-item-icon">
                    <Icon size={18} />
                  </span>
                  <span className="nav-item-label">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Tenant Status & Logout */}
        <div className="flex flex-col gap-3 pt-4 border-t border-[var(--border-subtle)] mt-6">
          <div className="tenant-status-box" style={{ padding: '10px 12px' }}>
            <div className="tenant-status-header" style={{ fontSize: '0.72rem' }}>
              <Lock size={12} />
              <span>Multi-Tenant Enterprise</span>
            </div>
            <div className="tenant-status-body" style={{ fontSize: '0.72rem' }}>
              Akses Superadmin Tingkat Sistem. Isolasi basis data terverifikasi.
            </div>
          </div>

          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', color: 'var(--accent-rose)' }}
          >
            <LogOut size={16} />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* ── Main Dynamic Viewport ── */}
      <main className="content-viewport" style={{ flex: 1, minWidth: 0, padding: '28px 36px' }}>
        {activeTab === 'ringkasan' && (
          <div className="corporate-view-container">
            {/* Header */}
            <div className="page-header-row">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)' }}>
                    SUPERADMIN • KONTROL SISTEM KORPORAT
                  </span>
                </div>
                <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <LayoutDashboard size={28} style={{ color: 'var(--primary)' }} />
                  Ringkasan Sistem &amp; Tata Kelola
                </h2>
                <p className="page-subtitle">
                  Kondisi terkini seluruh perusahaan induk, unit kerja workspace BUMD, dan akun pengguna pada platform.
                </p>
              </div>

              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => setActiveTab('perusahaan')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Building2 size={16} />
                <span>Kelola Entitas</span>
              </button>
            </div>

            {/* Error banner */}
            {error && (
              <div className="card-panel" style={{ borderColor: 'var(--accent-rose)', background: 'rgba(244, 63, 94, 0.06)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-rose)' }}>
                  <ShieldAlert size={18} />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{error}</span>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => void load()}>Coba lagi</button>
              </div>
            )}

            {/* KPI Cards Grid */}
            <div className="corporate-kpi-grid">
              {stats.map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="corporate-kpi-card">
                    <div className="corporate-kpi-header">
                      <span className="corporate-kpi-label">{stat.label}</span>
                      <div className="corporate-kpi-icon-wrap" style={{ background: stat.bg, color: stat.color }}>
                        <Icon size={20} />
                      </div>
                    </div>
                    <div className="corporate-kpi-value">{loading ? '—' : stat.value}</div>
                    <div className="corporate-kpi-hint">{stat.hint}</div>
                  </div>
                );
              })}
            </div>

            {/* Companies Master Table Card */}
            <div className="corporate-table-card">
              <div className="corporate-table-header">
                <div>
                  <div className="corporate-table-title">
                    <Building2 size={20} style={{ color: 'var(--primary)' }} />
                    <span>Data Master Entitas BUMD</span>
                  </div>
                  <p className="corporate-table-subtitle">Perusahaan induk beserta jumlah unit kerja workspace dan akun terhubung.</p>
                </div>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActiveTab('perusahaan')}
                >
                  Buka Menu Data Master
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="corporate-table">
                  <thead>
                    <tr>
                      <th>Entitas Induk</th>
                      <th>Jumlah Workspace</th>
                      <th>Akun Terhubung</th>
                      <th style={{ textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(overview?.companies || []).map(company => (
                      <tr key={company.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="corporate-avatar-box">
                              <Building2 size={18} />
                            </div>
                            <div>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem', display: 'block' }}>
                                {company.name}
                              </span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                ID: {company.id}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{company.workspaceCount}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>workspace</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{company.userCount}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>pengguna</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            type="button" 
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => setActiveTab('perusahaan')}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <span>Kelola</span>
                            <ArrowUpRight size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="corporate-table-footer">
                <span>
                  {loading ? 'Memuat ringkasan…' : !overview?.companies.length ? 'Belum ada perusahaan terdaftar.' : `Total ${overview.companies.length} entitas induk BUMD terdaftar.`}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--accent-emerald)' }} />
                  Database Terhubung
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'perusahaan' && <SuperadminView />}
        {activeTab === 'workspace' && <AdminWorkspacesView onOpen={onOpen} />}
        {activeTab === 'pengguna' && <AdminAccountsView />}
        {activeTab === 'kreator' && <AdminCreatorsView />}
        {activeTab === 'audit' && <AdminAuditView />}
      </main>
    </div>
  );
};
