import { ESTAGIOS, ROTULO_ESTAGIO } from "../../domain/lead/estados.js";
import { classificarPrioridade } from "../../domain/lead/prioridade.js";
import { DIA_MS } from "../../domain/shared/numeros.js";
import type { Repositorios } from "../../infra/database/repositories/index.js";
import type { Relogio } from "../../ports/relogio.js";
import { nomeEmpresa } from "../../shared/apresentacao.js";
import { gatilhosAtivosPorEmpresa } from "../comum/gatilhos.js";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_NA_SERIE = 6;

export class DashboardService {
  constructor(
    private readonly repos: Repositorios,
    private readonly relogio: Relogio,
  ) {}

  async obter(clienteId: string) {
    const hoje = this.relogio.agora();
    const inicioMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));

    const [comReuniaoRealizada, ganhos, reunioesMes, respostasQuentes, aprovacoesPendentes] = await Promise.all([
      this.repos.leads.contarComReuniaoRealizada(clienteId),
      this.repos.leads.contarComReuniaoRealizada(clienteId, "GANHO"),
      this.repos.reunioes.contarCriadasDesde(clienteId, inicioMes),
      this.repos.mensagens.contarRespostasQuentes(clienteId, new Date(hoje.getTime() - 30 * DIA_MS)),
      this.repos.mensagens.contarRascunhosDoCliente(clienteId),
    ]);

    return {
      metricas: {
        /** Reunião → Negócio: leads com reunião realizada que viraram negócio fechado. */
        reuniaoNegocio: {
          percentual: comReuniaoRealizada ? Math.round((ganhos / comReuniaoRealizada) * 100) : 0,
          ganhos,
          realizadas: comReuniaoRealizada,
        },
        reunioesMes,
        respostasQuentes,
        aprovacoesPendentes,
      },
      evolucao: await this.evolucaoReunioes(clienteId, hoje),
      porEstagio: await this.leadsPorEstagio(clienteId),
      ultimosLeads: await this.ultimosLeads(clienteId, hoje),
    };
  }

  /** Reuniões por mês (marcadas × realizadas) nos últimos meses. */
  private async evolucaoReunioes(clienteId: string, hoje: Date) {
    const inicio = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - (MESES_NA_SERIE - 1), 1));
    const chave = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    const serie = Array.from({ length: MESES_NA_SERIE }, (_, i) => {
      const d = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + i, 1));
      return { chave: chave(d), mes: MESES[d.getUTCMonth()], marcadas: 0, realizadas: 0 };
    });
    for (const r of await this.repos.reunioes.listarInicioDesde(clienteId, inicio)) {
      const ponto = serie.find((s) => s.chave === chave(r.inicio));
      if (!ponto) continue;
      ponto.marcadas++;
      if (r.status === "REALIZADA") ponto.realizadas++;
    }
    return serie.map(({ mes, marcadas, realizadas }) => ({ mes, marcadas, realizadas }));
  }

  private async leadsPorEstagio(clienteId: string) {
    const contagem = await this.repos.leads.contarPorEstagio(clienteId);
    return ESTAGIOS.map((e) => ({ estagio: e, rotulo: ROTULO_ESTAGIO[e], total: contagem.get(e) ?? 0 }));
  }

  private async ultimosLeads(clienteId: string, hoje: Date) {
    const ultimos = await this.repos.leads.listarUltimos(clienteId, 5);
    const ativos = await gatilhosAtivosPorEmpresa(this.repos, ultimos.map((l) => l.empresaId), hoje);
    return ultimos.map((l) => ({
      id: l.id,
      empresa: nomeEmpresa(l.empresa),
      municipio: l.empresa.municipio,
      gatilho: { codigo: l.evento.tipo.codigo, resumo: l.evento.resumo },
      estagio: l.estagio,
      dono: l.dono?.nome ?? null,
      prioridade: classificarPrioridade(l.scorePrioridade, ativos.get(l.empresaId)?.length ?? 0),
      criadoEm: l.criadoEm,
    }));
  }
}
