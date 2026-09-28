import type { Canal, ModoOperacao } from "@prisma/client";
import type { Repositorios } from "../../infra/database/repositories/index.js";
import type { UnitOfWork } from "../../infra/database/unit-of-work.js";
import { NaoEncontrado } from "../../shared/erros.js";

export interface ConfigCadencia {
  modoOperacao: ModoOperacao;
  condicoesParada: string[];
  passos: Array<{ dia: number; canal: Canal; titulo: string }>;
}

export class CadenciaService {
  constructor(
    private readonly repos: Repositorios,
    private readonly uow: UnitOfWork,
  ) {}

  async obter(clienteId: string) {
    const cliente = await this.repos.clientes.buscarPorId(clienteId);
    if (!cliente) throw new NaoEncontrado("Cliente não encontrado");
    const passos = await this.repos.cadencia.listarDoCliente(clienteId);
    return { modoOperacao: cliente.modoOperacao, condicoesParada: cliente.condicoesParada, passos };
  }

  /** Passos são reordenados pelo dia; tudo é salvo numa única transação. */
  async salvar(clienteId: string, config: ConfigCadencia) {
    const ordenados = [...config.passos].sort((a, b) => a.dia - b.dia).map((p, i) => ({ ...p, ordem: i + 1 }));
    await this.uow.executar(async (r) => {
      await r.clientes.atualizar(clienteId, { modoOperacao: config.modoOperacao, condicoesParada: config.condicoesParada });
      await r.cadencia.substituir(clienteId, ordenados);
    });
  }
}
