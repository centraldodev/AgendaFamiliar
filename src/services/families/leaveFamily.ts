import { familyAction } from "./familyAction";
// Sai do grupo; a conta continua. Sem grupo, o app mostra a tela de criar ou entrar.
export async function leaveFamily() {
  await familyAction("leave");
}
