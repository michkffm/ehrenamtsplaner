const key = 'ehrenamtsplaner.preferences.v1';
export function readPreferences(): string | null {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
}
export function writePreferences(value: string): void {
  window.localStorage.setItem(key, value);
}
