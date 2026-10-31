const {test} = require('node:test');
const assert = require('node:assert/strict');
const {register} = require('node:module');
register('data:text/javascript,'+encodeURIComponent("export async function resolve(specifier,context,next){try{return await next(specifier,context)}catch(error){if(specifier.startsWith('.'))return next(specifier+'.ts',context);throw error}}"));
const {nextOccurrence} = require('../src/utils/nextOccurrence.ts');
const {validateTaskInput} = require('../src/utils/validateTaskInput.ts');
const today = '2026-10-31';
test('próxima data por tipo de recorrência', () => {
  assert.equal(nextOccurrence('2026-10-31', {recurrence:'daily'}, today), '2026-11-01');
  assert.equal(nextOccurrence('2026-10-31', {recurrence:'weekly'}, today), '2026-11-07');
  assert.equal(nextOccurrence('2026-10-31', {recurrence:'interval', recurrenceInterval:15}, today), '2026-11-15');
  assert.equal(nextOccurrence('2026-10-31', {recurrence:'interval', recurrenceInterval:30}, today), '2026-11-30');
  // 31/10 mensal vira 30/11 e volta a 31/12 (mantém o dia original).
  assert.equal(nextOccurrence('2026-10-31', {recurrence:'monthly'}, today), '2026-11-30');
  assert.equal(nextOccurrence('2026-11-30', {recurrence:'monthly'}, '2026-11-30'), '2026-12-30');
  assert.equal(nextOccurrence('2028-02-29', {recurrence:'yearly'}, '2028-02-29'), '2029-02-28');
  // 31/10/2026 é sábado; seg(1) e qua(3) → 02/11.
  assert.equal(nextOccurrence('2026-10-31', {recurrence:'custom_weekly', weekDays:[1,3]}, today), '2026-11-02');
  assert.equal(nextOccurrence('2026-10-31', {recurrence:'none'}, today), null);
});
test('atrasada pula para depois de hoje; respeita a data final', () => {
  assert.equal(nextOccurrence('2026-10-20', {recurrence:'weekly'}, today), '2026-11-03');
  assert.equal(nextOccurrence('2026-12-01', {recurrence:'daily'}, today), '2026-12-02');
  assert.equal(nextOccurrence('2026-10-31', {recurrence:'interval', recurrenceInterval:15, recurrenceEndDate:'2026-11-10'}, today), null);
  assert.equal(nextOccurrence('2026-10-31', {recurrence:'daily', recurrenceEndDate:'2026-11-01'}, today), '2026-11-01');
});
test('valida subtarefas e recorrência no formulário', () => {
  const base = {title:'T', description:'', dueDate:today, dueTime:null, category:'home', isPrivate:false, subtasks:[], recurrence:'none'};
  assert.doesNotThrow(() => validateTaskInput({...base, recurrence:'interval', recurrenceInterval:15, recurrenceEndDate:'2026-12-31'}));
  for (const patch of [{subtasks:[{id:'1', title:' ', completed:false}]}, {recurrence:'interval', recurrenceInterval:0}, {recurrence:'custom_weekly', weekDays:[]}, {recurrence:'daily', recurrenceEndDate:'2026-10-01'}])
    assert.throws(() => validateTaskInput({...base, ...patch}));
});
test('subtarefas: agrupamento por categoria, campos opcionais validados', () => {
  const {groupSubtasks} = require('../src/utils/groupSubtasks.ts');
  const groups = groupSubtasks([{id:'1',title:'A',completed:false},{id:'2',title:'B',completed:false,category:'health'},{id:'3',title:'C',completed:false,category:'home'}]);
  assert.deepEqual(groups.map((g) => g.label), ['Casa','Saúde','Sem categoria']);
  const base = {title:'T', description:'', dueDate:today, dueTime:null, category:'home', isPrivate:false, recurrence:'none'};
  assert.doesNotThrow(() => validateTaskInput({...base, subtasks:[{id:'1',title:'A',completed:false,category:null,dueDate:null,dueTime:null}]}));
  assert.throws(() => validateTaskInput({...base, subtasks:[{id:'1',title:'A',completed:false,dueDate:'2026-02-30'}]}));
  assert.throws(() => validateTaskInput({...base, subtasks:[{id:'1',title:'A',completed:false,dueTime:'25:00'}]}));
});
test('status de vencimento e filtro de vencidas', () => {
  const {dueStatus} = require('../src/utils/dueStatus.ts');
  const {filterTasks} = require('../src/utils/filterTasks.ts');
  const now = new Date(2026, 9, 31, 15, 0);
  const t = (dueDate, dueTime = null, completed = false) => ({id: dueDate + dueTime, dueDate, dueTime, completed});
  assert.equal(dueStatus(t('2026-10-30'), now), 'overdue');
  assert.equal(dueStatus(t('2026-10-31', '14:00'), now), 'overdue');
  assert.equal(dueStatus(t('2026-10-31', '16:00'), now), 'soon');
  assert.equal(dueStatus(t('2026-10-31'), now), 'soon');
  assert.equal(dueStatus(t('2026-11-01'), now), 'soon');
  assert.equal(dueStatus(t('2026-11-02'), now), null);
  assert.equal(dueStatus(t('2026-10-30', null, true), now), null);
  const tasks = [t('2026-10-30'), t('2026-10-31', '14:00'), t('2026-10-31', '16:00'), t('2026-10-29', null, true)];
  assert.deepEqual(filterTasks(tasks, 'overdue', '2026-10-31', now).map((x) => x.dueDate + x.dueTime), ['2026-10-30null', '2026-10-3114:00']);
});
