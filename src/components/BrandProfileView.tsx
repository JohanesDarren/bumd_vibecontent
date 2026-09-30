import React, { useState } from 'react';
import { 
  BrandProfile, 
  Workspace, 
  User, 
  TerminologyItem, 
  BannedWordItem, 
  OfficialCTAItem 
} from '../types';
import { 
  Sparkles, 
  Save, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  BookOpen,
  MessageSquare
} from 'lucide-react';

interface BrandProfileViewProps {
  brandProfile: BrandProfile;
  activeWorkspace: Workspace;
  activeUser: User;
  onSaveProfile: (profile: BrandProfile) => void;
}

export const BrandProfileView: React.FC<BrandProfileViewProps> = ({
  brandProfile,
  activeWorkspace,
  activeUser,
  onSaveProfile
}) => {
  const [profile, setProfile] = useState<BrandProfile>(brandProfile);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Terminology add
  const [newTerm, setNewTerm] = useState('');
  const [newDef, setNewDef] = useState('');

  // Banned word add
  const [newBanned, setNewBanned] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newReplacement, setNewReplacement] = useState('');

  // CTA add
  const [newCtaLabel, setNewCtaLabel] = useState('');
  const [newCtaText, setNewCtaText] = useState('');

  const isAdmin = activeUser.role === 'admin';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(profile);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleAddTerm = () => {
    if (!newTerm.trim()) return;
    const item: TerminologyItem = {
      term: newTerm.trim(),
      definition: newDef.trim() || 'Definisi resmi BUMD',
      mandatory: true
    };
    setProfile({ ...profile, terminology: [...profile.terminology, item] });
    setNewTerm('');
    setNewDef('');
  };

  const handleDeleteTerm = (index: number) => {
    const list = [...profile.terminology];
    list.splice(index, 1);
    setProfile({ ...profile, terminology: list });
  };

  const handleAddBanned = () => {
    if (!newBanned.trim()) return;
    const item: BannedWordItem = {
      word: newBanned.trim(),
      reason: newReason.trim() || 'Melanggar kaidah penyiaran publik BUMD',
      suggestedReplacement: newReplacement.trim() || 'istilah baku terukur'
    };
    setProfile({ ...profile, bannedWords: [...profile.bannedWords, item] });
    setNewBanned('');
    setNewReason('');
    setNewReplacement('');
  };

  const handleDeleteBanned = (index: number) => {
    const list = [...profile.bannedWords];
    list.splice(index, 1);
    setProfile({ ...profile, bannedWords: list });
  };

  const handleAddCta = () => {
    if (!newCtaLabel.trim() || !newCtaText.trim()) return;
    const item: OfficialCTAItem = {
      id: `cta-${Date.now()}`,
      label: newCtaLabel.trim(),
      text: newCtaText.trim(),
      channel: 'Semua Kanal'
    };
    setProfile({ ...profile, officialCTAs: [...profile.officialCTAs, item] });
    setNewCtaLabel('');
    setNewCtaText('');
  };

  const handleDeleteCta = (id: string) => {
    setProfile({
      ...profile,
      officialCTAs: profile.officialCTAs.filter(c => c.id !== id)
    });
  };

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Profil Organisasi & Panduan Merek</h2>
          <p className="page-subtitle">
            Standarisasi bahasa, terminologi wajib, dan larangan istilah untuk menjaga konsistensi materi komunikasi <strong>{activeWorkspace.name}</strong>.
          </p>
        </div>

        {isAdmin && (
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={handleSave}
          >
            <Save size={16} />
            <span>{saveSuccess ? 'Tersimpan!' : 'Simpan Perubahan'}</span>
          </button>
        )}
      </div>

      {!isAdmin && (
        <div style={{ padding: '12px 18px', borderRadius: '10px', background: 'var(--bg-tertiary)', marginBottom: '20px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          🔒 Anda sedang membuka dalam mode tampilan peran <strong>{activeUser.role.toUpperCase()}</strong>. Hanya <strong>Administrator / Knowledge Owner</strong> yang memiliki izin memperbarui panduan merek.
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '28px', alignItems: 'start' }}>
        {/* Left Column: Organization & Tone Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card-panel">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--primary)" />
              <span>Identitas Resmi Organisasi</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Nama Badan Usaha / Lembaga</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={profile.organizationName}
                  onChange={e => setProfile({ ...profile, organizationName: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unit Kerja Penanggung Jawab</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={profile.unitDepartment}
                  onChange={e => setProfile({ ...profile, unitDepartment: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Bahasa Baku Default</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={profile.defaultLanguage}
                  onChange={e => setProfile({ ...profile, defaultLanguage: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Penafian Resmi (Official Disclaimer)</label>
                <textarea 
                  className="form-textarea" 
                  rows={2}
                  value={profile.officialDisclaimer}
                  onChange={e => setProfile({ ...profile, officialDisclaimer: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
            </div>
          </div>

          {/* Tone of Voice */}
          <div className="card-panel">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>
              Pilar Nada Bahasa (Tone of Voice)
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {profile.toneOfVoice.map((tone, idx) => (
                <span 
                  key={idx}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)'
                  }}
                >
                  ✓ {tone}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Terminology, Banned Words, and Official CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Official Terminology */}
          <div className="card-panel">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} color="var(--accent-cyan)" />
              <span>Glosarium Istilah Resmi (Terminology)</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {profile.terminology.map((t, idx) => (
                <div 
                  key={idx}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      {t.term}
                    </span>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {t.definition}
                    </p>
                  </div>
                  {isAdmin && (
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDeleteTerm(idx)}
                      style={{ padding: '4px' }}
                    >
                      <Trash2 size={14} color="#f43f5e" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isAdmin && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr auto', gap: '8px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Istilah resmi..."
                  value={newTerm}
                  onChange={e => setNewTerm(e.target.value)}
                />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Definisi / konteks penggunaan..."
                  value={newDef}
                  onChange={e => setNewDef(e.target.value)}
                />
                <button type="button" className="btn btn-secondary" onClick={handleAddTerm}>
                  <Plus size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Banned Words */}
          <div className="card-panel">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fb7185' }}>
              <AlertTriangle size={18} />
              <span>Larangan Istilah Publik (Banned Words)</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {profile.bannedWords.map((b, idx) => (
                <div 
                  key={idx}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(244, 63, 94, 0.08)',
                    border: '1px solid rgba(244, 63, 94, 0.25)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fb7185' }}>
                      <s>"{b.word}"</s>
                    </span>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Alasan: {b.reason}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#34d399', fontWeight: 600 }}>
                      Gunakan gantinya: "{b.suggestedReplacement}"
                    </div>
                  </div>
                  {isAdmin && (
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDeleteBanned(idx)}
                      style={{ padding: '4px' }}
                    >
                      <Trash2 size={14} color="#f43f5e" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isAdmin && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Kata dilarang..."
                  value={newBanned}
                  onChange={e => setNewBanned(e.target.value)}
                />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Alasan larangan..."
                  value={newReason}
                  onChange={e => setNewReason(e.target.value)}
                />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Kata pengganti..."
                  value={newReplacement}
                  onChange={e => setNewReplacement(e.target.value)}
                />
                <button type="button" className="btn btn-secondary" onClick={handleAddBanned}>
                  <Plus size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Official Call to Actions */}
          <div className="card-panel">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} color="var(--primary)" />
              <span>Call to Action (CTA) Resmi Terdaftar</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {profile.officialCTAs.map(c => (
                <div 
                  key={c.id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                      [{c.label}]
                    </span>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {c.text}
                    </p>
                  </div>
                  {isAdmin && (
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDeleteCta(c.id)}
                      style={{ padding: '4px' }}
                    >
                      <Trash2 size={14} color="#f43f5e" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isAdmin && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '8px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Nama label CTA..."
                  value={newCtaLabel}
                  onChange={e => setNewCtaLabel(e.target.value)}
                />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Kalimat lengkap ajakan Call to Action..."
                  value={newCtaText}
                  onChange={e => setNewCtaText(e.target.value)}
                />
                <button type="button" className="btn btn-secondary" onClick={handleAddCta}>
                  <Plus size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
