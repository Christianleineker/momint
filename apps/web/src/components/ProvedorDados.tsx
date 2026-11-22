"use client";

import { useEffect, type ReactNode } from "react";
import { SWRConfig, type Middleware } from "swr";
import { carregamento } from "@/lib/carregamento";

/** Toda leitura feita pelo SWR liga o spinner global na primeira carga (sem dados ainda).
 *  Atualizações em segundo plano (foco da janela, consultas periódicas) não ligam,
 *  para o spinner não piscar a cada poucos segundos. */
const indicarCarregamento: Middleware = (useSWRNext) => (chave, buscar, config) => {
  const swr = useSWRNext(chave, buscar, config);
  const primeiraCarga = swr.isLoading;
  useEffect(() => {
    if (!primeiraCarga) return;
    carregamento.iniciar();
    return () => carregamento.finalizar();
  }, [primeiraCarga]);
  return swr;
};

export function ProvedorDados({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ use: [indicarCarregamento] }}>{children}</SWRConfig>;
}
