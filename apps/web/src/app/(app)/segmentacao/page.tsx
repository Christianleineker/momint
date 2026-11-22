import { obterPerfil } from "@/lib/sessao-servidor";
import { SegmentacaoForm } from "./SegmentacaoForm";

export default async function SegmentacaoPage() {
  const perfil = await obterPerfil();
  return <SegmentacaoForm podeGerir={perfil.papel === "GESTOR" || perfil.papel === "ADMIN"} empresa={perfil.cliente.nome} />;
}
