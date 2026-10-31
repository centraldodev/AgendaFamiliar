const {test} = require('node:test');
const assert = require('node:assert/strict');
const {register} = require('node:module');
register('data:text/javascript,'+encodeURIComponent("export async function resolve(specifier,context,next){try{return await next(specifier,context)}catch(error){if(specifier.startsWith('.'))return next(specifier+'.ts',context);throw error}}"));
const {validateTaskInput} = require('../src/utils/validateTaskInput.ts');
const {filterTasks} = require('../src/utils/filterTasks.ts');
const {canCompleteTask} = require('../src/middlewares/canCompleteTask.ts');
const input = {title:'Consulta',description:'',dueDate:'2028-02-29',dueTime:'13:30',category:'health',isPrivate:false,subtasks:[],recurrence:'none'};
test('validação preserva datas reais, anos bissextos e horário opcional',()=>{
 assert.doesNotThrow(()=>validateTaskInput(input));
 assert.doesNotThrow(()=>validateTaskInput({...input,dueTime:null}));
 for(const patch of [{title:'   '},{dueDate:'2026-02-29'},{dueDate:'2026-13-01'},{dueTime:'24:00'}])assert.throws(()=>validateTaskInput({...input,...patch}));
});
test('filtros separam hoje (só a data de hoje), futuras, concluídas e privadas sem modificar a lista',()=>{
 const tasks=[{id:'a',completed:false,isPrivate:false,dueDate:'2026-10-31',dueTime:'18:00'},{id:'b',completed:true,isPrivate:false,dueDate:'2026-10-31'},{id:'c',completed:false,isPrivate:true,dueDate:'2026-11-02'},{id:'d',completed:false,isPrivate:false,dueDate:'2026-10-30'},{id:'e',completed:false,isPrivate:false,dueDate:'2026-11-01'}];
 const ids=(filter)=>filterTasks(tasks,filter,'2026-10-31').map(t=>t.id);
 assert.deepEqual(ids('today'),['a']);
 assert.deepEqual(ids('upcoming'),['e','c']);
 assert.deepEqual(ids('completed'),['b']);
 assert.deepEqual(filterTasks([{id:'x',completed:true,dueDate:'2026-10-01'},{id:'y',completed:true,dueDate:'2026-10-20'}],'completed','2026-10-31').map(t=>t.id),['y','x']);
 assert.deepEqual(filterTasks([{id:'z',completed:false}],'today','2026-10-31').map(t=>t.id),['z']);
 assert.deepEqual(ids('private'),['c']);
 assert.equal(tasks.length,5);assert.equal(tasks[0].id,'a');
});
test('administrador só conclui tarefas alheias compartilhadas',()=>{
 const task={createdBy:'alice',isPrivate:false};
 assert.equal(canCompleteTask(task,{uid:'bob',role:'dependent'}),false);
 assert.equal(canCompleteTask(task,{uid:'bob',role:'admin'}),true);
 assert.equal(canCompleteTask({...task,isPrivate:true},{uid:'bob',role:'admin'}),false);
 assert.equal(canCompleteTask({...task,isPrivate:true},{uid:'alice',role:'dependent'}),true);
});
