import { afterEach, expect, it, vi } from "vitest";
import { fontesHttp } from "../../src/infra/fontes-publicas/http.js";

afterEach(() => vi.unstubAllGlobals());

it("preserva o resultado de uma modalidade quando a outra falha e informa cobertura parcial", async () => {
  const fetchMock = vi.fn(async (url: URL | string) => {
    const endereco = String(url);
    if (endereco.includes("codigoModalidadeContratacao=5")) throw new TypeError("rede indisponível");
    if (endereco.includes("/itens/1/resultados")) return Response.json([{ tipoPessoa: "PJ", niFornecedor: "12345678000190", dataResultado: "2026-11-25", valorTotalHomologado: 500 }]);
    return Response.json({ totalPaginas: 1, data: [{ numeroControlePNCP: "123", objetoCompra: "Construção de escola", valorTotalHomologado: 500, dataAtualizacaoGlobal: "2026-11-25", anoCompra: 2026, sequencialCompra: 1, orgaoEntidade: { cnpj: "123", razaoSocial: "Município" }, unidadeOrgao: { municipioNome: "Curitiba", ufSigla: "PR", nomeUnidade: "Obras" } }] });
  });
  vi.stubGlobal("fetch", fetchMock);
  const dados = await fontesHttp.pncp.contratacoesPublicadas(new Date("2026-07-29"), new Date("2026-11-26"));
  expect(dados).toHaveLength(1);
  expect(dados[0].cnpjInteressado).toBe("12345678000190");
  expect(dados.avisos).toEqual(expect.arrayContaining([expect.stringContaining("período anterior"), "modalidade 5 indisponível"]));
  expect(fetchMock.mock.calls.some(([url]) => String(url).includes("dataInicial=20261125") && String(url).includes("dataFinal=20261125"))).toBe(true);
});
