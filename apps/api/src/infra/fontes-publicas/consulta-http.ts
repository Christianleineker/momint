const TEMPO_LIMITE_MS = 20_000;
const TENTATIVAS = 2;
const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Repete apenas falhas transitórias de consultas GET, inclusive durante a leitura do corpo. */
export async function lerJson<T>(url: URL | string, origem: string, limite?: AbortSignal): Promise<T | null> {
  for (let tentativa = 1; ; tentativa++) {
    if (limite?.aborted) throw new Error(`${origem}: tempo total de consulta excedido. Tente novamente mais tarde.`);
    let res: Response;
    try {
      const timeout = AbortSignal.timeout(TEMPO_LIMITE_MS);
      res = await fetch(url, { signal: limite ? AbortSignal.any([timeout, limite]) : timeout });
      if (res.status === 204 || res.status === 404) return null;
      if (res.ok) {
        const texto = await res.text();
        return texto ? JSON.parse(texto) as T : null;
      }
    } catch (erro) {
      if (limite?.aborted) throw new Error(`${origem}: tempo total de consulta excedido. Tente novamente mais tarde.`);
      const transitorio = erro instanceof Error && ["TimeoutError", "AbortError", "TypeError"].includes(erro.name);
      if (!transitorio) throw erro;
      if (tentativa === TENTATIVAS) {
        throw new Error(`${origem}: não foi possível concluir a consulta após ${TENTATIVAS} tentativas. Tente novamente mais tarde.`);
      }
      await esperar(1_000);
      continue;
    }
    if ((res.status === 429 || [502, 503, 504].includes(res.status)) && tentativa < TENTATIVAS) {
      const pedida = Number(res.headers.get("retry-after"));
      await res.body?.cancel();
      await esperar(pedida > 0 ? Math.min(pedida, 5) * 1000 : 1_000);
      continue;
    }
    await res.body?.cancel();
    throw new Error(`${origem} respondeu ${res.status}. Tente novamente mais tarde.`);
  }
}
