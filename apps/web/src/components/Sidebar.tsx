"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bot, Calendar, ChevronDown, Filter, Home, LogOut, Send, Settings, Target, UserPen, Zap } from "lucide-react";
import { Logo } from "./ui";

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

export function Sidebar({ pendentes = 0 }: { pendentes?: number }) {
  const path = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/login";
  }

  return (
    <aside className="flex w-16 shrink-0 flex-col bg-navy text-slate-200 md:w-64">
      <div className="px-4 py-7 md:px-6 [&_span]:hidden md:[&_span]:inline">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 px-2 md:px-3">
        {ITENS.map(({ href, rotulo, icone: Icone, contador }) => {
          const ativo = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={rotulo}
              title={rotulo}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] transition md:px-4 ${ativo ? "bg-gradient-to-r from-acento to-navy-2 text-white shadow" : "hover:bg-white/5"}`}
            >
              <Icone className="h-5 w-5" />
              <span className="hidden flex-1 md:block">{rotulo}</span>
              {contador && pendentes > 0 && <span className="absolute right-0 top-0 rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white md:static md:px-2">{pendentes}</span>}
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
          className="flex w-full items-center gap-3 rounded-lg text-left transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-acento/60"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-acento font-semibold text-white">GI</div>
          <div className="hidden flex-1 md:block">
            <p className="text-sm font-medium text-white">Gestor ImperSul</p>
            <p className="text-xs text-slate-400">Gestor de equipe</p>
          </div>
          <ChevronDown className={`hidden h-4 w-4 transition md:block ${menuAberto ? "rotate-180" : ""}`} />
        </button>

        {menuAberto && (
          <div role="menu" className="fixed bottom-20 left-3 z-50 w-52 overflow-hidden rounded-lg border border-white/10 bg-navy-2 py-1 shadow-xl md:static md:mt-3 md:w-auto">
            <Link
              href="/configuracoes"
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
