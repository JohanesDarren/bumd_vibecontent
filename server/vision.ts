/**
 * Vision/OCR client for the JagoAI 9router gateway.
 *
 * KMS stores images but RAG cannot see them. Before the image-generation LLM
 * runs, this model reads each reference image so the generator receives a
 * textual description of what the picture actually contains.
 */
export type VisionConfig = { baseUrl: string; apiKey: string; model: string };

export const visionConfig = (): VisionConfig => ({
  baseUrl: (process.env['9ROUTER_BASE_URL'] || 'https://9router.jagoai.dev/v1').replace(/\/+$/, ''),
  apiKey: process.env.NINE_ROUTER_API_KEY || process.env['9ROUTER_API_KEY'] || '',
  model: process.env['9ROUTER_VISION_MODEL'] || process.env['9ROUTER_LLM_MODEL'] || 'cbai/deepseek-v4.1-flash'
});

export const visionConfigured = (config = visionConfig()) => Boolean(config.baseUrl && config.apiKey && config.model);

const PROMPT = [
  'Kamu adalah analis visual untuk tim konten korporat.',
  'Baca gambar referensi ini dan jelaskan secara faktual:',
  '1. Semua teks yang terlihat (OCR apa adanya, pertahankan angka dan nama).',
  '2. Objek dan subjek utama.',
  '3. Warna dominan dan aksen.',
  '4. Gaya visual (fotografi/ilustrasi/grafis), pencahayaan, komposisi, sudut kamera.',
  '5. Suasana/mood dan elemen merek yang tampak (logo, tipografi).',
  'Jawab ringkas dalam Bahasa Indonesia, maksimal 200 kata, tanpa spekulasi.'
].join('\n');

type ChatResponse = { choices?: Array<{ message?: { content?: unknown; reasoning_content?: unknown } }>; error?: { message?: string } | string };

export function mimeForImage(filename: string): string | null {
  const name = filename.toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  return null;
}

/** Returns a factual description of the image, or throws with a readable reason. */
export async function describeImage(
  filename: string,
  data: Buffer,
  config: VisionConfig = visionConfig(),
  fetcher: typeof fetch = fetch
): Promise<string> {
  if (!visionConfigured(config)) throw new Error('Vision LLM belum dikonfigurasi (9ROUTER_API_KEY)');
  const mime = mimeForImage(filename);
  if (!mime) throw new Error(`Format ${filename} bukan gambar yang didukung vision`);
  if (!data.length || data.length > 5 * 1024 * 1024) throw new Error('Gambar harus berukuran maksimal 5 MB');

  let response: Response;
  try {
    response = await fetcher(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        max_tokens: 700,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: `data:${mime};base64,${data.toString('base64')}` } }
          ]
        }]
      }),
      signal: AbortSignal.timeout(90000)
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === 'TimeoutError'
      ? 'Vision LLM tidak merespons tepat waktu'
      : error instanceof Error ? error.message : 'Vision LLM tidak dapat dihubungi';
    throw new Error(reason, { cause: error });
  }

  const raw = await response.text();

  let body: ChatResponse;
  try { body = JSON.parse(raw) as ChatResponse; } catch { throw new Error(`Vision LLM mengembalikan respons tidak valid (HTTP ${response.status})`); }
  if (!response.ok) {
    const detail = typeof body.error === 'string' ? body.error : body.error?.message;
    throw new Error(`Vision LLM menolak permintaan (HTTP ${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`);
  }
  const message = body.choices?.[0]?.message;
  // Some reasoning models return an empty `content` and put the answer in
  // `reasoning_content`; accept either so a real reading is never discarded.
  const content = message?.content;
  const reasoning = message?.reasoning_content;
  const fromContent = Array.isArray(content)
    ? content.map(part => typeof part === 'string' ? part : String((part as { text?: string })?.text || '')).join(' ')
    : typeof content === 'string' ? content : '';
  const text = fromContent.trim() || (typeof reasoning === 'string' ? reasoning : '');
  const clean = text.trim();
  if (!clean) throw new Error('Vision LLM tidak mengembalikan deskripsi');
  return clean.slice(0, 2000);
}
