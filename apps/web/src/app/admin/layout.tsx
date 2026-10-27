import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { obterPerfil } from "@/lib/sessao-servidor";
import { Logo } from "@/components/ui";
import { Sair } from "@/components/Sair";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const perfil = await obterPerfil();
  if (perfil.papel !== "ADMIN") redirect("/dashboard");
  return <div className="min-h-screen"><header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-10"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"><Logo claro={false} /><div className="flex items-center gap-4"><Link href="/acessos" className="inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="h-4 w-4" /> Ambientes</Link><span className="hidden items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-acento sm:inline-flex"><ShieldCheck className="h-4 w-4" /> {perfil.email}</span><Sair /></div></div></header><main className="mx-auto max-w-7xl px-5 py-9 sm:px-10">{children}</main></div>;
}
