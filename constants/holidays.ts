import { formatDateToString } from '@utils/dateParser';

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Anonymous Gregorian algorithm (Meeus/Jones/Butcher) for the date of Easter Sunday.
 * Needed because Carnaval, Sexta-feira Santa and Corpus Christi are all offset from it.
 */
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Brazilian national holidays for a given year (fixed dates + Easter-based ones).
 */
export function getBrazilianHolidays(year: number): Holiday[] {
  const easter = getEasterDate(year);

  return [
    { date: formatDateToString(new Date(year, 0, 1)), name: 'Confraternização Universal' },
    { date: formatDateToString(addDays(easter, -48)), name: 'Carnaval' },
    { date: formatDateToString(addDays(easter, -47)), name: 'Carnaval' },
    { date: formatDateToString(addDays(easter, -2)), name: 'Sexta-feira Santa' },
    { date: formatDateToString(new Date(year, 3, 21)), name: 'Tiradentes' },
    { date: formatDateToString(new Date(year, 4, 1)), name: 'Dia do Trabalho' },
    { date: formatDateToString(addDays(easter, 60)), name: 'Corpus Christi' },
    { date: formatDateToString(new Date(year, 8, 7)), name: 'Independência do Brasil' },
    { date: formatDateToString(new Date(year, 9, 12)), name: 'Nossa Senhora Aparecida' },
    { date: formatDateToString(new Date(year, 10, 2)), name: 'Finados' },
    { date: formatDateToString(new Date(year, 10, 15)), name: 'Proclamação da República' },
    { date: formatDateToString(new Date(year, 10, 20)), name: 'Dia da Consciência Negra' },
    { date: formatDateToString(new Date(year, 11, 25)), name: 'Natal' },
  ];
}

/**
 * Map of YYYY-MM-DD -> holiday name, for one or more years (pass neighboring
 * years too when near a year boundary so month navigation stays correct).
 */
export function getHolidaysMap(years: number[]): Record<string, string> {
  const map: Record<string, string> = {};
  years.forEach((year) => {
    getBrazilianHolidays(year).forEach((holiday) => {
      map[holiday.date] = holiday.name;
    });
  });
  return map;
}
