"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Building2, CalendarCheck, CheckCircle2, Flame, Handshake, Plus, Save, Users } from "lucide-react";
import { Badge, Botao, Cabecalho, Card, CardTitulo, FONTE_ROTULO, Metrica } from "./ui";
import { CampoSenha } from "./CampoSenha";
import { enviar, ErroApi, lerJson } from "@/lib/api";
import { ROTULO_PAPEL, type Perfil } from "@/lib/perfil";
import { ConfiguracoesAbas } from "./ConfiguracoesAbas";

const campo = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-acento";
const estagio = (s: string) => ({ APTO: "Apto a abordar", AGUARDANDO_APROVACAO: "Aguardando aprovação", EM_CADENCIA: "Em cadência", REUNIAO_MARCADA: "Reunião marcada", REUNIAO_REALIZADA: "Reunião realizada", SEM_CONTATO: "Sem contato" }[s] ?? s.toLowerCase().replaceAll("_", " "));
const gerir = (p: Perfil) => p.papel === "GESTOR" || p.papel === "ADMIN";
function useRecurso<T>(url: string, perfil: Perfil) {
  const resultado = useSWR<T>(`${url}?sistema=${perfil.cliente.id}`, lerJson);
  useEffect(() => { if (resultado.error instanceof ErroApi && resultado.error.status === 401) window.location.href = "/login"; }, [resultado.error]);
  return resultado;
}
function Estado({ erro, carregando, tentar }: { erro?: Error; carregando?: boolean; tentar: () => unknown }) {
  if (erro) return <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">{erro.message} <button className="underline" onClick={() => tentar()}>Tentar novamente</button></div>;
  if (carregando) return <p className="p-6 text-sm text-slate-500">Carregando dados do seu sistema…</p>;
  return null;
}
function Vazio({ texto = "Nenhum registro neste sistema ainda." }: { texto?: string }) { return <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">{texto}</p>; }
function useAcao(perfil: Perfil) {
  const { mutate } = useSWRConfig();
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  async function executar(url: string, metodo: "POST" | "PUT" | "PATCH", dados?: unknown) {
    setOcupado(true); setErro(""); setMensagem("");
    try {
      await enviar(url, metodo, dados);
      await mutate(k => typeof k === "string" && k.endsWith(`?sistema=${perfil.cliente.id}`));
      setMensagem("Alteração salva com sucesso."); return true;
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível salvar."); return false; }
    finally { setOcupado(false); }
  }
  return { ocupado, executar, aviso: <>{erro && <p role="alert" className="my-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}{mensagem && <p role="status" className="my-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{mensagem}</p>}</> };
}

export function AmbienteCliente({ perfil }: { perfil: Perfil }) {
  const path = usePathname();
  const paginas: Record<string, React.ReactNode> = {
    "/dashboard": <Dashboard perfil={perfil} />,
    "/leads": <Leads perfil={perfil} />,
    "/gatilhos": <Gatilhos perfil={perfil} />,
    "/abordagens": <Abordagens perfil={perfil} />,
    "/reunioes": <Reunioes perfil={perfil} />,
    "/configuracoes": <ConfiguracoesAbas perfil={perfil}><Configuracoes perfil={perfil} /></ConfiguracoesAbas>,
    "/segmentacao": <Segmentacao perfil={perfil} />,
    "/automacao": <Automacao perfil={perfil} />,
  };
  return <div key={`${perfil.cliente.id}:${path}`}>{paginas[path] ?? (path.startsWith("/leads/") ? <DetalheLead perfil={perfil} id={path.split("/")[2]} /> : <Vazio />)}</div>;
}

interface DadosDashboard {
  metricas: { reuniaoNegocio: { percentual: number; ganhos: number; realizadas: number }; reunioesMes: number; respostasQuentes: number; aprovacoesPendentes: number };
  porEstagio: { estagio: string; rotulo: string; total: number }[];
  evolucao: { mes: string; marcadas: number; realizadas: number }[];
  ultimosLeads: { id: string; empresa: string; estagio: string }[];
}
function Dashboard({ perfil }: { perfil: Perfil }) {
  const { data: d, error, isLoading, mutate } = useRecurso<DadosDashboard>("/api/dashboard", perfil);
  return <><Cabecalho titulo="Dashboard" subtitulo={`Acompanhe os resultados de ${perfil.cliente.nome}.`} /><Estado erro={error} carregando={isLoading} tentar={mutate} />{d && <>
    <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Metrica icone={Handshake} rotulo="Reunião → Negócio" valor={`${d.metricas.reuniaoNegocio.percentual}%`} detalhe={`${d.metricas.reuniaoNegocio.ganhos} de ${d.metricas.reuniaoNegocio.realizadas} reuniões`} tom="verde" /><Metrica icone={CalendarCheck} rotulo="Reuniões no mês" valor={String(d.metricas.reunioesMes)} /><Metrica icone={Flame} rotulo="Respostas quentes" valor={String(d.metricas.respostasQuentes)} tom="vermelho" /><Metrica icone={CheckCircle2} rotulo="Aprovações pendentes" valor={String(d.metricas.aprovacoesPendentes)} tom="roxo" /></div>
    <div className="grid gap-6 lg:grid-cols-2"><Card><CardTitulo titulo="Leads por estágio" icone={Users} /><ul className="space-y-3">{d.porEstagio.map(e => <li key={e.estagio} className="flex justify-between gap-2 text-sm text-slate-600"><span>{e.rotulo}</span><b className="text-navy">{e.total}</b></li>)}</ul></Card><Card><CardTitulo titulo="Últimos leads" />{!d.ultimosLeads.length ? <Vazio texto="Seu sistema começa com uma base própria. Configure a segmentação para iniciar a prospecção." /> : <ul className="divide-y divide-slate-100">{d.ultimosLeads.map(l => <li key={l.id} className="py-3"><Link href={`/leads/${l.id}`} className="font-medium text-acento">{l.empresa}</Link><p className="text-xs text-slate-500">{estagio(l.estagio)}</p></li>)}</ul>}<CardTitulo titulo="Evolução das reuniões" /><div className="grid grid-cols-6 gap-2">{d.evolucao.map((e, i) => <div key={i} className="rounded-lg bg-blue-50 p-2 text-center text-xs text-slate-500"><b className="block text-navy">{e.mes}</b><span className="block">{e.marcadas} marc.</span><span>{e.realizadas} real.</span></div>)}</div></Card></div>
  </>}</>;
}

interface Lead { id: string; estagio: string; empresa: { nome: string; municipio: string }; gatilho: { codigo: string; resumo: string }; dono: { nome: string } | null }
function Leads({ perfil }: { perfil: Perfil }) {
  const { data, error, isLoading, mutate } = useRecurso<Lead[]>("/api/leads", perfil);
  return <><Cabecalho titulo="Leads" subtitulo="Acompanhe o funil deste sistema." /><Estado erro={error} carregando={isLoading} tentar={mutate} /><Card>{data?.length ? <ul className="divide-y divide-slate-100">{data.map(l => <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><Link className="font-semibold text-acento" href={`/leads/${l.id}`}>{l.empresa.nome}</Link><p className="mt-1 text-xs text-slate-500">{l.empresa.municipio} · {l.dono?.nome ?? "Sem responsável"}</p></div><Badge>{estagio(l.estagio)}</Badge></li>)}</ul> : !isLoading && !error && <Vazio texto="Nenhum lead neste sistema. Configure a segmentação para iniciar a prospecção." />}</Card></>;
}

interface Detalhe { id: string; estagio: string; empresa: { nome: string; cnpj: string; municipio: string }; qualificacao: { necessidade: boolean; momento: boolean; encaixe: boolean; qualificacaoForcada: boolean }; transicoes: string[]; contatos: { id: string; nome: string; email: string | null; telefone: string | null }[]; gatilhoPrincipal: { resumo: string }; podeAgendar: boolean }
function DetalheLead({ perfil, id }: { perfil: Perfil; id: string }) {
  const { data: d, error, isLoading, mutate } = useRecurso<Detalhe>(`/api/leads/${encodeURIComponent(id)}`, perfil);
  const a = useAcao(perfil);
  return <><Link href="/leads" className="text-sm text-acento">← Voltar aos leads</Link><Cabecalho titulo={d?.empresa.nome ?? "Lead"} subtitulo={d ? `${d.empresa.cnpj} · ${d.empresa.municipio}` : "Dados do seu sistema"} /><Estado erro={error} carregando={isLoading} tentar={mutate} />{a.aviso}{d && <div className="grid gap-6 lg:grid-cols-2"><Card><CardTitulo titulo="Qualificação" /><p className="mb-4 text-sm text-slate-500">{d.gatilhoPrincipal.resumo}</p>{(["necessidade", "momento", "encaixe"] as const).map(k => <label key={k} className="flex items-center gap-2 py-2 text-sm capitalize"><input type="checkbox" disabled={a.ocupado} checked={d.qualificacao[k]} onChange={e => void a.executar(`/api/leads/${id}/qualificacao`, "PATCH", { [k]: e.target.checked })} />{k}</label>)}<label className="mt-4 block text-sm">Etapa atual<select className={`${campo} mt-1`} value={d.estagio} disabled={a.ocupado} onChange={e => void a.executar(`/api/leads/${id}/estagio`, "PATCH", { estagio: e.target.value })}><option value={d.estagio}>{estagio(d.estagio)}</option>{d.transicoes.filter(t => t !== "REUNIAO_MARCADA" && t !== "AGUARDANDO_APROVACAO").map(t => <option key={t} value={t}>{estagio(t)}</option>)}</select></label>{["APTO", "RECICLADO"].includes(d.estagio) && <Botao disabled={a.ocupado} className="mt-4" onClick={() => void a.executar(`/api/leads/${id}/abordar`, "POST", {})}>Gerar abordagem</Botao>}</Card><Card><CardTitulo titulo="Contatos" />{!d.contatos.length && <Vazio texto="Nenhum contato cadastrado para esta empresa." />}{d.contatos.map(c => <div key={c.id} className="border-b border-slate-100 py-3 text-sm"><b>{c.nome}</b><p className="text-slate-500">{c.email} {c.telefone}</p></div>)}</Card></div>}</>;
}

interface Gatilho { id: string; tipo: string; resumo: string; status: string; empresa: { nome: string }; lead: { id: string; estagio: string } | null }
function Gatilhos({ perfil }: { perfil: Perfil }) {
  const { data, error, isLoading, mutate } = useRecurso<Gatilho[]>("/api/radar", perfil);
  const a = useAcao(perfil);
  return <><Cabecalho titulo="Gatilhos" subtitulo="Oportunidades avaliadas pela segmentação deste sistema." acoes={gerir(perfil) && <Botao disabled={a.ocupado} onClick={() => void a.executar("/api/radar/sincronizar", "POST")}>Sincronizar</Botao>} />{a.aviso}<Estado erro={error} carregando={isLoading} tentar={mutate} /><Card>{data?.length ? <ul className="divide-y divide-slate-100">{data.map(g => <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold text-navy">{g.empresa.nome} <Badge>{FONTE_ROTULO[g.tipo] ?? g.tipo}</Badge></p><p className="mt-1 text-sm text-slate-500">{g.resumo}</p><p className="mt-1 text-xs text-slate-400">{g.status.replaceAll("_", " ")}</p></div>{g.lead && ["APTO", "RECICLADO"].includes(g.lead.estagio) && <Botao variante="secundario" disabled={a.ocupado} onClick={() => void a.executar(`/api/radar/${g.id}/fila`, "POST", {})}>Adicionar à fila</Botao>}</li>)}</ul> : !isLoading && !error && <Vazio texto="Configure a segmentação antes de buscar oportunidades para este sistema." />}</Card></>;
}

interface Mensagem { id: string; assunto: string | null; conteudo: string; canal: string; lead: { empresa: string } }
function Abordagens({ perfil }: { perfil: Perfil }) {
  const { data, error, isLoading, mutate } = useRecurso<Mensagem[]>("/api/abordagens/fila", perfil);
  const a = useAcao(perfil);
  return <><Cabecalho titulo="Abordagens" subtitulo="Mensagens deste sistema aguardando sua aprovação." />{a.aviso}<Estado erro={error} carregando={isLoading} tentar={mutate} /><div className="space-y-4">{data?.map(m => <Card key={m.id}><CardTitulo titulo={m.lead.empresa} subtitulo={m.assunto ?? m.canal} /><p className="mb-5 whitespace-pre-wrap text-sm leading-6 text-slate-600">{m.conteudo}</p><div className="flex gap-3"><Botao disabled={a.ocupado} onClick={() => void a.executar(`/api/mensagens/${m.id}/aprovar`, "POST")}>Aprovar</Botao><Botao variante="perigo" disabled={a.ocupado} onClick={() => void a.executar(`/api/mensagens/${m.id}/rejeitar`, "POST")}>Rejeitar</Botao></div></Card>)}{data && !data.length && <Card><Vazio texto="Nenhuma mensagem aguardando aprovação neste sistema." /></Card>}</div></>;
}

interface Reuniao { id: string; inicio: string; fim: string; status: string; briefing: string; vendedor: string | null; lead: { empresa: string } }
function Reunioes({ perfil }: { perfil: Perfil }) {
  const { data, error, isLoading, mutate } = useRecurso<Reuniao[]>("/api/reunioes", perfil);
  const leads = useRecurso<Lead[]>("/api/leads", perfil);
  const a = useAcao(perfil);
  const [form, setForm] = useState(false);
  async function agendar(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); if (await a.executar(`/api/leads/${f.get("lead")}/reunioes`, "POST", { inicio: new Date(String(f.get("inicio"))).toISOString(), duracaoMin: Number(f.get("duracao")) })) setForm(false); }
  return <><Cabecalho titulo="Reuniões" subtitulo="Agenda e briefings deste sistema." acoes={<Botao onClick={() => setForm(!form)}><Plus className="h-4 w-4" /> Agendar</Botao>} />{a.aviso}<Estado erro={error} carregando={isLoading} tentar={mutate} />{form && <Card className="mb-6"><form onSubmit={agendar} className="grid gap-4 md:grid-cols-4"><label className="text-sm">Lead<select name="lead" className={campo} required><option value="">Selecione</option>{leads.data?.filter(l => ["ENGAJADO", "QUALIFICANDO"].includes(l.estagio)).map(l => <option value={l.id} key={l.id}>{l.empresa.nome}</option>)}</select></label><label className="text-sm">Início (horário local)<input name="inicio" type="datetime-local" className={campo} required /></label><label className="text-sm">Duração em minutos<input name="duracao" type="number" min={15} max={240} defaultValue={45} className={campo} required /></label><Botao disabled={a.ocupado} type="submit" className="self-end">Agendar reunião</Botao><p className="text-xs text-slate-500 md:col-span-4">O lead deve estar engajado ou em qualificação, com necessidade, momento e encaixe confirmados.</p></form></Card>}<div className="space-y-4">{data?.map(r => <Card key={r.id}><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-navy">{r.lead.empresa}</h2><p className="mt-1 text-sm text-slate-500">{new Date(r.inicio).toLocaleString("pt-BR")} · {r.vendedor ?? "Sem responsável"}</p></div><Badge>{r.status}</Badge></div><details className="mt-4 text-sm text-slate-600"><summary className="cursor-pointer text-acento">Ver briefing</summary><p className="mt-3 whitespace-pre-wrap leading-6">{r.briefing}</p></details>{r.status === "AGENDADA" && <div className="mt-4 flex flex-wrap gap-2">{["REALIZADA", "CANCELADA", "NO_SHOW"].map(s => <Botao variante="secundario" key={s} disabled={a.ocupado} onClick={() => void a.executar(`/api/reunioes/${r.id}`, "PATCH", { status: s })}>{s === "NO_SHOW" ? "Não compareceu" : s === "REALIZADA" ? "Marcar realizada" : "Cancelar"}</Botao>)}</div>}</Card>)}{data && !data.length && <Card><Vazio texto="Nenhuma reunião agendada neste sistema." /></Card>}</div></>;
}

interface Usuario { id: string; nome: string; email: string; papel: Perfil["papel"]; ativo: boolean }
interface Config { cliente: { nome: string; plano: string; vozMarca: string; assinaturaEmail: string | null; modoOperacao: string; calendarioProvedor: string | null; calendarioConectado: boolean }; usuarios: Usuario[] }
function Configuracoes({ perfil }: { perfil: Perfil }) {
  const { data, error, isLoading, mutate } = useRecurso<Config>("/api/configuracoes", perfil);
  const a = useAcao(perfil);
  const [form, setForm] = useState(false);
  async function criar(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); if (await a.executar("/api/usuarios", "POST", Object.fromEntries(f))) setForm(false); }
  async function salvar(e: FormEvent<HTMLFormElement>) { e.preventDefault(); if (!data) return; const f = new FormData(e.currentTarget); await a.executar("/api/configuracoes", "PUT", { ...data.cliente, vozMarca: f.get("vozMarca"), assinaturaEmail: f.get("assinaturaEmail") || null, modoOperacao: f.get("modoOperacao") }); }
  return <><Cabecalho titulo="Configurações" subtitulo={`Preferências e equipe de ${perfil.cliente.nome}.`} />{a.aviso}<Estado erro={error} carregando={isLoading} tentar={mutate} />{data && <div className="grid gap-6 lg:grid-cols-2"><Card><CardTitulo titulo="Preferências do sistema" /><form onSubmit={salvar} className="space-y-4"><label className="block text-sm">Voz da marca<select name="vozMarca" defaultValue={data.cliente.vozMarca} disabled={!gerir(perfil)} className={campo}><option value="consultivo">Consultivo</option><option value="direto">Direto</option><option value="proximo">Próximo</option></select></label><label className="block text-sm">Assinatura de e-mail<textarea name="assinaturaEmail" defaultValue={data.cliente.assinaturaEmail ?? ""} disabled={!gerir(perfil)} className={campo} rows={3} /></label><label className="block text-sm">Modo de operação<select name="modoOperacao" defaultValue={data.cliente.modoOperacao} disabled={!gerir(perfil)} className={campo}><option value="COPILOTO">Copiloto · requer aprovação</option><option value="AUTOPILOT">Autopilot · envio automático</option></select></label>{gerir(perfil) && <Botao disabled={a.ocupado} type="submit"><Save className="h-4 w-4" /> Salvar</Botao>}</form></Card><Card><CardTitulo titulo="Equipe do sistema" extra={gerir(perfil) && <Botao variante="secundario" onClick={() => setForm(!form)}><Plus className="h-4 w-4" /> Usuário</Botao>} />{form && <form onSubmit={criar} className="mb-5 space-y-3 rounded-xl bg-slate-50 p-4"><label className="block text-sm">Nome<input name="nome" className={campo} minLength={2} maxLength={120} required /></label><label className="block text-sm">E-mail<input name="email" type="email" className={campo} required /></label><CampoSenha autoComplete="new-password" minLength={12} /><label className="block text-sm">Papel<select name="papel" className={campo}><option value="VENDEDOR">Vendedor</option><option value="ATENDENTE">Atendente</option><option value="GESTOR">Gestor do sistema</option></select></label><p className="text-xs text-slate-500">Senha de 12 a 72 caracteres. Este usuário acessará somente este sistema.</p><Botao disabled={a.ocupado}>Criar usuário</Botao></form>}<ul className="divide-y divide-slate-100">{data.usuarios.map(u => <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium text-navy">{u.nome}</p><p className="break-all text-xs text-slate-500">{u.email}</p><Badge tom={u.ativo ? "azul" : "cinza"}>{ROTULO_PAPEL[u.papel]}{!u.ativo && " · Inativo"}</Badge></div>{gerir(perfil) && u.id !== perfil.id && u.papel !== "ADMIN" && <div className="flex flex-wrap gap-2"><select aria-label={`Papel de ${u.nome}`} value={u.papel} disabled={a.ocupado} className="rounded border border-slate-200 p-1 text-xs" onChange={e => void a.executar(`/api/usuarios/${u.id}`, "PATCH", { papel: e.target.value })}><option value="GESTOR">Gestor</option><option value="VENDEDOR">Vendedor</option><option value="ATENDENTE">Atendente</option></select><Botao variante="secundario" disabled={a.ocupado} onClick={() => void a.executar(`/api/usuarios/${u.id}`, "PATCH", { ativo: !u.ativo })}>{u.ativo ? "Desativar" : "Reativar"}</Botao></div>}</li>)}</ul></Card></div>}</>;
}

interface Icp { icp: { cnaes: string[]; portes: string[]; cidadeBase: string; raioKm: number; idadeMinAnos: number; idadeMaxAnos: number; fontesAtivas: string[] }; cidades: string[]; catalogoCnae: { codigo: string; descricao: string }[] }
function Segmentacao({ perfil }: { perfil: Perfil }) {
  const { data, error, isLoading, mutate } = useRecurso<Icp>("/api/icp", perfil);
  const a = useAcao(perfil);
  async function salvar(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); await a.executar("/api/icp", "PUT", { cnaes: f.getAll("cnaes"), portes: f.getAll("portes"), cidadeBase: f.get("cidadeBase"), raioKm: Number(f.get("raioKm")), idadeMinAnos: Number(f.get("idadeMinAnos")), idadeMaxAnos: Number(f.get("idadeMaxAnos")), fontesAtivas: f.getAll("fontesAtivas") }); }
  return <><Cabecalho titulo="Filtro e Segmentação" subtitulo="Defina o perfil de cliente ideal deste sistema." />{a.aviso}<Estado erro={error} carregando={isLoading} tentar={mutate} />{data && <form onSubmit={salvar}><fieldset disabled={!gerir(perfil) || a.ocupado} className="grid gap-6 lg:grid-cols-2"><Card><CardTitulo titulo="CNAEs aceitos" />{data.catalogoCnae.map(c => <label key={c.codigo} className="flex items-center gap-2 py-2 text-sm"><input type="checkbox" name="cnaes" value={c.codigo} defaultChecked={data.icp.cnaes.includes(c.codigo)} />{c.codigo} · {c.descricao}</label>)}</Card><Card><CardTitulo titulo="Porte e fontes" />{["MICRO EMPRESA", "EMPRESA DE PEQUENO PORTE", "DEMAIS"].map(p => <label key={p} className="flex items-center gap-2 py-2 text-sm"><input type="checkbox" name="portes" value={p} defaultChecked={data.icp.portes.includes(p)} />{p}</label>)}<div className="mt-4 border-t border-slate-100 pt-3">{["CNO", "PNCP", "CNPJ_NOVO"].map(p => <label key={p} className="flex items-center gap-2 py-2 text-sm"><input type="checkbox" name="fontesAtivas" value={p} defaultChecked={data.icp.fontesAtivas.includes(p)} />{FONTE_ROTULO[p]}</label>)}</div></Card><Card><CardTitulo titulo="Região e idade" /><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Cidade-base<select className={campo} name="cidadeBase" required defaultValue={data.icp.cidadeBase}><option value="">Selecione</option>{data.cidades.map(c => <option key={c} value={c}>{c}</option>)}</select></label><label className="text-sm">Raio (km)<input className={campo} name="raioKm" type="number" min={1} max={500} defaultValue={data.icp.raioKm} required /></label><label className="text-sm">Idade mínima (anos)<input className={campo} name="idadeMinAnos" type="number" min={0} defaultValue={data.icp.idadeMinAnos} required /></label><label className="text-sm">Idade máxima (anos)<input className={campo} name="idadeMaxAnos" type="number" min={0} defaultValue={data.icp.idadeMaxAnos} required /></label></div></Card>{gerir(perfil) && <div className="self-end"><Botao type="submit"><Save className="h-4 w-4" /> Salvar e reprocessar</Botao></div>}</fieldset></form>}</>;
}

interface Cadencia { modoOperacao: string; condicoesParada: string[]; passos: { dia: number; canal: string; titulo: string }[] }
function Automacao({ perfil }: { perfil: Perfil }) {
  const { data, error, isLoading, mutate } = useRecurso<Cadencia>("/api/cadencia", perfil);
  const a = useAcao(perfil);
  const [passos, setPassos] = useState<Cadencia["passos"] | null>(null);
  const lista = passos ?? data?.passos ?? [];
  async function salvar(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); await a.executar("/api/cadencia", "PUT", { passos: lista, modoOperacao: f.get("modoOperacao"), condicoesParada: f.getAll("parada") }); }
  return <><Cabecalho titulo="Automação" subtitulo="Cadência de contato exclusiva deste sistema." />{a.aviso}<Estado erro={error} carregando={isLoading} tentar={mutate} />{data && <form onSubmit={salvar}><fieldset disabled={!gerir(perfil) || a.ocupado} className="space-y-6"><Card><CardTitulo titulo="Passos da cadência" extra={gerir(perfil) && <Botao type="button" variante="secundario" onClick={() => setPassos([...lista, { dia: lista.length ? Math.min(60, lista[lista.length - 1].dia + 2) : 0, canal: "EMAIL", titulo: "" }])}><Plus className="h-4 w-4" /> Passo</Botao>} />{!lista.length && <Vazio texto="Nenhum passo configurado. Adicione o primeiro contato da sua cadência." />}{lista.map((p, i) => <div key={i} className="mb-3 grid items-end gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-[80px_140px_1fr_auto]"><label className="text-xs">Dia<input className={campo} type="number" min={0} max={60} required value={p.dia} onChange={e => setPassos(lista.map((v, j) => j === i ? { ...v, dia: Number(e.target.value) } : v))} /></label><label className="text-xs">Canal<select className={campo} value={p.canal} onChange={e => setPassos(lista.map((v, j) => j === i ? { ...v, canal: e.target.value } : v))}><option value="EMAIL">E-mail</option><option value="WHATSAPP">WhatsApp</option></select></label><label className="text-xs">Descrição<input className={campo} required value={p.titulo} onChange={e => setPassos(lista.map((v, j) => j === i ? { ...v, titulo: e.target.value } : v))} /></label>{gerir(perfil) && <button type="button" className="p-2 text-xs text-red-600" onClick={() => setPassos(lista.filter((_, j) => j !== i))}>Remover</button>}</div>)}</Card><Card><CardTitulo titulo="Operação e condições de parada" /><select name="modoOperacao" defaultValue={data.modoOperacao} className={`${campo} mb-4`}><option value="COPILOTO">Copiloto · requer aprovação</option><option value="AUTOPILOT">Autopilot · envio automático</option></select>{[{ id: "RESPONDEU", nome: "Lead respondeu" }, { id: "OPT_OUT", nome: "Contato pediu remoção" }, { id: "REUNIAO_MARCADA", nome: "Reunião marcada" }].map(p => <label key={p.id} className="flex items-center gap-2 py-2 text-sm"><input type="checkbox" name="parada" value={p.id} defaultChecked={data.condicoesParada.includes(p.id)} />{p.nome}</label>)}</Card>{gerir(perfil) && <Botao disabled={!lista.length} type="submit"><Save className="h-4 w-4" /> Salvar cadência</Botao>}</fieldset></form>}</>;
}
