"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { Botao, Logo } from "@/components/ui";

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

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex justify-center"><Logo claro={false} /></div>
        <h1 className="text-xl font-semibold text-navy">Recuperar senha</h1>
        {mensagem ? <p role="status" className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">{mensagem}</p> : (
          <form onSubmit={solicitar} className="mt-4 space-y-4">
            <label className="block"><span className="text-sm font-medium">E-mail cadastrado</span><div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 transition focus-within:border-acento focus-within:ring-2 focus-within:ring-blue-100"><Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" /><input name="email" type="email" required autoComplete="email" placeholder="seu@email.com" className="min-w-0 flex-1 outline-none" /></div></label>
            {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
            <Botao type="submit" disabled={enviando} className="w-full justify-center disabled:opacity-60"><Send aria-hidden="true" className="h-4 w-4" />{enviando ? "Solicitando..." : "Enviar link de recuperação"}</Botao>
          </form>
        )}
        <Link href="/login" className="mt-6 inline-flex items-center gap-2 rounded text-sm font-medium text-acento hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-acento"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Voltar para o login</Link>
      </section>
    </main>
  );
}
