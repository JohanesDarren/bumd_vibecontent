import type { VisualAsset } from '../types';

const sizes = { '1:1': [1080, 1080], '9:16': [1080, 1920], '16:9': [1920, 1080] } as const;

export function wrapVisualText(text: string, maxWidth: number, measure: (value: string) => number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) line = candidate;
      else {
        if (line) lines.push(line);
        let part = '';
        for (const char of Array.from(word)) {
          if (part && measure(part + char) > maxWidth) { lines.push(part); part = char; }
          else part += char;
        }
        line = part;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function composeVisualImage(imageUrl: string, visual: VisualAsset): Promise<Blob> {
  const [width, height] = sizes[visual.aspectRatio];
  const image = new Image();
  image.src = imageUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable; image not exported.');
  ctx.fillStyle = '#101827';
  ctx.fillRect(0, 0, width, height);

  const landscape = visual.aspectRatio === '16:9';
  const imageArea = landscape ? { x: 0, y: 0, w: width * .62, h: height } : { x: 0, y: 0, w: width, h: height * (visual.aspectRatio === '9:16' ? .64 : .6) };
  const imageScale = Math.min(imageArea.w / image.naturalWidth, imageArea.h / image.naturalHeight);
  const iw = image.naturalWidth * imageScale;
  const ih = image.naturalHeight * imageScale;
  ctx.drawImage(image, imageArea.x + (imageArea.w - iw) / 2, imageArea.y + (imageArea.h - ih) / 2, iw, ih);

  const panel = landscape ? { x: width * .62, y: 0, w: width * .38, h: height } : { x: 0, y: imageArea.h, w: width, h: height - imageArea.h };
  ctx.fillStyle = '#101827';
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.fillStyle = visual.primaryColor || '#ffffff';
  ctx.fillRect(panel.x, panel.y, Math.max(8, Math.round(width * .008)), panel.h);
  const pad = Math.round(Math.min(width, height) * .055) + Math.max(8, Math.round(width * .008));
  const maxWidth = panel.w - pad * 2;
  const entries = [
    { text: visual.badgeText, size: .052, weight: 700, color: visual.accentColor },
    { text: visual.headline, size: .09, weight: 700, color: '#ffffff' },
    { text: visual.subheadline, size: .052, weight: 400, color: '#e5e7eb' },
    { text: visual.ctaText, size: .05, weight: 700, color: visual.accentColor },
    { text: visual.disclaimer, size: .027, weight: 400, color: '#d1d5db' },
  ].filter(entry => entry.text.trim());
  let blocks: { lines: string[]; size: number; color: string; weight: number }[] = [];
  let total = 0;
  let scale = 1;
  for (;;) {
    total = 0;
    blocks = entries.map(entry => {
      const size = Math.max(18, Math.round(Math.min(width, height) * entry.size * scale));
      ctx.font = `${entry.weight} ${size}px Arial, sans-serif`;
      const lines = wrapVisualText(entry.text, maxWidth, value => ctx.measureText(value).width);
      total += lines.length * size * 1.2 + size * .45;
      return { lines, size, color: entry.color, weight: entry.weight };
    });
    if (total <= panel.h - pad * 2) break;
    if (blocks.every(block => block.size <= 18)) throw new Error('Exact copy does not fit this layout. Shorten the text or choose another aspect ratio.');
    scale *= .85;
  }
  let y = panel.y + Math.max(pad, (panel.h - total) / 2);
  ctx.textBaseline = 'top';
  for (const block of blocks) {
    ctx.font = `${block.weight} ${block.size}px Arial, sans-serif`;
    ctx.fillStyle = block.color;
    for (const line of block.lines) { ctx.fillText(line, panel.x + pad, y); y += block.size * 1.2; }
    y += block.size * .45;
  }
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image export failed.')), 'image/png'));
}

export async function renderVisualVideo(imageUrl: string, visual: VisualAsset, signal?: AbortSignal): Promise<Blob> {
  if (typeof MediaRecorder === 'undefined') throw new Error('This browser cannot render video; download the composed PNG instead.');
  const canvas = document.createElement('canvas');
  const [width, height] = sizes[visual.aspectRatio];
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx || !canvas.captureStream) throw new Error('Canvas video capture is unsupported; download the composed PNG instead.');
  const image = new Image(); image.src = imageUrl; await image.decode();
  const stream = canvas.captureStream(30);
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
  if (!mimeType) { stream.getTracks().forEach(track => track.stop()); throw new Error('WebM recording is unsupported; download the composed PNG instead.'); }
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  const stopped = new Promise<void>((resolve, reject) => { recorder.onstop = () => resolve(); recorder.onerror = () => reject(new Error('Browser video encoding failed.')); });
  try {
    recorder.start();
    const start = performance.now();
    do {
      if (signal?.aborted) throw new Error('Video rendering cancelled.');
      if (document.hidden) throw new Error('Keep this tab visible while rendering video.');
      const scale = 1.015 + .025 * ((performance.now() - start) / 6000);
      const w = width * scale, h = height * scale;
      ctx.fillStyle = '#101827'; ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
    } while (performance.now() - start < 6000);
    recorder.stop(); await stopped;
    const video = new Blob(chunks, { type: mimeType });
    if (!video.size) throw new Error('Browser produced an empty video.');
    return video;
  } finally {
    if (recorder.state !== 'inactive') recorder.stop();
    stream.getTracks().forEach(track => track.stop());
  }
}

export const visualExportDimensions = (ratio: VisualAsset['aspectRatio']) => sizes[ratio];
