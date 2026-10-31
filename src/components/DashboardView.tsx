import React from 'react';
import { 
  ContentDraft, 

  BrandProfile, 
  User, 
  Workspace,
  ActiveTab
} from '../types';
import { 
  FileText, 
  CheckCircle2, 
  Sparkles, 
  AlertTriangle, 
  ShieldCheck,
  PlusCircle,
  Eye,
  ArrowRight
} from 'lucide-react';

interface DashboardViewProps {
  drafts: ContentDraft[];

  brandProfile: BrandProfile;
  activeUser: User;
  activeWorkspace: Workspace;
  onNavigate: (tab: ActiveTab) => void;
  onSelectDraft: (draftId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  drafts,

  brandProfile,
  activeUser,
  activeWorkspace,
  onNavigate,
  onSelectDraft
}) => {

  return (
    <div>
      {/* Top Banner / Welcome */}
      <div 
        className="card-panel" 
        style={{ 
          marginBottom: '28px',
          background: 'linear-gradient(135deg, rgba(13, 12, 189, 0.15), rgba(6, 182, 212, 0.08))',
          border: '1px solid rgba(13, 12, 189, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)' }}>
                Portal Kerja  Terpadu
              </span>
              <span className="status-pill disetujui" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                <ShieldCheck size={12} /> Grounding Terverifikasi
              </span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Selamat datang, {activeUser.name}
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '650px' }}>
              Workspace <strong>{activeWorkspace.name}</strong>. Buat brief, hasilkan konten, edit versi, lalu pilih versi untuk visualisasi.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn btn-primary"
              onClick={() => onNavigate('brief_studio')}
            >
              <PlusCircle size={16} />
              <span>Buat Konten Baru</span>
            </button>

          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="card-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(13, 12, 189, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <FileText size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Draf</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800 }}>{drafts.length}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>{drafts.filter(d => d.format === 'copy_caption').length} Caption • {drafts.filter(d => d.format === 'naskah_singkat').length} Video</div>
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '24px', marginBottom: '32px' }}>
        {/* Brand & Grounding Guidelines Quickcard */}
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Panduan Tone & Terminologi Resmi</h3>
            </div>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('brand_profile')}
            >
              <span>Edit Profil</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Tone of Voice Disetujui
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {brandProfile.toneOfVoice.map((tone, idx) => (
                  <span key={idx} style={{ padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-tertiary)', fontSize: '0.75rem', border: '1px solid var(--border-subtle)' }}>
                    {tone}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Kata Terlarang
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {brandProfile.bannedWords.map((b, idx) => (
                  <span key={idx} style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(244, 63, 94, 0.1)', color: '#fb7185', fontSize: '0.75rem', border: '1px solid rgba(244, 63, 94, 0.25)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={12} />
                    <s>{b.word}</s>
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '4px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(13, 12, 189, 0.08)', border: '1px dashed rgba(13, 12, 189, 0.3)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <strong>Prinsip Anti-Halusinasi :</strong> VibeContent menolak klaim publik tanpa referensi SK atau SOP resmi. Jika data tidak terdaftar, draf akan ditandai <code>[Perlu Verifikasi]</code>.
            </div>
          </div>
        </div>
      </div>

      {/* Recent Drafts Table */}
      <div className="card-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Draf Konten Terbaru</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Semua draf yang dibuat di workspace {activeWorkspace.name}</p>
          </div>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('library')}
          >
            <span>Buka Semua di Pustaka</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Judul Draf</th>
                <th style={{ padding: '12px 14px' }}>Format</th>
                <th style={{ padding: '12px 14px' }}>Status Alur Kerja</th>
                <th style={{ padding: '12px 14px' }}>Grounding</th>
                <th style={{ padding: '12px 14px' }}>Versi</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {drafts.slice(0, 5).map(d => {
                const latestVer = d.versions[0];
                return (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {d.title}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                      {d.format === 'copy_caption' && 'Caption Media Sosial'}
                      {d.format === 'teks_promosi' && 'Siaran Pers'}
                      {d.format === 'naskah_singkat' && 'Naskah Video 9:16'}
                      {d.format === 'brief_visual' && 'Grafis Visual'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {latestVer?.unsupportedClaims?.length === 0 ? (
                        <span className="grounding-badge verified">
                          <CheckCircle2 size={12} /> {latestVer.citations.length} Referensi
                        </span>
                      ) : (
                        <span className="grounding-badge warning">
                          <AlertTriangle size={12} /> Perlu Verifikasi
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                      v{d.currentVersion}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          onSelectDraft(d.id);
                          onNavigate('editor');
                        }}
                      >
                        <Eye size={12} />
                        <span>Buka</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
