import { AttachmentError, attachmentUrl } from './attachments';

export async function openAttachment(path: string) {
  // Open during the click event so browsers do not block an asynchronously created tab.
  const tab = window.open('about:blank', '_blank');
  if (!tab) throw new AttachmentError('popup');
  tab.opener = null;
  try { tab.location.replace(await attachmentUrl(path)); }
  catch (error) { tab.close(); throw error; }
}
