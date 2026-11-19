"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, ListOrdered, Mail, MessageCircle, Radar, UserCheck } from "lucide-react";
import { Logo } from "@/components/ui";
import { CampoSenha } from "@/components/CampoSenha";
import { enviar } from "@/lib/api";
import { abrirChatSuporte } from "@/components/ChatSuporte";

const PILARES = [
  { icone: Radar, titulo: "Gatilhos em dados públicos", texto: "Obras, licitações e CNPJs novos, direto de fontes oficiais." },
  { icone: ListOrdered, titulo: "Prioridade automática", texto: "Cada empresa recebe um score para você atacar o que importa primeiro." },
  { icone: UserCheck, titulo: "Aprovação humana", texto: "Nenhuma mensagem sai sem a sua aprovação." },
];

export default function LoginPage() {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [pendente, setPendente] = useState<{ emailMascarado: string } | null>(null);
  const [reenvio, setReenvio] = useState(0);
  const [bloqueadoAte, setBloqueadoAte] = useState(0);
  const [espera, setEspera] = useState(0);
  const [codigo, setCodigo] = useState("");
  useEffect(() => {
    if (!bloqueadoAte) return;
    const atualizar = () => {
      const restante = Math.max(0, Math.ceil((bloqueadoAte - Date.now()) / 1000));
      setEspera(restante);
      if (!restante) { setBloqueadoAte(0); setErro(""); }
    };
    atualizar();
    const timer = window.setInterval(atualizar, 250);
    return () => window.clearInterval(timer);
  }, [bloqueadoAte]);
  useEffect(() => { let ativo = true; void fetch("/api/auth/login/pendente", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(d => { if (ativo && d?.requerCodigo) setPendente(d); }).catch(() => null); return () => { ativo = false; }; }, []);
  useEffect(() => { if (!reenvio) return; const timer = window.setTimeout(() => setReenvio(reenvio - 1), 1000); return () => window.clearTimeout(timer); }, [reenvio]);

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (espera > 0) return;
    setErro("");
    setCarregando(true);

    const dados = new FormData(event.currentTarget);
    const email = String(dados.get("email") ?? "").trim();
    const senha = String(dados.get("senha") ?? "");

    try {
      if (pendente) {
        const perfil = await enviar<{ papel: string }>("/api/auth/login/codigo", "POST", { codigo: dados.get("codigo") });
        router.push(perfil.papel === "ADMIN" ? "/acessos" : "/dashboard"); router.refresh(); return;
      }
      const resposta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      if (!resposta.ok) {
        const corpo = (await resposta.json().catch(() => null)) as { erro?: string; tentarNovamenteEm?: number } | null;
        if (corpo?.tentarNovamenteEm) {
          setEspera(corpo.tentarNovamenteEm);
          setBloqueadoAte(Date.now() + corpo.tentarNovamenteEm * 1000);
        }
        setErro(corpo?.erro ?? "Não foi possível entrar. Confira seus dados e tente novamente.");
        return;
      }

      const perfil = await resposta.json() as { papel: string; requerCodigo?: boolean; emailMascarado: string };
      if (perfil.requerCodigo) { setPendente(perfil); setReenvio(60); return; }
      router.push(perfil.papel === "ADMIN" ? "/acessos" : "/dashboard");
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[45%_1fr]">
      <aside className="hidden flex-col justify-between bg-navy px-12 py-12 text-white lg:flex">
        <Logo />
        <div className="space-y-10">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight">Prospecção B2B <span className="text-sky-400">no momento certo</span></h1>
            <p className="max-w-md text-base leading-relaxed text-slate-300">Encontre empresas no instante em que um sinal público indica necessidade, e aborde com aprovação humana.</p>
          </div>
          <ul className="space-y-6">
            {PILARES.map(({ icone: Icone, titulo, texto }) => (
              <li key={titulo} className="flex gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-teal">
                  <Icone aria-hidden="true" className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{titulo}</p>
                  <p className="text-sm leading-relaxed text-slate-300">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-400">Momint · Prospecção B2B</p>
      </aside>

      <div className="flex min-w-0 flex-col bg-fundo">
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex justify-center lg:hidden">
              <Logo claro={false} />
            </div>
            <form onSubmit={entrar} className="w-full rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-navy">{pendente ? "Verifique seu e-mail" : "Entrar"}</h2>
              <p className="mt-1 text-sm text-slate-500">{pendente ? `Enviamos um código de uso único para ${pendente.emailMascarado}.` : "Acesse sua conta para acompanhar leads, reuniões e automações."}</p>

              <div className="mt-6 space-y-4">
                {pendente ? (
                  <div>
                    <span className="text-sm font-medium text-slate-700">Código de 6 dígitos</span>
                    <div className="relative mt-2">
                      <input
                        name="codigo"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        minLength={6}
                        maxLength={6}
                        required
                        autoFocus
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        aria-label="Código de 6 dígitos"
                        className="absolute inset-0 h-full w-full cursor-text opacity-0"
                      />
                      <div className="flex justify-between gap-2" aria-hidden="true">
                        {Array.from({ length: 6 }, (_, i) => (
                          <span key={i} className={`grid h-14 flex-1 place-items-center rounded-lg border text-2xl font-semibold text-navy tabular-nums ${i === codigo.length ? "border-acento ring-2 ring-blue-100" : "border-slate-200"}`}>{codigo[i] ?? ""}</span>
                        ))}
                      </div>
                    </div>
                    <span className="mt-2 block text-xs leading-5 text-slate-500">Ele vale 5 minutos. Não compartilhe com outras pessoas.</span>
                  </div>
                ) : (
                  <>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">E-mail</span>
                      <div className="mt-1.5 flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 transition focus-within:border-acento focus-within:ring-2 focus-within:ring-blue-100">
                        <Mail aria-hidden="true" className="h-4 w-4 text-slate-400" />
                        <input name="email" type="email" placeholder="seu@email.com" autoComplete="email" required className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                      </div>
                    </label>
                    <CampoSenha />
                    <div className="flex justify-end">
                      <Link href="/recuperar-senha" className="rounded text-sm font-medium text-acento transition hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-acento">
                        Esqueci a senha
                      </Link>
                    </div>
                  </>
                )}

                {erro && (
                  <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{espera > 0 ? `Você errou 3 vezes seguidas. Aguarde ${espera} segundos e tente novamente.` : erro}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={carregando || espera > 0}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-acento font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {espera > 0 ? `Tentar novamente em ${espera}s` : carregando ? "Aguarde..." : pendente ? "Confirmar código e entrar" : "Entrar"} <ArrowRight className="h-4 w-4" />
                </button>

                {pendente && <div className="flex flex-wrap justify-between gap-3 text-xs"><button type="button" disabled={carregando || reenvio > 0} className="font-medium text-acento disabled:text-slate-400" onClick={async () => { setCarregando(true); setErro(""); try { await enviar("/api/auth/login/reenviar", "POST"); setReenvio(60); } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível reenviar."); } finally { setCarregando(false); } }}>{reenvio ? `Reenviar em ${reenvio}s` : "Reenviar código"}</button><button type="button" disabled={carregando} className="text-slate-500" onClick={async () => { await enviar("/api/auth/logout", "POST"); setPendente(null); setErro(""); setCodigo(""); }}>Usar outra conta</button></div>}

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-medium uppercase text-slate-400">ou</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <button type="button" onClick={abrirChatSuporte} className="flex w-full items-center justify-center gap-2 text-sm font-medium text-acento transition hover:text-blue-700">
                  <MessageCircle className="h-4 w-4" />
                  Falar com o suporte
                </button>
              </div>
            </form>
          </div>
        </main>
        <footer className="px-6 py-5 text-center text-xs text-slate-400">© 2026 Momint</footer>
      </div>
    </div>
  );
}
