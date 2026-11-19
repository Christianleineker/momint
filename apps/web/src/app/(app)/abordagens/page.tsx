import { Cabecalho } from "@/components/ui";
import { obterPerfil } from "@/lib/sessao-servidor";
import { AbordagensFila } from "./AbordagensFila";

export default async function AbordagensPage() {
  const perfil = await obterPerfil();
  return (
    <>
      <Cabecalho titulo="Abordagens" subtitulo="Fila de aprovação: revise os rascunhos da IA antes de cada envio." />
      <AbordagensFila remetente={`${perfil.nome} · ${perfil.cliente.nome}`} />
    </>
  );
}
