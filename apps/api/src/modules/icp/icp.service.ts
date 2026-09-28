// Perfil de Cliente Ideal (Filtro e Segmentação). Salvar reprocessa o match.
import type { Repositorios } from "../../infra/database/repositories/index.js";
import type { Geocodificador } from "../../ports/geocodificador.js";
import { EntradaInvalida, NaoEncontrado } from "../../shared/erros.js";
import type { RadarService } from "../radar/radar.service.js";

/** Catálogo de CNAEs do nicho (chips da tela de ICP). */
export const CATALOGO_CNAE = [
  { codigo: "4120400", descricao: "Construção de edifícios" },
  { codigo: "4110700", descricao: "Incorporação de empreendimentos imobiliários" },
  { codigo: "4299599", descricao: "Outras obras de engenharia civil" },
  { codigo: "4211101", descricao: "Construção de rodovias e ferrovias" },
  { codigo: "4330499", descricao: "Outros serviços de acabamento em construção" },
  { codigo: "4391600", descricao: "Obras de fundações" },
];

export interface AtualizacaoIcp {
  cnaes: string[];
  portes: string[];
  cidadeBase: string;
  raioKm: number;
  idadeMinAnos: number;
  idadeMaxAnos: number;
  fontesAtivas: string[];
}

export class IcpService {
  constructor(
    private readonly repos: Repositorios,
    private readonly geo: Geocodificador,
    private readonly radar: RadarService,
  ) {}

  async obter(clienteId: string) {
    const icp = await this.repos.icp.buscarDoCliente(clienteId);
    if (!icp) throw new NaoEncontrado("Perfil de ICP não configurado");
    return { icp, catalogoCnae: CATALOGO_CNAE, cidades: this.geo.municipiosConhecidos() };
  }

  async salvar(clienteId: string, dados: AtualizacaoIcp) {
    const coord = this.geo.coordenadas(dados.cidadeBase);
    if (!coord) throw new EntradaInvalida("Cidade-base desconhecida");
    await this.repos.icp.atualizarDoCliente(clienteId, { ...dados, latBase: coord[0], lngBase: coord[1] });
    return this.radar.processarCliente(clienteId);
  }
}
