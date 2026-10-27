import type { Repositorios } from "../../infra/database/repositories/index.js";
import type { HasherSenha } from "../../ports/hasher.js";
import { AcessoNegado, EntradaInvalida, NaoAutenticado, NaoEncontrado } from "../../shared/erros.js";
import type { Sessao } from "../../shared/sessao.js";
import { createHash, randomBytes } from "node:crypto";
import type { Email } from "../../ports/email.js";
import type { UnitOfWork } from "../../infra/database/unit-of-work.js";
import { adminPermitido, EMAIL_ADMIN } from "../../shared/admin.js";

const TRINTA_MINUTOS_MS = 30 * 60_000;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export class AuthService {
  constructor(
    private readonly repos: Repositorios,
    private readonly hasher: HasherSenha,
    private readonly uow: UnitOfWork,
    private readonly email?: Email,
    private readonly urlWeb = "http://localhost:3000",
    private readonly agora: () => Date = () => new Date(),
  ) {}

  /** Valida credenciais e devolve os dados da sessão (o token é emitido na camada HTTP). */
  async autenticar(email: string, senha: string): Promise<{ sessao: Sessao; nome: string }> {
    const usuario = await this.repos.usuarios.buscarPorEmail(email);
    const valido = usuario?.ativo && usuario.cliente.ativo && !usuario.cliente.contaCliente?.excluidoEm && adminPermitido(usuario) && (await this.hasher.comparar(senha, usuario.senhaHash));
    if (!usuario || !valido) throw new NaoAutenticado("E-mail ou senha inválidos");
    return { sessao: { sub: usuario.id, clienteId: usuario.clienteId, papel: usuario.papel, versao: usuario.versaoSessao }, nome: usuario.nome };
  }

  async sessaoValida(sessao: Sessao) {
    const usuario = await this.repos.usuarios.buscarComCliente(sessao.sub);
    return !!usuario?.ativo && usuario.cliente.ativo && !usuario.cliente.contaCliente?.excluidoEm && adminPermitido(usuario) && usuario.clienteId === sessao.clienteId && usuario.papel === sessao.papel && usuario.versaoSessao === (sessao.versao ?? 0);
  }

  async solicitarRecuperacao(email: string) {
    const usuario = await this.repos.usuarios.buscarPorEmail(email.trim());
    if (!usuario?.ativo || !usuario.cliente.ativo || usuario.cliente.contaCliente?.excluidoEm || !adminPermitido(usuario)) return;
    if (!this.email) throw new Error("Envio de e-mail não configurado.");
    const token = randomBytes(32).toString("hex");
    await this.repos.recuperacoes.emitir(usuario.id, hashToken(token), new Date(this.agora().getTime() + TRINTA_MINUTOS_MS));
    // O fragmento não é enviado ao servidor ao abrir o link nem aparece no Referer.
    const link = new URL("/redefinir-senha", this.urlWeb);
    link.hash = new URLSearchParams({ token }).toString();
    await this.email.enviar({
      destinatario: usuario.email,
      assunto: "Momint - redefinição de senha",
      texto: `Olá, ${usuario.nome}.\n\nPara definir uma nova senha, acesse:\n${link.toString()}\n\nO link é de uso único e expira em 30 minutos. Se você não solicitou a alteração, ignore este e-mail.\n\nEquipe Momint`,
    });
  }

  async tokenValido(token: string) {
    const recuperacao = await this.repos.recuperacoes.buscar(hashToken(token));
    return !!recuperacao && recuperacao.usuario.ativo && recuperacao.usuario.cliente.ativo && !recuperacao.usuario.cliente.contaCliente?.excluidoEm && adminPermitido(recuperacao.usuario) && !recuperacao.usadaEm && recuperacao.expiraEm > this.agora();
  }

  async redefinirSenha(token: string, senha: string) {
    const senhaHash = await this.hasher.gerar(senha);
    const usuario = await this.uow.executar(async (repos) => {
      if (!await repos.recuperacoes.consumir(hashToken(token), this.agora())) throw new EntradaInvalida("Link inválido ou expirado. Solicite um novo link de recuperação.");
      const recuperacao = await repos.recuperacoes.buscar(hashToken(token));
      return repos.usuarios.redefinirSenha(recuperacao!.usuarioId, senhaHash);
    });
    return usuario.email;
  }

  async avisarAlteracao(email: string) {
    await this.email?.enviar({ destinatario: email, assunto: "Momint - sua senha foi alterada", texto: "Sua senha de acesso ao Momint foi alterada. As sessões anteriores foram encerradas. Se você não reconhece esta alteração, entre em contato com o suporte.\n\nEquipe Momint" });
  }

  async atualizarPerfil(sessao: Sessao, dados: { nome: string; telefone?: string | null; email: string; senhaAtual?: string; novaSenha?: string }) {
    return this.uow.executar(async repos => {
      const usuario = await repos.usuarios.buscarComCliente(sessao.sub);
      if (!usuario?.ativo || usuario.versaoSessao !== (sessao.versao ?? 0) || usuario.papel !== sessao.papel || !usuario.cliente.ativo || usuario.cliente.contaCliente?.excluidoEm) throw new NaoAutenticado("Sessão encerrada. Entre novamente.");
      if (usuario.papel === "ADMIN" && dados.email !== EMAIL_ADMIN) throw new AcessoNegado("O e-mail do administrador geral é fixo.");
      if (usuario.papel !== "ADMIN" && dados.email === EMAIL_ADMIN) throw new AcessoNegado("E-mail reservado ao administrador geral.");
      if (usuario.doisFatoresEmail && dados.email !== usuario.email) throw new EntradaInvalida("Desative a verificação em duas etapas antes de alterar o e-mail. Depois, ative-a novamente no novo endereço.");
      const credenciaisAlteradas = dados.email !== usuario.email || !!dados.novaSenha;
      if (credenciaisAlteradas && (!dados.senhaAtual || !await this.hasher.comparar(dados.senhaAtual, usuario.senhaHash))) throw new EntradaInvalida("Informe sua senha atual corretamente para alterar e-mail ou senha.");
      const alterados = await repos.usuarios.atualizarPerfil(usuario.id, usuario.versaoSessao, {
        nome: dados.nome, email: dados.email, telefone: dados.telefone,
        ...(dados.novaSenha ? { senhaHash: await this.hasher.gerar(dados.novaSenha), primeiroAcessoPendente: false } : {}),
        ...(credenciaisAlteradas ? { versaoSessao: { increment: 1 } } : {}),
      });
      if (!alterados.count) throw new NaoAutenticado("Seu acesso foi atualizado. Entre novamente.");
      if (credenciaisAlteradas) await repos.recuperacoes.revogar(usuario.id);
      return { sub: usuario.id, clienteId: usuario.clienteId, papel: usuario.papel, versao: usuario.versaoSessao + (credenciaisAlteradas ? 1 : 0) } satisfies Sessao;
    });
  }

  async perfil(usuarioId: string) {
    const u = await this.repos.usuarios.buscarComCliente(usuarioId);
    if (!u) throw new NaoEncontrado("Usuário não encontrado");
    return {
      id: u.id,
      nome: u.nome,
      email: u.email,
      telefone: u.telefone,
      primeiroAcessoPendente: u.primeiroAcessoPendente,
      oferta2faPendente: u.oferta2faPendente,
      doisFatoresEmail: u.doisFatoresEmail,
      papel: u.papel,
      cliente: { id: u.cliente.id, nome: u.cliente.nome, modoOperacao: u.cliente.modoOperacao, demonstrativo: u.cliente.demonstrativo },
      aprovacoesPendentes: await this.repos.mensagens.contarRascunhosDoCliente(u.clienteId),
    };
  }
}
