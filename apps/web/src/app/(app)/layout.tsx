import { Sidebar } from "@/components/Sidebar";
import { obterPerfil } from "@/lib/sessao-servidor";
import { AmbienteCliente } from "@/components/AmbienteCliente";
import Link from "next/link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const perfil = await obterPerfil();
  return (
    <div className="flex min-h-screen">
      <Sidebar perfil={perfil} pendentes={perfil.aprovacoesPendentes} />
      <main className="min-w-0 flex-1 px-4 py-7 sm:px-8">
        {perfil.cliente.demonstrativo && <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-acento"><span>Sistema demonstrativo · {perfil.cliente.nome}</span>{perfil.papel === "ADMIN" && <Link href="/acessos" className="font-semibold hover:underline">Trocar ambiente →</Link>}</div>}
        {perfil.cliente.demonstrativo ? children : <AmbienteCliente perfil={perfil} />}
      </main>
    </div>
  );
}
