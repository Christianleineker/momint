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
    <aside className="flex w-64 shrink-0 flex-col bg-navy text-slate-200">
      <div className="px-6 py-7">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {ITENS.map(({ href, rotulo, icone: Icone, contador }) => {
          const ativo = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] transition ${ativo ? "bg-gradient-to-r from-acento to-navy-2 text-white shadow" : "hover:bg-white/5"}`}
            >
              <Icone className="h-5 w-5" />
              <span className="flex-1">{rotulo}</span>
              {contador && pendentes > 0 && <span className="rounded-full bg-red-500 px-2 text-xs font-semibold text-white">{pendentes}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-5 py-5">
        <button
          type="button"
          onClick={() => setMenuAberto((aberto) => !aberto)}
          aria-expanded={menuAberto}
          aria-haspopup="menu"
          className="flex w-full items-center gap-3 rounded-lg text-left transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-acento/60"
        >
          <div className="grid h-10 w-10 place-items-center rounded-full bg-acento font-semibold text-white">GI</div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Gestor ImperSul</p>
            <p className="text-xs text-slate-400">Gestor de equipe</p>
          </div>
          <ChevronDown className={`h-4 w-4 transition ${menuAberto ? "rotate-180" : ""}`} />
        </button>

        {menuAberto && (
          <div role="menu" className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-navy-2 py-1 shadow-xl">
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
