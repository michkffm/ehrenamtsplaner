import { Linking } from 'react-native';
import { attachmentUrl } from './attachments';

export async function openAttachment(path: string) {
  await Linking.openURL(await attachmentUrl(path));
}
