const { test } = require("node:test");
const assert = require("node:assert/strict");
const { clientCredentials, isAllowedRedirect, isValidClient } = require("../lib/oauth/config");
const { loginPage } = require("../lib/oauth/loginPage");

test("só aceita endereços de vinculação da Amazon", () => {
  assert.ok(isAllowedRedirect("https://pitangui.amazon.com/api/skill/link/M2ABC123"));
  assert.ok(isAllowedRedirect("https://layla.amazon.com/api/skill/link/M2ABC123"));
  assert.ok(isAllowedRedirect("https://alexa.amazon.co.jp/api/skill/link/M2ABC123"));
  for (const bad of [
    "http://pitangui.amazon.com/api/skill/link/M2",
    "https://pitangui.amazon.com.evil.com/api/skill/link/M2",
    "https://evil.com/?https://pitangui.amazon.com/api/skill/link/M2",
    "https://pitangui.amazon.com/api/skill/link/M2?x=1",
    undefined,
  ])
    assert.equal(isAllowedRedirect(bad), false, String(bad));
});

test("lê credenciais do cliente por Basic ou pelo corpo e compara", () => {
  const basic = `Basic ${Buffer.from("agenda:se%3Acret").toString("base64")}`;
  assert.deepEqual(clientCredentials(basic, {}), { id: "agenda", secret: "se:cret" });
  assert.deepEqual(clientCredentials(undefined, { client_id: "a", client_secret: "b" }), { id: "a", secret: "b" });
  assert.equal(clientCredentials(undefined, {}), null);
  const expected = { id: "agenda", secret: "se:cret" };
  assert.ok(isValidClient({ id: "agenda", secret: "se:cret" }, expected));
  assert.equal(isValidClient({ id: "agenda", secret: "errado" }, expected), false);
  assert.equal(isValidClient(null, expected), false);
  assert.equal(isValidClient({ id: "agenda", secret: "" }, { id: "agenda", secret: "" }), false);
});

test("página de login não deixa o state fechar o script", () => {
  const page = loginPage({ clientId: "c", redirectUri: "https://pitangui.amazon.com/api/skill/link/M2", state: "</script><script>alert(1)" });
  assert.equal(page.includes("</script><script>alert(1)"), false);
});
