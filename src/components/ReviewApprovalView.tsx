import React, { useState } from 'react';
import { 
  ContentDraft, 
  User, 
  Workspace, 
  ApprovalInfo, 
  ReviewComment 
} from '../types';
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  MessageSquare, 
  ShieldCheck, 
  FileText, 
  Clock, 
  Send, 
  Award,
  ChevronRight,
  BookOpen
} from 'lucide-react';

interface ReviewApprovalViewProps {
  drafts: ContentDraft[];
  selectedDraftId?: string;
  onSelectDraft: (draftId: string) => void;
  activeUser: User;
  activeWorkspace: Workspace;
  onApprove: (draftId: string, approvalInfo: ApprovalInfo) => void;
  onRequestRevision: (draftId: string, commentText: string) => void;
  onAddComment: (draftId: string, comment: ReviewComment) => void;
}

export const ReviewApprovalView: React.FC<ReviewApprovalViewProps> = ({
  drafts,
  selectedDraftId,
  onSelectDraft,
  activeUser,
  activeWorkspace,
  onApprove,
  onRequestRevision,
  onAddComment
}) => {
  const currentDraft = drafts.find(d => d.id === selectedDraftId) || drafts[0];

  const [commentInput, setCommentInput] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');

  const isReviewerOrAdmin = activeUser.role === 'reviewer' || activeUser.role === 'admin';

  if (!currentDraft) {
    return (
      <div className="card-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <CheckCircle2 size={48} color="var(--accent-emerald)" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>No Drafts in the Queue</h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '6px' }}>
          All drafts have been processed or no new drafts have been submitted for review yet.
        </p>
      </div>
    );
  }

  const latestVer = currentDraft.versions[0];

  const handleConfirmApproval = () => {
    const dispNumber = `DSP/${activeWorkspace.code}/${new Date().getMonth() + 1}/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`;
    const info: ApprovalInfo = {
      approvedBy: activeUser.name,
      approvedAt: new Date().toISOString(),
      decision: 'approved',
      notes: approvalNotes,
      dispositionNumber: dispNumber
    };
    onApprove(currentDraft.id, info);
    setShowApproveModal(false);
  };

  const handleConfirmRevision = () => {
    if (!revisionNotes.trim()) {
      alert('Please enter the required revision notes.');
      return;
    }
    onRequestRevision(currentDraft.id, revisionNotes);
    setShowRevisionModal(false);
    setRevisionNotes('');
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    const newComment: ReviewComment = {
      id: `cmt-${Date.now()}`,
      authorName: activeUser.name,
      authorRole: activeUser.role,
      text: commentInput,
      createdAt: new Date().toISOString(),
      resolved: false
    };

    onAddComment(currentDraft.id, newComment);
    setCommentInput('');
  };

  return (
    <div>
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-amber)', textTransform: 'uppercase' }}>
              PR & Public Communication Control Division
            </span>
            <span className={`status-pill ${currentDraft.status}`}>
              {currentDraft.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <h2 className="page-title">Content Review & Approval</h2>
          <p className="page-subtitle">
            Fact verification against Board Decrees/SOPs, enforcement of the official BUMD language style, and issuance of the approval disposition sheet.
          </p>
        </div>

        {/* Action Buttons for Reviewer / Approver */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isReviewerOrAdmin ? (
            <>
              <button 
                className="btn btn-warning"
                onClick={() => setShowRevisionModal(true)}
                disabled={currentDraft.status !== 'menunggu_review'}
              >
                <AlertCircle size={16} />
                <span>Request Revision</span>
              </button>

              <button 
                className="btn btn-success"
                onClick={() => setShowApproveModal(true)}
                disabled={currentDraft.status !== 'menunggu_review'}
              >
                <CheckCircle2 size={16} />
                <span>Approve Draft (Disposition)</span>
              </button>
            </>
          ) : (
            <div style={{ padding: '8px 14px', borderRadius: '10px', background: 'var(--bg-tertiary)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
               Read-only mode: Only Reviewers / Admins are authorized to issue approvals.
            </div>
          )}
        </div>
      </div>

      {/* Main Review Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1.8fr) minmax(320px, 1.1fr)', gap: '24px', alignItems: 'start' }}>
        {/* Left Column: Draft Queue Selector */}
        <div className="card-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Draft Queue
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {drafts.map(d => (
              <div 
                key={d.id}
                onClick={() => onSelectDraft(d.id)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  background: d.id === currentDraft.id ? 'var(--bg-tertiary)' : 'transparent',
                  border: d.id === currentDraft.id ? '1px solid var(--primary)' : '1px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {d.title}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`status-pill ${d.status}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                    {d.status === 'menunggu_review' ? 'Needs Review' : d.status}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    v{d.currentVersionon}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Column: Draft Inspection & Verification Stamp */}
        <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Header info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Created by <strong>{currentDraft.creatorName}</strong> • {new Date(currentDraft.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px' }}>
                {currentDraft.title}
              </h3>
            </div>

            {/* Official Approval Stamp if Approved */}
            {currentDraft.status === 'disetujui' && currentDraft.approvalInfo && (
              <div className="disposition-stamp">
                Status: OFFICIALLY APPROVED<br/>
                <span style={{ fontSize: '0.65rem', fontWeight: 500 }}>
                  {currentDraft.approvalInfo.dispositionNumber}
                </span>
              </div>
            )}
          </div>

          {/* Disposition Information Box if Approved */}
          {currentDraft.approvalInfo && (
            <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.35)', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Award size={24} color="#10b981" />
              <div style={{ fontSize: '0.82rem' }}>
                <strong style={{ color: '#10b981' }}>Official Disposition Issued:</strong> {currentDraft.approvalInfo.dispositionNumber}<br/>
                Approved by <strong>{currentDraft.approvalInfo.approvedBy}</strong> on {new Date(currentDraft.approvalInfo.approvedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.<br/>
                <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{currentDraft.approvalInfo.notes}"</span>
              </div>
            </div>
          )}

          {/* Full Draft Content View */}
          <div style={{ padding: '18px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-subtle)', whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: '0.92rem' }}>
            {latestVer?.content}
          </div>

          {/* Citations referenced */}
          <div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={16} color="var(--primary)" />
              <span>Factual References for This Draft:</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {latestVer?.citations?.map((c, idx) => (
                <div 
                  key={idx}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    borderLeft: '4px solid var(--accent-emerald)',
                    fontSize: '0.78rem'
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                     {c.documentTitle} ({c.section})
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '2px' }}>
                    "{c.excerpt}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Review Comments Thread */}
        <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <MessageSquare size={18} color="var(--accent-cyan)" />
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Review Notes & History</h4>
          </div>

          {/* Comments List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
            {currentDraft.comments.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No review comments on this draft yet.
              </div>
            ) : (
              currentDraft.comments.map(cmt => (
                <div 
                  key={cmt.id}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {cmt.authorName}
                    </span>
                    <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(2, 132, 199, 0.15)', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                      {cmt.authorRole.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {new Date(cmt.createdAt).toLocaleDateString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {cmt.text}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Comment Box */}
          <form onSubmit={handleSendComment} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
            <textarea 
              className="form-textarea" 
              rows={3}
              placeholder="Add a review note or response..."
              value={commentInput}
              onChange={e => setCommentInput(e.target.value)}
            />
            <button 
              type="submit" 
              className="btn btn-primary btn-sm"
              disabled={!commentInput.trim()}
              style={{ alignSelf: 'flex-end' }}
            >
              <Send size={14} />
              <span>Send Note</span>
            </button>
          </form>
        </div>
      </div>

      {/* Approval Modal */}
      {showApproveModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} />
                <span>Issue Approval Disposition Sheet</span>
              </h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                By approving this draft, its status will change to <strong>Approved</strong> and it will be ready to publish or export in official formats.
              </p>
              <div className="form-group">
                <label className="form-label">Disposition Notes / PR Instructions *</label>
                <textarea 
                  className="form-textarea"
                  value={approvalNotes}
                  onChange={e => setApprovalNotes(e.target.value)}
                  rows={3}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowApproveModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-success"
                onClick={handleConfirmApproval}
              >
                Issue Official Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Revision Modal */}
      {showRevisionModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} />
                <span>Draft Revision Request</span>
              </h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                The draft status will change to <strong>Revision Requested</strong>. The Creator will receive these correction instructions in the editor workspace.
              </p>
              <div className="form-group">
                <label className="form-label">Points That Need Correction *</label>
                <textarea 
                  className="form-textarea"
                  value={revisionNotes}
                  onChange={e => setRevisionNotes(e.target.value)}
                  rows={4}
                  placeholder="e.g.: Please shorten the second paragraph and include the HaloTirta hotline number..."
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowRevisionModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-warning"
                onClick={handleConfirmRevision}
              >
                Send Revision Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
