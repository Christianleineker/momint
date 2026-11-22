"use client";
import { alerta } from "@/lib/alertas";
import { avisoSegurancaFechado, fecharAvisoSeguranca } from "@/lib/aviso-seguranca";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import { ChevronDown, Mail, ShieldCheck, X } from "lucide-react";
import { Botao } from "./ui";
import { CampoSenha } from "./CampoSenha";
import { enviar, lerJson } from "@/lib/api";
import type { Perfil } from "@/lib/perfil";

export function SegurancaEmail({ perfil }: { perfil: Perfil }) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [destino, setDestino] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [ocupado, setOcupado] = useState(false);
  async function solicitar(e: FormEvent) {
    e.preventDefault(); setOcupado(true);
    try { const d = await enviar<{ emailMascarado: string }>("/api/auth/2fa/solicitar", "POST", { ativar: !perfil.doisFatoresEmail, ...(senhaAtual ? { senhaAtual } : {}) }); setDestino(d.emailMascarado); setSenhaAtual(""); }
    catch (e) { alerta.falha(e, "Não foi possível enviar o código."); }
    finally { setOcupado(false); }
  }
  async function confirmar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const codigo = new FormData(e.currentTarget).get("codigo"); setOcupado(true);
    try { const d = await enviar<Perfil>("/api/auth/2fa/confirmar", "POST", { codigo }); await mutate("/api/auth/me", d, false); setDestino(""); alerta.sucesso(d.doisFatoresEmail ? "Verificação em duas etapas ativada." : "Verificação em duas etapas desativada."); router.refresh(); }
    catch (e) { alerta.falha(e, "Não foi possível confirmar o código."); }
    finally { setOcupado(false); }
  }
  return <section className="space-y-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-acento" /><div><h3 className="font-semibold text-navy">Verificação em duas etapas por e-mail</h3><p className="mt-1 text-xs leading-6 text-slate-500">{perfil.doisFatoresEmail ? "Ativa. Além da senha, seu login exige um código enviado ao seu e-mail." : "Opcional: proteja o login com um código de uso único enviado ao e-mail da sua conta."}</p></div></div>
    {perfil.primeiroAcessoPendente && perfil.papel !== "ADMIN" ? <p className="text-xs text-slate-500">Conclua primeiro a escolha da senha inicial no dashboard.</p> : destino ? <form onSubmit={confirmar} className="space-y-3 rounded-xl bg-blue-50 p-4"><p className="flex items-center gap-2 text-xs leading-5 text-slate-600"><Mail className="h-4 w-4 shrink-0" />Código enviado para {destino}. Válido por 5 minutos.</p><label className="block text-sm font-medium">Código de 6 dígitos<input name="codigo" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} minLength={6} required autoFocus className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-center text-xl tracking-[.4em] outline-none focus:border-acento" /></label><div className="flex flex-wrap gap-2"><Botao disabled={ocupado}>Confirmar código</Botao><Botao type="button" variante="secundario" disabled={ocupado} onClick={() => setDestino("")}>Cancelar</Botao></div></form> : <form onSubmit={solicitar} className="space-y-3">{perfil.doisFatoresEmail && <CampoSenha nome="senhaAtual2fa" rotulo="Senha atual para desativar" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} />}<Botao disabled={ocupado} variante={perfil.doisFatoresEmail ? "secundario" : "primario"}>{ocupado ? "Enviando…" : perfil.doisFatoresEmail ? "Desativar com confirmação por e-mail" : "Ativar verificação por e-mail"}</Botao></form>}
    
  </section>;
}

export function BoasVindas({ perfil }: { perfil: Perfil }) {
  const router = useRouter();
  const { data: u, mutate } = useSWR<Perfil>("/api/auth/me", lerJson, { fallbackData: perfil });
  const [minimizado, setMinimizado] = useState(false);
  const [fechado, setFechado] = useState<boolean | null>(null);
  useEffect(() => setFechado(avisoSegurancaFechado()), []);
  const [alterar, setAlterar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  if (!u || u.papel === "ADMIN" || (!u.primeiroAcessoPendente && (!u.oferta2faPendente || u.doisFatoresEmail))) return null;
  // Fechado no X: some até o próximo login. A escolha de senha inicial não pode ser fechada.
  if (fechado === null || (fechado && !u.primeiroAcessoPendente)) return null;
  async function escolher(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    if (alterar && f.get("novaSenha") !== f.get("confirmacao")) { alerta.erro("As novas senhas não conferem."); return; }
    setOcupado(true);
    try { const d = await enviar<Perfil>("/api/auth/primeiro-acesso", "POST", { manterSenha: !alterar, ...(alterar ? { senhaAtual: f.get("senhaAtual"), novaSenha: f.get("novaSenha") } : {}) }); await mutate(d, false); router.refresh(); alerta.sucesso(alterar ? "Nova senha definida com sucesso." : "Escolha salva. Você continua com a senha recebida."); }
    catch (e) { alerta.falha(e, "Não foi possível salvar a escolha."); }
    finally { setOcupado(false); }
  }
  return <aside aria-label="Boas-vindas e segurança" className="fixed bottom-4 left-20 z-40 w-[min(390px,calc(100%-6rem))] overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl md:peer-data-[recolhido=false]:left-[272px]"><div className="flex items-center bg-navy text-white"><button type="button" aria-expanded={!minimizado} onClick={() => setMinimizado(!minimizado)} className="flex min-w-0 flex-1 items-center justify-between gap-3 py-4 pl-5 pr-2 text-left"><span className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-5 w-5 text-sky-300" />{u.primeiroAcessoPendente ? "Bem-vindo ao seu sistema" : "Proteja o acesso à sua conta"}</span><ChevronDown className={`h-4 w-4 transition ${minimizado ? "" : "rotate-180"}`} /></button>{!u.primeiroAcessoPendente && <button type="button" aria-label="Fechar até o próximo login" title="Fechar até o próximo login" onClick={() => { fecharAvisoSeguranca(); setFechado(true); }} className="mr-3 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"><X aria-hidden="true" className="h-4 w-4" /></button>}</div>
    {!minimizado && <div className="max-h-[75dvh] space-y-4 overflow-y-auto p-5">{u.primeiroAcessoPendente ? <form onSubmit={escolher} className="space-y-4"><div><h2 className="font-semibold text-navy">Como deseja continuar?</h2><p className="mt-2 text-sm leading-6 text-slate-500">Você pode manter a senha recebida ou escolher uma senha pessoal. Seu dashboard já está disponível.</p></div><div className="space-y-2"><label className={`flex gap-2 rounded-xl border p-3 text-sm ${!alterar ? "border-blue-300 bg-blue-50" : "border-slate-200"}`}><input type="radio" name="escolha" checked={!alterar} onChange={() => setAlterar(false)} />Manter a senha recebida</label><label className={`flex gap-2 rounded-xl border p-3 text-sm ${alterar ? "border-blue-300 bg-blue-50" : "border-slate-200"}`}><input type="radio" name="escolha" checked={alterar} onChange={() => setAlterar(true)} />Criar uma nova senha</label></div>{alterar && <><CampoSenha nome="senhaAtual" rotulo="Senha recebida" /><CampoSenha nome="novaSenha" rotulo="Nova senha" minLength={12} autoComplete="new-password" /><CampoSenha nome="confirmacao" rotulo="Confirmar nova senha" minLength={12} autoComplete="new-password" /><p className="text-xs text-slate-500">Use de 12 a 72 caracteres.</p></>}<Botao disabled={ocupado}>{ocupado ? "Salvando…" : "Continuar"}</Botao></form> : <><SegurancaEmail perfil={u} /><button disabled={ocupado} className="text-xs text-slate-500 underline" onClick={async () => { setOcupado(true); try { await enviar("/api/auth/2fa/adiar", "POST"); await mutate(); alerta.sucesso("Combinado. Você pode ativar depois em Meu perfil."); } catch { alerta.erro("Não foi possível salvar sua preferência."); } finally { setOcupado(false); } }}>Agora não, decidir depois em Meu perfil</button></>}</div>}
  </aside>;
}
