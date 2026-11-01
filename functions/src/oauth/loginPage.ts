// Página de login aberta pelo app Alexa ao vincular a conta. Usa o Firebase Auth do
// navegador (mesmo projeto do app) e envia o ID token para POST /authorize.
const firebaseConfig = {
  apiKey: "AIzaSyBAMfd4iS6Ip2P9ePNk57DOgnCyGIMd_0U",
  authDomain: "agendafamiliarkotlin.firebaseapp.com",
  projectId: "agendafamiliarkotlin",
  appId: "1:1038445694694:web:e7f47a89ac4742d84e3527",
};
const sdk = "https://www.gstatic.com/firebasejs/10.14.1";
// JSON dentro de <script> sem permitir fechar a tag.
const embed = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const style = `
  :root { color-scheme: light dark; --bg:#f4f6fb; --card:#fff; --text:#16213a; --muted:#5b6478; --line:#d5dae5; --accent:#2563eb; --danger:#b42318; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0f1729; --card:#18223a; --text:#e8ecf5; --muted:#a3adc2; --line:#2c3a57; --accent:#5b8def; --danger:#f97066; } }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:16px; background:var(--bg); color:var(--text); font:16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
  main { width:100%; max-width:400px; background:var(--card); border:1px solid var(--line); border-radius:20px; padding:28px 24px; display:grid; gap:14px; }
  h1 { margin:0; font-size:22px; } p { margin:0; color:var(--muted); font-size:15px; }
  label { display:grid; gap:6px; font-size:14px; font-weight:600; }
  input { font:inherit; padding:12px 14px; border-radius:12px; border:1px solid var(--line); background:transparent; color:inherit; }
  button { font:inherit; font-weight:600; padding:13px; border-radius:12px; border:0; cursor:pointer; background:var(--accent); color:#fff; }
  button.secondary { background:transparent; color:var(--accent); border:1px solid var(--line); }
  button:disabled { opacity:.6; cursor:default; }
  .error { color:var(--danger); font-size:14px; min-height:1em; }
  .sep { text-align:center; color:var(--muted); font-size:13px; }`;
export function errorPage(message: string) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Agenda Familiar</title><style>${style}</style></head><body><main><h1>Não foi possível vincular</h1><p>${escapeHtml(message)}</p></main></body></html>`;
}
export function loginPage(params: { clientId: string; redirectUri: string; state: string }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vincular Alexa</title><style>${style}</style></head><body>
<main>
  <h1>Vincular a Alexa</h1>
  <p>Entre com a sua conta da Agenda Familiar. A Alexa terá acesso só às suas tarefas e às da sua família.</p>
  <form id="form" style="display:grid;gap:14px">
    <label>E-mail<input id="email" type="email" autocomplete="email" required></label>
    <label>Senha<input id="password" type="password" autocomplete="current-password" required></label>
    <button id="submit" type="submit">Entrar e vincular</button>
  </form>
  <div class="sep">ou</div>
  <button id="google" class="secondary" type="button">Entrar com Google</button>
  <div id="error" class="error" role="alert"></div>
</main>
<script src="${sdk}/firebase-app-compat.js"></script>
<script src="${sdk}/firebase-auth-compat.js"></script>
<script>
  const params = ${embed(params)};
  firebase.initializeApp(${embed(firebaseConfig)});
  const auth = firebase.auth();
  auth.languageCode = "pt";
  // Nada fica salvo neste navegador: cada vinculação pede o login.
  const ready = auth.setPersistence(firebase.auth.Auth.Persistence.NONE);
  const $ = (id) => document.getElementById(id);
  const messages = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco.",
    "auth/popup-closed-by-user": "Login com Google cancelado.",
    "auth/popup-blocked": "O navegador bloqueou a janela do Google.",
  };
  function busy(on) { ["submit", "google"].forEach((id) => ($(id).disabled = on)); }
  async function link(signIn) {
    busy(true); $("error").textContent = "";
    try {
      await ready;
      const { user } = await signIn();
      const response = await fetch(location.pathname, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...params, idToken: await user.getIdToken() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Não foi possível vincular.");
      location.replace(data.redirect);
    } catch (error) {
      $("error").textContent = messages[error.code] || error.message || "Não foi possível entrar.";
      busy(false);
    }
  }
  $("form").addEventListener("submit", (event) => {
    event.preventDefault();
    link(() => auth.signInWithEmailAndPassword($("email").value.trim(), $("password").value));
  });
  $("google").addEventListener("click", () => link(() => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())));
</script>
</body></html>`;
}
