"use client";

import { useEffect } from "react";
import useSWR, { mutate as mutarGlobal } from "swr";
import { alerta } from "@/lib/alertas";
import { ErroApi, enviar, lerJson } from "@/lib/api";

/** Leitura de um endpoint da API com SWR. Sessão expirada (401) volta para o login. */
export function useApi<T>(url: string | null) {
  const resultado = useSWR<T, Error>(url, lerJson);
  useEffect(() => {
    if (resultado.error instanceof ErroApi && resultado.error.status === 401) window.location.href = "/login";
  }, [resultado.error]);
  return resultado;
}

/** Grava na API, mostra o alerta de sucesso ou erro e recarrega as leituras indicadas.
 *  Devolve a resposta da API, ou `null` quando a ação falhou. */
export async function acao<T = unknown>(
  url: string,
  metodo: "POST" | "PUT" | "PATCH" | "DELETE",
  corpo: unknown,
  opcoes: { sucesso: string; erro?: string; recarregar?: string[] },
): Promise<T | null> {
  try {
    const resposta = await enviar<T>(url, metodo, corpo);
    await Promise.all((opcoes.recarregar ?? []).map((chave) => mutarGlobal(chave)));
    alerta.sucesso(opcoes.sucesso);
    return resposta ?? ({} as T);
  } catch (e) {
    if (e instanceof ErroApi && e.status === 401) { window.location.href = "/login"; return null; }
    alerta.falha(e, opcoes.erro ?? "Não foi possível salvar.");
    return null;
  }
}
