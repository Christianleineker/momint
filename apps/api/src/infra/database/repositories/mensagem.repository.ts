import type { Prisma } from "@prisma/client";
import type { DbClient } from "../prisma.js";

export class MensagemRepository {
  constructor(private readonly db: DbClient) {}

  criar(dados: Prisma.MensagemUncheckedCreateInput) {
    return this.db.mensagem.create({ data: dados });
  }

  atualizar(id: string, dados: Prisma.MensagemUncheckedUpdateInput) {
    return this.db.mensagem.update({ where: { id }, data: dados });
  }

  /** Mensagem do cliente com contato e gatilho do lead (para validar/enviar). */
  buscarDoCliente(clienteId: string, id: string) {
    return this.db.mensagem.findFirst({
      where: { id, lead: { clienteId } },
      include: { contato: true, lead: { include: { evento: { include: { tipo: true } } } } },
    });
  }

  listarFilaDeAprovacao(clienteId: string) {
    return this.db.mensagem.findMany({
      where: { status: "RASCUNHO", lead: { clienteId } },
      include: {
        contato: true,
        lead: { include: { empresa: true, evento: { include: { tipo: true } }, dono: { select: { nome: true } } } },
      },
      orderBy: [{ lead: { scorePrioridade: "desc" } }, { criadoEm: "asc" }],
    });
  }

  contarRascunhosDoCliente(clienteId: string) {
    return this.db.mensagem.count({ where: { status: "RASCUNHO", lead: { clienteId } } });
  }

  contarRascunhosDoLead(leadId: string) {
    return this.db.mensagem.count({ where: { leadId, status: "RASCUNHO" } });
  }

  contarRespostasQuentes(clienteId: string, desde: Date) {
    return this.db.mensagem.count({ where: { lead: { clienteId }, direcao: "ENTRADA", quente: true, criadoEm: { gte: desde } } });
  }

  marcarEnviadasComoRespondidas(leadId: string) {
    return this.db.mensagem.updateMany({ where: { leadId, direcao: "SAIDA", status: "ENVIADA" }, data: { status: "RESPONDIDA" } });
  }

  /** Opt-out: rascunhos pendentes para o contato são descartados (de qualquer cliente). */
  rejeitarRascunhosDoContato(contatoId: string) {
    return this.db.mensagem.updateMany({ where: { contatoId, status: "RASCUNHO" }, data: { status: "REJEITADA" } });
  }
}
