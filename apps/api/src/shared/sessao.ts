export type Papel = "ADMIN" | "VENDEDOR";

/** Dados da sessão autenticada (conteúdo do JWT). */
export interface Sessao {
  sub: string;
  clienteId: string;
  papel: Papel;
}
