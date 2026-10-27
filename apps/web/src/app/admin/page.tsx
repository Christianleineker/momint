"use client";
import { useState, type FormEvent } from "react";
import useSWR from "swr";
import { Building2, ChevronDown, Monitor, Plus, Search, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { Badge, Botao, Cabecalho, Card, Metrica } from "@/components/ui";
import { CampoSenha } from "@/components/CampoSenha";
import { enviar, lerJson } from "@/lib/api";
import { ROTULO_PAPEL, type Perfil } from "@/lib/perfil";

interface Usuario { id: string; nome: string; email: string; papel: Perfil["papel"]; ativo: boolean }
interface Sistema { id: string; nome: string; plano: string; ativo: boolean; usuarios: Usuario[] }
interface Cliente { id: string; nome: string; documento: string | null; sistemas: Sistema[] }
interface Dados { clientes: Cliente[]; metricas: { clientes: number; sistemasVendidos: number; sistemasAtivos: number; usuariosAtivos: number } }
type Dialogo = { tipo: "cliente" } | { tipo: "sistema"; cliente: Cliente } | { tipo: "excluir"; cliente: Cliente };
const campo = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-acento focus:ring-2 focus:ring-blue-100";

export default function AdminPage() {
  const { data, error, isLoading, mutate } = useSWR<Dados>("/api/admin/clientes", lerJson);
  const [busca, setBusca] = useState("");
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [abertos, setAbertos] = useState<string[]>([]);
  function abrir(d: Dialogo) { setDialogo(d); setErro(""); setSucesso(""); setConfirmacao(""); }
  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!dialogo) return;
    const f = new FormData(e.currentTarget);
    setSalvando(true); setErro("");
    try {
      if (dialogo.tipo === "excluir") await enviar(`/api/admin/clientes/${dialogo.cliente.id}`, "DELETE", { confirmacao });
      else {
        const sistema = { nome: f.get("sistema"), plano: f.get("plano"), responsavel: f.get("responsavel"), email: f.get("email"), senha: f.get("senha") };
        if (dialogo.tipo === "cliente") await enviar("/api/admin/clientes", "POST", { nome: f.get("cliente"), documento: f.get("documento") || undefined, sistema });
        else await enviar(`/api/admin/clientes/${dialogo.cliente.id}/sistemas`, "POST", sistema);
      }
      setSucesso(dialogo.tipo === "excluir" ? "Cliente excluído. Todos os acessos foram encerrados." : "Cadastro criado. O responsável já pode entrar com o e-mail e a senha definidos.");
      setDialogo(null); await mutate();
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível salvar."); } finally { setSalvando(false); }
  }
  async function alternar(s: Sistema) {
    setSalvando(true); setErro(""); setSucesso("");
    try { await enviar(`/api/admin/sistemas/${s.id}`, "PATCH", { ativo: !s.ativo }); await mutate(); setSucesso(s.ativo ? "Sistema suspenso e sessões encerradas." : "Sistema reativado."); }
    catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível alterar o sistema."); } finally { setSalvando(false); }
  }
  const clientes = (data?.clientes ?? []).filter(c => `${c.nome} ${c.documento ?? ""} ${c.sistemas.map(s => `${s.nome} ${s.usuarios.map(u => u.email).join(" ")}`).join(" ")}`.toLowerCase().includes(busca.toLowerCase()));
  return <>
    <Cabecalho titulo="Painel Admin" subtitulo="Clientes, sistemas e pessoas. Uma visão completa da sua plataforma." acoes={<Botao onClick={() => abrir({ tipo: "cliente" })}><Plus className="h-4 w-4" /> Novo cliente</Botao>} />
    <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metrica icone={Building2} rotulo="Clientes" valor={data ? String(data.metricas.clientes) : "—"} detalhe="Cadastros comerciais" />
      <Metrica icone={Monitor} rotulo="Sistemas vendidos" valor={data ? String(data.metricas.sistemasVendidos) : "—"} detalhe="Sistemas dos clientes cadastrados" tom="roxo" />
      <Metrica icone={ShieldCheck} rotulo="Sistemas ativos" valor={data ? String(data.metricas.sistemasAtivos) : "—"} detalhe="Com acesso liberado" tom="verde" />
      <Metrica icone={Users} rotulo="Usuários ativos" valor={data ? String(data.metricas.usuariosAtivos) : "—"} detalhe="Gestores, vendedores e atendentes" />
    </div>
    <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/70 px-5 py-4 text-sm leading-6 text-slate-600">Cada cliente pode ter vários sistemas. Cada sistema tem dados e equipe próprios. A demonstração fica fora destes indicadores. Sistemas vendidos considera os cadastros atuais, inclusive suspensos; clientes excluídos ficam fora dos totais.</div>
    {sucesso && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{sucesso}</p>}
    {(error || (erro && !dialogo)) && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro || "Não foi possível carregar os clientes."} <button className="underline" onClick={() => void mutate()}>Tentar novamente</button></div>}
    <Card>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-semibold text-navy">Seus clientes</h2><p className="mt-1 text-sm text-slate-500">Gerencie o acesso e acompanhe os sistemas de cada cliente.</p></div><label className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 sm:w-80"><Search className="h-4 w-4 text-slate-400" /><input aria-label="Buscar clientes" placeholder="Nome, documento, sistema ou e-mail" value={busca} onChange={e => setBusca(e.target.value)} className="min-w-0 flex-1 text-sm outline-none" /></label></div>
      {isLoading && <p className="py-10 text-center text-slate-500">Carregando clientes…</p>}
      {!isLoading && !error && !clientes.length && <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center"><Building2 className="mx-auto mb-3 h-9 w-9 text-slate-300" /><h3 className="font-semibold text-navy">{busca ? "Nenhum cliente encontrado" : "Tudo pronto para seu primeiro cliente"}</h3><p className="mt-2 text-sm text-slate-500">{busca ? "Experimente outra busca." : "Crie o cadastro e o primeiro sistema com acesso para o responsável."}</p></div>}
      <div className="space-y-3">{clientes.map(c => { const aberto = abertos.includes(c.id); return <section key={c.id} className="overflow-hidden rounded-xl border border-slate-200"><div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 p-4"><button className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={aberto} onClick={() => setAbertos(aberto ? abertos.filter(id => id !== c.id) : [...abertos, c.id])}><span className="rounded-xl bg-white p-3 text-acento"><Building2 className="h-5 w-5" /></span><span className="min-w-0"><span className="block break-words font-semibold text-navy">{c.nome}</span><span className="text-xs text-slate-500">{c.documento ? `${c.documento} · ` : ""}{c.sistemas.length} {c.sistemas.length === 1 ? "sistema" : "sistemas"} · {c.sistemas.reduce((n, s) => n + s.usuarios.length, 0)} {c.sistemas.reduce((n, s) => n + s.usuarios.length, 0) === 1 ? "usuário" : "usuários"}</span></span><ChevronDown className={`ml-2 h-4 w-4 shrink-0 text-slate-400 transition ${aberto ? "rotate-180" : ""}`} /></button><div className="flex items-center gap-2"><Botao variante="secundario" onClick={() => abrir({ tipo: "sistema", cliente: c })}><Plus className="h-4 w-4" /> Sistema</Botao><button aria-label={`Excluir ${c.nome}`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => abrir({ tipo: "excluir", cliente: c })}><Trash2 className="h-4 w-4" /></button></div></div>
        {aberto && <div className="space-y-4 p-4">{c.sistemas.map(s => <div key={s.id} className="rounded-xl border border-slate-100 p-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 font-semibold text-navy"><Monitor className="h-4 w-4 text-acento" />{s.nome} <Badge tom={s.ativo ? "verde" : "amarelo"}>{s.ativo ? "Ativo" : "Suspenso"}</Badge></h3><p className="mt-1 text-xs text-slate-400">Plano: {s.plano}</p></div><Botao disabled={salvando} variante="secundario" onClick={() => void alternar(s)}>{s.ativo ? "Suspender acesso" : "Reativar acesso"}</Botao></div><ul className="divide-y divide-slate-100">{s.usuarios.map(u => <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><p className="font-medium text-navy">{u.nome}</p><p className="break-all text-xs text-slate-500">{u.email}</p></div><Badge tom={u.ativo ? "azul" : "cinza"}>{ROTULO_PAPEL[u.papel]}{!u.ativo ? " · Inativo" : ""}</Badge></li>)}</ul><p className="mt-3 text-xs text-slate-400">O gestor cadastra vendedores e atendentes em Configurações, dentro deste sistema.</p></div>)}</div>}
      </section>; })}</div>
    </Card>
    {dialogo && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-navy/45 p-4" onKeyDown={e => { if (e.key === "Escape" && !salvando) setDialogo(null); }}><section role="dialog" aria-modal="true" aria-labelledby="dialogo-titulo" className="my-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"><div className="mb-5 flex items-center justify-between gap-3"><h2 id="dialogo-titulo" className="text-xl font-bold text-navy">{dialogo.tipo === "cliente" ? "Novo cliente" : dialogo.tipo === "sistema" ? `Novo sistema · ${dialogo.cliente.nome}` : "Excluir cliente"}</h2><button autoFocus aria-label="Fechar" disabled={salvando} onClick={() => setDialogo(null)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <form onSubmit={salvar} className="space-y-4">{dialogo.tipo === "excluir" ? <><p className="text-sm leading-6 text-slate-600">A exclusão de <b>{dialogo.cliente.nome}</b> encerrará o acesso de todos os seus sistemas e usuários. O histórico será preservado para suporte (exclusão lógica).</p><label className="block text-sm font-medium">Digite o nome do cliente para confirmar<input className={campo} value={confirmacao} onChange={e => setConfirmacao(e.target.value)} required /></label></> : <>
        {dialogo.tipo === "cliente" && <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Nome do cliente<input name="cliente" className={campo} required minLength={2} maxLength={120} /></label><label className="text-sm font-medium">CPF/CNPJ (opcional)<input name="documento" className={campo} maxLength={40} /></label></div>}
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Nome do sistema<input name="sistema" className={campo} required minLength={2} maxLength={120} /></label><label className="text-sm font-medium">Plano<input name="plano" className={campo} defaultValue="piloto" required maxLength={60} /></label></div>
        <div className="border-t border-slate-100 pt-4"><h3 className="font-semibold text-navy">Acesso do responsável</h3><p className="mt-1 text-xs leading-5 text-slate-500">Será gestor deste sistema e poderá cadastrar a própria equipe. Use um e-mail diferente para cada acesso.</p></div>
        <label className="block text-sm font-medium">Nome do responsável<input name="responsavel" className={campo} required minLength={2} maxLength={120} /></label><label className="block text-sm font-medium">E-mail<input name="email" type="email" autoComplete="off" className={campo} required /></label><CampoSenha autoComplete="new-password" minLength={12} /><p className="text-xs text-slate-400">Defina uma senha com 12 a 72 caracteres e compartilhe com o responsável.</p>
      </>}{erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}<div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><Botao type="button" variante="secundario" disabled={salvando} onClick={() => setDialogo(null)}>Cancelar</Botao><Botao type="submit" variante={dialogo.tipo === "excluir" ? "perigo" : "primario"} disabled={salvando || (dialogo.tipo === "excluir" && confirmacao !== dialogo.cliente.nome)}>{salvando ? "Salvando…" : dialogo.tipo === "excluir" ? "Excluir cliente e encerrar acessos" : "Criar cadastro"}</Botao></div></form>
    </section></div>}
  </>;
}
