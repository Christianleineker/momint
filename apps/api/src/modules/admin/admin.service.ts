import { Prisma, type PrismaClient } from "@prisma/client";
import type { HasherSenha } from "../../ports/hasher.js";
import { Conflito, NaoEncontrado } from "../../shared/erros.js";
import { EMAIL_ADMIN } from "../../shared/admin.js";

export interface NovoSistema { nome: string; plano: string; responsavel: string; email: string; senha: string }
const equipe = { id: true, nome: true, email: true, papel: true, ativo: true } as const;

export class AdminService {
  constructor(private readonly db: PrismaClient, private readonly hasher: HasherSenha) {}

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
      return await this.db.contaCliente.create({ data: { nome: dados.nome, documento: dados.documento, sistemas: { create: sistema } }, select: { id: true, nome: true } });
    } catch (e) { this.conflitoEmail(e); }
  }

  async criarSistema(contaId: string, dados: NovoSistema) {
    const sistema = await this.dadosSistema(dados);
    try {
      return await this.db.$transaction(async tx => {
        // Bloqueia o cadastro para serializar criação/exclusão do mesmo cliente.
        const conta = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "ContaCliente" WHERE "id" = ${contaId} AND "excluidoEm" IS NULL FOR UPDATE`;
        if (!conta.length) throw new NaoEncontrado("Cliente não encontrado");
        return tx.cliente.create({ data: { ...sistema, contaClienteId: contaId }, select: { id: true, nome: true } });
      });
    } catch (e) { this.conflitoEmail(e); }
  }

  async alterarSistema(id: string, ativo: boolean) {
    await this.db.$transaction(async tx => {
      const sistema = await tx.cliente.findFirst({ where: { id, demonstrativo: false, contaCliente: { excluidoEm: null } } });
      if (!sistema) throw new NaoEncontrado("Sistema não encontrado");
      await tx.cliente.update({ where: { id }, data: { ativo } });
      await tx.usuario.updateMany({ where: { clienteId: id }, data: { versaoSessao: { increment: 1 } } });
    });
  }

  async excluirCliente(id: string, confirmacao: string) {
    await this.db.$transaction(async tx => {
      const contas = await tx.$queryRaw<Array<{ id: string; nome: string }>>`SELECT "id", "nome" FROM "ContaCliente" WHERE "id" = ${id} AND "excluidoEm" IS NULL FOR UPDATE`;
      if (!contas.length) throw new NaoEncontrado("Cliente não encontrado");
      if (contas[0].nome !== confirmacao) throw new Conflito("Digite o nome do cliente para confirmar a exclusão.");
      if (await tx.cliente.count({ where: { contaClienteId: id, OR: [{ demonstrativo: true }, { usuarios: { some: { email: EMAIL_ADMIN } } }] } })) throw new Conflito("A demonstração e o administrador geral são protegidos.");
      // Exclusão lógica: revoga todos os acessos, preservando o histórico para suporte.
      await tx.contaCliente.update({ where: { id }, data: { excluidoEm: new Date() } });
      await tx.cliente.updateMany({ where: { contaClienteId: id }, data: { ativo: false } });
      await tx.usuario.updateMany({ where: { cliente: { contaClienteId: id } }, data: { ativo: false, versaoSessao: { increment: 1 } } });
      await tx.recuperacaoSenha.deleteMany({ where: { usuario: { cliente: { contaClienteId: id } } } });
    });
  }

  private conflitoEmail(e: unknown): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new Conflito("E-mail já cadastrado.");
    throw e;
  }
}
