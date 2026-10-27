import { Prisma, type PrismaClient } from "@prisma/client";
import type { HasherSenha } from "../../ports/hasher.js";
import { Conflito, NaoEncontrado } from "../../shared/erros.js";
import { EMAIL_ADMIN } from "../../shared/admin.js";
import { createHash, randomBytes } from "node:crypto";

export interface NovoSistema { nome: string; plano: string; responsavel: string; email: string; senha: string }
const equipe = { id: true, nome: true, email: true, telefone: true, papel: true, ativo: true } as const;
export const ESPERA_EXCLUSAO_MS = 5_000;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export class AdminService {
  constructor(private readonly db: PrismaClient, private readonly hasher: HasherSenha, private readonly agora = () => new Date()) {}

  async listar() {
    const clientes = await this.db.contaCliente.findMany({
      where: { excluidoEm: null, sistemas: { some: { demonstrativo: false } } },
      orderBy: { criadoEm: "desc" },
      include: { sistemas: { where: { demonstrativo: false }, orderBy: { criadoEm: "asc" }, include: { usuarios: { select: equipe, orderBy: { criadoEm: "asc" } } } } },
    });
    const sistemas = clientes.flatMap(c => c.sistemas);
    return { clientes, metricas: {
      clientes: clientes.length,
      sistemasVendidos: sistemas.length,
      sistemasAtivos: sistemas.filter(s => s.ativo).length,
      usuariosAtivos: sistemas.reduce((n, s) => n + (s.ativo ? s.usuarios.filter(u => u.ativo).length : 0), 0),
    } };
  }

  private async dadosSistema(dados: NovoSistema) {
    if (dados.email === EMAIL_ADMIN || await this.db.usuario.findUnique({ where: { email: dados.email } })) throw new Conflito("E-mail já cadastrado ou reservado ao administrador geral.");
    return { nome: dados.nome, plano: dados.plano,
      icp: { create: { cnaes: [], portes: [], cidadeBase: "", ufBase: "", latBase: 0, lngBase: 0, raioKm: 40, fontesAtivas: [] } },
      usuarios: { create: { nome: dados.responsavel, email: dados.email, senhaHash: await this.hasher.gerar(dados.senha), papel: "GESTOR" as const } } };
  }

  async criarCliente(dados: { nome: string; documento?: string; sistema: NovoSistema }) {
    const sistema = await this.dadosSistema(dados.sistema);
    try {
      return await this.db.$transaction(async tx => {
        const cliente = await tx.contaCliente.create({ data: { nome: dados.nome, documento: dados.documento, sistemas: { create: sistema } }, select: { id: true, nome: true } });
        await tx.notificacaoAdmin.createMany({ data: [
          { tipo: "CLIENTE_CRIADO", titulo: "Novo cliente cadastrado", texto: `${cliente.nome} foi adicionado à plataforma.` },
          { tipo: "SISTEMA_VENDIDO", titulo: "Nova venda de sistema", texto: `${dados.sistema.nome} foi cadastrado para ${cliente.nome}.` },
        ] });
        return cliente;
      });
    } catch (e) { this.conflitoEmail(e); }
  }

  async criarSistema(contaId: string, dados: NovoSistema) {
    const sistema = await this.dadosSistema(dados);
    try {
      return await this.db.$transaction(async tx => {
        // Bloqueia o cadastro para serializar criação/exclusão do mesmo cliente.
        const conta = await tx.$queryRaw<Array<{ id: string; nome: string }>>`SELECT "id", "nome" FROM "ContaCliente" WHERE "id" = ${contaId} AND "excluidoEm" IS NULL FOR UPDATE`;
        if (!conta.length) throw new NaoEncontrado("Cliente não encontrado");
        const novo = await tx.cliente.create({ data: { ...sistema, contaClienteId: contaId }, select: { id: true, nome: true } });
        await tx.notificacaoAdmin.create({ data: { tipo: "SISTEMA_VENDIDO", titulo: "Nova venda de sistema", texto: `${novo.nome} foi cadastrado para ${conta[0].nome}.` } });
        return novo;
      });
    } catch (e) { this.conflitoEmail(e); }
  }

  async alterarSistema(id: string, ativo: boolean) {
    await this.db.$transaction(async tx => {
      const sistema = await tx.cliente.findFirst({ where: { id, demonstrativo: false, contaCliente: { excluidoEm: null } } });
      if (!sistema) throw new NaoEncontrado("Sistema não encontrado");
      await tx.cliente.update({ where: { id }, data: { ativo } });
      await tx.usuario.updateMany({ where: { clienteId: id }, data: { versaoSessao: { increment: 1 } } });
      await tx.notificacaoAdmin.create({ data: { tipo: "SISTEMA_ATUALIZADO", titulo: ativo ? "Sistema reativado" : "Sistema suspenso", texto: `${sistema.nome} teve o acesso ${ativo ? "reativado" : "suspenso"}.` } });
    });
  }

  private async contaEditavel(tx: Prisma.TransactionClient, id: string) {
    const contas = await tx.$queryRaw<Array<{ id: string; nome: string }>>`SELECT "id", "nome" FROM "ContaCliente" WHERE "id" = ${id} AND "excluidoEm" IS NULL FOR UPDATE`;
    if (!contas.length) throw new NaoEncontrado("Cliente não encontrado");
    if (await tx.cliente.count({ where: { contaClienteId: id, OR: [{ demonstrativo: true }, { usuarios: { some: { papel: "ADMIN" } } }] } })) throw new Conflito("A demonstração e o administrador geral são protegidos.");
    return contas[0];
  }

  async editarCliente(id: string, dados: { nome: string; emailContato?: string | null; telefone?: string | null }) {
    await this.db.$transaction(async tx => {
      const conta = await this.contaEditavel(tx, id);
      await tx.contaCliente.update({ where: { id }, data: dados });
      await tx.confirmacaoExclusao.deleteMany({ where: { contaClienteId: id } });
      await tx.notificacaoAdmin.create({ data: { tipo: "CLIENTE_ATUALIZADO", titulo: "Cadastro de cliente atualizado", texto: `${conta.nome} teve seus dados básicos atualizados${conta.nome !== dados.nome ? ` para ${dados.nome}` : ""}.` } });
    });
  }

  async editarSistema(id: string, dados: { nome: string; plano: string }) {
    await this.db.$transaction(async tx => {
      const sistema = await tx.cliente.findFirst({ where: { id, demonstrativo: false, contaCliente: { excluidoEm: null } } });
      if (!sistema?.contaClienteId) throw new NaoEncontrado("Sistema não encontrado");
      await this.contaEditavel(tx, sistema.contaClienteId);
      await tx.cliente.update({ where: { id }, data: dados });
      await tx.notificacaoAdmin.create({ data: { tipo: "SISTEMA_ATUALIZADO", titulo: "Cadastro de sistema atualizado", texto: `${sistema.nome} teve o nome ou plano atualizado.` } });
    });
  }

  async editarUsuario(id: string, dados: { nome: string; email: string; telefone?: string | null; senha?: string }) {
    const senhaHash = dados.senha ? await this.hasher.gerar(dados.senha) : undefined;
    await this.db.$transaction(async tx => {
      const u = await tx.usuario.findFirst({ where: { id, papel: { not: "ADMIN" }, cliente: { demonstrativo: false, contaCliente: { excluidoEm: null } } }, include: { cliente: true } });
      if (!u?.cliente.contaClienteId) throw new NaoEncontrado("Usuário não encontrado");
      if (dados.email === EMAIL_ADMIN) throw new Conflito("E-mail reservado ao administrador geral.");
      if (u.doisFatoresEmail && dados.email !== u.email) throw new Conflito("O titular deve desativar a verificação em duas etapas antes de alterar o e-mail.");
      await this.contaEditavel(tx, u.cliente.contaClienteId);
      const credenciaisAlteradas = dados.email !== u.email || !!senhaHash;
      await tx.usuario.update({ where: { id }, data: { nome: dados.nome, email: dados.email, telefone: dados.telefone, senhaHash, ...(senhaHash ? { primeiroAcessoPendente: true } : {}), ...(credenciaisAlteradas ? { versaoSessao: { increment: 1 } } : {}) } });
      if (credenciaisAlteradas) { await tx.recuperacaoSenha.deleteMany({ where: { usuarioId: id } }); await tx.desafioEmail.deleteMany({ where: { usuarioId: id } }); }
      await tx.notificacaoAdmin.create({ data: { tipo: "USUARIO_ATUALIZADO", titulo: "Dados de usuário atualizados", texto: `${dados.nome}, do sistema ${u.cliente.nome}, teve seus dados de acesso atualizados.` } });
    });
  }

  async prepararExclusao(id: string, confirmacao: string, usuarioId: string, versaoSessao: number) {
    const token = randomBytes(32).toString("hex");
    return this.db.$transaction(async tx => {
      const conta = await this.contaEditavel(tx, id);
      if (conta.nome !== confirmacao) throw new Conflito("Digite o nome do cliente para confirmar a exclusão.");
      const agora = this.agora();
      await tx.confirmacaoExclusao.deleteMany({ where: { usuarioId, contaClienteId: id } });
      await tx.confirmacaoExclusao.create({ data: { tokenHash: hashToken(token), usuarioId, contaClienteId: id, nomeConfirmado: conta.nome, versaoSessao, prontoEm: new Date(agora.getTime() + ESPERA_EXCLUSAO_MS), expiraEm: new Date(agora.getTime() + 5 * 60_000) } });
      return { token, aguardarMs: ESPERA_EXCLUSAO_MS };
    });
  }

  async cancelarExclusao(id: string, usuarioId: string) {
    await this.db.confirmacaoExclusao.deleteMany({ where: { contaClienteId: id, usuarioId } });
  }

  async excluirCliente(id: string, confirmacao: string, token: string, usuarioId: string, versaoSessao: number) {
    await this.db.$transaction(async tx => {
      const conta = await this.contaEditavel(tx, id);
      if (conta.nome !== confirmacao) throw new Conflito("Digite o nome do cliente para confirmar a exclusão.");
      const agora = this.agora();
      const usada = await tx.confirmacaoExclusao.updateMany({ where: { tokenHash: hashToken(token), usuarioId, contaClienteId: id, nomeConfirmado: conta.nome, versaoSessao, usadaEm: null, prontoEm: { lte: agora }, expiraEm: { gt: agora } }, data: { usadaEm: agora } });
      if (usada.count !== 1) throw new Conflito("Confirme novamente a exclusão e aguarde a contagem regressiva.");
      // Exclusão lógica: revoga todos os acessos, preservando o histórico para suporte.
      await tx.contaCliente.update({ where: { id }, data: { excluidoEm: new Date() } });
      await tx.cliente.updateMany({ where: { contaClienteId: id }, data: { ativo: false } });
      await tx.usuario.updateMany({ where: { cliente: { contaClienteId: id } }, data: { ativo: false, versaoSessao: { increment: 1 } } });
      await tx.recuperacaoSenha.deleteMany({ where: { usuario: { cliente: { contaClienteId: id } } } });
      await tx.desafioEmail.deleteMany({ where: { usuario: { cliente: { contaClienteId: id } } } });
      await tx.notificacaoAdmin.create({ data: { tipo: "CLIENTE_EXCLUIDO", titulo: "Cliente excluído", texto: `${conta.nome} foi excluído e todos os seus acessos foram encerrados.` } });
    });
  }

  async notificacoes() {
    const [itens, naoLidas] = await Promise.all([
      this.db.notificacaoAdmin.findMany({ take: 50, orderBy: [{ criadoEm: "desc" }, { id: "desc" }] }),
      this.db.notificacaoAdmin.count({ where: { lidaEm: null } }),
    ]);
    return { itens, naoLidas };
  }

  async lerNotificacoes(ids?: string[]) {
    await this.db.notificacaoAdmin.updateMany({ where: { ...(ids ? { id: { in: ids } } : {}), lidaEm: null }, data: { lidaEm: this.agora() } });
  }

  private conflitoEmail(e: unknown): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new Conflito("E-mail já cadastrado.");
    throw e;
  }
}
