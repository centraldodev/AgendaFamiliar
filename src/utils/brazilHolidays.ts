// Feriados nacionais do Brasil (Lei 662/1949 e posteriores, incluindo o Dia da
// Consciência Negra desde 2024), mais os pontos facultativos nacionais ligados à
// Páscoa. Calculados localmente, sem depender de serviço externo.
export interface Holiday {
  date: string;
  name: string;
  /** Ponto facultativo (Carnaval, Quarta de Cinzas, Corpus Christi). */
  optional?: boolean;
}
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Domingo de Páscoa pelo algoritmo de Meeus/Jones/Butcher (calendário gregoriano).
function easter(year: number) {
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
  return new Date(year, month - 1, day, 12);
}
const offset = (base: Date, days: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return iso(d);
};
export function brazilHolidays(year: number): Holiday[] {
  const e = easter(year);
  const list: Holiday[] = [
    { date: `${year}-01-01`, name: "Confraternização Universal" },
    { date: offset(e, -48), name: "Carnaval", optional: true },
    { date: offset(e, -47), name: "Carnaval", optional: true },
    { date: offset(e, -46), name: "Quarta-feira de Cinzas", optional: true },
    { date: offset(e, -2), name: "Sexta-feira Santa" },
    { date: iso(e), name: "Páscoa" },
    { date: `${year}-04-21`, name: "Tiradentes" },
    { date: `${year}-05-01`, name: "Dia do Trabalho" },
    { date: offset(e, 60), name: "Corpus Christi", optional: true },
    { date: `${year}-09-07`, name: "Independência do Brasil" },
    { date: `${year}-10-12`, name: "Nossa Senhora Aparecida" },
    { date: `${year}-11-02`, name: "Finados" },
    { date: `${year}-11-15`, name: "Proclamação da República" },
    ...(year >= 2024 ? [{ date: `${year}-11-20`, name: "Dia da Consciência Negra" }] : []),
    { date: `${year}-12-25`, name: "Natal" },
  ];
  return list.sort((a, b) => a.date.localeCompare(b.date));
}
