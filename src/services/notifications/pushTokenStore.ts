// Último token registrado neste aparelho, para removê-lo ao sair da conta.
let current: string | null = null;
export const pushTokenStore = {
  get: () => current,
  set: (token: string | null) => {
    current = token;
  },
};
