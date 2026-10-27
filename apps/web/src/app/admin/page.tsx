"use client";
import { useEffect, useState, type FormEvent } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Building2, ChevronDown, Clock3, Monitor, Pencil, Plus, Search, ShieldCheck, Trash2, Users } from "lucide-react";
import { Badge, Botao, Cabecalho, Card, Metrica } from "@/components/ui";
import { CampoSenha } from "@/components/CampoSenha";
import { Modal } from "@/components/Modal";
import { CHAVE_NOTIFICACOES_ADMIN } from "@/components/NotificacoesAdmin";
import { enviar, lerJson } from "@/lib/api";
import { ROTULO_PAPEL, type Perfil } from "@/lib/perfil";

interface Usuario { id: string; nome: string; email: string; telefone: string | null; papel: Perfil["papel"]; ativo: boolean }
interface Sistema { id: string; nome: string; plano: string; ativo: boolean; usuarios: Usuario[] }
interface Cliente { id: string; nome: string; documento: string | null; emailContato: string | null; telefone: string | null; sistemas: Sistema[] }
interface Dados { clientes: Cliente[]; metricas: { clientes: number; sistemasVendidos: number; sistemasAtivos: number; usuariosAtivos: number } }
type Dialogo = { tipo: "cliente" } | { tipo: "sistema"; cliente: Cliente } | { tipo: "excluir"; cliente: Cliente }
  | { tipo: "editar-cliente"; cliente: Cliente } | { tipo: "editar-sistema"; sistema: Sistema } | { tipo: "editar-usuario"; usuario: Usuario };
const campo = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-acento focus:ring-2 focus:ring-blue-100";

export default function AdminPage() {
  const { data, error, isLoading, mutate } = useSWR<Dados>("/api/admin/clientes", lerJson);
  const { mutate: atualizar } = useSWRConfig();
  const [busca, setBusca] = useState("");
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [exclusao, setExclusao] = useState<{ token: string; liberarEm: number } | null>(null);
  const [restante, setRestante] = useState(0);
  const [abertos, setAbertos] = useState<string[]>([]);

  useEffect(() => {
    if (!exclusao) return;
    const contar = () => setRestante(Math.max(0, Math.ceil((exclusao.liberarEm - Date.now()) / 1000)));
    contar(); const timer = window.setInterval(contar, 200);
    return () => window.clearInterval(timer);
  }, [exclusao]);

  function abrir(d: Dialogo) { setDialogo(d); setErro(""); setSucesso(""); setConfirmacao(""); setExclusao(null); }
  function fechar() {
    if (salvando) return;
    if (dialogo?.tipo === "excluir" && exclusao) void enviar(`/api/admin/clientes/${dialogo.cliente.id}/confirmar-exclusao`, "DELETE").catch(() => null);
    setDialogo(null); setExclusao(null); setErro("");
  }
  async function atualizarDados() { await Promise.all([mutate(), atualizar(CHAVE_NOTIFICACOES_ADMIN)]); }

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!dialogo || salvando) return;
    const f = new FormData(e.currentTarget);
    setSalvando(true); setErro("");
    try {
      if (dialogo.tipo === "excluir") {
        if (!exclusao) {
          const resultado = await enviar<{ token: string; aguardarMs: number }>(`/api/admin/clientes/${dialogo.cliente.id}/confirmar-exclusao`, "POST", { confirmacao });
          setRestante(Math.ceil(resultado.aguardarMs / 1000));
          setExclusao({ token: resultado.token, liberarEm: Date.now() + resultado.aguardarMs });
          return;
        }
        if (restante > 0) return;
        await enviar(`/api/admin/clientes/${dialogo.cliente.id}`, "DELETE", { confirmacao, token: exclusao.token });
      } else if (dialogo.tipo === "editar-cliente") {
        await enviar(`/api/admin/clientes/${dialogo.cliente.id}`, "PUT", { nome: f.get("nome"), emailContato: f.get("emailContato") || null, telefone: f.get("telefone") || null });
      } else if (dialogo.tipo === "editar-sistema") {
        await enviar(`/api/admin/sistemas/${dialogo.sistema.id}`, "PUT", { nome: f.get("nome"), plano: f.get("plano") });
      } else if (dialogo.tipo === "editar-usuario") {
        const senha = String(f.get("senha") ?? "");
        await enviar(`/api/admin/usuarios/${dialogo.usuario.id}`, "PUT", { nome: f.get("nome"), email: f.get("email"), telefone: f.get("telefone") || null, ...(senha ? { senha } : {}) });
      } else {
        const sistema = { nome: f.get("sistema"), plano: f.get("plano"), responsavel: f.get("responsavel"), email: f.get("email"), senha: f.get("senha") };
        if (dialogo.tipo === "cliente") await enviar("/api/admin/clientes", "POST", { nome: f.get("cliente"), documento: f.get("documento") || undefined, sistema });
        else await enviar(`/api/admin/clientes/${dialogo.cliente.id}/sistemas`, "POST", sistema);
      }
      setSucesso(dialogo.tipo === "excluir" ? "Cliente excluído. Todos os acessos foram encerrados." : dialogo.tipo.startsWith("editar-") ? "Dados básicos atualizados. Alterações de e-mail ou senha encerram os acessos anteriores do usuário." : "Cadastro criado. O responsável já pode entrar com o e-mail e a senha definidos.");
      setDialogo(null); setExclusao(null); await atualizarDados();
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { setSalvando(false); }
  }

  async function alternar(s: Sistema) {
    setSalvando(true); setErro(""); setSucesso("");
    try { await enviar(`/api/admin/sistemas/${s.id}`, "PATCH", { ativo: !s.ativo }); await atualizarDados(); setSucesso(s.ativo ? "Sistema suspenso e sessões encerradas." : "Sistema reativado."); }
    catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível alterar o sistema."); }
    finally { setSalvando(false); }
  }
  const clientes = (data?.clientes ?? []).filter(c => `${c.nome} ${c.emailContato ?? ""} ${c.documento ?? ""} ${c.sistemas.map(s => `${s.nome} ${s.usuarios.map(u => u.email).join(" ")}`).join(" ")}`.toLowerCase().includes(busca.toLowerCase()));
  const titulo = !dialogo ? "" : dialogo.tipo === "cliente" ? "Novo cliente" : dialogo.tipo === "sistema" ? `Novo sistema · ${dialogo.cliente.nome}` : dialogo.tipo === "excluir" ? exclusao ? "Tem certeza?" : "Excluir cliente" : dialogo.tipo === "editar-cliente" ? "Editar cliente" : dialogo.tipo === "editar-sistema" ? "Editar sistema" : "Editar usuário";

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
      <div className="space-y-3">{clientes.map(c => {
        const aberto = abertos.includes(c.id);
        const usuarios = c.sistemas.reduce((n, s) => n + s.usuarios.length, 0);
        return <section key={c.id} className="overflow-hidden rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 p-4">
            <button className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={aberto} onClick={() => setAbertos(aberto ? abertos.filter(id => id !== c.id) : [...abertos, c.id])}><span className="rounded-xl bg-white p-3 text-acento"><Building2 className="h-5 w-5" /></span><span className="min-w-0"><span className="block break-words font-semibold text-navy">{c.nome}</span><span className="text-xs text-slate-500">{c.sistemas.length} {c.sistemas.length === 1 ? "sistema" : "sistemas"} · {usuarios} {usuarios === 1 ? "usuário" : "usuários"}</span></span><ChevronDown className={`ml-2 h-4 w-4 shrink-0 text-slate-400 transition ${aberto ? "rotate-180" : ""}`} /></button>
            <div className="flex items-center gap-2"><button aria-label={`Editar ${c.nome}`} title="Editar cliente" className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-acento" onClick={() => abrir({ tipo: "editar-cliente", cliente: c })}><Pencil className="h-4 w-4" /></button><Botao variante="secundario" onClick={() => abrir({ tipo: "sistema", cliente: c })}><Plus className="h-4 w-4" /> Sistema</Botao><button aria-label={`Excluir ${c.nome}`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => abrir({ tipo: "excluir", cliente: c })}><Trash2 className="h-4 w-4" /></button></div>
          </div>
          {aberto && <div className="space-y-4 p-4">{(c.emailContato || c.telefone) && <p className="break-words text-xs text-slate-500">Contato: {c.emailContato} {c.telefone}</p>}{c.sistemas.map(s => <div key={s.id} className="rounded-xl border border-slate-100 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="flex flex-wrap items-center gap-2 font-semibold text-navy"><Monitor className="h-4 w-4 text-acento" />{s.nome}<Badge tom={s.ativo ? "verde" : "amarelo"}>{s.ativo ? "Ativo" : "Suspenso"}</Badge></h3><p className="mt-1 text-xs text-slate-400">Plano: {s.plano}</p></div><div className="flex flex-wrap gap-2"><Botao variante="secundario" onClick={() => abrir({ tipo: "editar-sistema", sistema: s })}><Pencil className="h-3.5 w-3.5" />Editar</Botao><Botao disabled={salvando} variante="secundario" onClick={() => void alternar(s)}>{s.ativo ? "Suspender acesso" : "Reativar acesso"}</Botao></div></div>
            <ul className="divide-y divide-slate-100">{s.usuarios.map(u => <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><p className="font-medium text-navy">{u.nome}</p><p className="break-all text-xs text-slate-500">{u.email}</p>{u.telefone && <p className="text-xs text-slate-400">{u.telefone}</p>}</div><div className="flex items-center gap-2"><Badge tom={u.ativo ? "azul" : "cinza"}>{ROTULO_PAPEL[u.papel]}{!u.ativo ? " · Inativo" : ""}</Badge><button aria-label={`Editar usuário ${u.nome}`} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-acento" onClick={() => abrir({ tipo: "editar-usuario", usuario: u })}><Pencil className="h-4 w-4" /></button></div></li>)}</ul>
            <p className="mt-3 text-xs text-slate-400">O gestor cadastra vendedores e atendentes em Configurações, dentro deste sistema.</p>
          </div>)}</div>}
        </section>;
      })}</div>
    </Card>
    {dialogo && <Modal titulo={titulo} ocupado={salvando} fechar={fechar}><form onSubmit={salvar} className="space-y-4">
      <fieldset disabled={salvando} className="space-y-4">
        {dialogo.tipo === "excluir" ? <>
          <p className="text-sm leading-6 text-slate-600">A exclusão de <b>{dialogo.cliente.nome}</b> encerrará o acesso de todos os seus sistemas e usuários. O histórico será preservado para suporte.</p>
          {!exclusao ? <label className="block text-sm font-medium">Digite o nome do cliente para confirmar<input className={campo} value={confirmacao} onChange={e => setConfirmacao(e.target.value)} required autoComplete="off" /></label> : <div className="rounded-xl border border-red-100 bg-red-50 p-4"><p className="text-sm font-medium text-red-700">Tem certeza de que deseja excluir este cliente e encerrar todos os acessos?</p><p aria-live="polite" className="mt-3 flex items-center gap-2 text-xs text-red-600"><Clock3 className="h-4 w-4" />{restante > 0 ? `Aguarde ${restante} ${restante === 1 ? "segundo" : "segundos"} para confirmar.` : "Você já pode confirmar ou cancelar a exclusão."}</p></div>}
        </> : dialogo.tipo === "editar-cliente" ? <>
          <p className="text-xs leading-5 text-slate-500">Edite o cadastro comercial básico. Documentos e dados operacionais dos sistemas não serão alterados.</p>
          <label className="block text-sm font-medium">Nome do cliente<input name="nome" defaultValue={dialogo.cliente.nome} className={campo} minLength={2} maxLength={120} required /></label>
          <label className="block text-sm font-medium">E-mail de contato<input name="emailContato" type="email" defaultValue={dialogo.cliente.emailContato ?? ""} className={campo} maxLength={254} /></label>
          <label className="block text-sm font-medium">Telefone de contato<input name="telefone" type="tel" defaultValue={dialogo.cliente.telefone ?? ""} className={campo} maxLength={30} /></label>
        </> : dialogo.tipo === "editar-sistema" ? <>
          <label className="block text-sm font-medium">Nome do sistema<input name="nome" defaultValue={dialogo.sistema.nome} className={campo} required minLength={2} maxLength={120} /></label>
          <label className="block text-sm font-medium">Plano<input name="plano" defaultValue={dialogo.sistema.plano} className={campo} required maxLength={60} /></label>
          <p className="text-xs leading-5 text-slate-500">Esta alteração se limita ao cadastro do sistema. Leads, vendas, documentos e demais registros permanecem preservados.</p>
        </> : dialogo.tipo === "editar-usuario" ? <>
          <label className="block text-sm font-medium">Nome<input name="nome" defaultValue={dialogo.usuario.nome} className={campo} required minLength={2} maxLength={120} /></label>
          <label className="block text-sm font-medium">E-mail de acesso<input name="email" type="email" defaultValue={dialogo.usuario.email} className={campo} required maxLength={254} autoComplete="off" /></label>
          <label className="block text-sm font-medium">Telefone<input name="telefone" type="tel" defaultValue={dialogo.usuario.telefone ?? ""} className={campo} maxLength={30} /></label>
          <CampoSenha autoComplete="new-password" rotulo="Nova senha (opcional)" placeholder="Deixe em branco para manter a atual" required={false} minLength={12} />
          <p className="text-xs leading-5 text-slate-500">Senha de 12 a 72 caracteres. Alterar o e-mail ou a senha encerra as sessões e invalida os links de recuperação anteriores deste usuário.</p>
        </> : <>
          {dialogo.tipo === "cliente" && <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Nome do cliente<input name="cliente" className={campo} required minLength={2} maxLength={120} /></label><label className="text-sm font-medium">CPF/CNPJ (opcional)<input name="documento" className={campo} maxLength={40} /></label></div>}
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Nome do sistema<input name="sistema" className={campo} required minLength={2} maxLength={120} /></label><label className="text-sm font-medium">Plano<input name="plano" className={campo} defaultValue="piloto" required maxLength={60} /></label></div>
          <div className="border-t border-slate-100 pt-4"><h3 className="font-semibold text-navy">Acesso do responsável</h3><p className="mt-1 text-xs leading-5 text-slate-500">Será gestor deste sistema e poderá cadastrar a própria equipe. Use um e-mail diferente para cada acesso.</p></div>
          <label className="block text-sm font-medium">Nome do responsável<input name="responsavel" className={campo} required minLength={2} maxLength={120} /></label><label className="block text-sm font-medium">E-mail<input name="email" type="email" autoComplete="off" className={campo} required /></label><CampoSenha autoComplete="new-password" minLength={12} /><p className="text-xs text-slate-400">Defina uma senha com 12 a 72 caracteres e compartilhe com o responsável.</p>
        </>}
      </fieldset>
      {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4"><Botao type="button" variante="secundario" disabled={salvando} onClick={fechar}>Cancelar</Botao><Botao type="submit" variante={dialogo.tipo === "excluir" ? "perigo" : "primario"} disabled={salvando || (dialogo.tipo === "excluir" && (confirmacao !== dialogo.cliente.nome || (!!exclusao && restante > 0)))}>{salvando ? "Aguarde…" : dialogo.tipo === "excluir" ? exclusao ? restante > 0 ? `Tem certeza? (${restante}s)` : "Sim, tenho certeza. Excluir" : "Excluir cliente" : dialogo.tipo.startsWith("editar-") ? "Salvar alterações" : "Criar cadastro"}</Botao></div>
    </form></Modal>}
  </>;
}
