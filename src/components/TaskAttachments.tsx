import { useState } from 'react';
import { Text, View } from 'react-native';
import { useUI } from '../lib/preferences';
import { errorText, type Task } from '../lib/models';
import { AttachmentError, chooseAttachment, deleteAttachment, finishAttachment, loadPendingAttachments, loadTaskAttachments, uploadTaskAttachment } from '../lib/attachments';
import { openAttachment } from '../lib/openAttachment';
import type { Attachment, PendingAttachment } from '../lib/attachmentFiles';
import type { MessageKey } from '../lib/i18n';
import { Button, Notice } from './ui';

export function TaskAttachments({ task, disabled, userId, ownerId }: { task: Task; disabled: boolean; userId: string; ownerId: string }) {
  const { ui, t, language } = useUI();
  const [expanded, setExpanded] = useState(false);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [saved, setSaved] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleting, setDeleting] = useState<Attachment | null>(null);
  const [recoveryLoadFailed, setRecoveryLoadFailed] = useState(false);
  const [reloadFailed, setReloadFailed] = useState(false);
  let message = error ? errorText(error, language) : '';
  if (error instanceof AttachmentError) {
    const keys: Record<AttachmentError['kind'], MessageKey> = { size: 'attachmentSizeError', type: 'attachmentTypeError', name: 'attachmentNameError', pending: 'attachmentPending', popup: 'attachmentPopup', mismatch: 'attachmentRetryMismatch' };
    message = t(keys[error.kind]);
  }
  async function reload() {
    const [files, pending] = await Promise.all([loadTaskAttachments(task.id), loadPendingAttachments(task.id)]);
    setFiles(files); setPending(pending);
  }
  async function run(action: () => Promise<void>) {
    if (busy || disabled) return;
    setBusy(true); setError(null); setSaved(false); setDeleted(false); setReloadFailed(false); setRecoveryLoadFailed(false);
    try { await action(); }
    catch (e) {
      setError(e);
      if (e instanceof AttachmentError && e.attachmentId) {
        try { await reload(); } catch { setRecoveryLoadFailed(true); }
      }
    }
    finally { setBusy(false); }
  }
  async function afterUpload() {
    setSaved(true);
    try { await reload(); } catch { setReloadFailed(true); }
  }
  async function pick(pending?: PendingAttachment) {
    // Do not lock the UI while the browser file picker is open: cancellation is not reported by all browsers.
    try {
      const selection = await chooseAttachment();
      if (selection.canceled) return;
      const asset = selection.assets[0];
      if (!asset) return;
      await run(async () => { await uploadTaskAttachment(task, asset, pending); await afterUpload(); });
    } catch (e) { setError(e); }
  }
  return <View style={{ gap: 10 }}>
    <Button label={t('attachments')} secondary selected={expanded} disabled={disabled || busy} onPress={() => {
      if (expanded) setExpanded(false);
      else { setExpanded(true); void run(reload); }
    }} />
    {expanded ? <>
      <Text style={ui.body}>{t('attachmentHint')}</Text>
      <Notice message={message} error />
      <Notice message={recoveryLoadFailed ? t('attachmentRecoveryLoadFailed') : ''} error />
      <Notice message={saved ? t('attachmentSaved') : deleted ? t('attachmentDeleted') : ''} />
      <Notice message={reloadFailed ? t(deleted ? 'attachmentDeleteReloadFailed' : 'attachmentReloadFailed') : ''} error />
      {busy ? <Text accessibilityLiveRegion="polite" style={ui.body}>{t('wait')}</Text> : null}
      {!busy && !error && !reloadFailed && !files.length && !pending.length ? <Text style={ui.body}>{t('noAttachments')}</Text> : null}
      {files.map((file) => <View key={file.id} style={{ gap: 8 }}>
        <Button label={`${file.filename} · ${new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-GB', { maximumFractionDigits: 1 }).format(file.size_bytes / 1024)} KB`}
          secondary disabled={disabled || busy} onPress={() => void run(() => openAttachment(file.storage_path))} />
        {file.created_by === userId || userId === ownerId ? <Button label={t('attachmentDeleteNamed', { name: file.filename })}
          secondary disabled={disabled || busy || deleting !== null} onPress={() => setDeleting(file)} /> : null}
      </View>)}
      {deleting ? <View style={ui.card}>
        <Text accessibilityRole="alert" style={ui.body}>{t('attachmentDeleteConfirm', { name: deleting.filename })}</Text>
        <Button label={t('attachmentDeleteConfirmButton')} disabled={disabled || busy} onPress={() => void run(async () => {
          await deleteAttachment(deleting);
          setFiles(current => current.filter(file => file.id !== deleting.id));
          setDeleting(null); setDeleted(true);
          try { await reload(); } catch { setReloadFailed(true); }
        })} />
        <Button label={t('cancel')} secondary disabled={busy} onPress={() => setDeleting(null)} />
      </View> : null}
      {pending.map(file => <View key={file.id} style={ui.card}>
        <Text style={ui.body}>{t('attachmentUnfinished', { name: file.filename })}</Text>
        <Text style={ui.body}>{t(file.uploaded ? 'attachmentRetryFinishHint' : 'attachmentRetrySelectHint')}</Text>
        <Button label={t(file.uploaded ? 'attachmentFinish' : 'attachmentRetrySelect')} disabled={disabled || busy}
          onPress={() => file.uploaded
            ? void run(async () => { await finishAttachment(file.id); await afterUpload(); })
            : void pick(file)} />
      </View>)}
      <View style={ui.row}>
        <Button label={t('attachmentAdd')} disabled={disabled || busy} onPress={() => void pick()} />
        <Button label={t('refresh')} secondary disabled={disabled || busy} onPress={() => void run(reload)} />
      </View>
    </> : null}
  </View>;
}
