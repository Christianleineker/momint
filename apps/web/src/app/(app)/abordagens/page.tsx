import { Cabecalho } from "@/components/ui";
import { AbordagensFila } from "./AbordagensFila";

export default function AbordagensPage() {
  return (
    <>
      <Cabecalho titulo="Fila de Aprovação" subtitulo="Mensagens rascunhadas pela IA aguardando revisão (modo Copiloto)." />
      <AbordagensFila />
    </>
  );
}