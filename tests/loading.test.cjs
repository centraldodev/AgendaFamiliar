const { test } = require("node:test");
const assert = require("node:assert/strict");
const { withReadTimeout } = require("../src/utils/withReadTimeout.ts");
test("leitura que não responde tem prazo limitado", async () => {
  await assert.rejects(withReadTimeout(new Promise(() => {}), 10), {
    code: "read/timeout",
  });
});
