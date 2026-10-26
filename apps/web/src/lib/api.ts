// Funções compartilhadas para falar com a API (o Next repassa /api/* para o Fastify).

export const CHAVE_FILA = "/api/abordagens/fila";

export class ErroApi extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem);
  }
}

async function tratar<T>(resposta: Response): Promise<T> {
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const mensagem = typeof dados?.erro === "string" ? dados.erro : "Não foi possível concluir a ação.";
    throw new ErroApi(resposta.status, mensagem);
  }
  return dados as T;
}

/** GET que devolve JSON. Serve como "fetcher" do SWR. */
export async function lerJson<T>(url: string): Promise<T> {
  return tratar<T>(await fetch(url, { cache: "no-store" }));
}

/** POST/PUT/PATCH. Só envia Content-Type quando há corpo (o Fastify recusa JSON vazio). */
export async function enviar<T = unknown>(url: string, metodo: "POST" | "PUT" | "PATCH", corpo?: unknown): Promise<T> {
  const init: RequestInit = { method: metodo };
  if (corpo !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(corpo);
  }
  return tratar<T>(await fetch(url, init));
}