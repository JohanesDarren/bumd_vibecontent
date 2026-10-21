import { inflateRawSync } from 'node:zlib';

/**
 * Minimal text extraction for the formats KMS accepts as documents.
 * KMS stores the original file; RAG needs plain text to index. Keeping this
 * dependency-free avoids shipping a PDF/Office parser stack into the runtime.
 */
export function extractDocumentText(filename: string, data: Buffer): string {
  const name = filename.toLowerCase();
  if (name.endsWith('.md') || name.endsWith('.txt')) return data.toString('utf8');
  if (name.endsWith('.docx')) return extractDocx(data);
  if (name.endsWith('.pdf')) return extractPdf(data);
  throw new Error(`Format ${filename} belum didukung untuk indeks RAG`);
}

/** Pull visible runs out of word/document.xml inside the DOCX zip. */
function extractDocx(data: Buffer): string {
  const eocd = data.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('DOCX tidak valid');
  const count = data.readUInt16LE(eocd + 10);
  let offset = data.readUInt32LE(eocd + 16);
  const end = offset + data.readUInt32LE(eocd + 12);
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || data.readUInt32LE(offset) !== 0x02014b50) break;
    const method = data.readUInt16LE(offset + 10);
    const size = data.readUInt32LE(offset + 20);
    const nameLength = data.readUInt16LE(offset + 28);
    const extra = data.readUInt16LE(offset + 30);
    const comment = data.readUInt16LE(offset + 32);
    const entryName = data.subarray(offset + 46, offset + 46 + nameLength).toString();
    if (entryName === 'word/document.xml') {
      const local = data.readUInt32LE(offset + 42);
      const start = local + 30 + data.readUInt16LE(local + 26) + data.readUInt16LE(local + 28);
      const raw = data.subarray(start, start + size);
      const xml = method === 8 ? inflateRawSync(raw, { maxOutputLength: 50 * 1024 * 1024 }) : raw;
      return xml.toString('utf8')
        .replace(/<w:p[ >]/g, '\n<w:p ')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/\n{2,}/g, '\n').trim();
    }
    offset += 46 + nameLength + extra + comment;
  }
  throw new Error('DOCX tidak memuat word/document.xml');
}

/** Best-effort PDF text: uncompressed Tj/TJ literals only. */
function extractPdf(data: Buffer): string {
  const raw = data.toString('latin1');
  const out: string[] = [];
  const re = /\((?:\\.|[^\\()])*\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    const text = match[0].slice(1, -1).replace(/\\([()\\])/g, '$1');
    if (/[a-zA-Z]{2,}/.test(text)) out.push(text);
  }
  const joined = out.join(' ').replace(/\s+/g, ' ').trim();
  if (joined.length < 20) throw new Error('PDF tidak memuat teks yang bisa diekstrak (kemungkinan hasil pindai)');
  return joined;
}
