"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, ChartNoAxesColumnIncreasing, Lock, LockKeyhole, Mail, MessageCircle, Server, ShieldCheck, Users, Zap } from "lucide-react";
import { Logo } from "@/components/ui";

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

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    setCarregando(true);

    const dados = new FormData(event.currentTarget);
    const email = String(dados.get("email") ?? "").trim();
    const senha = String(dados.get("senha") ?? "");

    try {
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

      router.push("/dashboard");
      router.refresh();
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
            <h2 className="text-2xl font-bold text-navy">Entrar na plataforma</h2>
            <p className="text-sm text-slate-500">Acesse sua conta para acompanhar leads, reuniões e automações.</p>
          </div>
          <label className="block">
            <span className="text-sm font-medium">E-mail</span>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
              <Mail className="h-4 w-4 text-slate-400" />
              <input name="email" type="email" placeholder="seu@email.com" autoComplete="email" required className="min-w-0 flex-1 outline-none" />
            </div>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Senha</span>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
              <Lock className="h-4 w-4 text-slate-400" />
              <input name="senha" type="password" placeholder="Digite sua senha" autoComplete="current-password" required className="min-w-0 flex-1 outline-none" />
            </div>
          </label>
          {erro && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {erro}
            </p>
          )}
          <div className="flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-acento focus:ring-acento" />
              Lembrar de mim
            </label>
            <button type="button" className="text-sm font-medium text-acento transition hover:text-blue-700">
              Esqueci a senha?
            </button>
          </div>
          <button
            type="submit"
            disabled={carregando}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-acento py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {carregando ? "Entrando..." : "Entrar"} <ArrowRight className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase text-slate-400">ou</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <button type="button" className="flex w-full items-center justify-center gap-2 text-sm font-medium text-acento transition hover:text-blue-700">
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
