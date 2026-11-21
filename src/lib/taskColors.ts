import type { TaskColor } from './models';

export function taskColorValue(color: TaskColor, dark: boolean, defaultColor: string): string {
  const palette = dark
    ? { green: '#4ADE80', blue: '#60A5FA', yellow: '#FACC15', red: '#F87171', purple: '#C084FC' }
    : { green: '#16A34A', blue: '#2563EB', yellow: '#EAB308', red: '#EF4444', purple: '#A855F7' };
  return color === 'none' ? defaultColor : palette[color];
}
