export class ReadTimeoutError extends Error {
  code = "read/timeout";
  constructor() {
    super(
      "A conexão demorou para responder. Verifique sua internet e tente novamente.",
    );
  }
}
