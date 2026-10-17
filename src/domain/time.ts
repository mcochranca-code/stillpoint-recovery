export interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

export interface Milestone {
  id: string;
  label: string;
  at: Date;
  daysApprox: number;
}

export const localDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function dateOnlyToTimestamp(date: string, time = '00:00'): string {
  const parsed = new Date(`${date}T${time}:00`);
  if (Number.isNaN(parsed.getTime())) throw new Error('Choose a valid local recovery date and time.');
  return parsed.toISOString();
}

export function elapsedParts(startAt: string | null | undefined, now = Date.now()): DurationParts | null {
  if (!startAt) return null;
  const start = new Date(startAt).getTime();
  if (!Number.isFinite(start)) return null;
  const totalSeconds = Math.max(0, Math.floor((now - start) / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalSeconds,
  };
}

function addCalendarMonths(source: Date, months: number): Date {
  const target = new Date(source);
  const day = target.getDate();
  target.setDate(1);
  target.setMonth(target.getMonth() + months);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target;
}

export function buildMilestones(startAt: string): Milestone[] {
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return [];
  const fixed = [
    { id: '24-hours', label: '24 hours', hours: 24 },
    { id: '3-days', label: '3 days', hours: 72 },
    { id: '7-days', label: '7 days', hours: 168 },
    { id: '14-days', label: '14 days', hours: 336 },
    { id: '30-days', label: '30 days', hours: 720 },
    { id: '60-days', label: '60 days', hours: 1440 },
    { id: '90-days', label: '90 days', hours: 2160 },
  ].map((item) => ({
    id: item.id,
    label: item.label,
    at: new Date(start.getTime() + item.hours * 3600000),
    daysApprox: item.hours / 24,
  }));
  const calendar = [
    { months: 6, label: '6 months' },
    { months: 9, label: '9 months' },
    { months: 12, label: '1 year' },
    { months: 18, label: '18 months' },
    { months: 24, label: '2 years' },
    ...Array.from({ length: 50 }, (_, index) => ({ months: 36 + index * 12, label: `${3 + index} years` })),
  ].map((item) => {
    const at = addCalendarMonths(start, item.months);
    return { id: `calendar-${item.months}-months`, label: item.label, at, daysApprox: (at.getTime() - start.getTime()) / 86400000 };
  });
  return [...fixed, ...calendar].sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function nextMilestone(startAt: string | null, now = Date.now()): Milestone | null {
  if (!startAt) return null;
  return buildMilestones(startAt).find((milestone) => milestone.at.getTime() > now) ?? null;
}

export function reachedMilestones(startAt: string, now = Date.now()): Milestone[] {
  return buildMilestones(startAt).filter((milestone) => milestone.at.getTime() <= now);
}

export function formatElapsed(parts: DurationParts | null, style: 'days' | 'full' = 'full'): string {
  if (!parts) return 'Set a recovery date whenever you feel ready';
  if (style === 'days') return `${parts.days} ${parts.days === 1 ? 'day' : 'days'}`;
  return `${parts.days}d ${String(parts.hours).padStart(2, '0')}h ${String(parts.minutes).padStart(2, '0')}m ${String(parts.seconds).padStart(2, '0')}s`;
}

export function formatLocalDate(date: string | Date, options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }): string {
  const parsed = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T12:00:00`)
    : new Date(date);
  return Number.isNaN(parsed.getTime()) ? 'Date not set' : parsed.toLocaleDateString(undefined, options);
}

export function periodStart(date: Date, days: 7 | 30 | 365): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - days + 1);
  return result;
}
