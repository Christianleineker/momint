import { obterPerfil } from "@/lib/sessao-servidor";
import { PerfilEditor } from "@/components/PerfilEditor";
import { Cabecalho } from "@/components/ui";
export default async function PerfilAdmin() {
  const perfil = await obterPerfil();
  return <><Cabecalho titulo="Meu perfil" subtitulo="Dados pessoais e senha do administrador." /><PerfilEditor perfil={perfil} /></>;
}
