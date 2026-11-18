import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { client } from './supabase';
import { rpc } from './api';
import { attachmentMimeTypes, attachmentType, cleanAttachmentName, maxAttachmentBytes, parseAttachments, type Attachment } from './attachmentFiles';
import type { Task } from './models';

export class AttachmentError extends Error {
  constructor(public kind: 'size' | 'type' | 'name' | 'pending' | 'popup', public attachmentId?: string) { super(kind); }
}

export function chooseAttachment() {
  return DocumentPicker.getDocumentAsync({ type: [...attachmentMimeTypes], multiple: false, copyToCacheDirectory: true, base64: false });
}

export async function loadTaskAttachments(taskId: string): Promise<Attachment[]> {
  const { data, error } = await client().from('task_attachments')
    .select('id,task_id,filename,mime_type,size_bytes,storage_path,created_at,created_by').eq('task_id', taskId).order('created_at');
  if (error) throw error;
  return parseAttachments(data);
}

export async function finishAttachment(id: string) {
  await rpc('finish_task_attachment', { p_id: id });
}

export async function uploadTaskAttachment(task: Task, asset: DocumentPicker.DocumentPickerAsset) {
  const filename = cleanAttachmentName(asset.name);
  if (!filename) throw new AttachmentError('name');
  let size: number;
  let read: () => Promise<ArrayBuffer>;
  if (Platform.OS === 'web') {
    const file = asset.file;
    if (!file) throw new AttachmentError('type');
    size = file.size; read = () => file.arrayBuffer();
  } else {
    const { File } = await import('expo-file-system');
    const file = new File(asset.uri);
    size = file.size; read = () => file.arrayBuffer();
  }
  if (!Number.isInteger(size) || size <= 0 || size > maxAttachmentBytes) throw new AttachmentError('size');
  const content = await read();
  if (content.byteLength !== size) throw new AttachmentError('size');
  const mime = attachmentType(new Uint8Array(content));
  if (!mime) throw new AttachmentError('type');
  const slot = await rpc('begin_task_attachment', { p_task: task.id, p_filename: filename, p_mime: mime, p_size: size });
  if (!Array.isArray(slot) || slot.length !== 1 || !slot[0] || typeof slot[0] !== 'object') throw new Error('invalid_data');
  const record = slot[0] as Record<string, unknown>;
  if (typeof record.attachment_id !== 'string' || typeof record.storage_path !== 'string'
    || !record.storage_path.startsWith(`${task.group_id}/${task.id}/${record.attachment_id}.`)) throw new Error('invalid_data');
  const id = record.attachment_id;
  const uploaded = await client().storage.from('task-attachments').upload(record.storage_path, content, { contentType: mime, upsert: false });
  if (uploaded.error) {
    // A response can be lost after the server has stored the file. Check without uploading twice.
    try { await finishAttachment(id); return; } catch { throw uploaded.error; }
  }
  try { await finishAttachment(id); }
  catch { throw new AttachmentError('pending', id); }
}

export async function attachmentUrl(path: string): Promise<string> {
  const { data, error } = await client().storage.from('task-attachments').createSignedUrl(path, 300);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('invalid_data');
  return data.signedUrl;
}

export async function deleteAttachment(file: Attachment): Promise<void> {
  const { error } = await client().storage.from('task-attachments').remove([file.storage_path]);
  if (error) throw error;
  // Keep metadata until Storage confirms removal. Retrying after a partial success is safe.
  await rpc('finish_attachment_deletion', { p_id: file.id });
}
