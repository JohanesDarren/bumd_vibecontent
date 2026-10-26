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
const CORE_PROMPT_PRODUCT = [
  'Professional commercial photograph of the product as the single hero subject.',
  'The product is presented on ___ background with ___ lighting setup.',
  'Typography treatment uses ___ for any overlay text area, rendered as clean, legible type.',
  'Color grading follows ___ palette, applied consistently to highlights and shadows.',
  'Composition keeps generous negative space so overlay copy remains readable.',
  'Shot on a full-frame camera with a 50mm lens at f/4, soft natural falloff, no harsh reflections.',
  'Ultra sharp product detail, realistic materials and texture, no distorted geometry.',
  'Absolutely no watermarks, no invented logos, no extra text, no collage, no split frames.'
].join(' ');

const CORE_PROMPT_HUMAN = [
  'Professional commercial lifestyle photograph featuring a human model as the main subject.',
  'The model follows ___ pose reference, framed from mid-thigh up with natural body language.',
  'The model is lit with ___ lighting setup, producing soft directional shadows and clean skin tones.',
  'Background is ___ with depth separation from the subject, no distracting elements.',
  'Typography treatment uses ___ for any overlay text area, rendered as clean, legible type.',
  'Color grading follows ___ palette, applied consistently across skin, wardrobe and background.',
  'Shot on a full-frame camera with an 85mm lens at f/2, shallow depth of field, eye-level angle.',
  'Photorealistic detail, natural proportions, no extra limbs, no distorted hands or faces.',
  'Absolutely no watermarks, no invented logos, no extra text, no collage, no split frames.'
].join(' ');

/** Slots the human can influence, in template order. */
const TEMPLATE_SLOTS: Record<VisualMode, ReferenceSlot[]> = {
  product: ['color', 'lighting', 'font'],
  human: ['pose', 'lighting', 'color', 'font']
};

export function corePromptTemplate(mode: VisualMode): string {
  return mode === 'human' ? CORE_PROMPT_HUMAN : CORE_PROMPT_PRODUCT;
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
export function fillCorePrompt(mode: VisualMode, values: SlotValues): FilledPrompt {
  const order = TEMPLATE_SLOTS[mode];
  const filledFromHuman: ReferenceSlot[] = [];
  const usedDefaults: ReferenceSlot[] = [];

  let index = 0;
  const template = corePromptTemplate(mode);
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
