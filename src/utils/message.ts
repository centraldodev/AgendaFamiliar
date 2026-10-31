export function message(error: unknown) {
  const code = (error as { code?: string })?.code;
  const known: Record<string, string> = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/email-already-in-use":
      "Este e-mail já tem uma conta. Entre com sua senha.",
    "auth/weak-password": "Use uma senha com pelo menos 6 caracteres.",
    "auth/invalid-email": "Informe um e-mail válido.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco.",
    "functions/deadline-exceeded":
      "A conexão demorou para responder. Verifique sua internet e tente novamente.",
    "functions/unavailable":
      "Não foi possível conectar ao servidor. Tente novamente.",
    "functions/not-found":
      "Família não encontrada ou serviço ainda não publicado.",
    "permission-denied": "Sua conta não tem permissão para esta ação.",
  };
  return (
    known[code ?? ""] ??
    (error instanceof Error
      ? error.message
      : "Não foi possível concluir. Tente novamente.")
  );
}
