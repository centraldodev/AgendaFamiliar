# Agenda Familiar

Aplicativo em React Native + TypeScript + Expo SDK 58, com backend em Cloud Functions (Firebase `agendafamiliarkotlin`). Estrutura, convenções, permissões e API: [ARCHITECTURE.md](ARCHITECTURE.md).

## Executar

Use Node.js 22 (`nvm use`) e Expo Go compatível com o SDK 58.

```sh
npm install
npm start          # Expo Go (Android/iOS); `npm run web` para o navegador
```

O app acessa dados reais: salvar uma tarefa ou criar/entrar numa família altera o banco de produção. O pacote Android é `com.natanael.agendafamiliar` (o mesmo do app antigo, que é substituído na instalação).

## Testes

```sh
npm run typecheck
npm run test:all   # app, backend e (com Java 17+) regras e família no emulador
```

Os testes de emulador usam só o projeto fictício `demo-agenda-familiar`.

## Publicar

O deploy é feito à mão (as functions ficam no codebase `agenda-simple`, região `us-central1`):

```sh
firebase deploy --only functions:agenda-simple
firebase deploy --only firestore:rules,firestore:indexes
```

Publique as functions antes das regras: as regras dependem de ações que só existem no backend novo (ex.: marcar subtarefas).

## APK (EAS)

Projeto EAS `@n2ilva/agenda-familiar`, com a mesma chave de assinatura do app antigo: o APK instala por cima dele.

```sh
npx eas-cli build --platform android --profile preview      # APK para instalar direto
npx eas-cli build --platform android --profile production   # AAB para a Play Store
```

As notificações push no Android precisam do `google-services.json` do app Android `com.natanael.agendafamiliar` (Console do Firebase). Ele não vai para o git; cadastre uma vez no EAS:

```sh
npx eas-cli env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json \
  --environment preview --environment production --visibility secret
```

## Limpeza do app antigo (uma vez)

1. Migrar os dados: normaliza tarefas e papéis antigos e apaga `approvals`, `ivePedidos` e `iveTokens`. Sem `--apply` só simula.

   ```sh
   gcloud auth application-default login
   cd functions
   node scripts/migrateLegacy.cjs            # confira o resumo
   node scripts/migrateLegacy.cjs --apply
   ```

   Coleções que o script não reconhece aparecem como "desconhecida" e só são apagadas com `--apply --delete-unknown`.

2. Apagar functions antigas publicadas fora do codebase `agenda-simple` (ex.: `ive`):

   ```sh
   firebase functions:list
   firebase functions:delete <nome> --region <região>
   ```

   As do codebase `agenda-simple` começam com `agenda`; não apague essas.
