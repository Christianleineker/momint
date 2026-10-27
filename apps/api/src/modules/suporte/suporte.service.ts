import { createHash, randomBytes } from "node:crypto";
import type { AutorSuporte, Prisma, PrismaClient } from "@prisma/client";
import { AcessoNegado, EntradaInvalida, NaoEncontrado } from "../../shared/erros.js";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const resumo = { id: true, nome: true, email: true, assunto: true, encerrada: true, pendentesAdmin: true, pendentesVisitante: true, criadoEm: true, ultimaMensagemEm: true } as const;
type MensagemNova = { conteudo: string; idEnvio: string };

export class SuporteService {
  constructor(private readonly db: PrismaClient, private readonly agora = () => new Date()) {}

  private async visitante(token: string) {
    const conversa = await this.db.conversaSuporte.findUnique({ where: { acessoHash: hash(token) }, select: { id: true, acessoExpiraEm: true } });
    if (!conversa || conversa.acessoExpiraEm <= this.agora()) throw new NaoEncontrado("Conversa não encontrada neste navegador.");
    return conversa.id;
  }

  async iniciar(dados: { nome: string; email?: string; assunto: string; conteudo: string; idEnvio: string }, tokenExistente?: string) {
    if (tokenExistente) {
      const existente = await this.db.conversaSuporte.findUnique({ where: { acessoHash: hash(tokenExistente) } });
      if (existente && existente.acessoExpiraEm > this.agora()) {
        await this.enviarVisitante(tokenExistente, dados);
        return { token: tokenExistente, conversa: await this.obter(existente.id) };
      }
    }
    const token = randomBytes(32).toString("hex");
    const conversa = await this.db.$transaction(async tx => {
      const c = await tx.conversaSuporte.create({ data: {
        acessoHash: hash(token), nome: dados.nome, email: dados.email, assunto: dados.assunto,
        pendentesAdmin: 1, criadoEm: this.agora(), ultimaMensagemEm: this.agora(),
        acessoExpiraEm: new Date(this.agora().getTime() + 30 * 86_400_000),
        mensagens: { create: { conteudo: dados.conteudo, idEnvio: dados.idEnvio, autor: "VISITANTE", nomeAutor: dados.nome, criadoEm: this.agora() } },
      } });
      await tx.notificacaoAdmin.create({ data: { tipo: "SUPORTE_MENSAGEM", titulo: dados.assunto === "COMERCIAL" ? "Novo interesse no sistema" : "Novo atendimento", texto: `${dados.nome} iniciou uma conversa no suporte.` } });
      return c;
    });
    return { token, conversa: await this.obter(conversa.id) };
  }

  async obterVisitante(token: string, antes?: string) {
    if (!token) return null;
    try { return await this.obter(await this.visitante(token), antes); }
    catch (e) { if (e instanceof NaoEncontrado) return null; throw e; }
  }

  async obter(id: string, antes?: string) {
    const conversa = await this.db.conversaSuporte.findUnique({ where: { id }, select: resumo });
    if (!conversa) throw new NaoEncontrado("Conversa não encontrada");
    const cursor = antes ? await this.db.mensagemSuporte.findFirst({ where: { id: antes, conversaId: id } }) : null;
    if (antes && !cursor) throw new EntradaInvalida("Página de mensagens inválida.");
    const mensagens = await this.db.mensagemSuporte.findMany({
      where: { conversaId: id, ...(cursor ? { OR: [{ criadoEm: { lt: cursor.criadoEm } }, { criadoEm: cursor.criadoEm, id: { lt: cursor.id } }] } : {}) },
      orderBy: [{ criadoEm: "desc" }, { id: "desc" }], take: 101,
      select: { id: true, autor: true, nomeAutor: true, conteudo: true, criadoEm: true },
    });
    return { ...conversa, mensagens: mensagens.slice(0, 100).reverse(), temAnteriores: mensagens.length > 100 };
  }

  async listar(busca = "") {
    const [conversas, pendentes] = await Promise.all([
      this.db.conversaSuporte.findMany({ where: busca ? { OR: [{ nome: { contains: busca, mode: "insensitive" } }, { email: { contains: busca, mode: "insensitive" } }] } : {}, orderBy: [{ ultimaMensagemEm: "desc" }, { id: "desc" }], take: 100, select: { ...resumo, mensagens: { take: 1, orderBy: [{ criadoEm: "desc" }, { id: "desc" }], select: { conteudo: true, autor: true } } } }),
      this.db.conversaSuporte.aggregate({ _sum: { pendentesAdmin: true } }),
    ]);
    return { conversas, naoLidas: pendentes._sum.pendentesAdmin ?? 0 };
  }

  private async bloquear(tx: Prisma.TransactionClient, id: string) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "ConversaSuporte" WHERE "id" = ${id} FOR UPDATE`;
    if (!rows.length) throw new NaoEncontrado("Conversa não encontrada");
  }

  private async enviar(id: string, autor: AutorSuporte, nomeAutor: string, dados: MensagemNova) {
    return this.db.$transaction(async tx => {
      await this.bloquear(tx, id);
      const repetida = await tx.mensagemSuporte.findUnique({ where: { conversaId_idEnvio: { conversaId: id, idEnvio: dados.idEnvio } } });
      if (repetida) {
        if (repetida.autor !== autor || repetida.conteudo !== dados.conteudo) throw new EntradaInvalida("Identificador de envio já utilizado.");
        return { ok: true };
      }
      await tx.mensagemSuporte.create({ data: { conversaId: id, autor, nomeAutor, ...dados, criadoEm: this.agora() } });
      await tx.conversaSuporte.update({ where: { id }, data: { ultimaMensagemEm: this.agora(), encerrada: false, ...(autor === "VISITANTE" ? { pendentesAdmin: { increment: 1 } } : { pendentesVisitante: { increment: 1 } }) } });
      if (autor === "VISITANTE") await tx.notificacaoAdmin.create({ data: { tipo: "SUPORTE_MENSAGEM", titulo: "Nova mensagem no suporte", texto: `${nomeAutor} enviou uma mensagem no atendimento.` } });
      return { ok: true };
    });
  }

  async enviarVisitante(token: string, dados: MensagemNova) {
    const id = await this.visitante(token);
    const c = await this.db.conversaSuporte.findUniqueOrThrow({ where: { id }, select: { nome: true } });
    return this.enviar(id, "VISITANTE", c.nome, dados);
  }

  async responder(id: string, usuarioId: string, dados: MensagemNova) {
    const u = await this.db.usuario.findUnique({ where: { id: usuarioId } });
    if (!u?.ativo || u.papel !== "ADMIN") throw new AcessoNegado("Somente administradores podem responder ao suporte.");
    return this.enviar(id, "ADMIN", u.nome, dados);
  }

  async marcarLida(id: string, ate: string, leitor: AutorSuporte) {
    await this.db.$transaction(async tx => {
      await this.bloquear(tx, id);
      const mensagem = await tx.mensagemSuporte.findFirst({ where: { id: ate, conversaId: id } });
      if (!mensagem) throw new EntradaInvalida("Mensagem de referência inválida.");
      const quantidade = await tx.mensagemSuporte.count({ where: { conversaId: id, autor: leitor === "ADMIN" ? "VISITANTE" : "ADMIN", OR: [{ criadoEm: { gt: mensagem.criadoEm } }, { criadoEm: mensagem.criadoEm, id: { gt: mensagem.id } }] } });
      await tx.conversaSuporte.update({ where: { id }, data: leitor === "ADMIN" ? { pendentesAdmin: quantidade } : { pendentesVisitante: quantidade } });
    });
  }

  async marcarVisitante(token: string, ate: string) { return this.marcarLida(await this.visitante(token), ate, "VISITANTE"); }
  async encerrar(id: string, encerrada: boolean) {
    const r = await this.db.conversaSuporte.updateMany({ where: { id }, data: { encerrada } });
    if (!r.count) throw new NaoEncontrado("Conversa não encontrada");
  }
}
