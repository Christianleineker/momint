"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, ChartNoAxesColumnIncreasing, LockKeyhole, Mail, MessageCircle, Server, ShieldCheck, Users, Zap } from "lucide-react";
import { Logo } from "@/components/ui";
import { CampoSenha } from "@/components/CampoSenha";
import { enviar } from "@/lib/api";
import { abrirChatSuporte } from "@/components/ChatSuporte";

const DESTAQUES = [
  { icone: Users, titulo: "Organize seus leads", texto: "Tenha controle total do seu funil de vendas." },
  { icone: Zap, titulo: "Automatize sua operação", texto: "Ganhe tempo e aumente sua produtividade." },
  { icone: BarChart3, titulo: "Tome decisões com dados", texto: "Acompanhe resultados em tempo real." },
];

const INFORMACOES = [
  { icone: ShieldCheck, titulo: "Plataforma segura", texto: "Seus dados protegidos com criptografia.", cor: "bg-blue-100 text-blue-600" },
  { icone: LockKeyhole, titulo: "Conformidade LGPD", texto: "Privacidade e segurança garantidas.", cor: "bg-emerald-100 text-emerald-600" },
  { icone: Server, titulo: "Alta disponibilidade", texto: "99,9% de uptime para o seu negócio.", cor: "bg-violet-100 text-violet-600" },
];

export default function LoginPage() {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [pendente, setPendente] = useState<{ emailMascarado: string } | null>(null);
  const [reenvio, setReenvio] = useState(0);
  useEffect(() => { let ativo = true; void fetch("/api/auth/login/pendente", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(d => { if (ativo && d?.requerCodigo) setPendente(d); }).catch(() => null); return () => { ativo = false; }; }, []);
  useEffect(() => { if (!reenvio) return; const timer = window.setTimeout(() => setReenvio(reenvio - 1), 1000); return () => window.clearTimeout(timer); }, [reenvio]);

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null;
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
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative isolate hidden overflow-hidden bg-navy px-10 py-12 text-white lg:flex lg:flex-col lg:justify-center 2xl:px-16">
        <Image src="/images/login-office.webp" alt="" fill priority sizes="(min-width: 1024px) 50vw, 1px" className="object-cover object-left" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(7,23,50,0.55)_0%,rgba(7,23,50,0.3)_55%,rgba(7,23,50,0.05)_100%)]" />
        <div className="relative z-10 flex flex-col gap-8">
          <Logo />
          <p className="text-xs tracking-[0.3em] text-slate-400">RELACIONAMENTO • PROCESSOS • RESULTADOS</p>
          <h1 className="max-w-md text-4xl font-bold leading-tight">
            Mais oportunidades <br />para <span className="text-sky-400">o seu negócio</span>
          </h1>
          <p className="max-w-sm text-base leading-relaxed text-slate-200">
            Centralize seus leads, automatize seu processo comercial e acompanhe cada etapa em tempo real, com o Momint.
          </p>
          <ul className="max-w-sm space-y-6">
            {DESTAQUES.map(({ icone: Icone, titulo, texto }) => (
              <li key={titulo} className="flex gap-4">
                <div className="rounded-xl bg-white/10 p-3">
                  <Icone className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold">{titulo}</p>
                  <p className="text-sm text-slate-300">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex w-fit max-w-full items-center gap-4 rounded-lg border border-sky-300/15 bg-navy/50 px-5 py-4 shadow-lg backdrop-blur-sm">
            <ChartNoAxesColumnIncreasing
              aria-hidden="true"
              strokeWidth={4}
              strokeLinecap="butt"
              className="h-9 w-9 shrink-0 text-sky-400 [&_line:nth-child(1)]:stroke-sky-500 [&_line:nth-child(2)]:stroke-blue-500 [&_line:nth-child(3)]:stroke-cyan-400"
            />
            <p className="text-sm leading-relaxed text-slate-200">
              Empresas que usam o Momint<br /> aceleram seus resultados
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-8 p-6">
        <form onSubmit={entrar} className="w-full max-w-lg space-y-5 rounded-2xl bg-white p-6 shadow-lg sm:p-10">
          <div className="flex justify-center">
            <Logo claro={false} />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-navy">{pendente ? "Verifique seu e-mail" : "Entrar na plataforma"}</h2>
            <p className="text-sm text-slate-500">{pendente ? `Enviamos um código de uso único para ${pendente.emailMascarado}.` : "Acesse sua conta para acompanhar leads, reuniões e automações."}</p>
          </div>
          {pendente ? <label className="block text-sm font-medium">Código de 6 dígitos<input name="codigo" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required autoFocus className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 text-center text-2xl tracking-[.5em] outline-none focus:border-acento" /><span className="mt-2 block text-xs font-normal leading-5 text-slate-500">O código expira em 5 minutos. Não compartilhe com outras pessoas.</span></label> : <>
          <label className="block">
            <span className="text-sm font-medium">E-mail</span>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 transition focus-within:border-acento focus-within:ring-2 focus-within:ring-blue-100">
              <Mail aria-hidden="true" className="h-4 w-4 text-slate-400" />
              <input name="email" type="email" placeholder="seu@email.com" autoComplete="email" required className="min-w-0 flex-1 outline-none" />
            </div>
          </label>
          <CampoSenha />
          </>}
          {erro && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {erro}
            </p>
          )}
          {!pendente && <div className="flex justify-end">
            <Link href="/recuperar-senha" className="rounded text-sm font-medium text-acento transition hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-acento">
              Esqueci a senha?
            </Link>
          </div>}
          <button
            type="submit"
            disabled={carregando}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-acento py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {carregando ? "Aguarde..." : pendente ? "Confirmar código e entrar" : "Entrar"} <ArrowRight className="h-4 w-4" />
          </button>
          {pendente && <div className="flex flex-wrap justify-between gap-3 text-xs"><button type="button" disabled={carregando || reenvio > 0} className="text-acento disabled:text-slate-400" onClick={async () => { setCarregando(true); setErro(""); try { await enviar("/api/auth/login/reenviar", "POST"); setReenvio(60); } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível reenviar."); } finally { setCarregando(false); } }}>{reenvio ? `Reenviar em ${reenvio}s` : "Reenviar código"}</button><button type="button" disabled={carregando} className="text-slate-500" onClick={async () => { await enviar("/api/auth/logout", "POST"); setPendente(null); setErro(""); }}>Usar outra conta</button></div>}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase text-slate-400">ou</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <button type="button" onClick={abrirChatSuporte} className="flex w-full items-center justify-center gap-2 text-sm font-medium text-acento transition hover:text-blue-700">
            <MessageCircle className="h-5 w-5" />
            Falar com o suporte
          </button>
        </form>
        <ul className="grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-0">
          {INFORMACOES.map(({ icone: Icone, titulo, texto, cor }) => (
            <li key={titulo} className="flex min-w-0 items-start gap-3 border-slate-200 sm:gap-2 sm:px-3 sm:first:pl-0 sm:last:pr-0 sm:[&:not(:first-child)]:border-l">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cor}`}>
                <Icone aria-hidden="true" className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-4 text-navy">{titulo}</p>
                <p className="mt-1 text-xs leading-4 text-slate-500">{texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
