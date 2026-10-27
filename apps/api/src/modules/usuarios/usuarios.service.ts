import type { Papel } from "@prisma/client";
import type { Repositorios } from "../../infra/database/repositories/index.js";
import type { HasherSenha } from "../../ports/hasher.js";
import { AcessoNegado, Conflito, NaoEncontrado } from "../../shared/erros.js";
import { EMAIL_ADMIN, emailNormalizado } from "../../shared/admin.js";

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
    if (dados.papel === "ADMIN" || emailNormalizado(dados.email) === EMAIL_ADMIN) throw new AcessoNegado("O administrador geral é exclusivo e não pode ser criado pela equipe.");
    if (await this.repos.usuarios.buscarPorEmail(dados.email)) throw new Conflito("E-mail já cadastrado");
    return this.repos.usuarios.criar({
      clienteId,
      nome: dados.nome,
      email: emailNormalizado(dados.email),
      papel: dados.papel,
      senhaHash: await this.hasher.gerar(dados.senha),
    });
  }

  async atualizar(clienteId: string, solicitanteId: string, id: string, dados: { ativo?: boolean; papel?: Papel }) {
    const usuario = await this.repos.usuarios.buscarDoCliente(clienteId, id);
    if (dados.papel === "ADMIN" || usuario?.papel === "ADMIN") throw new AcessoNegado("O administrador geral não pode ser alterado pela equipe.");
    if (id === solicitanteId) throw new Conflito("Você não pode alterar o próprio acesso");
    if (!(await this.repos.usuarios.atualizarDoCliente(clienteId, id, { ...dados, versaoSessao: { increment: 1 } }))) throw new NaoEncontrado("Usuário não encontrado");
  }
}
