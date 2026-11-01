# Organização do Agenda Familiar

O projeto usa uma organização por camadas para React Native/TypeScript, com controllers implementados como hooks React. Não há uma estrutura universal obrigatória para React Native; esta divisão foi escolhida para tornar telas, ações e integrações fáceis de localizar.

```text
App.tsx                       Inicialização dos providers e do router
src/
  config/                     Inicialização do Firebase
  models/                     Tipos e contratos dos dados
  constants/                  Valores fixos, como categorias
  middlewares/                Pré-condições das ações e permissões da interface
  services/
    auth/                     Login, cadastro, logout e recuperação de senha
    profiles/                 Leitura e atualização do perfil
    families/                 Grupo, solicitações de entrada, membros, papéis e histórico
    notifications/            Permissão, token e escuta das notificações push
    tasks/                    Leitura, gravação e conclusão de tarefas
    session/                  Leitura do contexto da sessão
  controllers/
    requests/                 Concorrência e ciclo de vida das leituras
    useSessionController.ts   Autenticação e contexto familiar
    useTaskController.ts      Lista, filtros, atualização e tentativas
    useTaskFormController.ts  Estado do formulário e envio
    useAuthController.ts      Estado e ações da tela de autenticação
    useFamilyController.ts    Criar grupo, pedir entrada e aguardar aprovação
    useFamilyManagementController.ts  Área da família: membros, pedidos, histórico, troca de grupo
    useNotificationController.ts  Registro do aparelho e ações das notificações
    useAsyncActionController.ts  Estado das ações e mensagens
    useAgendaController.ts    Composição dos controllers
  routes/                     Seleção das telas de acordo com a sessão
  views/                      Telas de autenticação, família, configurações, tarefas e formulário
  components/
    ui/                       Botão e campo de entrada
    layout/                   Cabeçalho (com o botão de configurações)
    settings/                 Cartões da área de configurações e da família
    tasks/                    Cartão de tarefa, FAB e skeleton
  styles/                     Estilos compartilhados do aplicativo
  utils/                      Data, mensagens, filtros, validação e timeout
functions/src/
  index.ts                    Registro dos endpoints, preservando seus nomes
  config/                     Firebase Admin e opções dos endpoints
  controllers/                Uma função de atendimento por arquivo
  services/                   Regras de família: solicitações, aprovação, papéis, histórico e push
  middlewares/                Verificação de visibilidade no servidor
```

## Convenções

- Cada componente, hook e função pública tem seu próprio arquivo, com nome correspondente. Callbacks locais de efeitos, eventos e transações permanecem junto do componente ou controller que captura seu estado.
- Views e componentes não fazem chamadas ao Firebase. Controllers coordenam estado e serviços; serviços realizam as operações externas.
- Models não dependem de React, de telas ou de serviços. O contrato que agrupa controllers fica em `controllers/AgendaController.ts`.
- Middlewares do aplicativo são pré-condições locais e não substituem segurança no servidor. `firestore.rules` e as funções autenticadas continuam sendo a autoridade de acesso.
- Os routers preservam a navegação simples atual, sem introduzir outra biblioteca de navegação nesta refatoração.
- Código compartilhado: `functions/src/shared/` (recorrência, validação de tarefa, permissões e papéis) é a fonte única para o app e o backend. Não pode importar Firebase nem nada de fora da pasta. O `firestore.rules` repete as regras; os testes de regras cobrem os mesmos casos.
- Estilo: nada de cor, fonte ou espaçamento solto nos componentes. Tokens em `styles/tokens.ts` (cores com nome de papel, como `primary`, `surface` ou `textMuted`, além de `spacing`, `radius` e `typography`); estilos em `styles/appStyles.ts`, lidos com `const { s, colors } = useTheme()`. Botões usam `<Button variant="primary|secondary|danger|ghost">`. Modo escuro: paleta `darkColors`. A escolha (Configurações › Aparência: aparelho, claro ou escuro) fica salva só no aparelho (`services/settings/themePreference.ts`). Cor nova? Crie o token nas duas paletas.
- Dados, nomes das coleções, endpoints, regras publicadas e identidade do aplicativo são preservados.

## Papéis e permissões

- Há dois papéis: `admin` e `user`. Sem papel definido vale como `user`.
- `user`: cria tarefas públicas, conclui as tarefas que criou ou de que é responsável e marca as subtarefas delas. Marcar a última subtarefa conclui a tarefa.
- Responsável (`assignedTo`): um membro da família, escolhido no formulário; tarefa privada não tem. Ele pode concluir a tarefa, vê ela no filtro `Minhas` e recebe push ao ser designado (`agendaTaskCreated`/`agendaTaskUpdated`).
- `admin`: tudo isso, mais criar tarefas privadas, editar e excluir tarefas compartilhadas (e as próprias privadas), restaurar tarefas concluídas (só um admin reabre uma concluída), aprovar ou recusar entradas, mudar o papel de membros e removê-los. Tarefas privadas de outras pessoas continuam fora do alcance de qualquer administrador.
- As regras estão em `firestore.rules` (tarefas) e nos serviços de `functions/src/services` (família); o app apenas espelha as permissões em `src/middlewares`.

## Filtros da agenda

- `Hoje`: pendentes com data de hoje. `Minhas`: pendentes em que você é o responsável. `Vencidas`: pendentes atrasadas. `Futuras`: pendentes do dia seguinte em diante. `Concluídas`: concluídas nos últimos 7 dias, mais recentes primeiro; as mais antigas somem do app e são apagadas pela `agendaCleanup`. `Privadas`: tarefas privadas do usuário (o filtro só aparece quando útil).
- A regra fica em `utils/filterTasks.ts`; se o filtro `Privadas` deixar de estar disponível, a tela volta para `Hoje`.

## Recorrência e subtarefas

- Recorrências: `daily`, `weekly`, `custom_weekly` (dias da semana em `weekDays`), `interval` (a cada `recurrenceInterval` dias; 15 e 30 são atalhos), `monthly` e `yearly`, com `recurrenceEndDate` opcional.
- Concluir uma recorrente (pelo botão ou marcando a última subtarefa) ou pular a recorrência passa pelo backend (`agendaTaskOccurrence`): a atual é arquivada (concluída, ou `skipped` quando pulada) e uma nova é criada na próxima data depois de hoje, com o mesmo autor, subtarefas desmarcadas e `previousOccurrenceId`. Passada a data final, só arquiva. Puladas aparecem em `Concluídas` e só um admin as restaura. O cálculo está em `functions/src/shared/nextOccurrence.ts`, usado também pelo app.
- Subtarefas: até 30 por tarefa, criadas e editadas no formulário. Marcar segue a permissão de concluir e passa pelo backend (`agendaTaskOccurrence`, ação `toggleSubtask`): as regras não deixam o app reescrever a lista, porque rules não conseguem comparar item por item. Marcar a última conclui a tarefa (recorrente: cria a próxima).
- Concluídas ou puladas há mais de 7 dias saem da lista e são apagadas pela `agendaCleanup` (diária, 03:30). A listagem não grava nada.
- A lista chega em tempo real (`services/tasks/subscribeTasks.ts`): duas consultas, compartilhadas e as minhas, porque as regras só liberam consultas que fixam `isPrivate` ou `createdBy`. Os nomes de autor e responsável vêm da lista de membros. A última lista fica salva no aparelho (`taskCache.ts`) para abrir sem internet; o cache é apagado ao sair.
- Configurações e espera de aprovação consultam periodicamente, só em primeiro plano (`controllers/usePolling.ts`): 30s com as configurações abertas, 120s fora delas, e 30s na espera. Puxar a tela para baixo atualiza tudo.
- Busca por título, descrição e subtarefas, sem diferenciar acentos (`utils/searchTasks.ts`).
- Concluir e excluir esperam 5s com o aviso "Desfazer" antes de gravar; restaurar é imediato.

## Entrada no grupo, histórico e notificações

- Entrar por código nunca vincula direto: cria `joinRequests/{uid}` (um pedido por usuário) e avisa os administradores por push.
- Um administrador aceita (escolhendo `user` ou `admin`) ou recusa, no app ou pelos botões da notificação. Quem já está em um grupo continua nele até a aprovação; então a troca acontece e a saída é registrada.
- Todo evento (pedido, aprovação com quem aprovou, horário e acesso concedido, recusa, mudança de papel, remoção, saída) é gravado em `families/{id}/history`, somente pelo backend, e lido por administradores.
- Tarefa pública criada: `agendaTaskCreated` (gatilho do Firestore) avisa os outros membros. Privadas não geram aviso.
- Vencimento: `agendaDueReminders` roda a cada 5 minutos. Cada pessoa escolhe em Configurações › Lembretes quando ser avisada (`users.reminderMinutes`: no horário, 15/30/60/120 min ou 1 dia antes, ou -1 para nunca). Sem horário, a tarefa conta como 08:00 (Brasília). Pública: toda a família; privada: só quem criou. Lê o estado atual a cada execução, então exclusão, conclusão ou mudança de data já valem; `dueReminders/{taskId}_{uid}` evita aviso repetido. O app não agenda lembretes locais.
- O token de push do aparelho fica em `users/{uid}.pushTokens` e é enviado pelo serviço Expo Push. Push remoto exige app instalado (development build/EAS) em aparelho real; no Expo Go do Android o app funciona sem notificações, e os pedidos aparecem em Configurações.

## Conta

- Configurações reúne aparência, lembretes, tokens da API, sair e excluir conta.
- Excluir conta (`agendaAccount`, exigência da Play Store): pede a senha de novo (o servidor exige login com menos de 10 min). Apaga perfil, tarefas privadas, tokens e pedidos; tira a pessoa de responsável nas compartilhadas, que ficam com a família. O único membro apaga o grupo inteiro; o único admin com outros membros precisa promover alguém antes.
- Login com Google: na web por popup; no Android por `@react-native-google-signin` (só no app instalado, não no Expo Go). Exige o SHA-1 da chave de assinatura do EAS cadastrado no app Android do Firebase.

## API REST

Função `agendaApi` (`functions/src/api`), em `https://us-central1-<projeto>.cloudfunctions.net/agendaApi/v1/...`. Autenticação por `Authorization: Bearer <token>`, que pode ser o ID token do Firebase (app) ou o token de acesso `agf_…` de uma Alexa vinculada (vale 1 hora, guardado só como SHA-256 em `accessTokens`). Limites: 300 req/min por IP antes da autenticação e 120 req/min por usuário depois, contados em cada instância (com até 3 instâncias, o teto real é o triplo). Tokens recusados ficam 5 min em cache, sem nova leitura no banco. Os erros saem em `application/problem+json`, com `errors[]` por campo quando a resposta é 422. As permissões e a validação vêm de `functions/src/shared/`, as mesmas do app.

- `GET /v1/me` e `GET /v1/family`
- `GET /v1/tasks?from&to&status=open|done|all&category`, `POST /v1/tasks`, `GET|PATCH|DELETE /v1/tasks/:id`
- `POST /v1/tasks/:id/complete|skip|reopen` (recorrentes criam a próxima) e `PATCH /v1/tasks/:id/subtasks/:subtaskId` com `{ "completed": bool }`
- `GET /v1/alexa` (está vinculada?) e `DELETE /v1/alexa` (desvincula): só com login do Firebase.

## Vinculação com a Alexa (OAuth 2.0)

Função `agendaOAuth` (`functions/src/oauth`), usada como *Account Linking* (Auth Code Grant) de uma skill pública: cada pessoa vincula a própria conta e a skill recebe o token dela em cada pedido.

- `GET /authorize`: página de login (e-mail e senha ou Google) aberta pelo app Alexa. Só aceita o `client_id` configurado e `redirect_uri` dos endereços da Amazon (`/api/skill/link/…`).
- `POST /authorize`: recebe o ID token de um login feito há menos de 10 min e devolve o endereço da Amazon com `code` (uso único, 5 min, em `oauthCodes`) e `state`.
- `POST /token`: cliente autenticado por HTTP Basic. `authorization_code` cria a vinculação (`alexaLinks/{sha256(refresh)}`) e devolve `access_token` (1 h) e `refresh_token`. `refresh_token` emite outro `access_token`.
- Desvincular no app ou excluir a conta apaga as vinculações e os tokens. A limpeza diária apaga tokens e códigos vencidos.
- Configuração: parâmetro `ALEXA_CLIENT_ID` (padrão `agenda-familiar-alexa`) e segredo `ALEXA_CLIENT_SECRET`. Passo a passo em [integrations/alexa/README.md](integrations/alexa/README.md).

## Verificação

- `npm run typecheck`: tipos do aplicativo.
- `npm test`: regressões de carregamento, datas, filtros e permissões da interface.
- `npm --prefix functions test`: compilação e testes de privacidade e da API do backend.
- `npm run test:rules`: testes das regras no emulador, usando o projeto fictício.
- `npm run test:family`: testes das ações de família do backend (pedidos, aprovação, papéis, histórico) no emulador.
- `npm run test:all`: todos os anteriores (os de emulador precisam de Java).
- `npm run build:web`: exportação da aplicação web.

Ao adicionar uma ação independente, crie sua função em `services/<domínio>/<ação>.ts`, use-a no controller responsável e mantenha a apresentação na view. Estilos e pequenos callbacks que pertencem exclusivamente a um componente podem permanecer no seu arquivo.
