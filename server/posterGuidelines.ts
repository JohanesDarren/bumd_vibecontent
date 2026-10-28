/**
 * POSTER DESIGN GUIDELINES — extracted from the company poster system.
 *
 * Source: `D:\1. ASET JAGOAI\rag-poster-template` (template/rag-poster.html,
 * aset/rag-poster.css, aset/fonts.txt, dokumentasi/schema.json, prompt-rag.md).
 *
 * This module turns that visual system into knowledge the image model can use:
 * the eight themes with their real palettes and typefaces, the thirteen layout
 * archetypes with the copy slots each one expects, the four canvas sizes, and
 * the ornament language per theme.
 *
 * Everything here is derived from the source files, not invented.
 */

export type PosterTheme = 'korporat' | 'gelap' | 'editorial' | 'aurora' | 'alam' | 'blueprint' | 'ceria' | 'swiss';
export type PosterLayout =
  | 'hero' | 'split' | 'event' | 'speaker' | 'quote' | 'stats' | 'list'
  | 'product' | 'hiring' | 'announcement' | 'collage' | 'profile' | 'agenda';
export type PosterSize = 'portrait' | 'square' | 'story' | 'a4';

export type ThemeSpec = {
  background: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  accent2: string;
  /** Data-visualisation ramp, c1..c6, in order. */
  ramp: string[];
  headingFont: string;
  bodyFont: string;
  /** Ornament character, described so the image model can reproduce it. */
  ornament: string;
  dark: boolean;
};

export const THEMES: Record<PosterTheme, ThemeSpec> = {
  korporat: {
    background: '#fff',
    surface: '#f3f5f9',
    ink: '#0f1f3d',
    muted: '#5a6782',
    accent: '#c8962e',
    accent2: '#1b3a6b',
    // The CSS ramp references variables; resolve them to the concrete values so
    // the image model receives real colours, not CSS syntax.
    ramp: ['#1b3a6b', '#c8962e', '#4f7cc4', '#8fa6c9', '#d9b56a', '#2d5aa0'],
    headingFont: "Manrope",
    bodyFont: "Manrope",
    ornament: "Clean institutional frame: a short accent bar at the top-left, a large thin concentric circle bleeding off the bottom-right, and a slim vertical accent2 bar at the top-right.",
    dark: false
  },
  gelap: {
    background: '#0b0d17',
    surface: '#141828',
    ink: '#e8ecff',
    muted: '#8f98bf',
    accent: '#22d3ee',
    accent2: '#a78bfa',
    ramp: ['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#60a5fa'],
    headingFont: "Sora",
    bodyFont: "Sora",
    ornament: "Neon night: soft radial glows of accent2 from the top-right and accent from the bottom-left over near-black.",
    dark: true
  },
  editorial: {
    background: '#f6f1e7',
    surface: '#ece5d6',
    ink: '#1d1a16',
    muted: '#6b6257',
    accent: '#1f3a93',
    accent2: '#b5452b',
    ramp: ['#1f3a93', '#b5452b', '#c9a227', '#5b7f6e', '#8a6fb0', '#7a8fb8'],
    headingFont: "Fraunces",
    bodyFont: "Source Sans 3",
    ornament: "Print editorial: warm paper background, no gradients, generous margins, serif display type.",
    dark: false
  },
  aurora: {
    background: '#f7f5ff',
    surface: '#ffffff',
    ink: '#1a1433',
    muted: '#625b7f',
    accent: '#7c3aed',
    accent2: '#ec4899',
    ramp: ['#7c3aed', '#ec4899', '#38bdf8', '#f59e0b', '#10b981', '#a78bfa'],
    headingFont: "Bricolage Grotesque",
    bodyFont: "Bricolage Grotesque",
    ornament: "Soft aurora: three overlapping radial glows (accent2, sky blue, accent) bleeding from opposite corners.",
    dark: false
  },
  alam: {
    background: '#f4f1e8',
    surface: '#e6ecdc',
    ink: '#1f2d1f',
    muted: '#5d6b58',
    accent: '#2f6b3a',
    accent2: '#c08a2b',
    ramp: ['#2f6b3a', '#c08a2b', '#7aa874', '#8c5a3c', '#4f8a8b', '#c9b77a'],
    headingFont: "Outfit",
    bodyFont: "Nunito Sans",
    ornament: "Organic calm: muted earth palette, soft flat surfaces, no harsh gradients.",
    dark: false
  },
  blueprint: {
    background: '#f5f8fc',
    surface: '#e8f0f9',
    ink: '#0b2340',
    muted: '#4d6585',
    accent: '#0a66c2',
    accent2: '#f59e0b',
    ramp: ['#0a66c2', '#f59e0b', '#06b6d4', '#64748b', '#22c55e', '#93c5fd'],
    headingFont: "IBM Plex Sans",
    bodyFont: "IBM Plex Sans",
    ornament: "Technical grid: a faint accent-coloured grid at 32px, precise alignment, engineering feel.",
    dark: false
  },
  ceria: {
    background: '#fffaf5',
    surface: '#fff1e6',
    ink: '#2b2a3a',
    muted: '#6f6c80',
    accent: '#ff6b6b',
    accent2: '#2ec4b6',
    ramp: ['#ff6b6b', '#2ec4b6', '#ffc145', '#6c8cff', '#b388ff', '#ff9f6b'],
    headingFont: "Nunito",
    bodyFont: "Nunito",
    ornament: "Playful: warm off-white base with vivid coral and teal accents, rounded shapes.",
    dark: false
  },
  swiss: {
    background: '#fff',
    surface: '#f2f2f2',
    ink: '#111',
    muted: '#555',
    accent: '#e3000f',
    accent2: '#111',
    ramp: ['#e3000f', '#111', '#8a8a8a', '#ff6a5c', '#c7c7c7', '#5c0006'],
    headingFont: "Archivo",
    bodyFont: "Archivo",
    ornament: "Strict Swiss modernism: pure white, hairline black rules, one red accent, tight grid, flush-left type.",
    dark: false
  },
};

/**
 * The thirteen layout archetypes from the poster system, each with the copy
 * slots it expects. `subject` says what the picture must feature, so the image
 * model knows whether to render a person, a product, or no subject at all.
 */
export type LayoutSpec = {
  /** What the poster is for. */
  purpose: string;
  /** What the image must contain. */
  subject: 'person' | 'product' | 'scene' | 'none' | 'collage';
  /** Copy fields this layout renders, in visual order. */
  slots: string[];
  /** How much text area the layout reserves. */
  copyWeight: 'low' | 'medium' | 'high';
};

export const LAYOUTS: Record<PosterLayout, LayoutSpec> = {
  hero: {
    purpose: 'Campaign or major announcement led by one full-bleed photograph.',
    subject: 'person',
    slots: ['eyebrow', 'title', 'subtitle', 'date', 'location', 'cta'],
    copyWeight: 'low'
  },
  split: {
    purpose: 'Programme or service: photograph above, text panel below.',
    subject: 'person',
    slots: ['eyebrow', 'title', 'body', 'date', 'platform', 'cta'],
    copyWeight: 'medium'
  },
  event: {
    purpose: 'Seminar or workshop with a date block and speaker portraits.',
    subject: 'person',
    slots: ['eyebrow', 'title', 'subtitle', 'day', 'month', 'year', 'time', 'location', 'speakers', 'cta', 'qr'],
    copyWeight: 'high'
  },
  speaker: {
    purpose: 'Webinar or talkshow led by one main speaker in a blob crop.',
    subject: 'person',
    slots: ['eyebrow', 'title', 'speakers', 'date', 'time', 'platform', 'cta'],
    copyWeight: 'medium'
  },
  quote: {
    purpose: 'Quotation or testimonial with a circular author portrait.',
    subject: 'person',
    slots: ['quote', 'author'],
    copyWeight: 'low'
  },
  stats: {
    purpose: 'Infographic of achievements: 3 to 6 numbers.',
    subject: 'none',
    slots: ['eyebrow', 'title', 'items', 'note', 'sources'],
    copyWeight: 'high'
  },
  list: {
    purpose: 'Tips, steps or education: 3 to 6 items.',
    subject: 'scene',
    slots: ['eyebrow', 'title', 'items', 'cta'],
    copyWeight: 'high'
  },
  product: {
    purpose: 'Promotion with price, discount and features.',
    subject: 'product',
    slots: ['eyebrow', 'title', 'discount', 'oldPrice', 'price', 'priceNote', 'features', 'cta'],
    copyWeight: 'high'
  },
  hiring: {
    purpose: 'Job vacancy with requirements and benefits.',
    subject: 'collage',
    slots: ['eyebrow', 'title', 'requirements', 'benefits', 'location', 'cta'],
    copyWeight: 'high'
  },
  announcement: {
    purpose: 'Official notice with letterhead, body paragraphs and a signature.',
    subject: 'none',
    slots: ['eyebrow', 'title', 'reference', 'body', 'date', 'time', 'details', 'signature'],
    copyWeight: 'high'
  },
  collage: {
    purpose: 'Activity documentation in 3 to 5 photographs.',
    subject: 'collage',
    slots: ['eyebrow', 'title', 'body', 'date'],
    copyWeight: 'low'
  },
  profile: {
    purpose: 'Employee appreciation or person profile with a framed portrait and badge.',
    subject: 'person',
    slots: ['eyebrow', 'name', 'role', 'award', 'achievements', 'quote'],
    copyWeight: 'medium'
  },
  agenda: {
    purpose: 'Event rundown: up to 9 timed rows.',
    subject: 'none',
    slots: ['eyebrow', 'title', 'date', 'location', 'items'],
    copyWeight: 'high'
  }
};

/** Canvas sizes from the poster system, with the real pixel dimensions. */
export const SIZES: Record<PosterSize, { w: number; h: number; name: string; ratio: string }> = {
  portrait: { w: 1080, h: 1350, name: 'Instagram 4:5', ratio: '4:5' },
  square: { w: 1080, h: 1080, name: 'Square 1:1', ratio: '1:1' },
  story: { w: 1080, h: 1920, name: 'Story 9:16', ratio: '9:16' },
  a4: { w: 1080, h: 1527, name: 'A4 / A3 print', ratio: '1:1.414' }
};

export function normalizeTheme(value: unknown): PosterTheme {
  const key = typeof value === 'string' ? value.toLowerCase().trim() : '';
  return (Object.keys(THEMES) as PosterTheme[]).includes(key as PosterTheme) ? (key as PosterTheme) : 'korporat';
}

export function normalizeLayout(value: unknown): PosterLayout {
  const key = typeof value === 'string' ? value.toLowerCase().trim() : '';
  return (Object.keys(LAYOUTS) as PosterLayout[]).includes(key as PosterLayout) ? (key as PosterLayout) : 'hero';
}

export function normalizeSize(value: unknown): PosterSize {
  const key = typeof value === 'string' ? value.toLowerCase().trim() : '';
  return (Object.keys(SIZES) as PosterSize[]).includes(key as PosterSize) ? (key as PosterSize) : 'portrait';
}

/**
 * Compose the design-guideline block appended to the core prompt.
 *
 * This is knowledge, not instructions: it states the palette, the typefaces,
 * the ornament character, the layout archetype and the copy weight, so the image
 * model can build a composition that matches the company's poster system instead
 * of inventing one.
 */
export function posterGuidelineBlock(input: {
  theme?: unknown;
  layout?: unknown;
  size?: unknown;
  accent?: unknown;
  accent2?: unknown;
}): string {
  const themeKey = normalizeTheme(input.theme);
  const layoutKey = normalizeLayout(input.layout);
  const sizeKey = normalizeSize(input.size);
  const theme = THEMES[themeKey];
  const layout = LAYOUTS[layoutKey];
  const size = SIZES[sizeKey];

  // A brand accent overrides the theme accent, exactly like meta.accent does.
  const accent = typeof input.accent === 'string' && /^#[0-9a-f]{3,8}$/i.test(input.accent) ? input.accent : theme.accent;
  const accent2 = typeof input.accent2 === 'string' && /^#[0-9a-f]{3,8}$/i.test(input.accent2) ? input.accent2 : theme.accent2;

  const subject =
    layout.subject === 'person'
      ? 'one person as the focal figure'
      : layout.subject === 'product'
        ? 'the product alone as a hero object'
        : layout.subject === 'collage'
          ? 'a collage of photographs'
          : layout.subject === 'scene'
            ? 'a supporting scene, no person'
            : 'no photographic subject, typographic only';

  const copy =
    layout.copyWeight === 'low'
      ? 'one compact copy block'
      : layout.copyWeight === 'medium'
        ? 'a moderate copy block plus one support area'
        : 'several stacked copy blocks in clear hierarchy';

  // Kept deliberately compact: the image model prompt has a hard length budget,
  // and the template already carries the art direction.
  // Dark themes need the background stated as a requirement, not a suggestion:
  // image models default to light backgrounds and otherwise ignore the palette.
  const bgLine = theme.dark
    ? `Background MUST be dark (${theme.background}) covering the whole canvas — not white, not light, not a bright gradient.`
    : `Palette: bg ${theme.background}, ink ${theme.ink}, accent ${accent}, accent2 ${accent2}.`;

  return [
    `Design system: ${themeKey} theme.`,
    bgLine,
    `Type character: ${theme.headingFont} display, ${theme.bodyFont} body.`,
    `Ornament: ${theme.ornament}`,
    `Layout ${layoutKey}: ${layout.purpose}`,
    `Subject: ${subject}.`,
    `Copy area: ${copy}.`,
    theme.dark ? `Ink ${theme.ink}, accent ${accent}, accent2 ${accent2}.` : '',
    `Canvas ${size.w}x${size.h} (${size.ratio}).`,
    'Stay inside this palette.'
  ].filter(Boolean).join(' ');
}

/** The thirteen layout names, for validation and UI pickers. */
export const LAYOUT_KEYS = Object.keys(LAYOUTS) as PosterLayout[];
export const THEME_KEYS = Object.keys(THEMES) as PosterTheme[];
export const SIZE_KEYS = Object.keys(SIZES) as PosterSize[];
