const {before,after,beforeEach,test}=require('node:test');
const {readFileSync}=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,getDoc,getDocs,collection,setDoc,updateDoc,deleteDoc,serverTimestamp,Timestamp,query,where}=require('firebase/firestore');
let env;
const db=(uid='alice')=>uid?env.authenticatedContext(uid,{email:`${uid}@example.com`}).firestore():env.unauthenticatedContext().firestore();
const task=(extra={})=>({title:'Consulta',description:'',dueDate:'2026-10-31',dueTime:null,category:'health',isPrivate:false,familyId:'fa',createdBy:'alice',createdAt:Timestamp.fromMillis(1),updatedAt:Timestamp.fromMillis(1),lastModifiedBy:'alice',completed:false,recurrence:'none',subtasks:[],...extra});
const meta=(uid='alice')=>({lastModifiedBy:uid,updatedAt:serverTimestamp()});
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-agenda-familiar',firestore:{rules:readFileSync('../firestore.rules','utf8')}})});
after(async()=>{if(env)await env.cleanup()});
beforeEach(async()=>{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async ctx=>{const store=ctx.firestore();for(const [uid,familyId,role] of [['alice','fa','user'],['bob','fa','user'],['admin','fa','admin'],['outsider','fb','admin']])await setDoc(doc(store,'users',uid),{uid,email:`${uid}@example.com`,displayName:uid,familyId,role});
 for(const id of ['fa','fb'])await setDoc(doc(store,'families',id),{name:id,code:'ABC123'});
 for(const [id,data] of [['shared',task()],['private',task({isPrivate:true})],['other',task({familyId:'fb',createdBy:'outsider'})],['adminTask',task({createdBy:'admin',lastModifiedBy:'admin'})],['adminPrivate',task({isPrivate:true,createdBy:'admin',lastModifiedBy:'admin'})],['recurring',task({recurrence:'weekly',weekDays:[1,3],subtasks:[{id:'1',title:'Etapa'}],customLegacy:'preservar'})]])await setDoc(doc(store,'tasks',id),data);
 });
});
test('bloqueia acesso sem login',async()=>{await assertFails(getDoc(doc(db(null),'tasks','shared')));await assertFails(getDoc(doc(db(null),'users','alice')))});
test('perfil é visível somente ao titular',async()=>{await assertSucceeds(getDoc(doc(db(),'users','alice')));await assertFails(getDoc(doc(db('bob'),'users','alice')));await assertFails(getDocs(collection(db(),'users')))});
test('cadastro cria perfil sem família nem privilégios',async()=>{await assertSucceeds(setDoc(doc(db('new'),'users','new'),{uid:'new',email:'new@example.com',displayName:'Novo'}));await assertFails(setDoc(doc(db('evil'),'users','evil'),{uid:'evil',email:'evil@example.com',displayName:'Novo',role:'admin',familyId:'fa'}))});
test('não cria perfil para outra pessoa ou com e-mail forjado',async()=>{await assertFails(setDoc(doc(db('new'),'users','another'),{uid:'another',email:'new@example.com',displayName:''}));await assertFails(setDoc(doc(db('new'),'users','new'),{uid:'new',email:'other@example.com',displayName:''}))});
test('atualiza nome mas bloqueia escalada de privilégios e troca de família',async()=>{await assertSucceeds(updateDoc(doc(db(),'users','alice'),{displayName:'Alice'}));for(const patch of [{role:'admin'},{familyId:'fb'},{uid:'bob'},{email:'other@example.com'}])await assertFails(updateDoc(doc(db(),'users','alice'),patch));await assertFails(deleteDoc(doc(db(),'users','alice')))});
test('admin não altera perfil de outro membro',async()=>{await assertFails(updateDoc(doc(db('admin'),'users','alice'),{role:'admin'}))});
test('família só pode ser lida por membros; operações de vínculo são do backend',async()=>{await assertSucceeds(getDoc(doc(db(),'families','fa')));await assertFails(getDoc(doc(db('outsider'),'families','fa')));await assertFails(getDocs(collection(db(),'families')));await assertFails(setDoc(doc(db(),'families','new'),{name:'Teste'}));await assertFails(updateDoc(doc(db('admin'),'families','fa'),{code:'OTHER'}));await assertFails(deleteDoc(doc(db('admin'),'families','fa')))});
test('tarefas públicas são visíveis à família',async()=>{for(const id of ['shared'])await assertSucceeds(getDoc(doc(db('bob'),'tasks',id)));await assertFails(getDoc(doc(db('outsider'),'tasks','shared')))});
test('privada é visível apenas ao criador, nunca ao administrador',async()=>{await assertSucceeds(getDoc(doc(db(),'tasks','private')));for(const uid of ['bob','admin','outsider'])await assertFails(getDoc(doc(db(uid),'tasks','private')))});
test('consulta irrestrita de tarefas é negada',async()=>{await assertFails(getDocs(collection(db(),'tasks')))});
test('usuário cria só tarefas públicas; admin cria públicas e privadas',async()=>{const data=(isPrivate)=>({createdAt:serverTimestamp(),updatedAt:serverTimestamp(),isPrivate});await assertSucceeds(setDoc(doc(db(),'tasks','new-public'),task(data(false))));await assertFails(setDoc(doc(db(),'tasks','new-private'),task(data(true))));await assertFails(setDoc(doc(db('bob'),'tasks','new-private-bob'),task({...data(true),createdBy:'bob',lastModifiedBy:'bob'})));for(const isPrivate of [true,false])await assertSucceeds(setDoc(doc(db('admin'),'tasks',`admin-${isPrivate}`),task({...data(isPrivate),createdBy:'admin',lastModifiedBy:'admin'})))});
test('não forja autoria, família, timestamps ou campos extras',async()=>{for(const patch of [{createdBy:'bob'},{userId:'bob'},{familyId:'fb'},{createdAt:Timestamp.fromMillis(2)},{lastModifiedBy:'bob'},{extra:true},{completed:true},{recurrence:'hourly'},{recurrence:'interval'},{recurrence:'custom_weekly'},{recurrenceInterval:0},{subtasks:Array(31).fill({id:'x',title:'x',completed:false})}])await assertFails(setDoc(doc(db(),'tasks','invalid'),task({createdAt:serverTimestamp(),updatedAt:serverTimestamp(),...patch})))});
test('valida título, descrição, privacidade, data e hora',async()=>{for(const patch of [{title:''},{title:'a'.repeat(161)},{description:'a'.repeat(4001)},{isPrivate:'true'},{dueDate:'31/10/2026'},{dueTime:'25:80'},{category:''}])await assertFails(setDoc(doc(db(),'tasks','invalid'),task({createdAt:serverTimestamp(),updatedAt:serverTimestamp(),...patch})))});
test('usuário não edita detalhes nem a própria tarefa; admin edita a sua preservando dados legados',async()=>{for(const patch of [{title:'Novo título'},{isPrivate:true},{description:'x'}])await assertFails(updateDoc(doc(db(),'tasks','recurring'),{...patch,...meta()}));await assertSucceeds(updateDoc(doc(db('admin'),'tasks','adminTask'),{title:'Novo título',...meta('admin')}));await assertSucceeds(updateDoc(doc(db('admin'),'tasks','adminTask'),{isPrivate:true,...meta('admin')}));await assertFails(getDoc(doc(db('bob'),'tasks','adminTask')))});
test('criador conclui a sua; admin conclui compartilhadas',async()=>{await assertSucceeds(updateDoc(doc(db(),'tasks','private'),{completed:true,...meta()}));await assertSucceeds(updateDoc(doc(db('admin'),'tasks','shared'),{completed:true,...meta('admin')}))});
test('membro comum não edita tarefa alheia; admin edita tarefas compartilhadas sem torná-las privadas',async()=>{await assertFails(updateDoc(doc(db('bob'),'tasks','shared'),{title:'Editada',...meta('bob')}));await assertSucceeds(updateDoc(doc(db('admin'),'tasks','shared'),{title:'Ajustada pelo admin',description:'ok',dueDate:'2026-11-01',dueTime:'10:30',category:'home',isPrivate:false,...meta('admin')}));await assertSucceeds(updateDoc(doc(db('admin'),'tasks','recurring'),{title:'Preserva recorrência',isPrivate:false,...meta('admin')}));for(const patch of [{isPrivate:true},{createdBy:'admin'},{familyId:'fb'},{title:''}])await assertFails(updateDoc(doc(db('admin'),'tasks','shared'),{...patch,...meta('admin')}));await assertFails(updateDoc(doc(db('outsider'),'tasks','shared'),{title:'Invadida',isPrivate:false,...meta('outsider')}))});
test('membro comum conclui tarefa compartilhada alheia, mas não reabre nem conclui privada alheia',async()=>{await assertSucceeds(updateDoc(doc(db('bob'),'tasks','shared'),{completed:true,...meta('bob')}));await assertFails(updateDoc(doc(db('bob'),'tasks','shared'),{completed:false,...meta('bob')}));await assertFails(updateDoc(doc(db('bob'),'tasks','private'),{completed:true,...meta('bob')}));await assertFails(updateDoc(doc(db('outsider'),'tasks','shared'),{completed:true,...meta('outsider')}))});
test('admin não altera tarefas privadas',async()=>{await assertFails(updateDoc(doc(db('admin'),'tasks','private'),{completed:true,...meta('admin')}))});
test('autoria, família, criação e recorrência são imutáveis',async()=>{for(const patch of [{createdBy:'bob'},{userId:'bob'},{familyId:'fb'},{createdAt:serverTimestamp()},{recurrence:'daily'},{subtasks:[]},{customLegacy:'alterado'}])await assertFails(updateDoc(doc(db(),'tasks','recurring'),{...patch,...meta()}))});
test('não aceita atualização com metadados forjados',async()=>{await assertFails(updateDoc(doc(db(),'tasks','shared'),{title:'Novo'}));await assertFails(updateDoc(doc(db(),'tasks','shared'),{completed:'yes',...meta()}));await assertFails(updateDoc(doc(db('admin'),'tasks','shared'),{title:'Sem metadados',isPrivate:false}))});
test('somente admin exclui; privadas só pelo criador; nunca entre famílias',async()=>{for(const uid of ['alice','bob'])await assertFails(deleteDoc(doc(db(uid),'tasks','shared')));await assertFails(deleteDoc(doc(db('outsider'),'tasks','shared')));await assertFails(deleteDoc(doc(db('admin'),'tasks','private')));await assertSucceeds(deleteDoc(doc(db('admin'),'tasks','adminPrivate')));await assertSucceeds(deleteDoc(doc(db('admin'),'tasks','shared')))});
test('solicitações e histórico de família só existem no backend',async()=>{await env.withSecurityRulesDisabled(async ctx=>{await setDoc(doc(ctx.firestore(),'joinRequests','alice'),{userId:'alice',familyId:'fa',status:'pending'});await setDoc(doc(ctx.firestore(),'families','fa','history','h1'),{type:'join_approved'})});for(const uid of ['alice','admin','outsider']){await assertFails(getDoc(doc(db(uid),'joinRequests','alice')));await assertFails(getDoc(doc(db(uid),'families','fa','history','h1')));await assertFails(setDoc(doc(db(uid),'joinRequests','alice'),{userId:uid,familyId:'fa',status:'approved'}));await assertFails(setDoc(doc(db(uid),'families','fa','history','h2'),{type:'join_approved'}))}await assertFails(updateDoc(doc(db(),'users','alice'),{pushTokens:['ExponentPushToken[x]']}))});
test('coleções antigas e desconhecidas ficam fechadas',async()=>{for(const name of ['approvals','categories','unknown']){await assertFails(getDoc(doc(db(),name,'x')));await assertFails(setDoc(doc(db(),name,'x'),{familyId:'fa'}))}});
test('subtarefas só pelo backend; criador conclui a tarefa sem mexer na lista',async()=>{
 await env.withSecurityRulesDisabled(async ctx=>{const store=ctx.firestore();await setDoc(doc(store,'tasks','withSubs'),task({subtasks:[{id:'1',title:'A',completed:false,category:'home'},{id:'2',title:'B',completed:true,category:'home'}]}));await setDoc(doc(store,'tasks','done'),task({completed:true}));await setDoc(doc(store,'tasks','donePrivate'),task({completed:true,isPrivate:true}))});
 const all=[{id:'1',title:'A',completed:true,category:'home'},{id:'2',title:'B',completed:true,category:'home'}];
 await assertFails(updateDoc(doc(db('bob'),'tasks','withSubs'),{subtasks:all,completed:true,...meta('bob')}));
 await assertFails(updateDoc(doc(db(),'tasks','withSubs'),{subtasks:[all[0]],...meta()}));
 await assertFails(updateDoc(doc(db(),'tasks','withSubs'),{subtasks:all,completed:true,...meta()}));
 await assertSucceeds(updateDoc(doc(db(),'tasks','withSubs'),{completed:true,...meta()}));
 await assertFails(updateDoc(doc(db(),'tasks','withSubs'),{subtasks:[],...meta()}));
});
test('restaurar concluída é exclusivo do admin',async()=>{
 await env.withSecurityRulesDisabled(async ctx=>{const store=ctx.firestore();await setDoc(doc(store,'tasks','done'),task({completed:true}));await setDoc(doc(store,'tasks','donePrivate'),task({completed:true,isPrivate:true}))});
 await assertFails(updateDoc(doc(db(),'tasks','done'),{completed:false,...meta()}));
 await assertFails(updateDoc(doc(db('admin'),'tasks','donePrivate'),{completed:false,...meta('admin')}));
 await assertSucceeds(updateDoc(doc(db('admin'),'tasks','done'),{completed:false,...meta('admin')}));
});
test('cria e edita com recorrência e subtarefas; recorrente só é concluída pelo backend',async()=>{
 const sub=[{id:'1',title:'Comprar',completed:false}];
 await assertSucceeds(setDoc(doc(db(),'tasks','rec'),task({createdAt:serverTimestamp(),updatedAt:serverTimestamp(),recurrence:'interval',recurrenceInterval:15,weekDays:null,recurrenceEndDate:'2026-12-31',subtasks:sub})));
 await assertFails(updateDoc(doc(db(),'tasks','rec'),{subtasks:[{...sub[0],completed:true}],...meta()}));
 await assertFails(updateDoc(doc(db(),'tasks','rec'),{completed:true,...meta()}));
 await assertFails(updateDoc(doc(db(),'tasks','rec'),{dueDate:'2026-11-15',...meta()}));
 await assertFails(updateDoc(doc(db(),'tasks','shared'),{dueDate:'2026-12-01',completed:false,...meta()}));
 await assertFails(updateDoc(doc(db(),'tasks','rec'),{recurrence:'daily',...meta()}));
 await assertSucceeds(updateDoc(doc(db('admin'),'tasks','rec'),{recurrence:'custom_weekly',weekDays:[1,3],recurrenceInterval:null,subtasks:[...sub,{id:'2',title:'Pagar',completed:false}],...meta('admin')}));
 await assertFails(updateDoc(doc(db('admin'),'tasks','rec'),{recurrence:'custom_weekly',weekDays:[],...meta('admin')}));
});
test('categorias: membros leem e criam as da própria família; ninguém altera',async()=>{
 const cat=(extra={})=>({label:'Pets',icon:'grid-outline',color:'#6B7280',familyId:'fa',isDefault:false,createdBy:'bob',createdAt:serverTimestamp(),...extra});
 await assertSucceeds(setDoc(doc(db('bob'),'categories','pets'),cat()));
 await assertSucceeds(getDocs(query(collection(db(),'categories'),where('familyId','==','fa'))));
 await assertFails(getDocs(query(collection(db('outsider'),'categories'),where('familyId','==','fa'))));
 await assertFails(getDocs(collection(db(),'categories')));
 for(const patch of [{familyId:'fb'},{createdBy:'alice'},{isDefault:true},{label:''},{label:'a'.repeat(41)},{extra:1}])await assertFails(setDoc(doc(db('bob'),'categories','bad'),cat(patch)));
 await assertFails(updateDoc(doc(db('admin'),'categories','pets'),{label:'Outro nome'}));
 await assertFails(deleteDoc(doc(db('admin'),'categories','pets')));
});
test('pulada fica travada e só o admin restaura',async()=>{
 await env.withSecurityRulesDisabled(async ctx=>{await setDoc(doc(ctx.firestore(),'tasks','skipped'),task({skipped:true,recurrence:'daily'}))});
 await assertFails(updateDoc(doc(db(),'tasks','skipped'),{completed:true,...meta()}));
 await assertFails(updateDoc(doc(db(),'tasks','skipped'),{skipped:false,completed:false,...meta()}));
 await assertSucceeds(updateDoc(doc(db('admin'),'tasks','skipped'),{skipped:false,completed:false,...meta('admin')}));
});
test('app não reescreve subtarefas (nem só o "completed"): é papel do backend',async()=>{
 await env.withSecurityRulesDisabled(async ctx=>{await setDoc(doc(ctx.firestore(),'tasks','subs'),task({subtasks:[{id:'1',title:'A',completed:false,dueDate:null}]}))});
 for(const change of [{title:'Trocado'},{dueDate:'2026-12-01'},{id:'9'},{extra:true}])
  await assertFails(updateDoc(doc(db(),'tasks','subs'),{subtasks:[{id:'1',title:'A',completed:true,dueDate:null,...change}],...meta()}));
 await assertFails(updateDoc(doc(db(),'tasks','subs'),{subtasks:[{id:'1',title:'A',completed:true,dueDate:null}],...meta()}));
});
test('responsável: membro da família conclui; não vale de fora nem em privada',async()=>{
 await assertSucceeds(setDoc(doc(db(),'tasks','assigned'),task({createdAt:serverTimestamp(),updatedAt:serverTimestamp(),assignedTo:'bob'})));
 await assertFails(setDoc(doc(db(),'tasks','assignedOut'),task({createdAt:serverTimestamp(),updatedAt:serverTimestamp(),assignedTo:'outsider'})));
 await assertFails(setDoc(doc(db('admin'),'tasks','assignedPriv'),task({createdAt:serverTimestamp(),updatedAt:serverTimestamp(),isPrivate:true,createdBy:'admin',lastModifiedBy:'admin',assignedTo:'admin'})));
 await assertSucceeds(updateDoc(doc(db('bob'),'tasks','assigned'),{completed:true,...meta('bob')}));
 await assertFails(updateDoc(doc(db('bob'),'tasks','assigned'),{assignedTo:'bob',title:'x',...meta('bob')}));
});
test('perfil: preferência de lembrete só com valores da lista',async()=>{
 for(const v of [-1,0,30,1440])await assertSucceeds(updateDoc(doc(db(),'users','alice'),{reminderMinutes:v}));
 for(const v of [5,'30',99999])await assertFails(updateDoc(doc(db(),'users','alice'),{reminderMinutes:v}));
});
