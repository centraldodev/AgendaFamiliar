import { getBrazilianHolidays, getHolidaysMap } from '@constants/holidays';

describe('getBrazilianHolidays', () => {
  it('includes all fixed-date national holidays for a given year', () => {
    const holidays = getBrazilianHolidays(2026);
    const byDate = Object.fromEntries(holidays.map((h) => [h.date, h.name]));

    expect(byDate['2026-01-01']).toBe('Confraternização Universal');
    expect(byDate['2026-04-21']).toBe('Tiradentes');
    expect(byDate['2026-05-01']).toBe('Dia do Trabalho');
    expect(byDate['2026-09-07']).toBe('Independência do Brasil');
    expect(byDate['2026-10-12']).toBe('Nossa Senhora Aparecida');
    expect(byDate['2026-11-02']).toBe('Finados');
    expect(byDate['2026-11-15']).toBe('Proclamação da República');
    expect(byDate['2026-11-20']).toBe('Dia da Consciência Negra');
    expect(byDate['2026-12-25']).toBe('Natal');
  });

  it('calculates Easter-based holidays correctly for 2026 (Easter = April 5)', () => {
    const holidays = getBrazilianHolidays(2026);
    const byDate = Object.fromEntries(holidays.map((h) => [h.date, h.name]));

    expect(byDate['2026-02-16']).toBe('Carnaval');
    expect(byDate['2026-02-17']).toBe('Carnaval');
    expect(byDate['2026-04-03']).toBe('Sexta-feira Santa');
    expect(byDate['2026-06-04']).toBe('Corpus Christi');
  });

  it('calculates Easter-based holidays correctly for 2025 (Easter = April 20)', () => {
    const holidays = getBrazilianHolidays(2025);
    const byDate = Object.fromEntries(holidays.map((h) => [h.date, h.name]));

    expect(byDate['2025-03-03']).toBe('Carnaval');
    expect(byDate['2025-03-04']).toBe('Carnaval');
    expect(byDate['2025-04-18']).toBe('Sexta-feira Santa');
    expect(byDate['2025-06-19']).toBe('Corpus Christi');
  });

  it('returns exactly 13 holidays per year', () => {
    expect(getBrazilianHolidays(2027)).toHaveLength(13);
  });
});

describe('getHolidaysMap', () => {
  it('merges holidays from multiple years into a single date -> name map', () => {
    const map = getHolidaysMap([2025, 2026]);

    expect(map['2025-12-25']).toBe('Natal');
    expect(map['2026-01-01']).toBe('Confraternização Universal');
  });

  it('returns an empty map for an empty year list', () => {
    expect(getHolidaysMap([])).toEqual({});
  });
});
