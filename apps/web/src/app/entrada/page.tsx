import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao-servidor";
export default async function Entrada() {
  const perfil = await obterPerfil();
  redirect(perfil.papel === "ADMIN" ? "/acessos" : "/dashboard");
}
