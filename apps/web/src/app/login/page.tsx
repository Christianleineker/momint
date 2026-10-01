import { ArrowRight, BarChart3, Lock, Mail, MessageCircle, Users, Zap } from "lucide-react";
import { Logo } from "@/components/ui";

const DESTAQUES = [
  { icone: Zap, titulo: "Gatilhos em tempo real", texto: "Obras, licitações e CNPJs novos monitorados." },
  { icone: Users, titulo: "Leads no momento certo", texto: "Fit de ICP + gatilho fresco = prioridade." },
  { icone: BarChart3, titulo: "Reuniões qualificadas", texto: "Da abordagem ao briefing, com revisão humana." },
];

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-center gap-10 bg-navy px-16 text-white lg:flex">
        <Logo />
        <p className="text-xs tracking-[0.3em] text-slate-400">RELACIONAMENTO • PROCESSOS • RESULTADOS</p>
        <h1 className="text-5xl font-bold leading-tight">
          Timing vence <span className="text-sky-400">volume</span>
        </h1>
        <ul className="space-y-6">
          {DESTAQUES.map(({ icone: Icone, titulo, texto }) => (
            <li key={titulo} className="flex gap-4">
              <div className="rounded-xl bg-white/10 p-3">
                <Icone className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">{titulo}</p>
                <p className="text-sm text-slate-300">{texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-center p-6">
        {/* TODO: POST /api/auth/login e redirecionar para /dashboard */}
        <form className="w-full max-w-md space-y-5 rounded-2xl bg-white p-10 shadow-lg">
          <div className="flex justify-center">
            <Logo claro={false} />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-navy">Entrar na plataforma</h2>
            <p className="text-sm text-slate-500">Acesse sua conta para acompanhar leads, reuniões e automações.</p>
          </div>
          <label className="block">
            <span className="text-sm font-medium">E-mail</span>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
              <Mail className="h-4 w-4 text-slate-400" />
              <input type="email" placeholder="seu@email.com" className="flex-1 outline-none" />
            </div>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Senha</span>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
              <Lock className="h-4 w-4 text-slate-400" />
              <input type="password" placeholder="Digite sua senha" className="flex-1 outline-none" />
            </div>
          </label>
          <div className="flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-acento focus:ring-acento" />
              Lembrar de mim
            </label>
            <button type="button" className="text-sm font-medium text-acento transition hover:text-blue-700">
              Esqueci a senha?
            </button>
          </div>
          <button type="button" className="flex w-full items-center justify-center gap-2 rounded-lg bg-acento py-3 font-medium text-white">
            Entrar <ArrowRight className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase text-slate-400">ou</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <button type="button" className="flex w-full items-center justify-center gap-2 text-sm font-medium text-acento transition hover:text-blue-700">
            <MessageCircle className="h-5 w-5" />
            Falar com o suporte
          </button>
        </form>
      </div>
    </div>
  );
}
