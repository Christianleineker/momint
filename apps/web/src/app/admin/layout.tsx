import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck, UserRound } from "lucide-react";
import { obterPerfil } from "@/lib/sessao-servidor";
import { Logo } from "@/components/ui";
import { Sair } from "@/components/Sair";
import { NotificacoesAdmin } from "@/components/NotificacoesAdmin";
import { SuporteAdminLink } from "@/components/SuporteAdminLink";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const perfil = await obterPerfil();
  if (perfil.papel !== "ADMIN") redirect("/dashboard");
  return <div className="min-h-screen"><header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-10"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"><Logo claro={false} /><div className="flex items-center gap-3"><Link href="/admin" className="hidden text-sm text-slate-500 sm:block">Clientes</Link><Link href="/acessos" className="inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="h-4 w-4" /> Ambientes</Link><span className="hidden items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-acento lg:inline-flex"><ShieldCheck className="h-4 w-4" /> {perfil.email}</span><SuporteAdminLink /><NotificacoesAdmin /><Link href="/admin/perfil" aria-label="Editar meu perfil" title="Editar meu perfil" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:text-acento"><UserRound className="h-5 w-5" /></Link><Sair /></div></div></header><main className="mx-auto max-w-7xl px-5 py-9 sm:px-10">{children}</main></div>;
}
