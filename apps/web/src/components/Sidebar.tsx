"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Calendar, ChevronDown, Filter, Home, Send, Settings, Target, Zap } from "lucide-react";
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
      <div className="flex items-center gap-3 border-t border-white/10 px-5 py-5">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-acento font-semibold text-white">GI</div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">Gestor ImperSul</p>
          <p className="text-xs text-slate-400">Gestor de equipe</p>
        </div>
        <ChevronDown className="h-4 w-4" />
      </div>
    </aside>
  );
}
