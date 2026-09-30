# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## 🎙️ Assistente Ive (controle por voz)

A assistente [Ive](https://github.com/centraldodev/Ive-Desktop) lê e mexe nas tarefas da família por voz, pela função
`ive` do Firebase (`functions/src/ive`, protocolo `ive-app/1` da Ive). As outras funções não mudam.

- **O que ela faz:** "quais as tarefas da família hoje?" (com as atrasadas), "tarefas pendentes da família",
  "cria a tarefa comprar leite pra sexta às 15h", "terminei a tarefa tirar o lixo" (recorrente: abre a próxima,
  como o app), "passa a tarefa X pra sábado", "apaga a tarefa X" (exclusão suave). Tudo com o "desfaz" da Ive;
  mudar e apagar ela confirma por voz antes.
- **Regras do app:** a família da pessoa; privadas só de quem criou; mudar só quem criou ou o admin; dependente vira
  pedido de aprovação (coleção `approvals`), como no app.
- **Segurança:** token por aparelho gerado em Configurações › Assistente Ive (mostrado uma vez, guardado só como
  SHA-256, revogável); cada pedido assinado com HMAC-SHA256, carimbo de até 5 min e `X-Ive-Request` único
  (`ivePedidos`, com TTL); 60 pedidos/min por token. `iveTokens` e `ivePedidos` fechadas para o app pelo
  `match /{document=**}`.
- **Versão web:** o endereço do site vai em `IVE_APP_ORIGINS` no `functions/.env` (CORS das rotas de token).
- **Publicar:** `firebase deploy --only functions:ive,firestore:indexes`. Testes: `npm test --prefix functions`.
