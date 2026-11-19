import { Sidebar } from "@/components/Sidebar";
import { COOKIE_MENU } from "@/lib/menu";
import { obterPerfil } from "@/lib/sessao-servidor";
import { AmbienteCliente } from "@/components/AmbienteCliente";
import Link from "next/link";
import { cookies } from "next/headers";
import { BoasVindas } from "@/components/AcessoInicial";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [perfil, cookieStore] = await Promise.all([obterPerfil(), cookies()]);
  const recolhido = cookieStore.get(COOKIE_MENU)?.value === "recolhido";
  return (
    <div className="flex min-h-screen">
      <Sidebar perfil={perfil} pendentes={perfil.aprovacoesPendentes} recolhidoInicial={recolhido} />
      <BoasVindas perfil={perfil} />
      <main className="mx-auto min-w-0 w-full max-w-[1280px] flex-1 px-4 py-7 sm:px-8">
        {perfil.cliente.demonstrativo && <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-acento"><span>Sistema demonstrativo · {perfil.cliente.nome}</span>{perfil.papel === "ADMIN" && <Link href="/acessos" className="font-semibold hover:underline">Trocar ambiente →</Link>}</div>}
        {perfil.cliente.demonstrativo ? children : <AmbienteCliente perfil={perfil} />}
      </main>
    </div>
  );
}
