"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

type Aviso = { id: number; tipo: "ok" | "erro"; texto: string };

/** Avisos temporários no canto da tela. Uso: const { avisar, avisos } = useAvisos(); <Avisos .../> */
export function useAvisos() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const proximo = useRef(0);
  const avisar = useCallback((tipo: Aviso["tipo"], texto: string) => {
    const id = ++proximo.current;
    setAvisos((lista) => [...lista, { id, tipo, texto }]);
    setTimeout(() => setAvisos((lista) => lista.filter((a) => a.id !== id)), tipo === "erro" ? 7000 : 4000);
  }, []);
  const fechar = useCallback((id: number) => setAvisos((lista) => lista.filter((a) => a.id !== id)), []);
  return { avisos, avisar, fechar };
}

export function Avisos({ avisos, fechar }: { avisos: Aviso[]; fechar: (id: number) => void }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  if (!montado) return null;
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:right-6 sm:bottom-6" aria-live="polite">
      {avisos.map((a) => (
        <div key={a.id} role={a.tipo === "erro" ? "alert" : "status"} className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${a.tipo === "ok" ? "border-emerald-200 bg-white text-slate-700" : "border-red-200 bg-white text-slate-700"}`}>
          {a.tipo === "ok" ? <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" /> : <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />}
          <p className="min-w-0 flex-1 break-words">{a.texto}</p>
          <button type="button" aria-label="Fechar aviso" onClick={() => fechar(a.id)} className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X aria-hidden="true" className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}
