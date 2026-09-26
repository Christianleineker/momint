import type { Papel } from "@prisma/client";
import type { Repositorios } from "../../infra/database/repositories/index.js";
import type { HasherSenha } from "../../ports/hasher.js";
import { Conflito, NaoEncontrado } from "../../shared/erros.js";

export interface NovoUsuario {
  nome: string;
  email: string;
  senha: string;
  papel: Papel;
}

export class UsuariosService {
  constructor(
    private readonly repos: Repositorios,
    private readonly hasher: HasherSenha,
  ) {}

  listarAtivos(clienteId: string) {
    return this.repos.usuarios.listarAtivos(clienteId);
  }

  async criar(clienteId: string, dados: NovoUsuario) {
    if (await this.repos.usuarios.buscarPorEmail(dados.email)) throw new Conflito("E-mail já cadastrado");
    return this.repos.usuarios.criar({
      clienteId,
      nome: dados.nome,
      email: dados.email.toLowerCase(),
      papel: dados.papel,
      senhaHash: await this.hasher.gerar(dados.senha),
    });
  }

  async atualizar(clienteId: string, solicitanteId: string, id: string, dados: { ativo?: boolean; papel?: Papel }) {
    if (id === solicitanteId) throw new Conflito("Você não pode alterar o próprio acesso");
    if (!(await this.repos.usuarios.atualizarDoCliente(clienteId, id, dados))) throw new NaoEncontrado("Usuário não encontrado");
  }
}
