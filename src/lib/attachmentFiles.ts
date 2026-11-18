export const maxAttachmentBytes = 10 * 1024 * 1024;
export const attachmentMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'] as const;
export type AttachmentMime = typeof attachmentMimeTypes[number];
export type Attachment = {
  id: string; task_id: string; filename: string; mime_type: AttachmentMime;
  size_bytes: number; storage_path: string; created_at: string; created_by: string;
};

export function attachmentType(bytes: Uint8Array): AttachmentMime | null {
  const text = (start: number, length: number) => String.fromCharCode(...bytes.slice(start, start + length));
  if (bytes.length >= 8 && bytes[0] === 137 && text(1, 3) === 'PNG' && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.length >= 12 && text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP') return 'image/webp';
  if (text(0, 5) === '%PDF-') return 'application/pdf';
  if (bytes.length >= 12 && text(4, 4) === 'ftyp') {
    if (['heic', 'heix', 'hevc', 'hevx'].includes(text(8, 4))) return 'image/heic';
    if (['mif1', 'msf1'].includes(text(8, 4))) return 'image/heif';
  }
  return null;
}

export function cleanAttachmentName(name: string): string {
  return name.normalize('NFC').replace(/[\u0000-\u001f\u007f/\\]/g, '_').trim().slice(0, 120);
}

export function parseAttachments(value: unknown): Attachment[] {
  if (!Array.isArray(value)) throw new Error('invalid_data');
  return value.map((entry: unknown) => {
    if (!entry || typeof entry !== 'object') throw new Error('invalid_data');
    const row = entry as Record<string, unknown>;
    const mime = attachmentMimeTypes.find((type) => type === row.mime_type);
    if (typeof row.id !== 'string' || typeof row.task_id !== 'string' || typeof row.filename !== 'string'
      || !row.filename || row.filename.length > 120 || typeof row.storage_path !== 'string'
      || typeof row.created_by !== 'string' || typeof row.created_at !== 'string' || !mime || typeof row.size_bytes !== 'number'
      || !Number.isInteger(row.size_bytes) || row.size_bytes <= 0 || row.size_bytes > maxAttachmentBytes) throw new Error('invalid_data');
    return { id: row.id, task_id: row.task_id, filename: row.filename, mime_type: mime,
      size_bytes: row.size_bytes, storage_path: row.storage_path, created_at: row.created_at, created_by: row.created_by };
  });
}
