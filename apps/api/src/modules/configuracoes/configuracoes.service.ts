import type { ModoOperacao } from "@prisma/client";
import type { Repositorios } from "../../infra/database/repositories/index.js";
import { NaoEncontrado } from "../../shared/erros.js";

export interface AtualizacaoConfiguracoes {
  vozMarca: "consultivo" | "direto" | "proximo";
  assinaturaEmail: string | null;
  modoOperacao: ModoOperacao;
  calendarioProvedor: "google" | "outlook" | null;
  calendarioConectado: boolean;
}

export class ConfiguracoesService {
  constructor(private readonly repos: Repositorios) {}

  async obter(clienteId: string) {
    const c = await this.repos.clientes.buscarPorId(clienteId);
    if (!c) throw new NaoEncontrado("Cliente não encontrado");
    return {
      cliente: {
        nome: c.nome,
        plano: c.plano,
        vozMarca: c.vozMarca,
        assinaturaEmail: c.assinaturaEmail,
        modoOperacao: c.modoOperacao,
        calendarioProvedor: c.calendarioProvedor,
        calendarioConectado: c.calendarioConectado,
      },
      usuarios: await this.repos.usuarios.listarDoCliente(clienteId),
    };
  }

  async salvar(clienteId: string, dados: AtualizacaoConfiguracoes) {
    await this.repos.clientes.atualizar(clienteId, dados);
  }
}
