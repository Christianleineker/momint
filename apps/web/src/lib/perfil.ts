export interface Perfil {
  id: string;
  nome: string;
  email: string;
  telefone?: string | null;
  primeiroAcessoPendente: boolean;
  oferta2faPendente: boolean;
  doisFatoresEmail: boolean;
  papel: "ADMIN" | "GESTOR" | "VENDEDOR" | "ATENDENTE";
  cliente: { id: string; nome: string; modoOperacao: string; demonstrativo: boolean };
  aprovacoesPendentes: number;
}
export const ROTULO_PAPEL = { ADMIN: "Administrador geral", GESTOR: "Gestor do sistema", VENDEDOR: "Vendedor", ATENDENTE: "Atendente" };
