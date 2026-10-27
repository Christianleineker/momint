export type Papel = "ADMIN" | "GESTOR" | "VENDEDOR" | "ATENDENTE";

/** Dados da sessão autenticada (conteúdo do JWT). */
export interface Sessao {
  sub: string;
  clienteId: string;
  papel: Papel;
  versao?: number;
}
