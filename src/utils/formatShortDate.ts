// "2026-10-31" ou ISO completo → "31/10/2026" na data local.
export function formatShortDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split("-").reverse().join("/");
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}
