"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { alerta as alertar, ouvirAlertas, type Alerta } from "@/lib/alertas";
import { mensagemDeValidacao } from "@/lib/validacao";

const DURACAO = { sucesso: 4000, erro: 7000, aviso: 10000 } as const;
const TITULO = { sucesso: "Sucesso", erro: "Erro", aviso: "Aviso" } as const;

/** Exibe os alertas do serviço `alerta` no canto inferior direito, acima do botão de suporte.
 *  Fica na camada superior do navegador (popover) para aparecer inclusive sobre modais.
 *  Também troca o balão nativo de validação dos formulários pelo alerta do sistema. */
export function Alertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const camada = useRef<HTMLDivElement>(null);

  useEffect(() => ouvirAlertas((novo) => {
    // A mesma mensagem repetida substitui a anterior em vez de empilhar.
    setAlertas((lista) => [...lista.filter((a) => a.tipo !== novo.tipo || a.texto !== novo.texto), novo].slice(-4));
    window.setTimeout(() => setAlertas((lista) => lista.filter((a) => a.id !== novo.id)), novo.duracao ?? DURACAO[novo.tipo]);
  }), []);

  // Validação de formulário: cancela o balão do navegador e mostra um alerta só para o
  // primeiro campo inválido de cada envio, levando o foco até ele.
  useEffect(() => {
    let ultimoEnvio = 0;
    function campoInvalido(evento: Event) {
      const campo = evento.target;
      if (!(campo instanceof HTMLInputElement || campo instanceof HTMLSelectElement || campo instanceof HTMLTextAreaElement)) return;
      evento.preventDefault();
      const agora = performance.now();
      if (agora - ultimoEnvio < 100) return;
      ultimoEnvio = agora;
      campo.focus();
      alertar.erro(mensagemDeValidacao(campo), { titulo: "Confira o formulário" });
    }
    document.addEventListener("invalid", campoInvalido, true);
    return () => document.removeEventListener("invalid", campoInvalido, true);
  }, []);

  useEffect(() => {
    const elemento = camada.current;
    if (!elemento || typeof elemento.showPopover !== "function") return;
    // Reabrir leva a camada para cima de um modal aberto depois dela.
    if (elemento.matches(":popover-open")) elemento.hidePopover();
    if (alertas.length) elemento.showPopover();
  }, [alertas]);

  const fechar = (id: number) => setAlertas((lista) => lista.filter((a) => a.id !== id));

  return (
    <div
      ref={camada}
      popover="manual"
      aria-live="polite"
      className="pointer-events-none fixed top-auto left-auto right-4 bottom-[72px] m-0 flex h-fit w-[calc(100%-2rem)] max-w-sm flex-col gap-2 overflow-visible border-0 bg-transparent p-0 [&:not(:popover-open)]:hidden"
    >
      {alertas.map((a) => {
        const sucesso = a.tipo === "sucesso";
        const aviso = a.tipo === "aviso";
        return (
          <div
            key={a.id}
            role={a.tipo === "erro" ? "alert" : "status"}
            className={`alerta-entrar pointer-events-auto flex items-start gap-3 rounded-xl border border-l-4 bg-white px-4 py-3 text-sm shadow-lg ${sucesso ? "border-emerald-200 border-l-emerald-500" : aviso ? "border-amber-200 border-l-amber-500" : "border-red-200 border-l-red-500"}`}
          >
            {sucesso
              ? <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              : <AlertCircle aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${aviso ? "text-amber-600" : "text-red-500"}`} />}
            <div className="min-w-0 flex-1">
              <p className={`font-semibold ${sucesso ? "text-emerald-700" : aviso ? "text-amber-700" : "text-red-700"}`}>{a.titulo ?? TITULO[a.tipo]}</p>
              <p className="mt-0.5 break-words leading-5 text-slate-600">{a.texto}</p>
            </div>
            <button type="button" aria-label="Fechar alerta" onClick={() => fechar(a.id)} className="shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
