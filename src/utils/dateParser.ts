/**
 * Date parsing and manipulation utilities
 * Handles timezone-safe date operations for Brasilia (GMT-3)
 */

/**
 * Parses a YYYY-MM-DD string into a Date object using local timezone
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object in local timezone
 */
export const parseDateString = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Formats a Date object to YYYY-MM-DD string
 * @param date - Date object to format
 * @returns Formatted date string
 */
export const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Gets today's date as YYYY-MM-DD string
 * @returns Today's date string
 */
export const getTodayString = (): string => {
  return formatDateToString(new Date());
};

/**
 * Gets the date N days ago as a YYYY-MM-DD string
 * @param days - Number of days in the past
 * @returns Date string N days ago
 */
export const getDateDaysAgoString = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDateToString(date);
};

/**
 * Checks if a date string is in the past
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns True if date is before today
 */
export const isPastDate = (dateStr: string): boolean => {
  const date = parseDateString(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
};

/**
 * Checks if a date string is today
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns True if date is today
 */
export const isToday = (dateStr: string): boolean => {
  return dateStr === getTodayString();
};
