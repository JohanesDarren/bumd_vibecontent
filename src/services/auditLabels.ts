// Audit events are stored with the action text the server wrote at the time,
// some in English ("Draft saved") and some in Indonesian ("Jadwal Dihapus").
// Stored values stay as they are (tests and exports depend on them); the views
// translate them for display so the log reads in one language.
const ACTIONS: Record<string, string> = {
  'draft saved': 'Draf Disimpan',
  'draft approved': 'Draf Disetujui',
  'draft rejected': 'Draf Ditolak',
  'draft submitted for review': 'Draf Diajukan Review',
  'brief deleted': 'Brief Dihapus',
  'schedule created': 'Jadwal Dibuat',
  'schedule saved': 'Jadwal Disimpan',
  'schedule published': 'Jadwal Terbit',
  'company created': 'Perusahaan Dibuat',
  'company deleted': 'Perusahaan Dihapus',
  'workspace created': 'Workspace Dibuat',
  'workspace deleted': 'Workspace Dihapus',
  'orphan vectors purged': 'Vektor Yatim Dibersihkan',
};

const OBJECT_TYPES: Record<string, string> = {
  draft: 'Draf',
  schedule: 'Jadwal',
  company: 'Perusahaan',
  workspace: 'Workspace',
  brief: 'Brief',
  user: 'Pengguna',
  document: 'Dokumen',
  knowledge: 'Knowledge Base',
  kms: 'Knowledge Base',
};

export const auditActionLabel = (action: string) => ACTIONS[action.trim().toLowerCase()] || action;
export const auditObjectTypeLabel = (type: string) => OBJECT_TYPES[type.trim().toLowerCase()] || type;
