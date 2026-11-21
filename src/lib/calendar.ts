export type CalendarDate = { year: number; month: number; day: number };

export function calendarUTCDate(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCFullYear(year, month, day);
  return date;
}

export function calendarValue(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseCalendarValue(value: string): CalendarDate | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, monthNumber, day] = value.split('-').map(Number);
  const month = monthNumber - 1;
  const date = calendarUTCDate(year, month, day);
  return year >= 1 && year <= 9999 && date.getUTCFullYear() === year
    && date.getUTCMonth() === month && date.getUTCDate() === day ? { year, month, day } : null;
}

export function calendarDays(year: number, month: number): (number | null)[] {
  const offset = (calendarUTCDate(year, month, 1).getUTCDay() + 6) % 7;
  const count = calendarUTCDate(year, month + 1, 0).getUTCDate();
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    return day >= 1 && day <= count ? day : null;
  });
}

export function adjacentCalendarMonth(year: number, month: number, direction: -1 | 1): { year: number; month: number } {
  const date = calendarUTCDate(year, month + direction, 1);
  if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return { year, month };
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}
