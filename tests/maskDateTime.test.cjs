const { test } = require("node:test");
const assert = require("node:assert/strict");
const { maskDateTime, parseDateTime, displayDateTime } = require("../src/utils/maskDateTime.ts");

test("máscara aceita só números e põe os separadores", () => {
  assert.equal(maskDateTime("31a10/2026xx99", "date"), "31/10/2026");
  assert.equal(maskDateTime("311", "date"), "31/1");
  assert.equal(maskDateTime("09h305", "time"), "09:30");
  assert.equal(maskDateTime("abc", "time"), "");
});

test("converte data e hora completas e válidas", () => {
  assert.deepEqual(parseDateTime("29/02/2028", "date"), { value: "2028-02-29" });
  assert.deepEqual(parseDateTime("23:59", "time"), { value: "23:59" });
  assert.deepEqual(parseDateTime("", "date"), { value: "" });
  assert.deepEqual(parseDateTime("31/1", "date"), {});
  assert.equal(displayDateTime("2026-10-31", "date"), "31/10/2026");
});

test("recusa dia, mês, hora e minuto fora do intervalo", () => {
  assert.ok(parseDateTime("29/02/2027", "date").error);
  assert.ok(parseDateTime("31/04/2026", "date").error);
  assert.ok(parseDateTime("10/13/2026", "date").error);
  assert.ok(parseDateTime("00/10/2026", "date").error);
  assert.ok(parseDateTime("24:00", "time").error);
  assert.ok(parseDateTime("12:60", "time").error);
});
