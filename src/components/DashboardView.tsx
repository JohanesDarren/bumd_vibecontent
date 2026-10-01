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
  Clock, 
  CheckCircle2, 

  ArrowRight, 
  Sparkles, 
  AlertTriangle, 
  ShieldCheck,
  PlusCircle,
  Eye
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
  const pendingReviewDrafts = drafts.filter(d => d.status === 'menunggu_review');
  const approvedDrafts = drafts.filter(d => d.status === 'disetujui');


  return (
    <div>
      {/* Top Banner / Welcome */}
      <div 
        className="card-panel" 
        style={{ 
          marginBottom: '28px',
          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15), rgba(6, 182, 212, 0.08))',
          border: '1px solid rgba(2, 132, 199, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)' }}>
                Unified BUMD Work Portal
              </span>
              <span className="status-pill disetujui" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                <ShieldCheck size={12} /> Grounding Verified
              </span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Welcome, {activeUser.name}
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '650px' }}>
              Official workspace of <strong>{activeWorkspace.name}</strong>. Production of promotional drafts, press releases, and multimedia content is guaranteed to source only from officially approved documents by the board.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn btn-primary"
              onClick={() => onNavigate('brief_studio')}
            >
              <PlusCircle size={16} />
              <span>Create New Content</span>
            </button>

          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="card-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(2, 132, 199, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <FileText size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Drafts</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800 }}>{drafts.length}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>{drafts.filter(d => d.format === 'copy_caption').length} Caption • {drafts.filter(d => d.format === 'naskah_singkat').length} Video</div>
          </div>
        </div>

        <div className="card-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-amber)' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Review</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-amber)' }}>{pendingReviewDrafts.length}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Needs reviewer disposition</div>
          </div>
        </div>

        <div className="card-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Approved Ready to Use</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{approvedDrafts.length}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Disposition signed</div>
          </div>
        </div>


      </div>

      {/* Main Grid: Pending Approvals & Recent Drafts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Review Queue Card */}
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="var(--accent-amber)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Review Queue</h3>
            </div>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('review_approval')}
            >
              <span>Open Review</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {pendingReviewDrafts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} color="var(--accent-emerald)" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
              <p style={{ fontSize: '0.88rem' }}>No drafts are currently awaiting approval.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingReviewDrafts.map(d => (
                <div 
                  key={d.id}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {d.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      By: <strong>{d.creatorName}</strong> • Version {d.currentVersionon} • {d.format.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                  <button 
                    className="btn btn-warning btn-sm"
                    onClick={() => {
                      onSelectDraft(d.id);
                      onNavigate('review_approval');
                    }}
                  >
                    <span>Review</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Brand & Grounding Guidelines Quickcard */}
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Official Tone & Terminology Guidelines</h3>
            </div>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('brand_profile')}
            >
              <span>Edit Profile</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Tone of Voice Approved
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
                Banned Terms
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

            <div style={{ marginTop: '4px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(2, 132, 199, 0.08)', border: '1px dashed rgba(2, 132, 199, 0.3)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <strong>BUMD Anti-Hallucination Principle:</strong> VibeContent rejects public claims without official SK or SOP references. If data is unregistered, draft will be marked <code>[Needs Verification]</code>.
            </div>
          </div>
        </div>
      </div>

      {/* Recent Drafts Table */}
      <div className="card-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Latest Content Drafts</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>All drafts created in the workspace of {activeWorkspace.name}</p>
          </div>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('library')}
          >
            <span>Open All in Library</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Draft Title</th>
                <th style={{ padding: '12px 14px' }}>Format</th>
                <th style={{ padding: '12px 14px' }}>Workflow Status</th>
                <th style={{ padding: '12px 14px' }}>Grounding</th>
                <th style={{ padding: '12px 14px' }}>Version</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Action</th>
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
                      {d.format === 'copy_caption' && 'Social Media Caption'}
                      {d.format === 'teks_promosi' && 'Press Release'}
                      {d.format === 'naskah_singkat' && '9:16 Video Script'}
                      {d.format === 'brief_visual' && 'Visual Graphic'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={`status-pill ${d.status}`}>
                        {d.status === 'draft' && 'Draft'}
                        {d.status === 'menunggu_review' && 'Pending Review'}
                        {d.status === 'revisi_diminta' && 'Revision Requested'}
                        {d.status === 'disetujui' && 'Approved'}
                        {d.status === 'diarsipkan' && 'Archived'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {latestVer?.unsupportedClaims?.length === 0 ? (
                        <span className="grounding-badge verified">
                          <CheckCircle2 size={12} /> {latestVer.citations.length} References
                        </span>
                      ) : (
                        <span className="grounding-badge warning">
                          <AlertTriangle size={12} /> Needs Verification
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                      v{d.currentVersionon}
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
                        <span>Open</span>
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
