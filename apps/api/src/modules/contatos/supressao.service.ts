// Opt-out global (regra 7): um contato suprimido nunca mais é abordado por
// nenhum cliente do sistema.
import type { Contato } from "@prisma/client";
import type { Repositorios } from "../../infra/database/repositories/index.js";
import type { UnitOfWork } from "../../infra/database/unit-of-work.js";
import { NaoEncontrado } from "../../shared/erros.js";

export class SupressaoService {
  constructor(
    private readonly repos: Repositorios,
    private readonly uow: UnitOfWork,
  ) {}

  estaSuprimido(contato: Pick<Contato, "email" | "telefone">, repos = this.repos) {
    return repos.supressoes.contem(contato);
  }

  /** Primeiro contato da empresa que não está na lista de supressão. */
  async contatoAbordavel(empresaId: string, repos = this.repos): Promise<Contato | null> {
    for (const c of await repos.empresas.listarContatos(empresaId)) {
      if (!(await repos.supressoes.contem(c))) return c;
    }
    return null;
  }

  /**
   * Registra o opt-out, descarta rascunhos pendentes para o contato e suprime
   * os leads da empresa que ficaram sem contato abordável — em todos os clientes.
   */
  async registrarOptOut(clienteId: string, contatoId: string, motivo = "Solicitação do contato") {
    const contato = await this.repos.empresas.buscarContatoAcessivel(clienteId, contatoId);
    if (!contato) throw new NaoEncontrado("Contato não encontrado");

    await this.uow.executar(async (r) => {
      await r.supressoes.registrar(contato, motivo);
      await r.mensagens.rejeitarRascunhosDoContato(contato.id);
      if (!(await this.contatoAbordavel(contato.empresaId, r))) {
        await r.leads.suprimirAbertosDaEmpresa(contato.empresaId);
      }
    });
  }
}
