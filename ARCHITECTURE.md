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
    families/                 Leitura, criação e entrada no grupo
    tasks/                    Leitura, gravação e conclusão de tarefas
    session/                  Leitura do contexto da sessão
  controllers/
    requests/                 Concorrência e ciclo de vida das leituras
    useSessionController.ts   Autenticação e contexto familiar
    useTaskController.ts      Lista, filtros, atualização e tentativas
    useTaskFormController.ts  Estado do formulário e envio
    useAuthController.ts      Estado e ações da tela de autenticação
    useFamilyController.ts    Estado e ações de entrada/criação da família
    useAsyncActionController.ts  Estado das ações e mensagens
    useAgendaController.ts    Composição dos controllers
  routes/                     Seleção das telas de acordo com a sessão
  views/                      Telas de autenticação, família, tarefas e formulário
  components/
    ui/                       Botão e campo de entrada
    layout/                   Cabeçalho e abas
    tasks/                    Cartão de tarefa, FAB e skeleton
  styles/                     Estilos compartilhados do aplicativo
  utils/                      Data, mensagens, filtros, validação e timeout
functions/src/
  index.ts                    Registro dos endpoints, preservando seus nomes
  config/                     Firebase Admin e opções dos endpoints
  controllers/                Uma função de atendimento por arquivo
  middlewares/                Verificação de visibilidade no servidor
```

## Convenções

- Cada componente, hook e função pública tem seu próprio arquivo, com nome correspondente. Callbacks locais de efeitos, eventos e transações permanecem junto do componente ou controller que captura seu estado.
- Views e componentes não fazem chamadas ao Firebase. Controllers coordenam estado e serviços; serviços realizam as operações externas.
- Models não dependem de React, de telas ou de serviços. O contrato que agrupa controllers fica em `controllers/AgendaController.ts`.
- Middlewares do aplicativo são pré-condições locais e não substituem segurança no servidor. `firestore.rules` e as funções autenticadas continuam sendo a autoridade de acesso.
- Os routers preservam a navegação simples atual, sem introduzir outra biblioteca de navegação nesta refatoração.
- Dados, nomes das coleções, endpoints, regras publicadas e identidade do aplicativo são preservados.

## Verificação

- `npm run typecheck`: tipos do aplicativo.
- `npm test`: regressões de carregamento, datas, filtros e permissões da interface.
- `npm --prefix functions test`: compilação e testes de privacidade do backend.
- `npm run test:rules`: testes das regras no emulador, usando o projeto fictício.
- `npm run build:web`: exportação da aplicação web.

Ao adicionar uma ação independente, crie sua função em `services/<domínio>/<ação>.ts`, use-a no controller responsável e mantenha a apresentação na view. Estilos e pequenos callbacks que pertencem exclusivamente a um componente podem permanecer no seu arquivo.
