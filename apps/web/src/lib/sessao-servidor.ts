import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Perfil } from "./perfil";

export async function obterPerfil(): Promise<Perfil> {
  const cookie = (await cookies()).get("momint_token");
  if (!cookie) redirect("/login");
  const resposta = await fetch(`${process.env.API_URL ?? "http://localhost:4000"}/api/auth/me`, {
    headers: { Cookie: `momint_token=${cookie.value}` }, cache: "no-store",
  });
  if (resposta.status === 401 || resposta.status === 403) redirect("/login");
  if (!resposta.ok) throw new Error("Não foi possível verificar sua sessão. Tente novamente.");
  return resposta.json();
}
