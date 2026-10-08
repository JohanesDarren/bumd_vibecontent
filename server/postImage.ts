// Fetches the preview image of a published social post (og:image / YouTube thumbnail).
// The URL comes from users, so every request is pinned to the platform's own hosts
// (no redirects elsewhere, https only, size and time limits) to prevent SSRF.

export class PostImageError extends Error {}

const POST_HOSTS: Record<string, string[]> = {
  instagram: ['instagram.com'],
  facebook: ['facebook.com', 'fb.watch'],
  twitter: ['x.com', 'twitter.com'],
  linkedin: ['linkedin.com'],
  youtube: ['youtube.com', 'youtu.be']
};

// CDNs that serve the platforms' post images.
const IMAGE_HOSTS = ['cdninstagram.com', 'fbcdn.net', 'twimg.com', 'licdn.com', 'ytimg.com'];

const MAX_HTML_BYTES = 1_500_000;
const MAX_IMAGE_BYTES = 3_000_000;
const TIMEOUT_MS = 10_000;
const USER_AGENT = 'Mozilla/5.0 (compatible; VibeContentLinkPreview/1.0)';

const hostMatches = (host: string, domains: string[]) =>
  domains.some(domain => host === domain || host.endsWith(`.${domain}`));

function httpsUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new PostImageError('Link post tidak valid.'); }
  if (url.protocol !== 'https:') throw new PostImageError('Link post harus memakai https://.');
  if (url.username || url.password || (url.port && url.port !== '443')) throw new PostImageError('Link post tidak valid.');
  return url;
}

/** Throws unless the post URL belongs to the schedule's platform. */
export function assertPostUrl(value: string, platform: string): URL {
  const url = httpsUrl(value);
  const hosts = POST_HOSTS[platform];
  if (!hosts || !hostMatches(url.hostname.toLowerCase(), hosts)) {
    throw new PostImageError(`Link post bukan alamat ${platform} yang dikenali.`);
  }
  return url;
}

export function youtubeVideoId(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  const id = host.endsWith('youtu.be')
    ? url.pathname.slice(1).split('/')[0]
    : url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|live|embed)\/([^/?#]+)/)?.[1] || '';
  return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null;
}

const decodeEntities = (value: string) =>
  value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x2F;/gi, '/').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/** og:image (or twitter:image) from a page's <meta> tags, attribute order independent. */
export function extractOgImage(html: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (key !== 'og:image' && key !== 'og:image:secure_url' && key !== 'twitter:image') continue;
    const content = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];
    if (content) return decodeEntities(content.trim());
  }
  return null;
}

type FetchLike = typeof fetch;

/** fetch that follows at most 3 redirects, re-checking every hop against `allowed`. */
async function pinnedFetch(start: URL, allowed: (url: URL) => boolean, fetchImpl: FetchLike): Promise<Response> {
  let url = start;
  for (let hop = 0; hop < 4; hop++) {
    if (!allowed(url)) throw new PostImageError('Link mengalihkan ke alamat di luar platform; dibatalkan.');
    const response = await fetchImpl(url, {
      redirect: 'manual',
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'id-ID,id;q=0.9' },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    const location = response.status >= 300 && response.status < 400 ? response.headers.get('location') : null;
    if (!location) return response;
    url = httpsUrl(new URL(location, url).toString());
  }
  throw new PostImageError('Terlalu banyak pengalihan dari link post.');
}

async function readCapped(response: Response, max: number): Promise<Uint8Array> {
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > max) throw new PostImageError('Ukuran respons terlalu besar.');
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) { await reader.cancel(); throw new PostImageError('Ukuran respons terlalu besar.'); }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
  return out;
}

/** Returns the post's preview image as a data URL. */
export async function fetchPostImage(postUrl: string, platform: string, fetchImpl: FetchLike = fetch): Promise<string> {
  const pageUrl = assertPostUrl(postUrl, platform);
  let imageUrl: URL;

  const videoId = platform === 'youtube' ? youtubeVideoId(pageUrl) : null;
  if (platform === 'youtube') {
    if (!videoId) throw new PostImageError('ID video YouTube tidak ditemukan pada link.');
    imageUrl = new URL(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);
  } else {
    const page = await pinnedFetch(pageUrl, url => hostMatches(url.hostname.toLowerCase(), POST_HOSTS[platform]), fetchImpl);
    if (!page.ok) throw new PostImageError(`Halaman post tidak bisa dibuka (HTTP ${page.status}).`);
    const html = new TextDecoder().decode(await readCapped(page, MAX_HTML_BYTES));
    const found = extractOgImage(html);
    if (!found) throw new PostImageError('Gambar post tidak ditemukan. Post mungkin privat, atau platform meminta login.');
    imageUrl = httpsUrl(new URL(found, pageUrl).toString());
  }

  const image = await pinnedFetch(imageUrl, url => hostMatches(url.hostname.toLowerCase(), IMAGE_HOSTS), fetchImpl);
  if (!image.ok) throw new PostImageError(`Gambar post tidak bisa diunduh (HTTP ${image.status}).`);
  const type = (image.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) throw new PostImageError('Berkas dari link bukan gambar JPEG/PNG/WebP.');
  const bytes = await readCapped(image, MAX_IMAGE_BYTES);
  if (!bytes.length) throw new PostImageError('Gambar post kosong.');
  return `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
}

const SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  'image/jpeg': b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': b => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': b => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP'
};

/** Validates a user-supplied image data URL by its bytes, not just its declared type. */
export function validateImageDataUrl(value: unknown, maxBytes = MAX_IMAGE_BYTES): string {
  const match = typeof value === 'string' ? value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/) : null;
  if (!match) throw new PostImageError('Gambar harus berupa JPEG, PNG, atau WebP.');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > maxBytes) throw new PostImageError(`Ukuran gambar maksimal ${Math.round(maxBytes / 1_000_000)} MB.`);
  if (!SIGNATURES[match[1]](bytes)) throw new PostImageError('Isi berkas tidak sesuai dengan tipe gambarnya.');
  return value as string;
}
