// Perfil de Cliente Ideal (Filtro e Segmentação). Salvar reprocessa o match.
import type { Repositorios } from "../../infra/database/repositories/index.js";
import type { Geocodificador } from "../../ports/geocodificador.js";
import { EntradaInvalida } from "../../shared/erros.js";
import type { RadarService } from "../radar/radar.service.js";

/** O radar cobre o Paraná (fontes filtradas por UF): a cidade-base é uma cidade do estado. */
const UF_ATENDIDA = "PR";

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
    // Instalações novas precisam conseguir abrir o formulário antes do primeiro cadastro.
    const icp = await this.repos.icp.buscarDoCliente(clienteId) ?? {
      cnaes: [], portes: [], cidadeBase: "", ufBase: UF_ATENDIDA,
      latBase: 0, lngBase: 0, raioKm: 40, idadeMinAnos: 0, idadeMaxAnos: 50,
      situacaoExigida: "ATIVA", fontesAtivas: [],
    };
    const [catalogoCnae, cidades] = await Promise.all([this.repos.cnaes.listar(), this.geo.municipios(UF_ATENDIDA)]);
    return { icp, catalogoCnae, cidades };
  }

  async salvar(clienteId: string, dados: AtualizacaoIcp) {
    const coord = await this.geo.coordenadas(dados.cidadeBase, UF_ATENDIDA);
    if (!coord) throw new EntradaInvalida("Cidade-base desconhecida");
    await this.repos.icp.atualizarDoCliente(clienteId, { ...dados, ufBase: UF_ATENDIDA, latBase: coord[0], lngBase: coord[1] });
    return this.radar.processarCliente(clienteId);
  }
}
