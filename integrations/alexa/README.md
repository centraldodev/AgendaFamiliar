# Skill da Alexa

Uma skill pública só. Cada pessoa ativa a skill no app Alexa e entra com a própria conta da Agenda Familiar (vinculação de conta OAuth 2.0). A skill não guarda nenhum token no código.

## 1. Segredo do cliente (uma vez)

Gere um segredo longo e guarde-o num gerenciador de senhas. Ele não vai para o git:

```sh
openssl rand -base64 32
firebase functions:secrets:set ALEXA_CLIENT_SECRET   # cole o valor gerado
firebase deploy --only functions:agenda-simple
```

## 2. Console da Alexa › Build › Tools › Account Linking

| Campo | Valor |
| --- | --- |
| Do you allow users to create an account or link to an existing account? | ativado |
| Allow users to enable skill without account linking | desativado |
| Authorization Grant Type | Auth Code Grant |
| Your Web Authorization URI | `https://us-central1-agendafamiliarkotlin.cloudfunctions.net/agendaOAuth/authorize` |
| Access Token URI | `https://us-central1-agendafamiliarkotlin.cloudfunctions.net/agendaOAuth/token` |
| Your Client ID | `agenda-familiar-alexa` |
| Your Secret | o segredo do passo 1 |
| Your Authentication Scheme | HTTP Basic (Recommended) |
| Scope | `tasks` |
| Default Access Token Expiration Time | 3600 |

Salve. Para o login com Google funcionar na página de vinculação, adicione `us-central1-agendafamiliarkotlin.cloudfunctions.net` em **Firebase › Authentication › Settings › Authorized domains**.

## 3. Código

- **Code**: cole [index.js](index.js) em `lambda/index.js` (o `package.json` do modelo já traz `ask-sdk-core`). Depois clique em **Deploy**.
- **Build › Interaction Model › JSON Editor**: cole [interactionModel.pt-BR.json](interactionModel.pt-BR.json), salve e faça o build.

## 4. Testar

1. No app Alexa do celular: **Mais › Skills › Suas skills › Desenvolvedor › Agenda Familiar › Ativar**. Entre com a conta da Agenda Familiar.
2. No console, em **Test**, diga "abrir agenda familiar".

No app Agenda Familiar, em **Configurações › Alexa**, aparece se a conta está vinculada e dá para desvincular.
