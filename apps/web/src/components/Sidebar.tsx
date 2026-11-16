"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bot, Calendar, ChevronDown, Filter, Home, LogOut, Menu, Send, Settings, Target, UserPen, Zap } from "lucide-react";
import { Logo } from "./ui";
import { ROTULO_PAPEL, type Perfil } from "@/lib/perfil";
import { COOKIE_MENU } from "@/lib/menu";

const ITENS = [
  { href: "/dashboard", rotulo: "Dashboard", icone: Home },
  { href: "/gatilhos", rotulo: "Gatilhos", icone: Zap },
  { href: "/leads", rotulo: "Leads", icone: Filter },
  { href: "/abordagens", rotulo: "Abordagens", icone: Send, contador: true },
  { href: "/automacao", rotulo: "Automação", icone: Bot },
  { href: "/reunioes", rotulo: "Reuniões", icone: Calendar },
  { href: "/segmentacao", rotulo: "Filtro e Segmentação", icone: Target },
  { href: "/configuracoes", rotulo: "Configurações", icone: Settings },
];

export function Sidebar({ pendentes = 0, perfil, recolhidoInicial = false }: { pendentes?: number; perfil: Perfil; recolhidoInicial?: boolean }) {
  const path = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const [recolhido, setRecolhido] = useState(recolhidoInicial);

  // Abaixo de `md` a barra já é uma trilha de ícones: o recolhimento manual
  // vale de `md` para cima, que é onde o botão aparece.
  const rotulo = recolhido ? "hidden" : "hidden md:block";

  function alternar() {
    setRecolhido((atual) => {
      const proximo = !atual;
      document.cookie = `${COOKIE_MENU}=${proximo ? "recolhido" : "expandido"}; path=/; max-age=31536000; samesite=lax`;
      return proximo;
    });
    setMenuAberto(false);
  }

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/login";
  }

  return (
    <aside id="menu-lateral" className={`flex shrink-0 flex-col bg-navy text-slate-200 transition-[width] duration-200 ${recolhido ? "w-16" : "w-16 md:w-64"}`}>
      <div className={`px-4 py-7 md:px-6 ${recolhido ? "flex flex-col items-center gap-5" : "flex items-center justify-between gap-2"}`}>
        <div className={recolhido ? "[&_span]:hidden" : "[&_span]:hidden md:[&_span]:inline"}>
          <Logo />
        </div>
        <button
          type="button"
          onClick={alternar}
          aria-expanded={!recolhido}
          aria-controls="menu-lateral"
          aria-label={recolhido ? "Expandir menu" : "Recolher menu"}
          title={recolhido ? "Expandir menu" : "Recolher menu"}
          className="hidden shrink-0 rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-acento md:block"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-2 md:px-3">
        {perfil.papel === "ADMIN" && <Link href="/acessos" title="Ambientes e Painel Admin" className="mb-3 block rounded-lg border border-white/10 px-3 py-3 text-xs text-sky-300 md:px-4"><span className={rotulo}>← Ambientes e Painel Admin</span><span className={recolhido ? "block text-center" : "md:hidden"}>←</span></Link>}
        {ITENS.map(({ href, rotulo: nome, icone: Icone, contador }) => {
          const ativo = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={nome}
              title={nome}
              className={`relative flex items-center gap-3 rounded-xl py-3 text-[15px] transition ${recolhido ? "justify-center px-3" : "px-3 md:px-4"} ${ativo ? "bg-gradient-to-r from-acento to-navy-2 text-white shadow" : "hover:bg-white/5"}`}
            >
              <Icone className="h-5 w-5 shrink-0" />
              <span className={`flex-1 ${rotulo}`}>{nome}</span>
              {contador && pendentes > 0 && <span className={`rounded-full bg-red-500 text-xs font-semibold text-white ${recolhido ? "absolute right-0 top-0 px-1.5" : "absolute right-0 top-0 px-1.5 md:static md:px-2"}`}>{pendentes}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-3 py-5 md:px-5">
        <button
          type="button"
          onClick={() => setMenuAberto((aberto) => !aberto)}
          aria-expanded={menuAberto}
          aria-haspopup="menu"
          aria-label="Menu do usuário"
          title="Menu do usuário"
          className={`flex w-full items-center gap-3 rounded-lg text-left transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-acento/60 ${recolhido ? "justify-center" : ""}`}
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-acento font-semibold text-white">{perfil.nome.split(" ").filter(Boolean).slice(0, 2).map(n => n[0]).join("")}</div>
          <div className={`flex-1 ${rotulo}`}>
            <p className="text-sm font-medium text-white">{perfil.nome}</p>
            <p className="text-xs text-slate-400">{ROTULO_PAPEL[perfil.papel]}</p>
            <p className="mt-1 text-xs text-slate-400">{perfil.cliente.nome}</p>
          </div>
          <ChevronDown className={`h-4 w-4 transition ${recolhido ? "hidden" : "hidden md:block"} ${menuAberto ? "rotate-180" : ""}`} />
        </button>

        {menuAberto && (
          <div role="menu" className={`fixed bottom-20 left-3 z-50 w-52 overflow-hidden rounded-lg border border-white/10 bg-navy-2 py-1 shadow-xl ${recolhido ? "left-16" : "md:static md:mt-3 md:w-auto"}`}>
            <Link
              href="/configuracoes?aba=perfil"
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10"
              onClick={() => setMenuAberto(false)}
            >
              <UserPen className="h-4 w-4" />
              Editar perfil
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={sair}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-200 transition hover:bg-red-500/10 hover:text-red-100"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
