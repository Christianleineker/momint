import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { FinalidadeCodigo, PrismaClient, Usuario } from "@prisma/client";
import type { HasherSenha } from "../../ports/hasher.js";
import type { Email } from "../../ports/email.js";
import type { Sessao } from "../../shared/sessao.js";
import { Conflito, EntradaInvalida, NaoAutenticado, ServicoIndisponivel } from "../../shared/erros.js";
import { adminPermitido } from "../../shared/admin.js";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const CINCO_MINUTOS = 5 * 60_000;
const sessaoUsuario = (u: Usuario): Sessao => ({ sub: u.id, clienteId: u.clienteId, papel: u.papel, versao: u.versaoSessao });

export class AcessoService {
  constructor(private readonly db: PrismaClient, private readonly hasher: HasherSenha, private readonly email: Email | undefined, private readonly segredo: string, private readonly agora = () => new Date()) {}

  private async usuarioValido(sessao: Sessao) {
    const u = await this.db.usuario.findUnique({ where: { id: sessao.sub }, include: { cliente: { include: { contaCliente: true } } } });
    if (!u?.ativo || !u.cliente.ativo || u.cliente.contaCliente?.excluidoEm || u.versaoSessao !== (sessao.versao ?? 0) || u.papel !== sessao.papel || u.clienteId !== sessao.clienteId || !adminPermitido(u)) throw new NaoAutenticado("Sessão encerrada. Entre novamente.");
    return u;
  }

  private codigoHash(token: string, codigo: string) {
    return createHmac("sha256", this.segredo).update(`${token}:${codigo}`).digest("hex");
  }

  private async emitir(sessao: Sessao, finalidade: FinalidadeCodigo) {
    if (!this.email) throw new ServicoIndisponivel("Não foi possível enviar o código. Tente novamente mais tarde.");
    const token = randomBytes(32).toString("hex");
    const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const agora = this.agora();
    const u = await this.usuarioValido(sessao);
    await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${u.id} FOR UPDATE`;
      const recente = await tx.desafioEmail.findFirst({ where: { usuarioId: u.id, finalidade, criadoEm: { gt: new Date(agora.getTime() - 60_000) } } });
      if (recente) throw new Conflito("Aguarde um minuto antes de solicitar outro código.");
      await tx.desafioEmail.deleteMany({ where: { OR: [{ usuarioId: u.id, finalidade }, { expiraEm: { lte: agora } }] } });
      await tx.desafioEmail.create({ data: { usuarioId: u.id, tokenHash: hashToken(token), codigoHash: this.codigoHash(token, codigo), finalidade, versaoSessao: u.versaoSessao, emailDestino: u.email, criadoEm: agora, expiraEm: new Date(agora.getTime() + CINCO_MINUTOS) } });
    });
    try {
      await this.email.enviar({ destinatario: u.email, assunto: "Momint - código de verificação", texto: `Olá, ${u.nome}.\n\nSeu código de verificação é: ${codigo}\n\nEle expira em 5 minutos e pode ser usado uma única vez. Não compartilhe este código. Se não foi você, não use o código e revise a segurança da sua conta.\n\nEquipe Momint` });
    } catch {
      await this.db.desafioEmail.deleteMany({ where: { tokenHash: hashToken(token) } });
      throw new ServicoIndisponivel("Não foi possível enviar o código. Tente novamente mais tarde.");
    }
    const [local, dominio] = u.email.split("@");
    return { token, emailMascarado: `${local.slice(0, 2)}***@${dominio}`, expiraEmSegundos: CINCO_MINUTOS / 1000 };
  }

  async iniciarLogin(sessao: Sessao) {
    const u = await this.usuarioValido(sessao);
    return u.doisFatoresEmail ? this.emitir(sessao, "LOGIN") : null;
  }

  async reenviarLogin(token: string) {
    const d = await this.db.desafioEmail.findUnique({ where: { tokenHash: hashToken(token) }, include: { usuario: true } });
    if (!d || d.finalidade !== "LOGIN" || d.expiraEm <= this.agora() || d.versaoSessao !== d.usuario.versaoSessao) throw new EntradaInvalida("Verificação expirada. Entre novamente com e-mail e senha.");
    return this.emitir(sessaoUsuario(d.usuario), "LOGIN");
  }

  async loginPendente(token: string) {
    const d = await this.db.desafioEmail.findUnique({ where: { tokenHash: hashToken(token) }, include: { usuario: true } });
    if (!d || d.finalidade !== "LOGIN" || d.expiraEm <= this.agora() || d.versaoSessao !== d.usuario.versaoSessao) return null;
    await this.usuarioValido(sessaoUsuario(d.usuario));
    const [local, dominio] = d.emailDestino.split("@");
    return { requerCodigo: true, emailMascarado: `${local.slice(0, 2)}***@${dominio}` };
  }

  async solicitarConfiguracao(sessao: Sessao, ativar: boolean, senhaAtual?: string) {
    const u = await this.usuarioValido(sessao);
    if (u.primeiroAcessoPendente && u.papel !== "ADMIN") throw new Conflito("Escolha primeiro se deseja manter ou alterar a senha inicial.");
    if (u.doisFatoresEmail === ativar) throw new Conflito(ativar ? "A verificação em duas etapas já está ativa." : "A verificação em duas etapas já está desativada.");
    if (!ativar && (!senhaAtual || !await this.hasher.comparar(senhaAtual, u.senhaHash))) throw new EntradaInvalida("Informe sua senha atual para desativar a verificação em duas etapas.");
    return this.emitir(sessao, ativar ? "ATIVAR_2FA" : "DESATIVAR_2FA");
  }

  async verificar(token: string, codigo: string, finalidade: "LOGIN" | "CONFIGURACAO", sessao?: Sessao) {
    const resultado = await this.db.$transaction(async tx => {
      const registros = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "DesafioEmail" WHERE "tokenHash" = ${hashToken(token)} FOR UPDATE`;
      if (!registros.length) return null;
      const d = await tx.desafioEmail.findUniqueOrThrow({ where: { id: registros[0].id }, include: { usuario: { include: { cliente: { include: { contaCliente: true } } } } } });
      const u = d.usuario;
      const valido = u.ativo && u.cliente.ativo && !u.cliente.contaCliente?.excluidoEm && adminPermitido(u) && d.versaoSessao === u.versaoSessao && d.emailDestino === u.email && d.expiraEm > this.agora();
      const proposito = finalidade === "LOGIN" ? d.finalidade === "LOGIN" && u.doisFatoresEmail : d.finalidade !== "LOGIN" && sessao?.sub === u.id && (sessao.versao ?? 0) === d.versaoSessao;
      if (!valido || !proposito) { await tx.desafioEmail.delete({ where: { id: d.id } }); return null; }
      if (!timingSafeEqual(Buffer.from(d.codigoHash, "hex"), Buffer.from(this.codigoHash(token, codigo), "hex"))) {
        if (d.tentativas >= 4) await tx.desafioEmail.delete({ where: { id: d.id } });
        else await tx.desafioEmail.update({ where: { id: d.id }, data: { tentativas: { increment: 1 } } });
        return null;
      }
      await tx.desafioEmail.delete({ where: { id: d.id } });
      if (d.finalidade === "LOGIN") return { sessao: sessaoUsuario(u), nome: u.nome };
      const atualizado = await tx.usuario.update({ where: { id: u.id }, data: { doisFatoresEmail: d.finalidade === "ATIVAR_2FA", oferta2faPendente: false, versaoSessao: { increment: 1 } } });
      await tx.desafioEmail.deleteMany({ where: { usuarioId: u.id } });
      return { sessao: sessaoUsuario(atualizado), nome: atualizado.nome };
    });
    if (!resultado) throw new EntradaInvalida("Código inválido ou expirado. Após 5 tentativas incorretas, inicie a verificação novamente.");
    return resultado;
  }

  async primeiroAcesso(sessao: Sessao, dados: { manterSenha: boolean; senhaAtual?: string; novaSenha?: string }) {
    const u = await this.usuarioValido(sessao);
    if (!u.primeiroAcessoPendente) throw new Conflito("A escolha da senha inicial já foi concluída.");
    if (!dados.manterSenha && (!dados.novaSenha || !dados.senhaAtual || !await this.hasher.comparar(dados.senhaAtual, u.senhaHash))) throw new EntradaInvalida("Informe a senha atual e uma nova senha válida.");
    const senhaHash = dados.manterSenha ? undefined : await this.hasher.gerar(dados.novaSenha!);
    return this.db.$transaction(async tx => {
      const alterados = await tx.usuario.updateMany({ where: { id: u.id, versaoSessao: u.versaoSessao, primeiroAcessoPendente: true }, data: { primeiroAcessoPendente: false, ...(senhaHash ? { senhaHash, versaoSessao: { increment: 1 } } : {}) } });
      if (!alterados.count) throw new Conflito("Seu acesso mudou. Atualize a página e tente novamente.");
      if (senhaHash) { await tx.recuperacaoSenha.deleteMany({ where: { usuarioId: u.id } }); await tx.desafioEmail.deleteMany({ where: { usuarioId: u.id } }); }
      return { ...sessaoUsuario(u), versao: u.versaoSessao + (senhaHash ? 1 : 0) };
    });
  }

  async adiarOferta(sessao: Sessao) {
    await this.usuarioValido(sessao);
    await this.db.usuario.update({ where: { id: sessao.sub }, data: { oferta2faPendente: false } });
  }
}
