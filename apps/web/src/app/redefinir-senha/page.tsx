"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Check, CheckCircle2, Save, TimerReset } from "lucide-react";
import { AcessoLayout } from "@/components/AcessoLayout";
import { CampoSenha } from "@/components/CampoSenha";

const botaoLink = "flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-acento font-medium text-white transition hover:bg-blue-700";
const botaoSalvar = "flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-acento font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70";

export default function RedefinirSenhaPage() {
  const leuLink = useRef(false);
  const [token, setToken] = useState("");
  const [estado, setEstado] = useState<"carregando" | "valido" | "invalido" | "erro" | "sucesso">("carregando");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");

  useEffect(() => {
    if (leuLink.current) return;
    leuLink.current = true;
    const recebido = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    if (/^[a-f0-9]{64}$/.test(recebido)) setToken(recebido);
    else setEstado("invalido");
  }, []);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setEstado("carregando");
    async function verificar() {
      try {
        const resposta = await fetch("/api/auth/recuperacao/validar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }), signal: controller.signal });
        if (!resposta.ok) { setEstado("erro"); return; }
        const corpo = await resposta.json() as { valido: boolean };
        setEstado(corpo.valido ? "valido" : "invalido");
      } catch { if (!controller.signal.aborted) setEstado("erro"); }
    }
    void verificar();
    return () => controller.abort();
  }, [token, tentativa]);

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dados = new FormData(event.currentTarget);
    const senha = String(dados.get("senha"));
    const confirmar = String(dados.get("confirmacao"));
    setErro("");
    if (senha !== confirmar) { setErro("As senhas não coincidem."); return; }
    if (new TextEncoder().encode(senha).length > 72) { setErro("A senha ultrapassa o tamanho máximo permitido."); return; }
    setSalvando(true);
    try {
      const resposta = await fetch("/api/auth/redefinir-senha", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, senha }) });
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null) as { codigo?: string; erro?: string } | null;
        if (corpo?.codigo === "LINK_RECUPERACAO_INVALIDO") setEstado("invalido");
        else setErro(corpo?.erro ?? (resposta.status === 429 ? "Muitas tentativas. Aguarde alguns minutos." : "Não foi possível alterar a senha. Tente novamente."));
        return;
      }
      setEstado("sucesso");
    } catch { setErro("Não foi possível conectar ao servidor. Tente novamente."); }
    finally { setSalvando(false); }
  }

  const requisitos = [
    { ok: novaSenha.length >= 12, texto: "Mínimo de 12 caracteres" },
    { ok: novaSenha.length > 0 && novaSenha === confirmacao, texto: "As senhas são iguais" },
  ];

  const cartao = "rounded-xl border border-slate-200 bg-white p-8 shadow-sm";
  const voltar = (
    <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded text-sm font-medium text-acento transition hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-acento">
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />Voltar para o login
    </Link>
  );

  if (estado === "sucesso") {
    return (
      <AcessoLayout>
        <section className={`${cartao} text-center`}>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 aria-hidden="true" className="h-7 w-7" /></div>
          <h1 className="mt-5 text-2xl font-semibold text-navy">Senha alterada</h1>
          <p role="status" className="mt-2 text-sm leading-6 text-slate-600">Entre com sua nova senha para continuar.</p>
          <Link href="/login" className={`${botaoLink} mt-6`}>Ir para o login</Link>
        </section>
      </AcessoLayout>
    );
  }

  if (estado === "invalido" || estado === "erro") {
    const expirado = estado === "invalido";
    return (
      <AcessoLayout>
        <section className={`${cartao} text-center`}>
          <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${expirado ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}><AlertCircle aria-hidden="true" className="h-7 w-7" /></div>
          <h1 className="mt-5 text-2xl font-semibold text-navy">{expirado ? "Link indisponível" : "Não foi possível verificar"}</h1>
          <p role="alert" className="mt-2 text-sm leading-6 text-slate-600">{expirado ? "Este link é inválido, expirou ou já foi utilizado." : "Não foi possível verificar o link agora."}</p>
          {expirado ? <Link href="/recuperar-senha" className={`${botaoLink} mt-6`}>Pedir novo link</Link> : <button type="button" onClick={() => setTentativa((valor) => valor + 1)} className={`${botaoLink} mt-6`}><TimerReset aria-hidden="true" className="h-4 w-4" />Tentar novamente</button>}
          <div className="mt-5">{voltar}</div>
        </section>
      </AcessoLayout>
    );
  }

  return (
    <AcessoLayout>
      {estado === "carregando" && (
        <section className={`${cartao} text-center text-sm text-slate-500`} role="status">Verificando o link...</section>
      )}
      {estado === "valido" && (
        <form onSubmit={salvar} className={cartao}>
          <h1 className="text-2xl font-semibold text-navy">Definir nova senha</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">Escolha uma senha forte para proteger sua conta.</p>
          <div className="mt-6 space-y-4">
            <CampoSenha rotulo="Nova senha" autoComplete="new-password" minLength={12} placeholder="Pelo menos 12 caracteres" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
            <CampoSenha nome="confirmacao" rotulo="Confirmar senha" autoComplete="new-password" minLength={12} placeholder="Repita a nova senha" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
            <ul className="space-y-1.5 rounded-lg bg-slate-50 p-3 text-xs">
              {requisitos.map(({ ok, texto }) => (
                <li key={texto} className={`flex items-center gap-2 ${ok ? "text-emerald-600" : "text-slate-500"}`}>
                  <Check aria-hidden="true" className={`h-3.5 w-3.5 ${ok ? "" : "opacity-30"}`} />{texto}
                </li>
              ))}
            </ul>
            {erro && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><span>{erro}</span>
              </div>
            )}
            <button type="submit" disabled={salvando} className={botaoSalvar}><Save aria-hidden="true" className="h-4 w-4" />{salvando ? "Salvando..." : "Salvar nova senha"}</button>
            <div className="pt-1">{voltar}</div>
          </div>
        </form>
      )}
    </AcessoLayout>
  );
}
