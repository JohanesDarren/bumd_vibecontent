export type UserRole = 'creator' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  workspaceId: string;
  title: string;
  department: string;
}

export interface Workspace {
  id: string;
  name: string;
  code: string;
  sector: string;
  city: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  description: string;
}

export type DocumentStatus = 'aktif' | 'menunggu_persetujuan' | 'usang' | 'gagal_diproses';

export type DocumentCategory = 
  | 'sk_direksi' 
  | 'sop_layanan' 
  | 'tarif_resmi' 
  | 'laporan_tahunan' 
  | 'panduan_merek' 
  | 'siaran_pers';

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  section: string;
  page?: number;
  content: string;
  keywords: string[];
}

export interface KnowledgeDocument {
  id: string;
  workspaceId: string;
  title: string;
  category: DocumentCategory;
  owner: string;
  version: string;
  effectiveDate: string;
  status: DocumentStatus;
  uploadDate: string;
  fileSize: string;
  summary: string;
  chunks: KnowledgeChunk[];
}

export interface TerminologyItem {
  term: string;
  definition: string;
  mandatory: boolean;
}

export interface BannedWordItem {
  word: string;
  reason: string;
  suggestedReplacement: string;
}

export interface OfficialCTAItem {
  id: string;
  label: string;
  text: string;
  channel: string;
}

export interface BrandProfile {
  workspaceId: string;
  organizationName: string;
  unitDepartment: string;
  defaultLanguage: string;
  targetAudiences: string[];
  toneOfVoice: string[];
  terminology: TerminologyItem[];
  bannedWords: BannedWordItem[];
  officialCTAs: OfficialCTAItem[];
  approvedChannels: string[];
  brandGuidelinesSummary: string;
  officialDisclaimer: string;
}

export type ContentFormat = 'copy_caption' | 'teks_promosi' | 'naskah_singkat' | 'brief_visual';

export interface ContentBrief {
  id: string;
  workspaceId: string;
  title: string;
  campaign?: string;
  targetAudience: string;
  format: ContentFormat;
  channel: string;
  tone: string;
  keyMessage: string;
  cta: string;
  limitations?: string;
  selectedProduct?: string;
  language: string;
  createdAt: string;
  createdBy: string;
}

export interface GroundedCitation {
  id: string;
  documentId: string;
  documentTitle: string;
  section: string;
  page?: number;
  excerpt: string;
  relevanceScore: number;
  verified: boolean;
  claimExcerpt: string;
}

export interface QualityCheck {
  briefCompliance: {
    score: number;
    details: string;
    passed: boolean;
  };
  toneCompliance: {
    score: number;
    details: string;
    passed: boolean;
  };
  factualGrounding: {
    score: number;
    groundedClaims: number;
    totalClaims: number;
    ungroundedClaims: string[];
    passed: boolean;
  };
  bannedWordsFound: string[];
  ctaCompliance: {
    hasCta: boolean;
    details: string;
  };
  overallStatus: 'siap_review' | 'perlu_verifikasi';
}

export interface VideoScriptScene {
  sceneNumber: number;
  visualDirection: string;
  audioNarration: string;
  textOnScreen: string;
  citationId?: string;
  citationNote?: string;
}

export interface DraftVersionon {
  versionNumber: number;
  content: string;
  scenes?: VideoScriptScene[];
  citations: GroundedCitation[];
  unsupportedClaims: string[];
  qualityCheck: QualityCheck;
  createdAt: string;
  createdBy: string;
  changeSummary: string;
}

export type DraftStatus = 'draft' | 'menunggu_review' | 'revisi_diminta' | 'disetujui' | 'ditolak' | 'diarsipkan';

export interface ReviewComment {
  id: string;
  authorName: string;
  authorRole: UserRole;
  text: string;
  createdAt: string;
  targetSnippet?: string;
  resolved: boolean;
}

export interface ApprovalInfo {
  approvedBy: string;
  approvedAt: string;
  decision: 'approved' | 'revision_requested' | 'rejected';
  notes: string;
  dispositionNumber: string;
}

export interface VisualAsset {
  id: string;
  headline: string;
  subheadline: string;
  aspectRatio: '1:1' | '9:16' | '16:9';
  primaryColor: string;
  accentColor: string;
  badgeText: string;
  ctaText: string;
  disclaimer: string;
  visualPrompt: string;
  templateStyle: 'corporate' | 'modern_bold' | 'clean_service' | 'infographic';
  generatedImageUrl?: string;
}

export interface ContentDraft {
  id: string;
  workspaceId: string;
  briefId: string;
  title: string;
  format: ContentFormat;
  status: DraftStatus;
  currentVersionon: number;
  versions: DraftVersionon[];
  comments: ReviewComment[];
  approvalInfo?: ApprovalInfo;
  visualAsset?: VisualAsset;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  creatorName: string;
}

export interface AuditLog {
  id: string;
  workspaceId: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  objectType: 'dokumen' | 'draft' | 'brief' | 'review' | 'brand_profile' | 'ekspor';
  objectId: string;
  objectName: string;
  details: string;
}

export type ActiveTab = 
  | 'dashboard' 
  | 'brief_studio' 
  | 'editor'  | 'visual_studio' 
  | 'content_scheduling'

  | 'library' 
  | 'brand_profile' 
  | 'user_management'
  | 'audit_log'
  | 'settings_help';
