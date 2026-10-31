// Compartilhado com o app (src/utils/nextOccurrence.ts reexporta). Sem imports: roda no app e no backend.
export interface RecurrenceRule {
  recurrence?: unknown;
  weekDays?: number[] | null;
  recurrenceInterval?: number | null;
  recurrenceEndDate?: string | null;
}
const pad = (n: number) => String(n).padStart(2, "0");
const format = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};
// Soma meses mantendo o dia, ou o último dia do mês quando ele não existe (31 → 30/28).
const addMonths = (date: Date, months: number, day: number) => {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1, 12);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, last));
  return target;
};
function step(date: Date, rule: RecurrenceRule, day: number): Date | null {
  const next = new Date(date);
  switch (rule.recurrence) {
    case "daily":
      next.setDate(next.getDate() + 1);
      return next;
    case "weekly":
      next.setDate(next.getDate() + 7);
      return next;
    case "interval": {
      const days = Number(rule.recurrenceInterval);
      if (!Number.isInteger(days) || days < 1) return null;
      next.setDate(next.getDate() + days);
      return next;
    }
    case "custom_weekly": {
      const days = (rule.weekDays ?? []).filter((d) => d >= 0 && d <= 6);
      if (!days.length) return null;
      do next.setDate(next.getDate() + 1);
      while (!days.includes(next.getDay()));
      return next;
    }
    case "monthly":
      return addMonths(date, 1, day);
    case "yearly":
      return addMonths(date, 12, day);
    default:
      return null;
  }
}
// Próxima data depois do vencimento e de hoje (concluir atrasada não gera outra
// já vencida). null quando não repete ou quando passaria da data final.
export function nextOccurrence(
  dueDate: string,
  rule: RecurrenceRule,
  todayDate: string,
): string | null {
  const limit = dueDate > todayDate ? dueDate : todayDate;
  const day = parse(dueDate).getDate();
  let current = parse(dueDate);
  for (let i = 0; i < 5000; i++) {
    const next = step(current, rule, day);
    if (!next) return null;
    const value = format(next);
    if (rule.recurrenceEndDate && value > rule.recurrenceEndDate) return null;
    if (value > limit) return value;
    current = next;
  }
  return null;
}
