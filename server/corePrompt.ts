/**
 * CORE PROMPT — internal asset, never sent to the browser.
 *
 * Architecture note (Developer Prompt Strategy):
 *   The company owns one master template ("core prompt") with deliberate blank
 *   spaces. The user never sees it; they only supply remarks ("add red shirt").
 *   Those remarks are compared against the template's slots and dropped into the
 *   matching blanks. The template alone must already produce a usable image, so
 *   an empty remark set is a valid request.
 *
 * Two layers only:
 *   1. Vision analysis of the uploaded references (describes, never instructs).
 *   2. The image model itself, fed by the filled core prompt.
 *
 * RAG's role is boundaries/knowledge, NOT authoring the image prompt — that is
 * why nothing here calls the writer LLM to invent a prompt.
 */

export type VisualMode = 'product' | 'human';

/** Reference slots required by the document, per mode. */
export const REFERENCE_SLOTS = [
  'model',
  'font',
  'color',
  'pose',
  'lighting'
] as const;

export type ReferenceSlot = (typeof REFERENCE_SLOTS)[number];

/** Which references each mode must supply. */
export const REQUIRED_SLOTS: Record<VisualMode, ReferenceSlot[]> = {
  // Product-only shots have no model and no pose; the object is the subject.
  product: ['font', 'color', 'lighting'],
  // Human-model shots need every reference.
  human: ['model', 'font', 'color', 'pose', 'lighting']
};

export type SlotValues = Partial<Record<ReferenceSlot, string>>;

/**
 * The master template. `___` marks a blank the human can fill.
 *
 * Keep it declarative and visual only: no factual claims, no marketing copy that
 * could contradict the brief. Copy is added separately as exact text.
 */
/**
 * Publication context changes the whole visual language, so the template cannot
 * be one-size-fits-all. The document is explicit:
 *
 *   Social media post  — elegant, clean, simple, minimal text, product/model focus
 *   Poster / banner    — public-service announcement feel, persuasive, copy-led
 *
 * Both variants keep the same blank-slot contract, so slot filling is identical.
 */
export type PublicationContext = 'social' | 'poster';

const CORE_PROMPT_PRODUCT_SOCIAL = [
  'Professional commercial product photograph for a social media feed post.',
  'The product is the single hero subject, centred with generous breathing room.',
  'Background colour is ___ (colour taken from the colour reference), lit with ___ (lighting taken from the lighting reference).',
  'A single flat empty colour field sits in the lower third; its proportions follow the letterform character of ___ (typeface taken from the font reference).',
  'Elegant, modern and restrained: lots of negative space, no busy decoration.',
  'Shot on a full-frame camera with a 50mm lens at f/4, soft natural falloff, no harsh reflections.',
  'Ultra sharp product detail, realistic materials and texture, no distorted geometry.',
  'Absolutely no watermarks, no invented logos, no collage, no split frames, no signage.'
].join(' ');

const CORE_PROMPT_PRODUCT_POSTER = [
  'Persuasive public-service announcement poster featuring the product as the hero subject.',
  'The layout reads like a campaign poster: strong focal hierarchy and a clear call to action.',
  'Background colour is ___ (colour taken from the colour reference), lit with ___ (lighting taken from the lighting reference), built to carry headline copy.',
  'A large flat empty colour field fills the upper third; its proportions follow the letterform character of ___ (typeface taken from the font reference).',
  'Composition reserves a clean copy zone for a headline, a supporting line and a call to action.',
  'Shot on a full-frame camera with a 35mm lens at f/5.6, deep focus so product and copy both read.',
  'Ultra sharp product detail, realistic materials and texture, no distorted geometry.',
  'Absolutely no watermarks, no invented logos, no collage, no split frames, no signage.'
].join(' ');

const CORE_PROMPT_HUMAN_SOCIAL = [
  'Professional commercial lifestyle photograph for a social media feed post featuring a human model.',
  'The model follows ___ (pose and framing taken from the pose reference), framed from mid-thigh up with relaxed body language.',
  'The model is lit with ___ (lighting taken from the lighting reference), producing soft directional shadows and clean skin tones.',
  'Background colour is ___ (colour taken from the colour reference), kept separate from the subject with nothing distracting.',
  'A single flat empty colour field sits in the lower third; its proportions follow the letterform character of ___ (typeface taken from the font reference).',
  'Elegant and clean: the model carries the frame, the scene stays simple.',
  'Shot on a full-frame camera with an 85mm lens at f/2, shallow depth of field, eye-level angle.',
  'Photorealistic detail, natural proportions, no extra limbs, no distorted hands or faces.',
  'Absolutely no watermarks, no invented logos, no collage, no split frames, no signage.'
].join(' ');

const CORE_PROMPT_HUMAN_POSTER = [
  'Persuasive public-service announcement poster featuring a human model as the main subject.',
  'The model follows ___ (pose and framing taken from the pose reference), positioned to leave a clear copy zone beside or above them.',
  'The model is lit with ___ (lighting taken from the lighting reference), producing confident, campaign-grade contrast.',
  'Background colour is ___ (colour taken from the colour reference), built to carry headline copy.',
  'A large flat empty colour field fills the upper third; its proportions follow the letterform character of ___ (typeface taken from the font reference).',
  'Composition reserves a clean copy zone for a headline, a supporting line and a call to action.',
  'Shot on a full-frame camera with a 50mm lens at f/4, enough depth for model and copy to both read.',
  'Photorealistic detail, natural proportions, no extra limbs, no distorted hands or faces.',
  'Absolutely no watermarks, no invented logos, no collage, no split frames, no signage.'
].join(' ');

const CORE_PROMPTS: Record<VisualMode, Record<PublicationContext, string>> = {
  product: { social: CORE_PROMPT_PRODUCT_SOCIAL, poster: CORE_PROMPT_PRODUCT_POSTER },
  human: { social: CORE_PROMPT_HUMAN_SOCIAL, poster: CORE_PROMPT_HUMAN_POSTER }
};

/** Slots the human can influence, in template order. */
const TEMPLATE_SLOTS: Record<VisualMode, ReferenceSlot[]> = {
  product: ['color', 'lighting', 'font'],
  human: ['pose', 'lighting', 'color', 'font']
};

/**
 * Hard exclusions. The document is explicit that product-only means no human
 * model, so the negative constraint is stated in words as well as implied by
 * the positive description — image models otherwise add people by default.
 */
const MODE_EXCLUSIONS: Record<VisualMode, string> = {
  product: 'No human model, no person, no face, no hands, no body parts anywhere in the frame. The product alone is the subject.',
  human: 'Exactly one human model as the subject; no additional people in the frame.'
};

/**
 * Copy density. A poster/banner carries far more text than a social feed post:
 * headline, supporting line and call to action versus a single short overlay.
 */
const COPY_RULES: Record<PublicationContext, string> = {
  social:
    'Composition: one flat empty colour field, roughly one fifth of the frame, held clear at the edge of the layout.',
  poster:
    'Composition: three flat empty colour fields — a wide band across the upper third, a narrower band ' +
    'beneath it, and a rounded pill-shaped field at the bottom.'
};

/**
 * Rendered text is forbidden on purpose, and the wording matters.
 *
 * Empirically FLUX adds invented lettering whenever a prompt mentions "text",
 * "typography", "headline" or "copy" — even in a negative sentence. The reliable
 * formulation describes the reserved areas as *empty colour fields* and avoids
 * those trigger words entirely in the negative clause.
 */
const NO_RENDERED_TEXT =
  'Plain empty colour fields only: no glyphs, no lettering, no numerals, no signage, ' +
  'no captions, no labels and no writing of any kind. Nothing is written on the image.';

export function corePromptTemplate(mode: VisualMode, context: PublicationContext = 'social'): string {
  return `${CORE_PROMPTS[mode][context]} ${MODE_EXCLUSIONS[mode]} ${COPY_RULES[context]} ${NO_RENDERED_TEXT}`;
}

/**
 * The document asks three framing questions that are NOT part of the template:
 * which topic the brief covers, whether the piece is commercial, and which kind
 * of company publishes it. Those are appended as a short context block so the
 * visual stays anchored to the brief instead of drifting into generic stock art.
 */
export type BriefContext = {
  /** The brief topic the visual must follow. */
  topic?: string;
  /** Issuing organisation type, e.g. a regional-owned enterprise. */
  companyType?: string;
  /** Commercial / promotional intent. */
  commercial?: boolean;
};

const trimTo = (value: unknown, limit: number): string => {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, limit);
};

/**
 * Build the context block appended after the filled template.
 *
 * Kept deliberately terse: the template already carries the art direction, so
 * this only states *what the picture is about* and *who publishes it*. Anything
 * that tries to issue instructions is stripped by sanitizeRemark-like rules.
 */
export function contextBlock(context: BriefContext, publication: PublicationContext): string {
  const topic = trimTo(context.topic, 220);
  const company = trimTo(context.companyType, 80);
  const lines: string[] = [];
  if (topic) lines.push(`Subject of the brief (must be visually recognisable): ${topic}.`);
  if (company) lines.push(`Published by a ${company}.`);
  lines.push(
    publication === 'poster'
      ? 'Intent: persuasive public-service campaign piece with a clear call to action.'
      : 'Intent: elegant social media feed post, restrained and product/model focused.'
  );
  if (context.commercial) lines.push('Commercial intent: the subject is being promoted.');
  return lines.join(' ');
}

/** Normalise an untrusted publication value; social is the safe default. */
export function normalizePublication(value: unknown): PublicationContext {
  return value === 'poster' ? 'poster' : 'social';
}

/** Defaults used when the human says nothing about a slot. */
const SLOT_DEFAULTS: Record<ReferenceSlot, string> = {
  model: 'a natural, friendly adult model matching the reference',
  font: 'a modern geometric sans-serif',
  color: 'a balanced brand-consistent',
  pose: 'a relaxed, confident standing',
  lighting: 'soft diffused studio'
};

export type FilledPrompt = {
  /** The complete prompt handed to the image model. */
  prompt: string;
  /** Which slots were filled from human remarks vs. defaults. */
  filledFromHuman: ReferenceSlot[];
  /** Slots that fell back to a default. */
  usedDefaults: ReferenceSlot[];
};

/**
 * Fill the master template with slot values.
 *
 * Blank spaces are consumed in the template's own order, so a slot only ever
 * lands in the blank it was designed for — the human cannot inject instructions
 * into the middle of the template.
 */
export function fillCorePrompt(
  mode: VisualMode,
  values: SlotValues,
  context: PublicationContext = 'social'
): FilledPrompt {
  const order = TEMPLATE_SLOTS[mode];
  const filledFromHuman: ReferenceSlot[] = [];
  const usedDefaults: ReferenceSlot[] = [];

  let index = 0;
  const template = corePromptTemplate(mode, context);
  const prompt = template.replace(/___/g, () => {
    const slot = order[index++];
    const raw = slot ? values[slot] : undefined;
    const clean = sanitizeRemark(raw);
    if (slot && clean) {
      filledFromHuman.push(slot);
      return clean;
    }
    if (slot) usedDefaults.push(slot);
    return slot ? SLOT_DEFAULTS[slot] : SLOT_DEFAULTS.lighting;
  });

  return { prompt, filledFromHuman, usedDefaults };
}

/**
 * Human remarks are untrusted data: they describe appearance, never commands.
 * Strip anything that tries to rewrite the template or smuggle instructions.
 */
export function sanitizeRemark(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return null;

  // Drop instruction-like fragments; keep the visual descriptor.
  text = text
    .replace(/\b(ignore|disregard|forget)\b[^.,;]*/gi, ' ')
    .replace(/\b(system|assistant|prompt|instruction)s?\b\s*:/gi, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip leading imperatives so the value reads as a descriptor, not a command:
  // "add red shirt" -> "red shirt", "make it dark" -> "dark".
  text = text
    .replace(/^(please\s+)?(add|tambahkan|tambah|buat|bikin|make|use|pakai|gunakan|set|ubah|change|apply|beri|kasih|with|dengan)\b\s*/i, '')
    .replace(/^(it|the|nya)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return null;
  // A slot value is a phrase, not an essay.
  return text.slice(0, 160);
}

/**
 * Map free-form human remarks onto slots.
 *
 * This is deliberately deterministic keyword matching, not an LLM call: the
 * document caps the pipeline at two model layers, and slot matching is exactly
 * the kind of thing a rule table does more predictably than a model.
 */
const SLOT_HINTS: Record<ReferenceSlot, RegExp> = {
  model: /\b(model|orang|person|man|woman|pria|wanita|perempuan|cewek|cowok|figure|talent)\b/i,
  font: /\b(font|typeface|tipografi|typography|lettering|huruf|serif|sans)\b/i,
  color:
    /\b(color|colour|warna|palette|palet|tone|hue|background|latar|merah|biru|hijau|kuning|hitam|putih|abu|emas|gold|navy|red|blue|green|yellow|black|white|grey|gray|silver|beige|cream|pink|purple|orange|brown|teal|maroon)\b/i,
  pose: /\b(pose|posing|berdiri|duduk|standing|sitting|gesture|stance|angle|sikap)\b/i,
  lighting: /\b(light|lighting|cahaya|pencahayaan|shadow|bayangan|backlight|softbox|neon|gelap|terang)\b/i
};

export function deriveSlotValues(mode: VisualMode, remark: string): SlotValues {
  const values: SlotValues = {};
  const text = sanitizeRemark(remark);
  if (!text) return values;

  // Split on commas / "and" so each clause can target its own slot.
  const clauses = text.split(/,|;|\band\b|\bdan\b/gi).map(part => part.trim()).filter(Boolean);
  for (const clause of clauses) {
    for (const slot of REQUIRED_SLOTS[mode]) {
      if (values[slot]) continue;
      if (SLOT_HINTS[slot].test(clause)) {
        values[slot] = sanitizeRemark(clause) ?? undefined;
        break;
      }
    }
  }
  return values;
}

/**
 * Vision descriptions of the uploaded references, condensed into slot values.
 * Each reference type contributes only its own visual attributes.
 */
export function slotValuesFromReferences(
  mode: VisualMode,
  described: Partial<Record<ReferenceSlot, string>>
): SlotValues {
  const values: SlotValues = {};
  for (const slot of REQUIRED_SLOTS[mode]) {
    const clean = sanitizeRemark(described[slot]);
    if (clean) values[slot] = clean;
  }
  return values;
}

/** Merge reference-derived values with human remarks (human wins). */
export function mergeSlotValues(base: SlotValues, override: SlotValues): SlotValues {
  return { ...base, ...Object.fromEntries(Object.entries(override).filter(([, v]) => Boolean(v))) };
}

export const ACCEPTED_REFERENCE_EXTENSIONS = ['png', 'jpg', 'jpeg'] as const;

export function hasAcceptedExtension(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  return (ACCEPTED_REFERENCE_EXTENSIONS as readonly string[]).includes(ext);
}
