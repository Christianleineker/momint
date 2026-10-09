"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Save } from "lucide-react";
import { CampoSenha } from "@/components/CampoSenha";
import { Botao, Logo } from "@/components/ui";

export default function RedefinirSenhaPage() {
  const leuLink = useRef(false);
  const [token, setToken] = useState("");
  const [estado, setEstado] = useState<"carregando" | "valido" | "invalido" | "erro" | "sucesso">("carregando");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);

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
    const confirmacao = String(dados.get("confirmacao"));
    setErro("");
    if (senha !== confirmacao) { setErro("As senhas não coincidem."); return; }
    if (new TextEncoder().encode(senha).length > 72) { setErro("A senha ultrapassa o tamanho máximo permitido."); return; }
    setSalvando(true);
    try {
      const resposta = await fetch("/api/auth/redefinir-senha", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, senha }) });
      if (!resposta.ok) {
        if (resposta.status === 400) setEstado("invalido");
        else setErro(resposta.status === 429 ? "Muitas tentativas. Aguarde alguns minutos." : "Não foi possível alterar a senha. Tente novamente.");
        return;
      }
      setEstado("sucesso");
    } catch { setErro("Não foi possível conectar ao servidor. Tente novamente."); }
    finally { setSalvando(false); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex justify-center"><Logo claro={false} /></div>
        <h1 className="text-xl font-semibold text-navy">Definir nova senha</h1>
        {estado === "carregando" && <p role="status" className="mt-4 text-sm text-slate-500">Verificando o link...</p>}
        {estado === "erro" && <div className="mt-4"><p role="alert" className="text-sm text-red-600">Não foi possível verificar o link.</p><Botao variante="secundario" className="mt-4" onClick={() => setTentativa((valor) => valor + 1)}>Tentar novamente</Botao></div>}
        {estado === "invalido" && <div className="mt-4"><p role="alert" className="text-sm text-slate-600">Este link é inválido, expirou ou já foi utilizado.</p><Link href="/recuperar-senha" className="mt-4 inline-block rounded text-sm font-medium text-acento focus-visible:outline-2 focus-visible:outline-acento">Solicitar novo link</Link></div>}
        {estado === "sucesso" && <p role="status" className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"><CheckCircle2 aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />Senha alterada. Entre com sua nova senha.</p>}
        {estado === "valido" && <form onSubmit={salvar} className="mt-4 space-y-4">
          <CampoSenha rotulo="Nova senha" autoComplete="new-password" minLength={12} placeholder="Pelo menos 12 caracteres" />
          <CampoSenha nome="confirmacao" rotulo="Confirmar nova senha" autoComplete="new-password" minLength={12} placeholder="Repita a nova senha" />
          {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
          <Botao type="submit" disabled={salvando} className="w-full justify-center disabled:opacity-60"><Save aria-hidden="true" className="h-4 w-4" />{salvando ? "Salvando..." : "Salvar nova senha"}</Botao>
        </form>}
        <Link href="/login" className="mt-6 inline-flex items-center gap-2 rounded text-sm font-medium text-acento hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-acento"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Voltar para o login</Link>
      </section>
    </main>
  );
}
