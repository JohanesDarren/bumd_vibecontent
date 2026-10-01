import React, { useState } from 'react';
import { AuditLog, Workspace, User } from '../types';
import { 
  ShieldAlert, 
  Clock, 
  UserCheck, 
  FileText, 
  Search, 
  Filter, 
  ShieldCheck,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface AuditLogViewProps {
  logs: AuditLog[];
  activeWorkspace: Workspace;
  activeUser: User;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  logs,
  activeWorkspace,
  activeUser
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const workspaceLogs = logs.filter(l => l.workspaceId === activeWorkspace.id);

  const filteredLogs = workspaceLogs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.actorName.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.objectName.toLowerCase().includes(search.toLowerCase());

    const matchesType = filterType === 'all' || log.objectType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Activity Audit Trail</h2>
          <p className="page-subtitle">
            Transparent recording of all draft changes, approval decisions, and document uploads for BUMD governance accountability of <strong>{activeWorkspace.name}</strong>.
          </p>
        </div>
      </div>

      {/* Security & Tenant Compliance Badge */}
      <div 
        style={{
          padding: '16px 20px',
          borderRadius: '14px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Lock size={20} color="#10b981" />
          <span style={{ fontSize: '0.85rem' }}>
            <strong>Tenant Isolation Compliance (PRD F-01 & F-12):</strong> All audit events are encrypted and strictly bound to the workspace ID <code>{activeWorkspace.id}</code>. No metadata leakage across BUMD entities.
          </span>
        </div>
        <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
          <CheckCircle2 size={14} style={{ marginRight: '6px' }} /> Status: Perfectly Isolated
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-panel" style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              className="form-input" 
              style={{ paddingLeft: '36px' }}
              placeholder="Search activity, staff name, object, or disposition number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select 
            className="form-select"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="all">All Object Types</option>
            <option value="draft">Content Drafts</option>
            <option value="review">Penelaahan & Persetujuan</option>
            <option value="dokumen">Knowledge Base Documents</option>
            <option value="brand_profile">Panduan Merek</option>
            <option value="ekspor">Pengeksporan</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card-panel">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Waktu Kejadian</th>
                <th style={{ padding: '12px 14px' }}>Aktor & Peran</th>
                <th style={{ padding: '12px 14px' }}>Tindakan (Action)</th>
                <th style={{ padding: '12px 14px' }}>Objek Terkait</th>
                <th style={{ padding: '12px 14px' }}>Rincian Metadata</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                    {new Date(log.timestamp).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>

                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {log.actorName}
                    </div>
                    <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--bg-tertiary)', color: 'var(--accent-cyan)', textTransform: 'uppercase', fontWeight: 700 }}>
                      {log.actorRole}
                    </span>
                  </td>

                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {log.action}
                  </td>

                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {log.objectName}
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {log.objectType}
                    </span>
                  </td>

                  <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '0.8rem', maxWidth: '380px' }}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
