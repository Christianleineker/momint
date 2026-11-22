"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bot, Calendar, ChevronRight, Filter, Home, LogOut, Menu, Send, Settings, Target, UserPen, Zap } from "lucide-react";
import { Logo } from "./ui";
import { ROTULO_PAPEL, type Perfil } from "@/lib/perfil";
import { COOKIE_MENU } from "@/lib/menu";
import { requisitar } from "@/lib/api";

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
  const botaoUsuario = useRef<HTMLButtonElement>(null);
  const painelUsuario = useRef<HTMLDivElement>(null);
  const iniciais = perfil.nome.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("");
  const [dica, setDica] = useState<{ texto: string; top: number; left: number } | null>(null);

  // Dica ao passar o mouse (ou focar pelo teclado) quando o nome não está visível:
  // menu recolhido ou tela estreita. `sempre` vale para botões que só têm ícone.
  // A dica é fixa e fica fora da lista rolável, para não ser cortada pela borda do menu.
  function abrirDica(alvo: HTMLElement, texto: string, sempre: boolean) {
    const nomeVisivel = !recolhido && window.matchMedia("(min-width: 768px)").matches;
    if (nomeVisivel && !sempre) return;
    const caixa = alvo.getBoundingClientRect();
    setDica({ texto, top: caixa.top + caixa.height / 2, left: caixa.right + 10 });
  }
  const comDica = (texto: string, sempre = false) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => abrirDica(e.currentTarget, texto, sempre),
    onFocus: (e: React.FocusEvent<HTMLElement>) => abrirDica(e.currentTarget, texto, sempre),
    onMouseLeave: () => setDica(null),
    onBlur: () => setDica(null),
  });

  useEffect(() => setDica(null), [path]);

  // O painel do usuário flutua ao lado do menu: fecha ao clicar fora ou com Esc.
  useEffect(() => {
    if (!menuAberto) return;
    function fora(event: PointerEvent) {
      const alvo = event.target as Node;
      if (!painelUsuario.current?.contains(alvo) && !botaoUsuario.current?.contains(alvo)) setMenuAberto(false);
    }
    function escapar(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenuAberto(false);
      botaoUsuario.current?.focus();
    }
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", escapar);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", escapar);
    };
  }, [menuAberto]);

  // Abaixo de `md` a barra já é uma trilha de ícones: o recolhimento manual
  // vale de `md` para cima, que é onde o botão aparece.
  const rotulo = recolhido ? "hidden" : "hidden md:block";

  function alternar() {
    setRecolhido((atual) => {
      const proximo = !atual;
      document.cookie = `${COOKIE_MENU}=${proximo ? "recolhido" : "expandido"}; path=/; samesite=lax`;
      return proximo;
    });
    setMenuAberto(false);
    setDica(null);
  }

  async function sair() {
    await requisitar("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/login";
  }

  return (
    <aside id="menu-lateral" data-recolhido={recolhido ? "true" : "false"} className={`peer sticky top-0 flex h-dvh shrink-0 flex-col self-start bg-navy text-slate-200 transition-[width] duration-200 ${recolhido ? "w-16" : "w-16 md:w-64"}`}>
      <div className={`px-4 py-7 md:px-6 ${recolhido ? "flex flex-col items-center gap-5" : "flex items-center justify-between gap-2"}`}>
        {/* Recolhido, o topo fica só com o hamburguer. Abaixo de `md` não há
            botão, então a marca continua ali para o cabeçalho não ficar vazio. */}
        <div className={recolhido ? "[&_span]:hidden md:hidden" : "[&_span]:hidden md:[&_span]:inline"}>
          <Logo />
        </div>
        <button
          type="button"
          onClick={alternar}
          aria-expanded={!recolhido}
          aria-controls="menu-lateral"
          aria-label={recolhido ? "Expandir menu" : "Recolher menu"}
          {...comDica(recolhido ? "Expandir menu" : "Recolher menu", true)}
          className="hidden shrink-0 rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-acento md:block"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      <nav onScroll={() => setDica(null)} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 md:px-3">
        {perfil.papel === "ADMIN" && <Link href="/acessos" aria-label="Ambientes e Painel Admin" {...comDica("Ambientes e Painel Admin")} className="mb-3 block rounded-lg border border-white/10 px-3 py-3 text-xs text-sky-300 md:px-4"><span className={rotulo}>← Ambientes e Painel Admin</span><span className={recolhido ? "block text-center" : "md:hidden"}>←</span></Link>}
        {ITENS.map(({ href, rotulo: nome, icone: Icone, contador }) => {
          const ativo = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              /* As rotas são dinâmicas (o layout lê a sessão), e nesse caso o
                 Next não pré-carrega sozinho: a primeira visita a cada tela
                 pagava o download do JS da rota no clique. */
              prefetch
              aria-label={nome}
              {...comDica(contador && pendentes > 0 ? `${nome} · ${pendentes} ${pendentes === 1 ? "pendente" : "pendentes"}` : nome)}
              className={`relative flex items-center gap-3 rounded-xl py-3 text-[15px] transition ${recolhido ? "justify-center px-3" : "px-3 md:px-4"} ${ativo ? "bg-navy-2 text-white shadow-sm before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r before:bg-teal" : "hover:bg-white/5"}`}
            >
              <Icone className="h-5 w-5 shrink-0" />
              <span className={`flex-1 ${rotulo}`}>{nome}</span>
              {contador && pendentes > 0 && <span className={`rounded-full bg-red-500 text-xs font-semibold text-white ${recolhido ? "absolute right-0 top-0 px-1.5" : "absolute right-0 top-0 px-1.5 md:static md:px-2"}`}>{pendentes}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button
          ref={botaoUsuario}
          type="button"
          onClick={() => { setMenuAberto((aberto) => !aberto); setDica(null); }}
          aria-expanded={menuAberto}
          aria-haspopup="menu"
          aria-controls={menuAberto ? "painel-usuario" : undefined}
          aria-label="Menu do usuário"
          {...comDica(`${perfil.nome} · ${ROTULO_PAPEL[perfil.papel]}`)}
          className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-acento/60 ${menuAberto ? "bg-white/5" : ""} ${recolhido ? "justify-center" : ""}`}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-acento text-sm font-semibold text-white ring-2 ring-white/10">{iniciais}</span>
          <span className={`min-w-0 flex-1 ${rotulo}`}>
            <span className="block truncate text-sm font-medium text-white">{perfil.nome}</span>
            <span className="block truncate text-xs text-slate-400">{ROTULO_PAPEL[perfil.papel]}</span>
          </span>
          <ChevronRight aria-hidden="true" className={`h-4 w-4 shrink-0 transition ${rotulo} ${menuAberto ? "translate-x-0.5 text-slate-200" : "text-slate-500"}`} />
        </button>

        {menuAberto && (
          <div
            ref={painelUsuario}
            id="painel-usuario"
            className={`fixed bottom-3 z-50 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xl ${recolhido ? "left-[72px]" : "left-[72px] md:left-[264px]"}`}
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-acento text-sm font-semibold text-white">{iniciais}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy">{perfil.nome}</p>
                <p className="truncate text-xs text-slate-500">{ROTULO_PAPEL[perfil.papel]}</p>
                <p className="truncate text-xs text-slate-400">{perfil.cliente.nome}</p>
              </div>
            </div>
            <div role="menu" aria-label="Opções do usuário" className="p-1">
              <Link
                href="/configuracoes?aba=perfil"
                role="menuitem"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none transition hover:bg-slate-50 focus-visible:bg-slate-50"
                onClick={() => setMenuAberto(false)}
              >
                <UserPen aria-hidden="true" className="h-4 w-4 text-slate-500" />
                Editar perfil
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={sair}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-red-600 outline-none transition hover:bg-red-50 focus-visible:bg-red-50"
              >
                <LogOut aria-hidden="true" className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>
        )}
      </div>
      {dica && !menuAberto && (
        <span role="tooltip" style={{ top: dica.top, left: dica.left }} className="pointer-events-none fixed z-[60] -translate-y-1/2 whitespace-nowrap rounded-md bg-navy-2 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg ring-1 ring-white/10">
          <span aria-hidden="true" className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-navy-2" />
          {dica.texto}
        </span>
      )}
    </aside>
  );
}
