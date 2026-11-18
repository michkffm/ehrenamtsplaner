import { File, Paths } from 'expo-file-system';

function preferencesFile() { return new File(Paths.document, 'preferences.json'); }
export function readPreferences(): string | null {
  const file = preferencesFile();
  return file.exists ? file.textSync() : null;
}
export function writePreferences(value: string): void {
  preferencesFile().writeSync(value);
}
