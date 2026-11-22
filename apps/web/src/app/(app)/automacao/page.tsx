import { obterPerfil } from "@/lib/sessao-servidor";
import { AutomacaoForm } from "./AutomacaoForm";

export default async function AutomacaoPage() {
  const perfil = await obterPerfil();
  return <AutomacaoForm podeGerir={perfil.papel === "GESTOR" || perfil.papel === "ADMIN"} />;
}
