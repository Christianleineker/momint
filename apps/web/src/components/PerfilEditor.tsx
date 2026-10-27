"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import { Save, ShieldCheck, UserRound } from "lucide-react";
import { Botao, Card, CardTitulo } from "./ui";
import { CampoSenha } from "./CampoSenha";
import { enviar, lerJson } from "@/lib/api";
import { ROTULO_PAPEL, type Perfil } from "@/lib/perfil";
import { SegurancaEmail } from "./AcessoInicial";

const campo = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-acento focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500";

export function PerfilEditor({ perfil }: { perfil: Perfil }) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { data: atualizado } = useSWR<Perfil>("/api/auth/me", lerJson, { fallbackData: perfil });
  const [email, setEmail] = useState(perfil.email);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const credenciaisAlteradas = email.trim().toLowerCase() !== atualizado?.email || !!novaSenha;

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro(""); setSucesso("");
    if (novaSenha !== confirmarSenha) { setErro("A confirmação da nova senha não confere."); return; }
    const f = new FormData(e.currentTarget);
    setSalvando(true);
    try {
      const dados = await enviar<Perfil>("/api/auth/perfil", "PATCH", {
        nome: f.get("nome"), telefone: f.get("telefone") || null, email,
        ...(senhaAtual ? { senhaAtual } : {}), ...(novaSenha ? { novaSenha } : {}),
      });
      await mutate("/api/auth/me", dados, false);
      setEmail(dados.email); setNovaSenha(""); setConfirmarSenha(""); setSenhaAtual("");
      setSucesso(credenciaisAlteradas ? "Perfil atualizado. Os outros acessos à sua conta foram encerrados; você continua conectado aqui." : "Informações de perfil atualizadas.");
      router.refresh();
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível salvar seu perfil."); }
    finally { setSalvando(false); }
  }

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]"><Card>
    <CardTitulo icone={UserRound} titulo="Informações de perfil" subtitulo="Atualize seus dados pessoais e de acesso." />
    <form onSubmit={salvar} className="space-y-5">
      <fieldset disabled={salvando} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Nome<input name="nome" className={campo} defaultValue={atualizado?.nome} required minLength={2} maxLength={120} autoComplete="name" /></label><label className="block text-sm font-medium">Telefone (opcional)<input name="telefone" type="tel" className={campo} defaultValue={atualizado?.telefone ?? ""} maxLength={30} autoComplete="tel" /></label></div>
        <label className="block text-sm font-medium">E-mail<input name="email" type="email" className={campo} value={email} onChange={e => setEmail(e.target.value)} required disabled={perfil.papel === "ADMIN" || atualizado?.doisFatoresEmail} autoComplete="email" maxLength={254} /></label>
        {atualizado?.doisFatoresEmail && perfil.papel !== "ADMIN" && <p className="text-xs text-slate-500">Desative a verificação em duas etapas antes de mudar o e-mail e ative-a novamente no novo endereço.</p>}
        {perfil.papel === "ADMIN" && <p className="text-xs text-slate-500">O e-mail do administrador geral permanece fixo em jadiframe@gmail.com.</p>}
        <div className="border-t border-slate-100 pt-5"><h3 className="mb-1 font-semibold text-navy">Alterar senha</h3><p className="mb-4 text-xs leading-5 text-slate-500">Deixe os campos de nova senha em branco para manter a senha atual. Use de 12 a 72 caracteres.</p><div className="grid gap-4 sm:grid-cols-2"><CampoSenha nome="novaSenha" rotulo="Nova senha" autoComplete="new-password" required={false} minLength={12} value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Opcional" /><CampoSenha nome="confirmarSenha" rotulo="Confirmar nova senha" autoComplete="new-password" required={!!novaSenha} minLength={12} value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} placeholder="Repita a nova senha" /></div></div>
        <CampoSenha nome="senhaAtual" rotulo="Senha atual" required={credenciaisAlteradas} value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} placeholder="Obrigatória para alterar e-mail ou senha" />
        {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
        {sucesso && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{sucesso}</p>}
        <Botao type="submit"><Save className="h-4 w-4" />{salvando ? "Salvando…" : "Salvar perfil"}</Botao>
      </fieldset>
    </form>
    <div className="mt-6 border-t border-slate-100 pt-6"><SegurancaEmail perfil={atualizado ?? perfil} /></div>
  </Card><Card className="h-fit"><CardTitulo icone={ShieldCheck} titulo="Seu acesso" /><p className="text-sm font-medium text-navy">{ROTULO_PAPEL[perfil.papel]}</p><p className="mt-1 text-sm text-slate-500">{perfil.cliente.nome}</p><p className="mt-5 text-xs leading-6 text-slate-500">Você pode editar seus dados básicos. Permissões de acesso, documentos, vendas e demais registros operacionais não são alterados por este formulário.</p></Card></div>;
}
