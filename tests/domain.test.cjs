const {test} = require('node:test');
const assert = require('node:assert/strict');
const {validateTaskInput} = require('../src/utils/validateTaskInput.ts');
const {filterTasks} = require('../src/utils/filterTasks.ts');
const {canCompleteTask} = require('../src/middlewares/canCompleteTask.ts');
const input = {title:'Consulta',description:'',dueDate:'2028-02-29',dueTime:'13:30',category:'health',isPrivate:false};
test('validação preserva datas reais, anos bissextos e horário opcional',()=>{
 assert.doesNotThrow(()=>validateTaskInput(input));
 assert.doesNotThrow(()=>validateTaskInput({...input,dueTime:null}));
 for(const patch of [{title:'   '},{dueDate:'2026-02-29'},{dueDate:'2026-13-01'},{dueTime:'24:00'}])assert.throws(()=>validateTaskInput({...input,...patch}));
});
test('filtros distinguem pendentes, concluídas e privadas sem modificar a lista',()=>{
 const tasks=[{id:'a',completed:false,isPrivate:false},{id:'b',completed:true,isPrivate:false},{id:'c',completed:false,isPrivate:true}];
 assert.deepEqual(filterTasks(tasks,'pending').map(t=>t.id),['a','c']);
 assert.deepEqual(filterTasks(tasks,'completed').map(t=>t.id),['b']);
 assert.deepEqual(filterTasks(tasks,'private').map(t=>t.id),['c']);
 assert.equal(filterTasks(tasks,'all').length,3);assert.equal(tasks.length,3);
});
test('administrador só conclui tarefas alheias compartilhadas',()=>{
 const task={createdBy:'alice',isPrivate:false};
 assert.equal(canCompleteTask(task,{uid:'bob',role:'dependent'}),false);
 assert.equal(canCompleteTask(task,{uid:'bob',role:'admin'}),true);
 assert.equal(canCompleteTask({...task,isPrivate:true},{uid:'bob',role:'admin'}),false);
 assert.equal(canCompleteTask({...task,isPrivate:true},{uid:'alice',role:'dependent'}),true);
});
