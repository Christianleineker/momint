import type { CodigoGatilho } from "@prisma/client";
import type { DbClient } from "../prisma.js";

const RESPONSAVEL = { select: { id: true, nome: true } } as const;

export interface DadosRegraGatilho {
  nome: string;
  descricao: string;
  fonte: CodigoGatilho;
  criterio: string;
  responsavelId: string | null;
}

/** Regras de monitoramento de gatilhos de cada cliente (tela "Meus gatilhos"). */
export class RegraGatilhoRepository {
  constructor(private readonly db: DbClient) {}

  listarDoCliente(clienteId: string) {
    return this.db.regraGatilho.findMany({ where: { clienteId }, include: { responsavel: RESPONSAVEL }, orderBy: { criadoEm: "asc" } });
  }

  buscarDoCliente(clienteId: string, id: string) {
    return this.db.regraGatilho.findFirst({ where: { id, clienteId }, include: { responsavel: RESPONSAVEL } });
  }

  async responsavelOcupado(clienteId: string, responsavelId: string, ignorarId?: string) {
    const total = await this.db.regraGatilho.count({ where: { clienteId, responsavelId, ...(ignorarId ? { NOT: { id: ignorarId } } : {}) } });
    return total > 0;
  }

  criar(clienteId: string, dados: DadosRegraGatilho) {
    return this.db.regraGatilho.create({ data: { ...dados, clienteId }, include: { responsavel: RESPONSAVEL } });
  }

  atualizar(id: string, dados: Partial<DadosRegraGatilho> & { ativo?: boolean }) {
    return this.db.regraGatilho.update({ where: { id }, data: dados, include: { responsavel: RESPONSAVEL } });
  }

  async excluir(id: string) {
    await this.db.regraGatilho.delete({ where: { id } });
  }

  /** Data da detecção mais recente de cada fonte (eventos são compartilhados entre clientes). */
  async ultimaDeteccaoPorFonte(clienteId: string) {
    const tipos = await this.db.tipoDeGatilho.findMany({ select: { codigo: true, eventos: { where: { OR: [{ NOT: { externalId: { startsWith: "DEMO:" } } }, { externalId: { startsWith: "DEMO:" }, leads: { some: { clienteId, cliente: { demonstrativo: true } } } }] }, select: { detectadoEm: true }, orderBy: { detectadoEm: "desc" }, take: 1 } } });
    return new Map(tipos.filter((t) => t.eventos.length).map((t) => [t.codigo, t.eventos[0].detectadoEm] as const));
  }

  /** Leads do cliente agrupados pela fonte do gatilho que os originou. */
  async leadsPorFonte(clienteId: string) {
    const leads = await this.db.lead.findMany({ where: { clienteId }, select: { evento: { select: { tipo: { select: { codigo: true } } } } } });
    const contagem = new Map<CodigoGatilho, number>();
    for (const lead of leads) contagem.set(lead.evento.tipo.codigo, (contagem.get(lead.evento.tipo.codigo) ?? 0) + 1);
    return contagem;
  }
}
