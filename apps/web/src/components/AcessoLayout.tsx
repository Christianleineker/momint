import type { ReactNode } from "react";
import { ListOrdered, Radar, UserCheck } from "lucide-react";
import { Logo } from "./ui";

const PILARES = [
  { icone: Radar, titulo: "Gatilhos em dados públicos", texto: "Obras, licitações e CNPJs novos, direto de fontes oficiais." },
  { icone: ListOrdered, titulo: "Prioridade automática", texto: "Cada empresa recebe um score para você atacar o que importa primeiro." },
  { icone: UserCheck, titulo: "Aprovação humana", texto: "Nenhuma mensagem sai sem a sua aprovação." },
];

/** Layout dividido das telas de acesso (recuperação e redefinição de senha). */
export function AcessoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[45%_1fr]">
      <aside className="hidden flex-col justify-between bg-navy px-12 py-12 text-white lg:flex">
        <Logo />
        <div className="space-y-10">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold leading-tight">Prospecção B2B <span className="text-sky-400">no momento certo</span></h2>
            <p className="max-w-md text-base leading-relaxed text-slate-300">Encontre empresas no instante em que um sinal público indica necessidade, e aborde com aprovação humana.</p>
          </div>
          <ul className="space-y-6">
            {PILARES.map(({ icone: Icone, titulo, texto }) => (
              <li key={titulo} className="flex gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-teal">
                  <Icone aria-hidden="true" className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{titulo}</p>
                  <p className="text-sm leading-relaxed text-slate-300">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-400">Momint · Prospecção B2B</p>
      </aside>
      <div className="flex min-w-0 flex-col bg-fundo">
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex justify-center lg:hidden">
              <Logo claro={false} />
            </div>
            {children}
          </div>
        </main>
        <footer className="px-6 py-5 text-center text-xs text-slate-400">© 2026 Momint</footer>
      </div>
    </div>
  );
}
