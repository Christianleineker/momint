"use client";

import Link from "next/link";
import { CalendarCheck, CalendarDays, CheckCircle2, Flame, Handshake, Star, TrendingUp, Users } from "lucide-react";
import { Cabecalho, Card, CardTitulo, Metrica } from "@/components/ui";
import { EstadoDados, Vazio } from "@/components/EstadoDados";
import { SeloGatilho, SeloPrioridade } from "@/components/SeloGatilho";
import { formatarDataHora } from "@/lib/datas";
import { useApi } from "@/lib/useApi";
import { DashboardAcoes } from "./DashboardAcoes";

type DadosDashboard = {
  metricas: { reuniaoNegocio: { percentual: number; ganhos: number; realizadas: number }; reunioesMes: number; respostasQuentes: number; aprovacoesPendentes: number };
  porEstagio: { estagio: string; rotulo: string; total: number }[];
  evolucao: { mes: string; marcadas: number; realizadas: number }[];
};
type LeadResumo = { id: string; estagio: string; score: number; prioridade: string; empresa: { nome: string; municipio: string }; gatilho: { codigo: string }; dono: { nome: string } | null };
type ReuniaoResumo = { id: string; inicio: string; status: string; vendedor: string | null; lead: { id: string; empresa: string; municipio: string } };

const ENCERRADOS = ["GANHO", "PERDIDO", "DESQUALIFICADO", "SUPRIMIDO"];

export default function DashboardPage() {
  const painel = useApi<DadosDashboard>("/api/dashboard");
  const leads = useApi<LeadResumo[]>("/api/leads");
  const reunioes = useApi<ReuniaoResumo[]>("/api/reunioes");
  const d = painel.data;

  const prioridades = (leads.data ?? []).filter((l) => !ENCERRADOS.includes(l.estagio)).sort((a, b) => b.score - a.score).slice(0, 5);
  const agora = Date.now();
  const proximas = (reunioes.data ?? []).filter((r) => r.status === "AGENDADA" && Date.parse(r.inicio) >= agora).sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio)).slice(0, 4);
  const maxEstagio = Math.max(1, ...(d?.porEstagio.map((e) => e.total) ?? []));
  const maxEvolucao = Math.max(1, ...(d?.evolucao.flatMap((e) => [e.marcadas, e.realizadas]) ?? []));

  return (
    <>
      <div className="relative">
        <div className="pr-24"><Cabecalho titulo="Dashboard" subtitulo="Acompanhe o desempenho da sua operação em tempo real." /></div>
        <div className="absolute right-0 top-0"><DashboardAcoes /></div>
      </div>
      <EstadoDados erro={painel.error} carregando={painel.isLoading} tentar={painel.mutate} texto="Carregando indicadores..." />
      {d && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metrica icone={Handshake} rotulo="Reunião → Negócio" valor={`${d.metricas.reuniaoNegocio.percentual}%`} detalhe={`${d.metricas.reuniaoNegocio.ganhos} de ${d.metricas.reuniaoNegocio.realizadas} reuniões`} tom="verde" />
            <Metrica icone={CalendarCheck} rotulo="Reuniões marcadas (mês)" valor={String(d.metricas.reunioesMes)} tom="azul" />
            <Metrica icone={Flame} rotulo="Respostas quentes" valor={String(d.metricas.respostasQuentes)} detalhe="últimos 30 dias" tom="vermelho" />
            <Metrica icone={CheckCircle2} rotulo="Aprovações pendentes" valor={String(d.metricas.aprovacoesPendentes)} tom="roxo" />
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardTitulo icone={Users} titulo="Leads por estágio" subtitulo="Distribuição no funil." />
              <ul className="space-y-2.5">
                {d.porEstagio.map((e) => (
                  <li key={e.estagio} className="flex items-center gap-3 text-sm">
                    <span className="w-44 shrink-0 text-slate-600">{e.rotulo}</span>
                    <div className="h-2.5 flex-1 rounded-full bg-slate-100"><div className="h-2.5 rounded-full bg-acento" style={{ width: `${(e.total / maxEstagio) * 100}%` }} /></div>
                    <span className="w-6 text-right font-semibold tabular-nums text-navy">{e.total}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardTitulo icone={Star} titulo="Prioridades de hoje" subtitulo="Os cinco leads em aberto com maior score." />
              <EstadoDados erro={leads.error} carregando={leads.isLoading} tentar={leads.mutate} />
              {leads.data && !prioridades.length && <Vazio titulo="Nenhum lead em aberto" texto="Configure a segmentação para o radar encontrar oportunidades." />}
              <ul className="divide-y divide-slate-100">
                {prioridades.map((l) => (
                  <li key={l.id}>
                    <Link href={`/leads/${l.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-navy">{l.empresa.nome}</p>
                        <p className="truncate text-xs text-slate-500">{l.empresa.municipio}{l.dono ? ` · ${l.dono.nome}` : ""}</p>
                      </div>
                      <SeloGatilho codigo={l.gatilho.codigo} />
                      <span className="w-9 text-right text-sm font-semibold tabular-nums text-navy" title="Score de prioridade">{Math.round(l.score)}</span>
                      <SeloPrioridade prioridade={l.prioridade} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardTitulo icone={TrendingUp} titulo="Evolução das reuniões" subtitulo="Marcadas e realizadas nos últimos 6 meses." />
              <div className="flex h-40 items-end gap-3">
                {d.evolucao.map((e) => (
                  <div key={e.mes} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-32 w-full items-end justify-center gap-1">
                      <div className="w-1/3 rounded-t bg-acento/80" style={{ height: `${(e.marcadas / maxEvolucao) * 100}%` }} title={`${e.marcadas} marcadas`} />
                      <div className="w-1/3 rounded-t bg-teal" style={{ height: `${(e.realizadas / maxEvolucao) * 100}%` }} title={`${e.realizadas} realizadas`} />
                    </div>
                    <span className="text-xs text-slate-500">{e.mes}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-acento/80" />Marcadas</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-teal" />Realizadas</span>
              </div>
            </Card>
            <Card>
              <CardTitulo icone={CalendarDays} titulo="Próximas reuniões" subtitulo="Agenda dos próximos dias." />
              <EstadoDados erro={reunioes.error} carregando={reunioes.isLoading} tentar={reunioes.mutate} />
              {reunioes.data && !proximas.length && <Vazio icone={CalendarDays} titulo="Nenhuma reunião agendada" texto="Quando um lead qualificado aceitar conversar, a reunião aparece aqui." />}
              <ul className="divide-y divide-slate-100">
                {proximas.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-28 shrink-0 text-sm font-semibold tabular-nums text-navy">{formatarDataHora(r.inicio)}</span>
                    <Link href={`/leads/${r.lead.id}`} className="min-w-0 flex-1 truncate font-medium text-navy hover:text-acento">{r.lead.empresa}</Link>
                    <span className="truncate text-xs text-slate-500">{r.vendedor ?? "Sem responsável"}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
