import { ConfiguracoesAbas } from "@/components/ConfiguracoesAbas";
import { EquipeCard } from "@/components/EquipeCard";
import { PreferenciasSistema } from "@/components/PreferenciasSistema";
import { obterPerfil } from "@/lib/sessao-servidor";

export default async function ConfiguracoesPage() {
  const perfil = await obterPerfil();
  const podeGerir = perfil.papel === "GESTOR" || perfil.papel === "ADMIN";
  return (
    <ConfiguracoesAbas perfil={perfil}>
      <PreferenciasSistema podeGerir={podeGerir}>
        <EquipeCard podeGerir={podeGerir} />
      </PreferenciasSistema>
    </ConfiguracoesAbas>
  );
}
