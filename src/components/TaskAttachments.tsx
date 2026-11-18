import { useState } from 'react';
import { Text, View } from 'react-native';
import { useUI } from '../lib/preferences';
import { errorText, type Task } from '../lib/models';
import { AttachmentError, chooseAttachment, finishAttachment, loadTaskAttachments, uploadTaskAttachment } from '../lib/attachments';
import { openAttachment } from '../lib/openAttachment';
import type { Attachment } from '../lib/attachmentFiles';
import type { MessageKey } from '../lib/i18n';
import { Button, Notice } from './ui';

export function TaskAttachments({ task, disabled }: { task: Task; disabled: boolean }) {
  const { ui, t, language } = useUI();
  const [expanded, setExpanded] = useState(false);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [reloadFailed, setReloadFailed] = useState(false);
  let message = error ? errorText(error, language) : '';
  if (error instanceof AttachmentError) {
    const keys: Record<AttachmentError['kind'], MessageKey> = { size: 'attachmentSizeError', type: 'attachmentTypeError', name: 'attachmentNameError', pending: 'attachmentPending', popup: 'attachmentPopup' };
    message = t(keys[error.kind]);
  }
  async function reload() { setFiles(await loadTaskAttachments(task.id)); }
  async function run(action: () => Promise<void>) {
    if (busy || disabled) return;
    setBusy(true); setError(null); setSaved(false); setReloadFailed(false);
    try { await action(); }
    catch (e) { setError(e); if (e instanceof AttachmentError && e.attachmentId) setPending(e.attachmentId); }
    finally { setBusy(false); }
  }
  async function afterUpload() {
    setPending(null); setSaved(true);
    try { await reload(); } catch { setReloadFailed(true); }
  }
  async function pick() {
    // Do not lock the UI while the browser file picker is open: cancellation is not reported by all browsers.
    try {
      const selection = await chooseAttachment();
      if (selection.canceled) return;
      const asset = selection.assets[0];
      if (!asset) return;
      await run(async () => { await uploadTaskAttachment(task, asset); await afterUpload(); });
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
      <Notice message={saved ? t('attachmentSaved') : ''} />
      <Notice message={reloadFailed ? t('attachmentReloadFailed') : ''} error />
      {busy ? <Text accessibilityLiveRegion="polite" style={ui.body}>{t('wait')}</Text> : null}
      {!busy && !error && !reloadFailed && !files.length ? <Text style={ui.body}>{t('noAttachments')}</Text> : null}
      {files.map((file) => <Button key={file.id} label={`${file.filename} · ${new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-GB', { maximumFractionDigits: 1 }).format(file.size_bytes / 1024)} KB`}
        secondary disabled={disabled || busy} onPress={() => void run(() => openAttachment(file.storage_path))} />)}
      {pending ? <Button label={t('attachmentFinish')} disabled={disabled || busy} onPress={() => void run(async () => { await finishAttachment(pending); await afterUpload(); })} /> : null}
      <View style={ui.row}>
        <Button label={t('attachmentAdd')} disabled={disabled || busy || Boolean(pending)} onPress={() => void pick()} />
        <Button label={t('refresh')} secondary disabled={disabled || busy} onPress={() => void run(reload)} />
      </View>
    </> : null}
  </View>;
}
