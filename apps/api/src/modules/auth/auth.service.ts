import type { Repositorios } from "../../infra/database/repositories/index.js";
import type { HasherSenha } from "../../ports/hasher.js";
import { NaoAutenticado, NaoEncontrado } from "../../shared/erros.js";
import type { Sessao } from "../../shared/sessao.js";

export class AuthService {
  constructor(
    private readonly repos: Repositorios,
    private readonly hasher: HasherSenha,
  ) {}

  /** Valida credenciais e devolve os dados da sessão (o token é emitido na camada HTTP). */
  async autenticar(email: string, senha: string): Promise<{ sessao: Sessao; nome: string }> {
    const usuario = await this.repos.usuarios.buscarPorEmail(email);
    const valido = usuario?.ativo && (await this.hasher.comparar(senha, usuario.senhaHash));
    if (!usuario || !valido) throw new NaoAutenticado("E-mail ou senha inválidos");
    return { sessao: { sub: usuario.id, clienteId: usuario.clienteId, papel: usuario.papel }, nome: usuario.nome };
  }

  async perfil(usuarioId: string) {
    const u = await this.repos.usuarios.buscarComCliente(usuarioId);
    if (!u) throw new NaoEncontrado("Usuário não encontrado");
    return {
      id: u.id,
      nome: u.nome,
      email: u.email,
      papel: u.papel,
      cliente: { id: u.cliente.id, nome: u.cliente.nome, modoOperacao: u.cliente.modoOperacao },
      aprovacoesPendentes: await this.repos.mensagens.contarRascunhosDoCliente(u.clienteId),
    };
  }
}
