"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Mail, MailCheck, Send } from "lucide-react";
import { AcessoLayout } from "@/components/AcessoLayout";

export default function RecuperarSenhaPage() {
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  async function solicitar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
      const resposta = await fetch("/api/auth/recuperar-senha", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      if (!resposta.ok) {
        setErro(resposta.status === 429 ? "Muitas solicitações. Aguarde alguns minutos antes de tentar novamente." : "Não foi possível solicitar a recuperação. Tente novamente.");
        return;
      }
      setMensagem("Se o e-mail estiver associado a uma conta ativa, você receberá um link de recuperação. Confira também a pasta de spam.");
    } catch { setErro("Não foi possível conectar ao servidor. Tente novamente."); }
    finally { setEnviando(false); }
  }

  const voltar = (
    <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded text-sm font-medium text-acento transition hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-acento">
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />Voltar para o login
    </Link>
  );

  if (mensagem) {
    return (
      <AcessoLayout>
        <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <MailCheck aria-hidden="true" className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-navy">Verifique seu e-mail</h1>
          <p role="status" className="mt-2 text-sm leading-6 text-slate-600">{mensagem}</p>
          <p className="mt-3 text-sm text-slate-500">O link vale 30 minutos.</p>
          <div className="mt-6">{voltar}</div>
        </section>
      </AcessoLayout>
    );
  }

  return (
    <AcessoLayout>
      <form onSubmit={solicitar} className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-navy">Recuperar senha</h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.</p>
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">E-mail cadastrado</span>
            <div className="mt-1.5 flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 transition focus-within:border-acento focus-within:ring-2 focus-within:ring-blue-100">
              <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
              <input name="email" type="email" required autoComplete="email" placeholder="seu@email.com" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </div>
          </label>
          {erro && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}
          <button type="submit" disabled={enviando} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-acento font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70">
            <Send aria-hidden="true" className="h-4 w-4" />{enviando ? "Enviando..." : "Enviar link"}
          </button>
          <div className="pt-1">{voltar}</div>
        </div>
      </form>
    </AcessoLayout>
  );
}
