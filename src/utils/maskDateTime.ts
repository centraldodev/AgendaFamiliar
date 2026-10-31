// Máscaras dos campos digitados (web): só números, separadores automáticos.
export const maxDigits = { date: 8, time: 4 } as const;
const digitsOf = (text: string, mode: "date" | "time") =>
  text.replace(/\D/g, "").slice(0, maxDigits[mode]);
/** "3110202" -> "31/10/202"; "0930" -> "09:30". Letras e excesso de dígitos são descartados. */
export function maskDateTime(text: string, mode: "date" | "time") {
  const d = digitsOf(text, mode);
  if (mode === "time") return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
  if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return d;
}
/** Valor salvo (AAAA-MM-DD ou HH:MM) -> texto exibido (DD/MM/AAAA ou HH:MM). */
export function displayDateTime(value: string, mode: "date" | "time") {
  if (mode === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split("-").reverse().join("/");
  return value;
}
/**
 * Texto digitado -> valor salvo. Devolve { value } quando completo e válido,
 * { error } quando completo e inválido, e {} enquanto ainda falta dígito.
 */
export function parseDateTime(text: string, mode: "date" | "time"): { value?: string; error?: string } {
  const d = digitsOf(text, mode);
  if (!d) return { value: "" };
  if (d.length < maxDigits[mode]) return {};
  if (mode === "time") {
    const [h, m] = [Number(d.slice(0, 2)), Number(d.slice(2))];
    if (h > 23) return { error: "Hora deve ser de 00 a 23." };
    if (m > 59) return { error: "Minutos devem ser de 00 a 59." };
    return { value: `${d.slice(0, 2)}:${d.slice(2)}` };
  }
  const [day, month, year] = [Number(d.slice(0, 2)), Number(d.slice(2, 4)), Number(d.slice(4))];
  if (month < 1 || month > 12) return { error: "Mês deve ser de 01 a 12." };
  if (year < 1900 || year > 2100) return { error: "Ano deve ser entre 1900 e 2100." };
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return { error: `Dia deve ser de 01 a ${daysInMonth} neste mês.` };
  return { value: `${d.slice(4)}-${d.slice(2, 4)}-${d.slice(0, 2)}` };
}
