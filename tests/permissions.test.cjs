const {test} = require('node:test');
const assert = require('node:assert/strict');
const {register} = require('node:module');
// O app importa arquivos .ts sem extensão (Metro/TypeScript); o Node precisa de ajuda para resolvê-los.
register('data:text/javascript,'+encodeURIComponent("export async function resolve(specifier,context,next){try{return await next(specifier,context)}catch(error){if(specifier.startsWith('.'))return next(specifier+'.ts',context);throw error}}"));
const {isAdmin} = require('../src/middlewares/isAdmin.ts');
const {canEditTask} = require('../src/middlewares/canEditTask.ts');
const {canDeleteTask} = require('../src/middlewares/canDeleteTask.ts');
const {canCreatePrivateTask} = require('../src/middlewares/canCreatePrivateTask.ts');
const {canCompleteTask} = require('../src/middlewares/canCompleteTask.ts');
const {describeHistory} = require('../src/utils/describeHistory.ts');
const admin = {uid:'admin',role:'admin'};
const user = {uid:'alice',role:'user'};
const legacy = {uid:'bob',role:'dependent'};
const task = (extra={}) => ({createdBy:'alice',isPrivate:false,...extra});
test('somente role "admin" é administrador; papéis antigos valem como usuário',()=>{
 assert.equal(isAdmin(admin),true);
 for(const profile of [user,legacy,{uid:'x',role:'parent'},{uid:'x'},null,undefined])assert.equal(isAdmin(profile),false);
});
test('usuário só conclui as próprias tarefas e nunca edita, exclui ou cria privadas',()=>{
 assert.equal(canCompleteTask(task(),user),true);
 assert.equal(canCompleteTask(task({createdBy:'bob'}),user),false);
 for(const profile of [user,legacy]){
  assert.equal(canEditTask(task({createdBy:profile.uid}),profile),false);
  assert.equal(canDeleteTask(task({createdBy:profile.uid}),profile),false);
  assert.equal(canCreatePrivateTask(profile),false);
 }
});
test('administrador edita e exclui tarefas compartilhadas, mas não as privadas de outras pessoas',()=>{
 assert.equal(canEditTask(task(),admin),true);
 assert.equal(canDeleteTask(task(),admin),true);
 assert.equal(canEditTask(task({isPrivate:true}),admin),false);
 assert.equal(canDeleteTask(task({isPrivate:true}),admin),false);
 assert.equal(canEditTask(task({createdBy:'admin',isPrivate:true}),admin),true);
 assert.equal(canDeleteTask(task({createdBy:'admin',isPrivate:true}),admin),true);
 assert.equal(canCreatePrivateTask(admin),true);
 assert.equal(canCompleteTask(task(),admin),true);
});
test('histórico descreve quem aprovou, o acesso concedido e a troca de papel',()=>{
 assert.match(describeHistory({type:'join_approved',actorName:'Ana',targetName:'Beto',role:'admin',at:'2026-10-31T10:00:00.000Z',id:'1'}),/Ana aprovou a entrada de Beto como Administrador/);
 assert.match(describeHistory({type:'join_approved',actorName:'Ana',targetName:'Beto',role:'user',at:'',id:'2'}),/como Usuário/);
 assert.match(describeHistory({type:'role_changed',actorName:'Ana',targetName:'Beto',fromRole:'user',toRole:'admin',at:'',id:'3'}),/de Usuário para Administrador/);
});
