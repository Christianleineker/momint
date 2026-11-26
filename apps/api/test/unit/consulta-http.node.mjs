import { test } from "node:test";
import assert from "node:assert/strict";
import { lerJson } from "../../src/infra/fontes-publicas/consulta-http.ts";

test("não inicia consulta quando o orçamento total já terminou", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({}));
  await assert.rejects(lerJson("https://example.com", "PNCP", AbortSignal.abort()), /tempo total de consulta excedido/);
  assert.equal(fetch.mock.callCount(), 0);
});

test("recupera consulta após timeout e após indisponibilidade temporária", async (t) => {
  for (const falha of [new DOMException("timeout", "TimeoutError"), new Response(null, { status: 503 })]) {
    let chamadas = 0;
    t.mock.method(globalThis, "fetch", async () => {
      chamadas++;
      if (chamadas === 1) {
        if (falha instanceof Error) throw falha;
        return falha;
      }
      return Response.json({ data: [1] });
    });
    assert.deepEqual(await lerJson("https://example.com", "PNCP"), { data: [1] });
    assert.equal(chamadas, 2);
    t.mock.restoreAll();
  }
});

test("limita tentativas de timeout e apresenta erro compreensível", async (t) => {
  let chamadas = 0;
  t.mock.method(globalThis, "fetch", async () => {
    chamadas++;
    throw new DOMException("timeout", "TimeoutError");
  });
  await assert.rejects(lerJson("https://example.com", "PNCP"), /PNCP:.*após 2 tentativas/);
  assert.equal(chamadas, 2);
});

test("não repete erros permanentes nem JSON inválido; preserva ausência de dados", async (t) => {
  for (const [resposta, esperado] of [
    [new Response(null, { status: 401 }), /401/],
    [new Response("inválido"), SyntaxError],
    [new Response(null, { status: 204 }), null],
  ]) {
    let chamadas = 0;
    t.mock.method(globalThis, "fetch", async () => { chamadas++; return resposta; });
    if (esperado === null) assert.equal(await lerJson("https://example.com", "PNCP"), null);
    else await assert.rejects(lerJson("https://example.com", "PNCP"), esperado);
    assert.equal(chamadas, 1);
    t.mock.restoreAll();
  }
});
