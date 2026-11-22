"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Building2, CalendarPlus, Check, CheckSquare, FileText, Inbox, Mail, MessageCircle, Sparkles, UserPlus, UserRound, XCircle, Zap } from "lucide-react";
import { Badge, Botao, Card, CardTitulo } from "@/components/ui";
import { EstadoDados, Vazio } from "@/components/EstadoDados";
import { Modal } from "@/components/Modal";
import { SeloGatilho, SeloPrioridade } from "@/components/SeloGatilho";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { rotuloEstagio, tomEstagio } from "@/lib/estagios";
import { acao, useApi } from "@/lib/useApi";
import { mascararTelefone, proximoTelefone } from "@/lib/telefone";

type Mensagem = { id: string; canal: string; direcao: "SAIDA" | "ENTRADA"; status: string; assunto: string | null; conteudo: string; criadoEm: string; enviadaEm: string | null; contato: { nome: string } | null };
type Reuniao = { id: string; inicio: string; status: string; briefing: string; vendedor: { nome: string } | null };
type Detalhe = {
  id: string;
  estagio: string;
  score: number;
  prioridade: string;
  qualificacao: { necessidade: boolean; momento: boolean; encaixe: boolean; qualificacaoForcada: boolean };
  podeAgendar: boolean;
  transicoes: string[];
  dono: { nome: string } | null;
  empresa: { nome: string; cnpj: string; cnaeDescricao: string; porte: string; situacao: string; municipio: string; uf: string; idadeAnos: number };
  gatilhoPrincipal: { codigo: string; resumo: string; detectadoEm: string };
  gatilhos: { id: string; codigo: string; resumo: string; detectadoEm: string }[];
  contatos: { id: string; nome: string; cargo: string | null; email: string | null; telefone: string | null; origem: "RECEITA_FEDERAL" | "MANUAL"; suprimido: boolean }[];
  mensagens: Mensagem[];
  reunioes: Reuniao[];
  desfecho: { resultado: string; motivo: string | null; criadoEm: string } | null;
};
type Evento = { quando: string; titulo: string; detalhe?: string; mensagem?: { envio: boolean; canal: string; texto: string } };

const DESFECHO: Record<string, string> = { REUNIAO_REALIZADA: "Reunião realizada", NEGOCIO_FECHADO: "Negócio fechado", PERDIDO: "Perdido", DESQUALIFICADO: "Desqualificado" };
const REUNIAO: Record<string, string> = { AGENDADA: "Reunião marcada", REALIZADA: "Reunião realizada", CANCELADA: "Reunião cancelada", NO_SHOW: "Contato não compareceu à reunião" };
/** Estágios em que o lead já recebeu a abordagem e pode responder. */
const RESPONDIVEIS = ["EM_CADENCIA", "ENGAJADO", "QUALIFICANDO"];
const campo = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-acento focus:ring-2 focus:ring-blue-100";

/** Linha do tempo montada com as datas reais de gatilhos, mensagens, reuniões e desfecho. */
function linhaDoTempo(d: Detalhe): Evento[] {
  const eventos: Evento[] = d.gatilhos.map((g) => ({ quando: g.detectadoEm, titulo: "Gatilho detectado", detalhe: g.resumo }));
  for (const m of d.mensagens) {
    const canal = m.canal === "EMAIL" ? "e-mail" : "WhatsApp";
    if (m.direcao === "ENTRADA") eventos.push({ quando: m.criadoEm, titulo: `Respondido por ${canal}`, mensagem: { envio: false, canal, texto: m.conteudo } });
    else if (m.status === "RASCUNHO") eventos.push({ quando: m.criadoEm, titulo: "Rascunho gerado pela IA", detalhe: m.assunto ?? undefined });
    else if (m.status === "REJEITADA") eventos.push({ quando: m.criadoEm, titulo: "Rascunho rejeitado" });
    else if (m.status === "APROVADA") eventos.push({ quando: m.criadoEm, titulo: "Mensagem aprovada" });
    else eventos.push({ quando: m.enviadaEm ?? m.criadoEm, titulo: `Enviado por ${canal}`, mensagem: { envio: true, canal, texto: m.conteudo } });
  }
  for (const r of d.reunioes) eventos.push({ quando: r.inicio, titulo: REUNIAO[r.status] ?? "Reunião", detalhe: r.vendedor ? `Com ${r.vendedor.nome}` : undefined });
  if (d.desfecho) eventos.push({ quando: d.desfecho.criadoEm, titulo: `Desfecho: ${DESFECHO[d.desfecho.resultado] ?? d.desfecho.resultado}`, detalhe: d.desfecho.motivo ?? undefined });
  return eventos.sort((a, b) => Date.parse(a.quando) - Date.parse(b.quando));
}

export function LeadDetalhe({ id }: { id: string }) {
  const url = `/api/leads/${encodeURIComponent(id)}`;
  const { data: d, error, isLoading, mutate } = useApi<Detalhe>(url);
  const [ocupado, setOcupado] = useState(false);
  const [agendando, setAgendando] = useState(false);
  const [novoContato, setNovoContato] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [respondendo, setRespondendo] = useState(false);

  async function executar(caminho: string, metodo: "POST" | "PATCH", corpo: unknown, sucesso: string) {
    setOcupado(true);
    const ok = await acao(caminho, metodo, corpo, { sucesso, recarregar: [url, "/api/leads", "/api/reunioes", "/api/dashboard"] });
    setOcupado(false);
    return ok !== null;
  }

  async function agendar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const ok = await executar(`${url}/reunioes`, "POST", { inicio: new Date(String(f.get("inicio"))).toISOString(), duracaoMin: Number(f.get("duracao")) }, "Reunião agendada. O briefing já está disponível.");
    if (ok) setAgendando(false);
  }

  async function cadastrarContato(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const ok = await executar(`${url}/contatos`, "POST", { nome: f.get("nome"), cargo: f.get("cargo"), email: f.get("email"), telefone }, "Contato cadastrado.");
    if (ok) { setNovoContato(false); setTelefone(""); }
  }

  async function registrarResposta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const ok = await executar(`${url}/respostas`, "POST", { canal: f.get("canal"), conteudo: f.get("conteudo"), quente: f.get("quente") === "on" }, "Resposta registrada no histórico do lead.");
    if (ok) setRespondendo(false);
  }


  if (!d) {
    return (
      <>
        <Link href="/leads" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-acento"><ArrowLeft className="h-4 w-4" />Voltar aos leads</Link>
        <EstadoDados erro={error} carregando={isLoading} tentar={mutate} texto="Carregando lead..." />
      </>
    );
  }

  const eventos = linhaDoTempo(d);
  const etapas = d.transicoes.filter((t) => t !== "REUNIAO_MARCADA" && t !== "AGUARDANDO_APROVACAO" && t !== "DESQUALIFICADO");
  const briefing = d.reunioes[0]?.briefing;
  const podeResponder = RESPONDIVEIS.includes(d.estagio) && d.mensagens.some((m) => m.direcao === "SAIDA" && m.status !== "RASCUNHO" && m.status !== "REJEITADA");

  return (
    <>
      <Link href="/leads" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-acento"><ArrowLeft className="h-4 w-4" />Voltar aos leads</Link>
      <Card className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-acento"><Building2 aria-hidden="true" className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-semibold text-navy">{d.empresa.nome}</h1>
              <p className="mt-1 text-sm text-slate-500">CNPJ {d.empresa.cnpj} · {d.empresa.cnaeDescricao} · {d.empresa.municipio}/{d.empresa.uf}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tom={tomEstagio(d.estagio)}>{rotuloEstagio(d.estagio)}</Badge>
                <SeloPrioridade prioridade={d.prioridade} />
                <span className="text-xs text-slate-500">Score <b className="tabular-nums text-navy">{Math.round(d.score)}</b></span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {["APTO", "RECICLADO"].includes(d.estagio) && <Botao variante="secundario" disabled={ocupado} onClick={() => void executar(`${url}/abordar`, "POST", {}, "Rascunho gerado e enviado para a fila de aprovação.")}><Sparkles aria-hidden="true" className="h-4 w-4" />Gerar abordagem</Botao>}
            {podeResponder && <Botao variante="secundario" disabled={ocupado} onClick={() => setRespondendo(true)}><Inbox aria-hidden="true" className="h-4 w-4" />Registrar resposta</Botao>}
            <Botao disabled={ocupado || !d.podeAgendar} title={d.podeAgendar ? undefined : "Confirme necessidade, momento e encaixe para agendar"} onClick={() => setAgendando(true)}><CalendarPlus aria-hidden="true" className="h-4 w-4" />Agendar</Botao>
            {etapas.length > 0 && (
              <select aria-label="Mover para a etapa" value="" disabled={ocupado} onChange={(e) => { const estagio = e.target.value; if (estagio) void executar(`${url}/estagio`, "PATCH", { estagio }, `Lead movido para “${rotuloEstagio(estagio)}”.`); }} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy outline-none focus:border-acento">
                <option value="">Mover para...</option>
                {etapas.map((t) => <option key={t} value={t}>{rotuloEstagio(t)}</option>)}
              </select>
            )}
            {d.transicoes.includes("DESQUALIFICADO") && <Botao variante="perigo" disabled={ocupado} onClick={() => { if (window.confirm(`Desqualificar ${d.empresa.nome}?`)) void executar(`${url}/estagio`, "PATCH", { estagio: "DESQUALIFICADO" }, "Lead desqualificado."); }}><XCircle aria-hidden="true" className="h-4 w-4" />Desqualificar</Botao>}
          </div>
        </div>
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50 p-4">
          <Zap aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-semibold text-amber-800">Por que agora <SeloGatilho codigo={d.gatilhoPrincipal.codigo} /></p>
            <p className="mt-1 text-sm leading-6 text-amber-800/90">{d.gatilhoPrincipal.resumo}, detectado em {formatarData(d.gatilhoPrincipal.detectadoEm)}.</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="space-y-6">
          <Card>
            <CardTitulo titulo="Dados da empresa" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div><dt className="text-xs text-slate-500">CNPJ</dt><dd className="font-medium tabular-nums text-navy">{d.empresa.cnpj}</dd></div>
              <div><dt className="text-xs text-slate-500">Município</dt><dd className="font-medium text-navy">{d.empresa.municipio}/{d.empresa.uf}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-slate-500">Setor</dt><dd className="font-medium text-navy">{d.empresa.cnaeDescricao}</dd></div>
              <div><dt className="text-xs text-slate-500">Porte</dt><dd className="font-medium text-navy">{d.empresa.porte}</dd></div>
              <div><dt className="text-xs text-slate-500">Idade</dt><dd className="font-medium tabular-nums text-navy">{d.empresa.idadeAnos} {d.empresa.idadeAnos === 1 ? "ano" : "anos"} · {d.empresa.situacao}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-slate-500">Responsável</dt><dd className="font-medium text-navy">{d.dono?.nome ?? "Sem responsável"}</dd></div>
            </dl>
          </Card>

          <Card>
            <CardTitulo icone={UserRound} titulo="Contatos" extra={<Botao variante="secundario" disabled={ocupado} onClick={() => setNovoContato(true)} className="h-8 px-3 text-xs"><UserPlus aria-hidden="true" className="h-3.5 w-3.5" />Adicionar</Botao>} />
            {!d.contatos.length && <Vazio icone={UserRound} titulo="Nenhum contato cadastrado" texto="Sem contato, a abordagem não pode ser enviada." />}
            <ul className="divide-y divide-slate-100">
              {d.contatos.map((c) => (
                <li key={c.id} className="py-2.5 text-sm">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-navy">{c.nome}{c.origem === "RECEITA_FEDERAL" && <Badge tom="azul">Quadro societário (Receita)</Badge>}{c.suprimido && <Badge tom="cinza">Não contatar</Badge>}</p>
                  {c.cargo && <p className="text-xs text-slate-500">{c.cargo}</p>}
                  <p className="break-all text-xs text-slate-500">{[c.email, c.telefone && mascararTelefone(c.telefone)].filter(Boolean).join(" · ")}</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardTitulo icone={CheckSquare} titulo="Qualificação" subtitulo="Obrigatória antes de agendar." />
            <div className="space-y-2">
              {(["necessidade", "momento", "encaixe"] as const).map((k) => (
                <label key={k} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium capitalize text-navy transition hover:bg-slate-50">
                  <input type="checkbox" disabled={ocupado} checked={d.qualificacao[k]} onChange={(e) => void executar(`${url}/qualificacao`, "PATCH", { [k]: e.target.checked }, "Qualificação atualizada.")} className="h-4 w-4 accent-blue-600" /> {k}
                </label>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" disabled={ocupado} checked={d.qualificacao.qualificacaoForcada} onChange={(e) => void executar(`${url}/qualificacao`, "PATCH", { qualificacaoForcada: e.target.checked }, "Qualificação atualizada.")} className="h-3.5 w-3.5 accent-blue-600" /> Forçar manualmente</label>
          </Card>

          <Card>
            <CardTitulo icone={FileText} titulo="Briefing pré-reunião" />
            {briefing
              ? <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{briefing}</p>
              : <Vazio icone={FileText} titulo="Briefing ainda não gerado" texto="Ele é criado automaticamente ao agendar a reunião." />}
          </Card>
        </div>

        <Card>
          <CardTitulo titulo="Linha do tempo" subtitulo="Cada etapa desde a detecção do gatilho." />
          {!eventos.length && <Vazio titulo="Nenhum evento ainda" />}
          <ol className="ml-2 space-y-5 border-l border-slate-200 pl-6">
            {eventos.map((e, i) => {
              const atual = i === eventos.length - 1;
              return (
                <li key={`${e.quando}-${i}`} className="relative">
                  <span className={`absolute -left-8 top-0.5 grid h-4 w-4 place-items-center rounded-full text-white ${atual ? "bg-acento ring-4 ring-blue-100" : "bg-emerald-500"}`}>{!atual && <Check aria-hidden="true" className="h-2.5 w-2.5" />}</span>
                  <p className={`text-sm font-semibold ${atual ? "text-acento" : "text-navy"}`}>{e.titulo}<span className="ml-2 text-xs font-normal tabular-nums text-slate-500">{formatarDataHora(e.quando)}</span></p>
                  {e.detalhe && <p className="mt-1 text-sm leading-6 text-slate-600">{e.detalhe}</p>}
                  {e.mensagem && (
                    <div className={`mt-2 max-w-[90%] rounded-lg p-3 text-sm leading-6 text-slate-700 ${e.mensagem.envio ? "bg-blue-50" : "ml-auto bg-emerald-50"}`}>
                      <p className="mb-1 flex items-center gap-1 text-xs text-slate-500">{e.mensagem.canal === "e-mail" ? <Mail aria-hidden="true" className="h-3 w-3" /> : <MessageCircle aria-hidden="true" className="h-3 w-3" />}{e.mensagem.envio ? "Enviado" : "Resposta"} · {e.mensagem.canal}</p>
                      <p className="line-clamp-4 whitespace-pre-wrap">{e.mensagem.texto}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
      </div>

      {agendando && (
        <Modal titulo={`Agendar reunião · ${d.empresa.nome}`} ocupado={ocupado} fechar={() => { if (!ocupado) setAgendando(false); }}>
          <form onSubmit={agendar} className="space-y-4">
            <fieldset disabled={ocupado} className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">Data e horário<input name="inicio" type="datetime-local" required className={campo} /></label>
              <label className="block text-sm font-medium">Duração (minutos)<input name="duracao" type="number" min={15} max={240} step={15} defaultValue={45} required className={campo} /></label>
            </fieldset>
            <p className="text-xs leading-5 text-slate-500">A reunião fica com {d.dono?.nome ?? "o responsável do lead"} e o briefing é gerado na hora.</p>
            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
              <Botao type="button" variante="secundario" disabled={ocupado} onClick={() => setAgendando(false)}>Cancelar</Botao>
              <Botao type="submit" disabled={ocupado}><CalendarPlus aria-hidden="true" className="h-4 w-4" />{ocupado ? "Agendando..." : "Agendar reunião"}</Botao>
            </div>
          </form>
        </Modal>
      )}
      {novoContato && (
        <Modal titulo={`Novo contato · ${d.empresa.nome}`} ocupado={ocupado} fechar={() => { if (!ocupado) setNovoContato(false); }}>
          <form onSubmit={cadastrarContato} className="space-y-4">
            <fieldset disabled={ocupado} className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium sm:col-span-2">Nome<input name="nome" required minLength={2} maxLength={120} autoComplete="off" className={campo} /></label>
              <label className="block text-sm font-medium sm:col-span-2">Cargo<input name="cargo" maxLength={80} placeholder="Ex.: Engenheiro responsável pela obra" className={campo} /></label>
              <label className="block text-sm font-medium">E-mail<input name="email" type="email" maxLength={254} autoComplete="off" className={campo} /></label>
              <label className="block text-sm font-medium">Telefone<input name="telefone" inputMode="tel" value={telefone} onChange={(e) => setTelefone(proximoTelefone(telefone, e.target.value))} placeholder="(41) 99999-0000" className={campo} /></label>
            </fieldset>
            <p className="text-xs leading-5 text-slate-500">Informe ao menos o e-mail ou o telefone. Na abordagem, os contatos cadastrados pelo time têm preferência sobre os do quadro societário.</p>
            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
              <Botao type="button" variante="secundario" disabled={ocupado} onClick={() => setNovoContato(false)}>Cancelar</Botao>
              <Botao type="submit" disabled={ocupado}><UserPlus aria-hidden="true" className="h-4 w-4" />{ocupado ? "Salvando..." : "Salvar contato"}</Botao>
            </div>
          </form>
        </Modal>
      )}

      {respondendo && (
        <Modal titulo={`Resposta de ${d.empresa.nome}`} ocupado={ocupado} fechar={() => { if (!ocupado) setRespondendo(false); }}>
          <form onSubmit={registrarResposta} className="space-y-4">
            <fieldset disabled={ocupado} className="space-y-4">
              <div className="flex flex-wrap gap-2 text-sm">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 has-[:checked]:border-acento has-[:checked]:bg-blue-50"><input type="radio" name="canal" value="EMAIL" defaultChecked className="accent-blue-600" /><Mail aria-hidden="true" className="h-4 w-4 text-slate-500" />E-mail</label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 has-[:checked]:border-acento has-[:checked]:bg-blue-50"><input type="radio" name="canal" value="WHATSAPP" className="accent-blue-600" /><MessageCircle aria-hidden="true" className="h-4 w-4 text-slate-500" />WhatsApp</label>
              </div>
              <label className="block text-sm font-medium">O que o contato respondeu<textarea name="conteudo" required rows={5} maxLength={4000} className={campo} /></label>
              <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" name="quente" className="h-4 w-4 accent-blue-600" />Resposta quente: demonstrou interesse claro</label>
            </fieldset>
            <p className="text-xs leading-5 text-slate-500">A resposta entra na linha do tempo e encerra a cadência. Um lead em cadência passa a “Engajado”.</p>
            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
              <Botao type="button" variante="secundario" disabled={ocupado} onClick={() => setRespondendo(false)}>Cancelar</Botao>
              <Botao type="submit" disabled={ocupado}><Inbox aria-hidden="true" className="h-4 w-4" />{ocupado ? "Registrando..." : "Registrar resposta"}</Botao>
            </div>
          </form>
        </Modal>
      )}

    </>
  );
}
