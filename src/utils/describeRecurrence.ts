import type { RecurrenceRule } from "../models/Recurrence";
const weekDayNames = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export function describeRecurrence(rule: Partial<RecurrenceRule>) {
  const base = (() => {
    switch (rule.recurrence) {
      case "daily":
        return "Todos os dias";
      case "weekly":
        return "Toda semana";
      case "interval":
        return `A cada ${rule.recurrenceInterval} dias`;
      case "custom_weekly":
        return `Toda ${(rule.weekDays ?? []).map((d) => weekDayNames[d]).join(", ")}`;
      case "monthly":
        return "Todo mês";
      case "yearly":
        return "Todo ano";
      default:
        return "";
    }
  })();
  if (!base) return "";
  return rule.recurrenceEndDate
    ? `${base} até ${rule.recurrenceEndDate.split("-").reverse().join("/")}`
    : base;
}
export { weekDayNames };
