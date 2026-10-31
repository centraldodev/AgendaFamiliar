// "interval" repete a cada N dias (15, 30 ou personalizado). Os demais valores
// são os do app anterior e continuam válidos nos registros antigos.
export type Recurrence =
  | "none"
  | "daily"
  | "weekly"
  | "custom_weekly"
  | "interval"
  | "monthly"
  | "yearly";
export interface RecurrenceRule {
  recurrence: Recurrence;
  /** Dias da semana (0 = domingo) para "custom_weekly". */
  weekDays?: number[] | null;
  /** Intervalo em dias para "interval". */
  recurrenceInterval?: number | null;
  /** Última data (AAAA-MM-DD) em que a tarefa pode se repetir. */
  recurrenceEndDate?: string | null;
}
