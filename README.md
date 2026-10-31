# Agenda Familiar

Aplicativo em React Native + TypeScript + Expo. Esta é a única versão local do Agenda Familiar; a versão anterior permanece no histórico Git.

## Executar

```sh
npm install
npm start
```

Abra pelo Expo Go (Android/iOS) ou use `npm run web`. O nome exibido é **Agenda Familiar**. Identificadores nativos têm o sufixo `.nova` para manter a identidade usada nos testes desta versão.

## Firebase atual

Configurado para **agendafamiliarkotlin**, com o mesmo aplicativo Firebase e as mesmas contas. Entre com seu e-mail/senha existente. Contas exclusivamente Google precisam cadastrar uma senha pelo fluxo de recuperação, conforme a configuração do Firebase; login Google nativo não foi incluído nesta base.

O aplicativo acessa dados reais: salvar uma tarefa ou criar/entrar numa família altera o banco compartilhado com o original. Nenhuma migração ou exclusão em massa é executada.

Coleções reutilizadas: `users`, `families`, `tasks`. As funções consultam a família do usuário autenticado no servidor, filtrando tarefas privadas antes de responder. Tarefas antigas sem `isPrivate` são compartilhadas. Tarefas com `deletedAt` são ignoradas. A atualização é por consulta a cada 20 segundos e após gravações, com botão manual; não usa listener em tempo real.

### Backend

```sh
cd functions
npm install
npm run build
node --test tests/*.test.cjs
cd ..
firebase deploy --only functions:agenda-simple --project agendafamiliarkotlin
```

Codebase separado `agenda-simple`: funções `agendaSimpleFamily` e `agendaSimpleTasks`, região `us-central1`. As regras atuais estão em `firestore.rules`. O deploy das funções usa o codebase `agenda-simple`, preservando os demais serviços existentes no Firebase. Publique regras separadamente com `firebase deploy --only firestore:rules`. Os índices e a configuração TTL existentes não são alterados por esse comando. O deploy exige acesso ao projeto e suporte a Cloud Functions (faturamento habilitado).

Entrar por código é resolvido no servidor porque as regras proíbem consultar famílias antes de fazer parte delas. Os membros atuais não são trocados de grupo. A criação do grupo e o vínculo ao perfil ocorrem na mesma transação.

## Base implementada

- Login, cadastro, recuperação de senha e persistência da sessão.
- Criar família ou entrar com código; exibir código de convite.
- Ver tarefas compartilhadas da família e privadas do próprio usuário.
- Criar/editar título, descrição, data, horário, categoria e privacidade.
- Concluir/reabrir: criador ou administrador nas tarefas compartilhadas, conforme as regras atuais.
- Filtros por pendentes, concluídas, privadas e todas.

Novas tarefas usam o esquema original: `title`, `description`, `dueDate` (AAAA-MM-DD), `dueTime` (HH:MM ou null), `category`, `completed`, `recurrence`, `subtasks`, `userId`, `familyId`, `createdBy`, `isPrivate`, `lastModifiedBy`, `createdAt`, `updatedAt`. Confirmado com uma amostra de cinco documentos reais, sem copiar conteúdo pessoal para o repositório.

Na base simples, novas tarefas são sem recorrência e sem subtarefas. Editar tarefas existentes preserva esses campos. Geração de próximas ocorrências, notificações, exclusão e gerenciamento de membros ficam para evolução posterior.

## Validação

```sh
npm run typecheck
npm run build:web
```

A proteção do endpoint tem testes em `functions/tests/visibility.test.cjs`. As regras de acesso têm 20 testes de integração no emulador, em `firestore-tests/rules.test.cjs`. Para executar: `npm --prefix firestore-tests ci` e `npm run test:rules` (Java 17+ e Firebase CLI 14). Os testes usam exclusivamente o projeto fictício `demo-agenda-familiar`.

As regras impedem que o cliente altere família, papel, autoria e datas de criação. Perfis são privados. Somente o criador edita detalhes de suas tarefas; administradores podem concluir/reabrir tarefas compartilhadas. Tarefas privadas continuam restritas ao criador dentro da família. Famílias e vínculos são geridos pelas funções autenticadas, que validam essas operações no servidor. Exclusão direta e acesso às coleções antigas `categories` e `approvals` estão bloqueados, pois não são usados nesta versão.

Backup local das regras anteriormente publicadas: `.local-backups/firestore-before.rules` (ignorado pelo Git). A publicação não modifica os documentos existentes.

## Estado desta entrega

As duas funções foram publicadas em `agendafamiliarkotlin` em 31/10/2026. Os endpoints responderam `401 UNAUTHENTICATED` ao teste sem sessão. TypeScript, exportação web, bundle Android e os três testes de visibilidade passaram. Tela de entrada conferida no Chrome. O usuário também confirmou que testou o aplicativo com sucesso. Não foram criados documentos de teste pelo agente no banco real.
