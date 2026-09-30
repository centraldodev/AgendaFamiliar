// Conexão com a assistente Ive (função "ive" no Firebase, functions/src/ive). O app só cria, lista e revoga
// tokens; a Ive usa o token para ler e mudar as tarefas pelo protocolo ive-app/1.
import firebase from '@src/firebase/config/firebase.config';

export const IVE_URL = (process.env.EXPO_PUBLIC_IVE_URL
  || 'https://us-central1-agendafamiliarkotlin.cloudfunctions.net/ive').replace(/\/$/, '');
export const IVE_FICHA = `${IVE_URL}/ive.json`;

export interface IveToken { id: string; nome: string; criadoEm?: string; usadoEm?: string }

async function pedir<T>(caminho: string, metodo = 'GET', corpo?: unknown): Promise<T> {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error('not-signed-in');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const resposta = await fetch(`${IVE_URL}${caminho}`, {
      method: metodo, signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
      ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
    });
    if (resposta.status === 204) return undefined as T;
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(dados.fala || 'ive-unavailable');
    return dados as T;
  } finally { clearTimeout(timer); }
}

export const iveService = {
  async tokens(): Promise<IveToken[]> { return (await pedir<{ tokens: IveToken[] }>('/tokens')).tokens; },
  criar(nome: string): Promise<{ id: string; token: string }> { return pedir('/tokens', 'POST', { nome }); },
  revogar(id: string): Promise<void> { return pedir(`/tokens/${encodeURIComponent(id)}`, 'DELETE'); },
};
