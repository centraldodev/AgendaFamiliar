import type { RecurrenceType, WeekDay } from '@types';

/**
 * Task-related constants
 */
export const RECURRENCE_TYPES = {
  NONE: 'none',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  CUSTOM_WEEKLY: 'custom_weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const;

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  none: 'Não repete',
  daily: 'Diariamente',
  weekly: 'Semanalmente',
  custom_weekly: 'Personalizado',
  monthly: 'Mensalmente',
  yearly: 'Anualmente',
};

/**
 * Days of the week in Portuguese (short), indexed like Task['weekDays']
 * (Dom=0, Seg=1, Ter=2, Qua=3, Qui=4, Sex=5, Sáb=6).
 */
export const WEEK_DAYS: { day: WeekDay; label: string; fullLabel: string }[] = [
  { day: 0, label: 'D', fullLabel: 'Dom' },
  { day: 1, label: 'S', fullLabel: 'Seg' },
  { day: 2, label: 'T', fullLabel: 'Ter' },
  { day: 3, label: 'Q', fullLabel: 'Qua' },
  { day: 4, label: 'Q', fullLabel: 'Qui' },
  { day: 5, label: 'S', fullLabel: 'Sex' },
  { day: 6, label: 'S', fullLabel: 'Sáb' },
];

/**
 * Formats selected weekdays for display, e.g. "Qui, Sex, Sáb" - used on a
 * custom_weekly task to show which days it repeats on, instead of a generic
 * "Personalizado" label.
 */
export function formatWeekDays(weekDays: WeekDay[]): string {
  return WEEK_DAYS.filter((wd) => weekDays.includes(wd.day))
    .map((wd) => wd.fullLabel)
    .join(', ');
}

/**
 * Notification timing constants (in minutes)
 */
export const NOTIFICATION_TIMINGS = {
  EXACT: 0,
  ONE_HOUR_BEFORE: 60,
  TWELVE_HOURS_BEFORE: 720,
} as const;

/**
 * Task status constants
 */
export const TASK_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
} as const;
