// O que o cliente vende: alimenta a 1ª abordagem e o briefing de reunião.
import type { DadosOferta } from "../../infra/database/repositories/oferta.repository.js";
import type { Repositorios } from "../../infra/database/repositories/index.js";

export class OfertaService {
  constructor(private readonly repos: Repositorios) {}

  async obter(clienteId: string) {
    return { oferta: await this.repos.ofertas.buscarDoCliente(clienteId) };
  }

  async salvar(clienteId: string, dados: DadosOferta) {
    return { oferta: await this.repos.ofertas.salvarDoCliente(clienteId, dados) };
  }
}
