const {test} = require('node:test');
const assert = require('node:assert/strict');
const {register} = require('node:module');
register('data:text/javascript,'+encodeURIComponent("export async function resolve(specifier,context,next){try{return await next(specifier,context)}catch(error){if(specifier.startsWith('.'))return next(specifier+'.ts',context);throw error}}"));
const {brazilHolidays} = require('../src/utils/brazilHolidays.ts');
const {monthGrid} = require('../src/utils/monthGrid.ts');
test('feriados nacionais móveis e fixos', () => {
  const byName = (year) => Object.fromEntries(brazilHolidays(year).map((h) => [h.name + (h.optional ? '*' : ''), h.date]));
  const y2026 = byName(2026);
  assert.equal(y2026['Páscoa'], '2026-04-05');
  assert.equal(y2026['Sexta-feira Santa'], '2026-04-03');
  assert.equal(y2026['Corpus Christi*'], '2026-06-04');
  assert.equal(y2026['Dia da Consciência Negra'], '2026-11-20');
  assert.equal(byName(2025)['Páscoa'], '2025-04-20');
  assert.equal(byName(2023)['Dia da Consciência Negra'], undefined);
  const carnaval = brazilHolidays(2026).filter((h) => h.name === 'Carnaval').map((h) => h.date);
  assert.deepEqual(carnaval, ['2026-02-16', '2026-02-17']);
});
test('grade do mês começa no dia da semana certo', () => {
  const weeks = monthGrid(2026, 10); // novembro/2026 começa num domingo
  assert.equal(weeks[0][0], '2026-11-01');
  assert.equal(weeks.flat().filter(Boolean).length, 30);
  assert.equal(monthGrid(2026, 9)[0][4], '2026-10-01'); // outubro/2026: quinta
});
