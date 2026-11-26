import { describe, expect, it, vi } from "vitest";
import { IcpService } from "../../src/modules/icp/icp.service.js";
import { RadarService } from "../../src/modules/radar/radar.service.js";
import { PerfilIcpRepository } from "../../src/infra/database/repositories/perfil-icp.repository.js";
import type { Repositorios } from "../../src/infra/database/repositories/index.js";
import type { DbClient } from "../../src/infra/database/prisma.js";
import type { FontesPublicas } from "../../src/ports/fontes-publicas.js";
import type { Geocodificador } from "../../src/ports/geocodificador.js";
import type { AbordagemService } from "../../src/modules/abordagem/abordagem.service.js";

const geo: Geocodificador = { coordenadas: async () => [-25, -49], municipios: async () => ["Curitiba"] };
const relogio = { agora: () => new Date("2026-11-26T12:00:00Z") };
const repositorios = (dados: unknown) => dados as Repositorios;

describe("Instalação sem perfil de segmentação", () => {
  it("abre o formulário sem gravar configuração implícita", async () => {
    const salvar = vi.fn();
    const repos = repositorios({ icp: { buscarDoCliente: async () => null, atualizarDoCliente: salvar }, cnaes: { listar: async () => [] } });
    const service = new IcpService(repos, geo, {} as RadarService);
    const dados = await service.obter("novo");
    expect(dados.icp).toMatchObject({ cnaes: [], fontesAtivas: [], cidadeBase: "" });
    expect(dados.cidades).toEqual(["Curitiba"]);
    expect(salvar).not.toHaveBeenCalled();
  });

  it("retorna radar vazio quando o perfil ainda não existe", async () => {
    const repos = repositorios({ icp: { buscarDoCliente: async () => null } });
    const radar = new RadarService(repos, {} as FontesPublicas, geo, relogio, {} as AbordagemService);
    expect(await radar.listar("novo")).toEqual([]);
  });

  it("salva o primeiro perfil por upsert e preserva a separação por cliente", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const repo = new PerfilIcpRepository({ perfilICP: { upsert } } as unknown as DbClient);
    const dados = { cnaes: ["4120400"], portes: ["DEMAIS"], cidadeBase: "Curitiba", ufBase: "PR", latBase: -25, lngBase: -49, raioKm: 100 };
    await repo.atualizarDoCliente("novo", dados);
    expect(upsert).toHaveBeenCalledWith({ where: { clienteId: "novo" }, create: { clienteId: "novo", ...dados }, update: dados });
  });
});

describe("Fontes ativas do radar", () => {
  function preparar(ativas: string[]) {
    const fontes = {
      pncp: { contratacoesPublicadas: vi.fn().mockResolvedValue([]) },
      cno: { obrasRegistradas: vi.fn().mockRejectedValue(new Error("CNO sem integração")) },
      cnpj: { buscar: vi.fn(), novasEmpresas: vi.fn().mockRejectedValue(new Error("CNPJ sem integração")) },
    };
    const repos = repositorios({
      eventos: { tiposPorCodigo: async () => ({}) },
      icp: { buscarDoCliente: async () => ({ fontesAtivas: ativas }) },
      clientes: { listarIds: async () => [{ id: "demo" }], buscarComIcp: async () => null },
    });
    return { fontes, radar: new RadarService(repos, fontes, geo, relogio, {} as AbordagemService) };
  }

  it("consulta somente PNCP quando CNO e CNPJ novo estão desativados", async () => {
    const { fontes, radar } = preparar(["PNCP"]);
    expect((await radar.sincronizar("demo")).fontesIndisponiveis).toEqual([]);
    expect(fontes.pncp.contratacoesPublicadas).toHaveBeenCalledOnce();
    expect(fontes.cno.obrasRegistradas).not.toHaveBeenCalled();
    expect(fontes.cnpj.novasEmpresas).not.toHaveBeenCalled();
  });

  it("mantém a falha visível quando uma fonte selecionada está indisponível", async () => {
    const { radar } = preparar(["CNO"]);
    expect((await radar.sincronizar()).fontesIndisponiveis).toEqual(["CNO: CNO sem integração"]);
  });

  it("não consulta fontes quando nenhuma foi selecionada", async () => {
    const { fontes, radar } = preparar([]);
    await radar.sincronizar("demo");
    expect(fontes.pncp.contratacoesPublicadas).not.toHaveBeenCalled();
  });
});
