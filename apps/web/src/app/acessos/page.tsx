import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, Building2, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import { Logo } from "@/components/ui";
import { Sair } from "@/components/Sair";
import { obterPerfil } from "@/lib/sessao-servidor";

export default async function Acessos() {
  const perfil = await obterPerfil();
  if (perfil.papel !== "ADMIN") redirect("/dashboard");
  const cards = [
    { titulo: "Sistema Demonstrativo", href: "/dashboard", icone: LayoutDashboard, etiqueta: "EXPLORE O MOMINT", descricao: "Demonstração do sistema com dashboard, leads, gatilhos, abordagens, automações e todas as outras telas da operação.", detalhes: ["Dashboard e indicadores", "Todas as telas do sistema"], secundario: false },
    { titulo: "Painel Admin", href: "/admin", icone: ShieldCheck, etiqueta: "GESTÃO DA PLATAFORMA", descricao: "Criação e exclusão de contas de clientes, gestão de sistemas e equipes, suporte à gestão e indicadores de clientes, sistemas vendidos e sistemas por cliente.", detalhes: ["Clientes, sistemas e equipes", "Indicadores para sua gestão"], secundario: true },
  ];
  return <div className="access-page">
    <header className="access-header"><Logo claro={false} /><Sair /></header>
    <main className="access-main">
      <span className="access-label"><ShieldCheck className="h-3.5 w-3.5" /> ACESSO DO ADMINISTRADOR</span>
      <h1>Seu próximo passo começa aqui.</h1>
      <p className="access-welcome">Bem-vindo, {perfil.nome}. Escolha o ambiente que deseja acessar.</p>
      <div className="access-options">{cards.map(({ titulo, href, icone: Icone, etiqueta, descricao, detalhes, secundario }) => <Link key={href} href={href} className={`access-card group ${secundario ? "access-admin" : "access-demo"}`}>
        <div className="access-card-top"><span className="access-icon"><Icone /></span><span className="access-eyebrow">{etiqueta}</span></div>
        <h2>{titulo}</h2>
        <p className="access-description">{descricao}</p>
        <ul className="access-details">{detalhes.map((d, i) => <li key={d}>{i ? <BarChart3 /> : <Users />}{d}</li>)}</ul>
        <div className="access-action">Acessar ambiente <ArrowRight className="transition-transform group-hover:translate-x-1" /></div>
      </Link>)}</div>
      <p className="access-footer"><Building2 className="h-3.5 w-3.5" /> Cada sistema possui dados e equipe próprios.</p>
    </main>
  </div>;
}
