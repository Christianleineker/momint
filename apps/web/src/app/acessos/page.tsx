import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, Building2, LayoutDashboard, ShieldCheck, Users, Zap } from "lucide-react";
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
  return <div className="min-h-screen px-5 py-7 sm:px-10">
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-4"><Logo claro={false} /><Sair /></header>
    <main className="mx-auto max-w-6xl py-14 sm:py-20">
      <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold tracking-wider text-acento"><ShieldCheck className="h-4 w-4" /> ACESSO DO ADMINISTRADOR</span>
      <h1 className="mt-6 text-4xl font-bold tracking-tight text-navy sm:text-5xl">Seu próximo passo começa aqui.</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-500">Bem-vindo, {perfil.nome}. Escolha o ambiente que deseja acessar.</p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">{cards.map(({ titulo, href, icone: Icone, etiqueta, descricao, detalhes, secundario }) => <Link key={href} href={href} className={`access-card group relative flex flex-col overflow-hidden rounded-3xl border p-7 outline-none sm:p-9 ${secundario ? "border-navy bg-navy text-white" : "border-slate-200 bg-white text-navy"}`}>
        <div aria-hidden className={`access-glow absolute -right-14 -top-16 h-56 w-56 rounded-full blur-3xl ${secundario ? "bg-blue-500/25" : "bg-sky-100"}`} />
        <div className="relative flex items-center justify-between"><span className={`rounded-2xl p-4 ${secundario ? "bg-white/10 text-sky-300" : "bg-blue-50 text-acento"}`}><Icone className="h-8 w-8" /></span><span className={`text-[10px] font-semibold tracking-[0.16em] ${secundario ? "text-sky-200" : "text-slate-400"}`}>{etiqueta}</span></div>
        <h2 className="relative mt-8 text-2xl font-bold">{titulo}</h2>
        <p className={`relative mt-3 min-h-24 text-sm leading-7 ${secundario ? "text-slate-300" : "text-slate-500"}`}>{descricao}</p>
        <ul className="relative mt-6 space-y-3 text-sm">{detalhes.map((d, i) => <li key={d} className="flex items-center gap-2">{i ? <BarChart3 className="h-4 w-4 text-teal" /> : <Users className="h-4 w-4 text-teal" />}{d}</li>)}</ul>
        <div className={`relative mt-8 flex items-center justify-between border-t pt-6 font-semibold ${secundario ? "border-white/10 text-sky-300" : "border-slate-100 text-acento"}`}>Acessar ambiente <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /></div>
      </Link>)}</div>
      <p className="mt-8 flex items-center gap-2 text-xs text-slate-400"><Building2 className="h-4 w-4" /> Cada sistema possui dados e equipe próprios. <Zap className="ml-1 h-3 w-3" /></p>
    </main>
  </div>;
}
