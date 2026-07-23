import { parseDateString } from './dateParser';

// Alias kept for backwards compatibility - dateParser.ts is the canonical
// implementation of timezone-safe YYYY-MM-DD parsing.
export const parseDateLocal = parseDateString;

export const formatDate = (date: string | Date): string => {
  let d: Date;

  if (typeof date === 'string') {
    d = parseDateLocal(date);
  } else {
    d = date;
  }

  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo', // Brasilia timezone
  });
};

export const formatDateTime = (date: string | Date): string => {
  return `${formatDate(date)} ${formatTime(date)}`;
};

export const isPastDate = (date: string | Date): boolean => {
  // Use parseDateLocal for strings to avoid UTC interpretation
  const d = typeof date === 'string' ? parseDateLocal(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
};

export const isToday = (date: string | Date): boolean => {
  // Use parseDateLocal for strings to avoid UTC interpretation
  const d = typeof date === 'string' ? parseDateLocal(date) : date;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

export const isTomorrow = (date: string | Date): boolean => {
  // Use parseDateLocal for strings to avoid UTC interpretation
  const d = typeof date === 'string' ? parseDateLocal(date) : date;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear()
  );
};

// ============================================
// Funções de Timezone de Brasília (UTC-3)
// Brasília não usa horário de verão desde 2019
// ============================================

/**
 * Cria uma data no horário de Brasília a partir de strings de data e hora
 * Esta função garante que a data seja interpretada corretamente independente
 * do timezone do dispositivo.
 * 
 * @param dateStr - Data no formato YYYY-MM-DD
 * @param timeStr - Hora no formato HH:mm (opcional, default 09:00)
 * @returns Date object representando o momento correto
 */
export function createBrasiliaDate(dateStr: string, timeStr?: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);

  let hours = 9;
  let minutes = 0;

  if (timeStr) {
    [hours, minutes] = timeStr.split(':').map(Number);
  }

  // Criar a data diretamente com os componentes
  // Isso cria a data no timezone LOCAL do dispositivo
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);

  return date;
}

/**
 * Calcula segundos até uma data alvo
 * 
 * @param targetDate - Data alvo
 * @returns Número de segundos até a data alvo
 */
export function secondsUntilDate(targetDate: Date): number {
  const now = new Date();
  return Math.floor((targetDate.getTime() - now.getTime()) / 1000);
}

/**
 * Formata uma data para exibição em horário de Brasília
 * @param date - Date object
 * @returns String formatada em pt-BR
 */
export function formatBrasiliaDateTime(date: Date): string {
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

