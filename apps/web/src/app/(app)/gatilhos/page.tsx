"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Building2, FileText, HardHat, Layers, Plus, Search, Users, Zap } from "lucide-react";
import { Badge, Botao, Cabecalho, Card, FONTE_ROTULO, FONTE_TOM, Metrica, PRIORIDADE_ROTULO, PRIORIDADE_TOM } from "@/components/ui";
import { DialogoGatilho, MenuGatilho } from "./GatilhoAcoes";
import type { Acao, Dialogo, Gatilho } from "./GatilhoAcoes";
import { chaveResponsavel, corrigirResponsaveis, responsaveisDisponiveis } from "./responsaveis";

const CHAVE = "momint:gatilhos:v1";
const GATILHOS_INICIAIS: Gatilho[] = [
  { id: "cno", nome: "Nova obra no CNO", descricao: "Empresas que iniciaram obras no CNO", fonte: "CNO", criterio: "Nova obra registrada", responsavel: "Rafael Nunes", ativo: true, ultimaOcorrencia: "há 2 h", leads: 124 },
  { id: "pncp", nome: "Nova licitação no PNCP", descricao: "Licitações de construção e impermeabilização", fonte: "PNCP", criterio: "Licitação publicada", responsavel: "Carla Dias", ativo: true, ultimaOcorrencia: "há 4 h", leads: 86 },
  { id: "cnpj", nome: "Nova empresa no CNPJ", descricao: "Empresas abertas no segmento de construção", fonte: "CNPJ_NOVO", criterio: "Novo CNPJ registrado", responsavel: "Gestor ImperSul", ativo: false, ultimaOcorrencia: "há 1 dia", leads: 38 },
];
const ICONES = { CNO: HardHat, PNCP: FileText, CNPJ_NOVO: Building2 };

function gatilhoValido(valor: unknown): valor is Gatilho {
  if (!valor || typeof valor !== "object") return false;
  const g = valor as Record<string, unknown>;
  return ["id", "nome", "descricao", "criterio", "responsavel", "ultimaOcorrencia"].every((campo) => typeof g[campo] === "string")
    && (g.fonte === "CNO" || g.fonte === "PNCP" || g.fonte === "CNPJ_NOVO")
    && typeof g.ativo === "boolean" && typeof g.leads === "number" && Number.isInteger(g.leads) && g.leads >= 0;
}

// TODO: GET /api/radar + POST /api/radar/:eventoId/fila + filtros
const EVENTOS = [
  { empresa: "Prisma Incorporadora", tipo: "PNCP", resumo: "Conjunto habitacional — COHAPAR", cidade: "São José dos Pinhais/PR", data: "25/09/2026", prioridade: "ALTA", empilhados: 2 },
  { empresa: "Prisma Incorporadora", tipo: "CNO", resumo: "Residencial multifamiliar 12.300 m²", cidade: "São José dos Pinhais/PR", data: "18/09/2026", prioridade: "ALTA", empilhados: 2 },
  { empresa: "Construtora Horizonte", tipo: "CNO", resumo: "Residencial multifamiliar 8.400 m²", cidade: "Curitiba/PR", data: "22/09/2026", prioridade: "MEDIA", empilhados: 1 },
  { empresa: "Alicerce Obras", tipo: "CNPJ_NOVO", resumo: "Empresa recém-aberta", cidade: "Curitiba/PR", data: "15/09/2026", prioridade: "MEDIA", empilhados: 1 },
  { empresa: "Edifica Engenharia", tipo: "PNCP", resumo: "Impermeabilização de 6 escolas", cidade: "Colombo/PR", data: "12/09/2026", prioridade: "MEDIA", empilhados: 1 },
  { empresa: "Bauen Construções", tipo: "CNO", resumo: "Comercial 3.200 m²", cidade: "Pinhais/PR", data: "08/09/2026", prioridade: "BAIXA", empilhados: 1 },
];

const EMPRESAS = Array.from(new Set(EVENTOS.map((e) => e.empresa))).map((empresa) => {
  const eventos = EVENTOS.filter((e) => e.empresa === empresa);
  return { ...eventos[0], tipos: Array.from(new Set(eventos.map((e) => e.tipo))), resumo: eventos.map((e) => e.resumo).join(" · ") };
});

const campoFiltro = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-acento focus:ring-2 focus:ring-blue-100";

export default function GatilhosPage() {
  const [gatilhos, setGatilhos] = useState(GATILHOS_INICIAIS);
  const [carregado, setCarregado] = useState(false);
  const [aba, setAba] = useState("gatilhos");
  const [busca, setBusca] = useState("");
  const [fonte, setFonte] = useState("");
  const [status, setStatus] = useState("");
  const [eventoBusca, setEventoBusca] = useState("");
  const [eventoTipo, setEventoTipo] = useState("");
  const [eventoPrioridade, setEventoPrioridade] = useState("");
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE);
      if (salvo) {
        const dados: unknown = JSON.parse(salvo);
        if (Array.isArray(dados) && dados.every(gatilhoValido) && new Set(dados.map((g) => g.id)).size === dados.length) {
          const corrigidos = corrigirResponsaveis(dados);
          setGatilhos(corrigidos);
          if (corrigidos.some((g) => !g.responsavel)) setAviso("Gatilhos sem responsável disponível foram mantidos pausados e sem atribuição.");
        }
        else setAviso("Não foi possível recuperar a lista salva.");
      }
    } catch { setAviso("Não foi possível recuperar a lista salva."); }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    try { localStorage.setItem(CHAVE, JSON.stringify(gatilhos)); }
    catch { setAviso("As alterações estão disponíveis nesta sessão, mas não puderam ser salvas no navegador."); }
  }, [gatilhos, carregado]);

  function executar(acao: Acao, gatilho: Gatilho) {
    if (acao === "editar" || acao === "remover") { setDialogo({ tipo: acao, gatilho }); return; }
    if (acao === "duplicar") {
      if (!responsaveisDisponiveis(gatilhos).length) {
        setAviso("Todos os responsáveis já possuem um gatilho. Libere um responsável antes de duplicar.");
        return;
      }
      setDialogo({ tipo: "duplicar", gatilho });
    } else {
      if (!gatilho.responsavel) { setDialogo({ tipo: "editar", gatilho }); return; }
      setGatilhos((lista) => lista.map((g) => g.id === gatilho.id ? { ...g, ativo: !g.ativo } : g));
      setAviso(gatilho.ativo ? "Gatilho pausado." : "Gatilho ativado.");
    }
  }

  function novoGatilho() {
    if (!responsaveisDisponiveis(gatilhos).length) {
      setAviso("Todos os responsáveis já possuem um gatilho. Libere um responsável antes de criar outro.");
      return;
    }
    setDialogo({ tipo: "novo" });
  }

  const responsaveis = responsaveisDisponiveis(gatilhos, dialogo?.tipo === "editar" ? dialogo.gatilho.id : undefined);
  if (dialogo?.tipo === "editar" && dialogo.gatilho.responsavel && !responsaveis.includes(dialogo.gatilho.responsavel)) responsaveis.push(dialogo.gatilho.responsavel);

  const filtrados = gatilhos.filter((g) => `${g.nome} ${g.descricao} ${g.responsavel}`.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR"))
    && (!fonte || g.fonte === fonte) && (!status || g.ativo === (status === "ativo")));

  const empresasFiltradas = EMPRESAS.filter((e) => e.empresa.toLocaleLowerCase("pt-BR").includes(eventoBusca.trim().toLocaleLowerCase("pt-BR"))
    && (!eventoTipo || e.tipos.includes(eventoTipo)) && (!eventoPrioridade || e.prioridade === eventoPrioridade));

  const ativos = gatilhos.filter((g) => g.ativo).length;
  const altaPrioridade = EVENTOS.filter((e) => e.prioridade === "ALTA").length;
  const empilhadas = EMPRESAS.filter((e) => e.empilhados >= 2).length;

  return (
    <>
      <Cabecalho
        titulo="Gatilhos"
        subtitulo="Monitore eventos e sinais públicos que indicam novas oportunidades."
        acoes={<Botao disabled={!carregado} onClick={novoGatilho}><Plus className="h-4 w-4" /> Novo gatilho</Botao>}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica icone={Zap} rotulo="Gatilhos ativos" valor={carregado ? String(ativos) : "..."} tom="azul" />
        <Metrica icone={AlertTriangle} rotulo="Prioridade alta" valor={String(altaPrioridade)} tom="vermelho" />
        <Metrica icone={Users} rotulo="Leads gerados" valor={carregado ? gatilhos.reduce((soma, g) => soma + g.leads, 0).toLocaleString("pt-BR") : "..."} tom="verde" />
        <Metrica icone={Layers} rotulo="Empresas com gatilhos empilhados" valor={String(empilhadas)} tom="roxo" />
      </div>
      <div className="mb-5 flex gap-6 border-b border-slate-200" role="tablist" aria-label="Visualizações de gatilhos">
        {[{ id: "gatilhos", nome: "Meus gatilhos" }, { id: "eventos", nome: "Radar de eventos" }].map(({ id, nome }) => (
          <button key={id} id={`aba-${id}`} type="button" role="tab" aria-selected={aba === id} aria-controls={`painel-${id}`} tabIndex={aba === id ? 0 : -1} className={`border-b-2 px-1 pb-3 text-sm font-medium ${aba === id ? "border-acento text-acento" : "border-transparent text-slate-500 hover:text-navy"}`} onClick={() => setAba(id)} onKeyDown={(event) => {
            if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              const proxima = event.key === "Home" ? "gatilhos" : event.key === "End" ? "eventos" : aba === "gatilhos" ? "eventos" : "gatilhos";
              setAba(proxima);
              document.getElementById(`aba-${proxima}`)?.focus();
            }
          }}>{nome}</button>
        ))}
      </div>
      {aviso && <p role="status" className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{aviso}</p>}
      {aba === "gatilhos" ? (
        <section id="painel-gatilhos" role="tabpanel" aria-labelledby="aba-gatilhos">
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
                {carregado && filtrados.map((g) => {
                  const Icone = ICONES[g.fonte];
                  return (
                    <tr key={g.id} className="transition hover:bg-blue-50/40">
                      <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-acento"><Icone aria-hidden="true" className="h-5 w-5" /></div><div className="max-w-52"><p className="break-words font-semibold text-navy">{g.nome}</p><p className="mt-0.5 break-words text-xs leading-4 text-slate-500">{g.descricao}</p></div></div></td>
                      <td className="px-4 py-3"><Badge tom={FONTE_TOM[g.fonte]}>{FONTE_ROTULO[g.fonte]}</Badge></td>
                      <td className="px-4 py-3"><p className="max-w-40 break-words text-xs leading-5 text-slate-500">{g.criterio}</p></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2 whitespace-nowrap"><span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${g.responsavel === "Carla Dias" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"}`}>{g.responsavel ? g.responsavel.split(" ").map((parte) => parte[0]).slice(0, 2).join("") : "—"}</span><span className="text-xs text-slate-600">{g.responsavel || "Sem responsável"}</span></div></td>
                      <td className="px-4 py-3"><Badge tom={g.ativo ? "verde" : "cinza"}>{g.ativo ? "Ativo" : "Pausado"}</Badge></td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{g.ultimaOcorrencia}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-navy">{g.leads.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-3 text-right"><MenuGatilho gatilho={g} onAcao={(acao) => executar(acao, g)} /></td>
                    </tr>
                  );
                })}
                {(!carregado || filtrados.length === 0) && <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">{!carregado ? "Carregando gatilhos..." : gatilhos.length ? "Nenhum gatilho encontrado." : "Nenhum gatilho cadastrado."}</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">{carregado ? `${filtrados.length} de ${gatilhos.length} gatilhos` : ""}</p>
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
            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Empresa</th>
                    <th scope="col" className="px-4 py-3 font-medium">Gatilhos</th>
                    <th scope="col" className="px-4 py-3 font-medium">Detecção</th>
                    <th scope="col" className="px-4 py-3 font-medium">Prioridade</th>
                    <th scope="col" className="px-4 py-3"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {empresasFiltradas.map((e) => (
                    <tr key={e.empresa} className={`transition hover:bg-blue-50/40 ${e.empilhados >= 2 ? "bg-red-50/40" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-navy">{e.empresa}</p>
                        <p className="text-xs text-slate-500">{e.cidade}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{e.resumo}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {e.tipos.map((tipo) => {
                            const Icone = ICONES[tipo as keyof typeof ICONES];
                            return <Badge key={tipo} tom={FONTE_TOM[tipo]}><Icone aria-hidden="true" className="mr-1 h-3.5 w-3.5" />{FONTE_ROTULO[tipo]}</Badge>;
                          })}
                          {e.empilhados >= 2 && <Badge tom="vermelho">2 gatilhos</Badge>}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600">{e.data}</td>
                      <td className="px-4 py-3"><Badge tom={PRIORIDADE_TOM[e.prioridade]}>{PRIORIDADE_ROTULO[e.prioridade]}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        <Botao variante="secundario" className="px-3"><Plus className="h-4 w-4" /> Fila</Botao>
                      </td>
                    </tr>
                  ))}
                  {empresasFiltradas.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">Nenhum evento encontrado com esses filtros.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
      {dialogo && <DialogoGatilho key={dialogo.tipo === "novo" ? "novo" : `${dialogo.tipo}-${dialogo.gatilho.id}`} dialogo={dialogo} responsaveis={responsaveis} onFechar={() => setDialogo(null)} onSalvar={(gatilho) => {
        if (!gatilho.responsavel || gatilhos.some((g) => g.id !== gatilho.id && chaveResponsavel(g.responsavel) === chaveResponsavel(gatilho.responsavel))) {
          setAviso("Escolha um responsável que ainda não possua outro gatilho.");
          return;
        }
        setGatilhos((lista) => lista.some((g) => g.id === gatilho.id) ? lista.map((g) => g.id === gatilho.id ? gatilho : g) : [...lista, gatilho]);
        setAviso(dialogo.tipo === "duplicar" ? "Gatilho duplicado com um novo responsável." : dialogo.tipo === "novo" ? "Gatilho criado." : "Gatilho atualizado.");
        setDialogo(null);
      }} onRemover={(gatilho) => {
        setGatilhos((lista) => lista.filter((g) => g.id !== gatilho.id));
        setAviso("Gatilho removido.");
        setDialogo(null);
      }} />}
    </>
  );
}
