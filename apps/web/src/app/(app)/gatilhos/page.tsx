"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Clock, Layers, Plus, RefreshCw, Search, Zap } from "lucide-react";
import { mutate as recarregarChave } from "swr";
import { Badge, Botao, Cabecalho, Card, FONTE_ROTULO, FONTE_TOM, Metrica, PRIORIDADE_ROTULO, type Tom } from "@/components/ui";
import { EstadoDados, Vazio } from "@/components/EstadoDados";
import { SeloGatilho, SeloPrioridade, iconeGatilho } from "@/components/SeloGatilho";
import { alerta } from "@/lib/alertas";
import { enviar } from "@/lib/api";
import { formatarData } from "@/lib/datas";
import { acao, useApi } from "@/lib/useApi";
import { DialogoGatilho, MenuGatilho, type Acao, type DadosGatilho, type Dialogo, type Gatilho, type Responsavel } from "./GatilhoAcoes";

/** Evento do radar (GET /api/radar): avaliado contra o perfil de cliente ideal do sistema. */
type EventoRadar = {
  id: string;
  demonstracao: boolean;
  tipo: string;
  resumo: string;
  detectadoEm: string;
  diasDecorridos: number;
  frescor: number;
  empresa: { id: string; nome: string; municipio: string; uf: string };
  status: "APTO" | "EXPIRADO" | "FORA_DO_ICP" | "FONTE_INATIVA";
  gatilhosEmpilhados: number;
  score: number;
  prioridade: string;
  lead: { id: string; estagio: string } | null;
};
const SITUACAO: Record<EventoRadar["status"], { rotulo: string; tom: Tom }> = {
  APTO: { rotulo: "No perfil", tom: "verde" },
  EXPIRADO: { rotulo: "Janela encerrada", tom: "cinza" },
  FORA_DO_ICP: { rotulo: "Fora do perfil", tom: "cinza" },
  FONTE_INATIVA: { rotulo: "Fonte inativa", tom: "cinza" },
};
const TONS_AVATAR = ["bg-sky-100 text-sky-700", "bg-violet-100 text-violet-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700"];
const tomAvatar = (id: string) => TONS_AVATAR[[...id].reduce((soma, c) => soma + c.charCodeAt(0), 0) % TONS_AVATAR.length];
const iniciais = (nome: string) => nome.split(" ").filter(Boolean).map((parte) => parte[0]).slice(0, 2).join("");
const campoFiltro = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-acento focus:ring-2 focus:ring-blue-100";

export default function GatilhosPage() {
  const radar = useApi<EventoRadar[]>("/api/radar");
  const regras = useApi<Gatilho[]>("/api/gatilhos");
  const equipe = useApi<Responsavel[]>("/api/vendedores");
  const eu = useApi<{ papel: string }>("/api/auth/me");
  const podeGerir = eu.data?.papel === "GESTOR" || eu.data?.papel === "ADMIN";

  const [aba, setAba] = useState("eventos");
  const [busca, setBusca] = useState("");
  const [fonte, setFonte] = useState("");
  const [status, setStatus] = useState("");
  const [eventoBusca, setEventoBusca] = useState("");
  const [eventoTipo, setEventoTipo] = useState("");
  const [eventoPrioridade, setEventoPrioridade] = useState("");
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [enfileirando, setEnfileirando] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  /** Busca novos eventos nas fontes públicas reais (PNCP e CNPJ) e reavalia os leads. */
  async function sincronizar() {
    setSincronizando(true);
    try {
      const r = await enviar<{ eventosProcessados: number; fontesIndisponiveis?: string[] }>("/api/radar/sincronizar", "POST");
      await Promise.all(["/api/radar", "/api/gatilhos", "/api/leads", "/api/dashboard"].map((chave) => recarregarChave(chave)));
      if (r.fontesIndisponiveis?.length) {
        const texto = `${r.eventosProcessados ?? 0} eventos processados. Consulta incompleta: ${r.fontesIndisponiveis.join("; ")}. Os eventos existentes foram mantidos.`;
        if (r.eventosProcessados > 0) alerta.aviso(texto, { titulo: "Resultados parciais", duracao: 12000 });
        else alerta.erro(texto, { titulo: "Sincronização incompleta", duracao: 12000 });
      } else {
        alerta.sucesso(r.eventosProcessados ? "Radar sincronizado: " + r.eventosProcessados + " eventos das fontes públicas." : "Radar sincronizado. Nenhum evento novo nas fontes públicas.");
      }
    } catch (e) {
      alerta.falha(e, "Não foi possível sincronizar o radar.");
    } finally {
      setSincronizando(false);
    }
  }

  const gatilhos = regras.data ?? [];
  /** Pessoas da equipe que ainda não cuidam de outra regra (cada responsável cuida de uma). */
  const disponiveis = (ignorarId?: string) => (equipe.data ?? []).filter((u) => !gatilhos.some((g) => g.id !== ignorarId && g.responsavel?.id === u.id));
  const recarregar = ["/api/gatilhos"];

  async function executar(tipo: Acao, gatilho: Gatilho) {
    if (tipo === "editar" || tipo === "remover") { setDialogo({ tipo, gatilho }); return; }
    if (tipo === "duplicar") {
      if (!disponiveis().length) { alerta.erro("Todos da equipe já cuidam de um gatilho. Cadastre outra pessoa antes de duplicar."); return; }
      setDialogo({ tipo: "duplicar", gatilho });
      return;
    }
    if (!gatilho.ativo && !gatilho.responsavel) {
      alerta.erro("Defina um responsável antes de ativar o gatilho.");
      setDialogo({ tipo: "editar", gatilho });
      return;
    }
    await acao(`/api/gatilhos/${gatilho.id}/situacao`, "PATCH", { ativo: !gatilho.ativo }, { sucesso: gatilho.ativo ? "Gatilho pausado." : "Gatilho ativado.", recarregar });
  }

  function novoGatilho() {
    if (!disponiveis().length) { alerta.erro("Todos da equipe já cuidam de um gatilho. Cadastre outra pessoa em Configurações → Equipe."); return; }
    setDialogo({ tipo: "novo" });
  }

  async function salvar(dados: DadosGatilho) {
    if (!dialogo) return;
    setSalvando(true);
    const editando = dialogo.tipo === "editar";
    const ok = editando
      ? await acao(`/api/gatilhos/${dialogo.gatilho.id}`, "PUT", dados, { sucesso: "Gatilho atualizado.", recarregar })
      : await acao("/api/gatilhos", "POST", dados, { sucesso: dialogo.tipo === "duplicar" ? "Gatilho duplicado com um novo responsável." : "Gatilho criado.", recarregar });
    setSalvando(false);
    if (ok !== null) setDialogo(null);
  }

  async function remover(gatilho: Gatilho) {
    setSalvando(true);
    const ok = await acao(`/api/gatilhos/${gatilho.id}`, "DELETE", undefined, { sucesso: "Gatilho removido.", recarregar });
    setSalvando(false);
    if (ok !== null) setDialogo(null);
  }

  const filtrados = gatilhos.filter((g) => `${g.nome} ${g.descricao} ${g.responsavel?.nome ?? ""}`.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR"))
    && (!fonte || g.fonte === fonte) && (!status || g.ativo === (status === "ativo")));

  const eventos = radar.data ?? [];
  const eventosFiltrados = eventos
    .filter((e) => e.empresa.nome.toLocaleLowerCase("pt-BR").includes(eventoBusca.trim().toLocaleLowerCase("pt-BR"))
      && (!eventoTipo || e.tipo === eventoTipo) && (!eventoPrioridade || e.prioridade === eventoPrioridade))
    .sort((a, b) => Number(b.demonstracao) - Number(a.demonstracao) || (a.status === "APTO" ? 0 : 1) - (b.status === "APTO" ? 0 : 1) || b.score - a.score || a.diasDecorridos - b.diasDecorridos);

  const valorMetrica = (valor: number) => radar.data ? String(valor) : radar.isLoading ? "..." : "—";
  const noPerfil = eventos.filter((e) => e.status === "APTO").length;
  const altaPrioridade = eventos.filter((e) => e.prioridade === "ALTA").length;
  const novosSemana = eventos.filter((e) => e.diasDecorridos <= 7).length;
  const empilhadas = new Set(eventos.filter((e) => e.gatilhosEmpilhados >= 2).map((e) => e.empresa.id)).size;

  async function enfileirar(evento: EventoRadar) {
    setEnfileirando(evento.id);
    await acao(`/api/radar/${evento.id}/fila`, "POST", {}, { sucesso: `${evento.empresa.nome} entrou na fila de aprovação.`, recarregar: ["/api/radar", "/api/abordagens/fila", "/api/leads"] });
    setEnfileirando(null);
  }

  const responsaveisDoDialogo = dialogo && dialogo.tipo !== "remover" ? disponiveis(dialogo.tipo === "editar" ? dialogo.gatilho.id : undefined) : [];

  return (
    <>
      <Cabecalho
        titulo="Gatilhos"
        subtitulo="Monitore eventos e sinais públicos que indicam novas oportunidades."
        acoes={podeGerir && <><Botao variante="secundario" disabled={sincronizando} onClick={() => void sincronizar()}><RefreshCw className={sincronizando ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> {sincronizando ? "Sincronizando..." : "Sincronizar radar"}</Botao><Botao disabled={!regras.data || !equipe.data} onClick={novoGatilho}><Plus className="h-4 w-4" /> Novo gatilho</Botao></>}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica icone={Zap} rotulo="Gatilhos no perfil" valor={valorMetrica(noPerfil)} detalhe="eventos dentro da segmentação" tom="azul" />
        <Metrica icone={AlertTriangle} rotulo="Prioridade alta" valor={valorMetrica(altaPrioridade)} tom="vermelho" />
        <Metrica icone={Clock} rotulo="Novos nesta semana" valor={valorMetrica(novosSemana)} detalhe="detectados nos últimos 7 dias" tom="verde" />
        <Metrica icone={Layers} rotulo="Empresas com gatilhos empilhados" valor={valorMetrica(empilhadas)} tom="roxo" />
      </div>
      <div className="mb-5 flex gap-6 border-b border-slate-200" role="tablist" aria-label="Visualizações de gatilhos">
        {[{ id: "eventos", nome: "Radar de eventos" }, { id: "gatilhos", nome: "Meus gatilhos" }].map(({ id, nome }) => (
          <button key={id} id={`aba-${id}`} type="button" role="tab" aria-selected={aba === id} aria-controls={`painel-${id}`} tabIndex={aba === id ? 0 : -1} className={`border-b-2 px-1 pb-3 text-sm font-medium ${aba === id ? "border-acento text-acento" : "border-transparent text-slate-500 hover:text-navy"}`} onClick={() => setAba(id)} onKeyDown={(event) => {
            if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              const proxima = event.key === "Home" ? "eventos" : event.key === "End" ? "gatilhos" : aba === "gatilhos" ? "eventos" : "gatilhos";
              setAba(proxima);
              document.getElementById(`aba-${proxima}`)?.focus();
            }
          }}>{nome}</button>
        ))}
      </div>
      {aba === "gatilhos" ? (
        <section id="painel-gatilhos" role="tabpanel" aria-labelledby="aba-gatilhos">
          <EstadoDados erro={regras.error} carregando={regras.isLoading} tentar={regras.mutate} texto="Carregando gatilhos..." />
          {regras.data && !gatilhos.length && (
            <Vazio icone={Zap} titulo="Nenhum gatilho cadastrado" texto="Crie um gatilho para definir qual fonte pública monitorar e quem cuida das oportunidades." acao={podeGerir && <Botao onClick={novoGatilho}><Plus className="h-4 w-4" /> Novo gatilho</Botao>} />
          )}
          {regras.data && gatilhos.length > 0 && (
            <>
              <div className="mb-4 flex flex-wrap gap-3">
                <label className="flex min-w-48 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
                  <input aria-label="Buscar gatilho" placeholder="Buscar gatilho ou responsável..." value={busca} onChange={(event) => setBusca(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                </label>
                <select aria-label="Filtrar por fonte" value={fonte} onChange={(event) => setFonte(event.target.value)} className={campoFiltro}><option value="">Todas as fontes</option>{Object.entries(FONTE_ROTULO).map(([codigo, nome]) => <option key={codigo} value={codigo}>{nome}</option>)}</select>
                <select aria-label="Filtrar por status" value={status} onChange={(event) => setStatus(event.target.value)} className={campoFiltro}><option value="">Todos os status</option><option value="ativo">Ativo</option><option value="pausado">Pausado</option></select>
              </div>
              <div className="relative overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <tr>{["Nome do gatilho", "Fonte", "Critério", "Responsável", "Status", "Última ocorrência", "Leads gerados"].map((nome) => <th key={nome} scope="col" className="px-4 py-3 font-medium">{nome}</th>)}<th scope="col" className="px-3 py-3"><span className="sr-only">Ações</span></th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtrados.map((g) => {
                      const Icone = iconeGatilho(g.fonte);
                      return (
                        <tr key={g.id} className="transition hover:bg-blue-50/40">
                          <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-acento"><Icone aria-hidden="true" className="h-5 w-5" /></div><div className="max-w-52"><p className="break-words font-semibold text-navy">{g.nome}</p><p className="mt-0.5 break-words text-xs leading-4 text-slate-500">{g.descricao}</p></div></div></td>
                          <td className="px-4 py-3"><Badge tom={FONTE_TOM[g.fonte]}>{FONTE_ROTULO[g.fonte]}</Badge></td>
                          <td className="px-4 py-3"><p className="max-w-40 break-words text-xs leading-5 text-slate-500">{g.criterio}</p></td>
                          <td className="px-4 py-3">
                            {g.responsavel
                              ? <div className="flex items-center gap-2 whitespace-nowrap"><span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${tomAvatar(g.responsavel.id)}`}>{iniciais(g.responsavel.nome)}</span><span className="text-xs text-slate-600">{g.responsavel.nome}</span></div>
                              : <span className="text-xs text-slate-500">Sem responsável</span>}
                          </td>
                          <td className="px-4 py-3"><Badge tom={g.ativo ? "verde" : "cinza"}>{g.ativo ? "Ativo" : "Pausado"}</Badge></td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-slate-500">{g.ultimaOcorrencia ? formatarData(g.ultimaOcorrencia) : "Sem ocorrências"}</td>
                          <td className="px-4 py-3 font-semibold tabular-nums text-navy">{g.leadsGerados.toLocaleString("pt-BR")}</td>
                          <td className="px-3 py-3 text-right">{podeGerir && <MenuGatilho gatilho={g} onAcao={(tipo) => void executar(tipo, g)} />}</td>
                        </tr>
                      );
                    })}
                    {filtrados.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">Nenhum gatilho encontrado com esses filtros.</td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-500">{filtrados.length} de {gatilhos.length} gatilhos</p>
            </>
          )}
        </section>
      ) : (
        <div id="painel-eventos" role="tabpanel" aria-labelledby="aba-eventos">
          <Card>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <label className="flex min-w-48 flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
                <input aria-label="Buscar empresa" placeholder="Buscar empresa..." value={eventoBusca} onChange={(event) => setEventoBusca(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              </label>
              <select aria-label="Filtrar por tipo" value={eventoTipo} onChange={(event) => setEventoTipo(event.target.value)} className={campoFiltro}><option value="">Tipo: todos</option>{Object.entries(FONTE_ROTULO).map(([codigo, nome]) => <option key={codigo} value={codigo}>{nome}</option>)}</select>
              <select aria-label="Filtrar por prioridade" value={eventoPrioridade} onChange={(event) => setEventoPrioridade(event.target.value)} className={campoFiltro}><option value="">Prioridade: todas</option>{Object.entries(PRIORIDADE_ROTULO).map(([codigo, nome]) => <option key={codigo} value={codigo}>{nome}</option>)}</select>
            </div>
            <EstadoDados erro={radar.error} carregando={radar.isLoading} tentar={radar.mutate} texto="Carregando o radar..." />
            {radar.data && (
              <div className="overflow-x-auto rounded-lg border border-slate-100">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">Empresa</th>
                      <th scope="col" className="px-4 py-3 font-medium">Gatilho</th>
                      <th scope="col" className="px-4 py-3 font-medium">Detecção</th>
                      <th scope="col" className="px-4 py-3 font-medium">Frescor</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">Score</th>
                      <th scope="col" className="px-4 py-3 font-medium">Prioridade</th>
                      <th scope="col" className="px-4 py-3 font-medium">Situação</th>
                      <th scope="col" className="px-4 py-3"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {eventosFiltrados.map((e) => {
                      const situacao = SITUACAO[e.status] ?? { rotulo: e.status, tom: "cinza" as const };
                      const podeEnfileirar = !!e.lead && ["APTO", "RECICLADO"].includes(e.lead.estagio);
                      return (
                        <tr key={e.id} className={`transition hover:bg-blue-50/40 ${e.gatilhosEmpilhados >= 2 ? "bg-red-50/40" : ""}`}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-navy">{e.empresa.nome}</p>
                            <p className="text-xs font-medium text-slate-500">{e.demonstracao ? "Exemplo fictício" : "Fonte pública"}</p>
                            <p className="text-xs text-slate-500">{e.empresa.municipio}/{e.empresa.uf}</p>
                            <p className="mt-0.5 max-w-64 text-xs leading-4 text-slate-500">{e.resumo}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <SeloGatilho codigo={e.tipo} />
                              {e.gatilhosEmpilhados >= 2 && <Badge tom="vermelho">{e.gatilhosEmpilhados} gatilhos</Badge>}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <p className="tabular-nums text-slate-700">{formatarData(e.detectadoEm)}</p>
                            <p className="text-xs text-slate-500">há {e.diasDecorridos} {e.diasDecorridos === 1 ? "dia" : "dias"}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2" title={`Frescor ${Math.round(e.frescor * 100)}%`}>
                              <div className="h-1.5 w-20 rounded-full bg-slate-100"><div className={`h-1.5 rounded-full ${e.frescor >= 0.5 ? "bg-emerald-500" : e.frescor > 0 ? "bg-amber-500" : "bg-slate-300"}`} style={{ width: `${Math.round(e.frescor * 100)}%` }} /></div>
                              <span className="w-9 text-xs tabular-nums text-slate-500">{Math.round(e.frescor * 100)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-navy">{Math.round(e.score)}</td>
                          <td className="px-4 py-3"><SeloPrioridade prioridade={e.prioridade} /></td>
                          <td className="px-4 py-3"><Badge tom={situacao.tom}>{situacao.rotulo}</Badge></td>
                          <td className="px-4 py-3 text-right">
                            {podeEnfileirar
                              ? <Botao variante="secundario" className="px-3" disabled={enfileirando === e.id} onClick={() => void enfileirar(e)}><Plus className="h-4 w-4" /> Fila</Botao>
                              : e.lead && <Link href={`/leads/${e.lead.id}`} className="text-sm font-medium text-acento hover:underline">Ver lead</Link>}
                          </td>
                        </tr>
                      );
                    })}
                    {eventosFiltrados.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">{eventos.length ? "Nenhum evento encontrado com esses filtros." : "Nenhum evento no radar ainda. Os eventos chegam das fontes públicas quando o radar é sincronizado."}</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
            {radar.data && <p className="mt-3 text-xs text-slate-500">{eventosFiltrados.length} de {eventos.length} eventos</p>}
          </Card>
        </div>
      )}
      {dialogo && (
        <DialogoGatilho
          key={dialogo.tipo === "novo" ? "novo" : `${dialogo.tipo}-${dialogo.gatilho.id}`}
          dialogo={dialogo}
          responsaveis={responsaveisDoDialogo}
          salvando={salvando}
          onFechar={() => setDialogo(null)}
          onSalvar={(dados) => void salvar(dados)}
          onRemover={(gatilho) => void remover(gatilho)}
        />
      )}
    </>
  );
}
