import { CalendarDays, MessageSquareQuote, MoreHorizontal, Save, ShieldCheck, UserPlus, Users } from "lucide-react";
import { Badge, Botao, Cabecalho, Card, CardTitulo } from "@/components/ui";
import { ConfiguracoesAbas } from "@/components/ConfiguracoesAbas";
import { obterPerfil } from "@/lib/sessao-servidor";

// TODO: GET/PUT /api/configuracoes + POST/PATCH /api/usuarios
const USUARIOS = [
  { nome: "Gestor ImperSul", email: "gestor@impersul.com.br", papel: "Gestor", ativo: true },
  { nome: "Rafael Nunes", email: "rafael@impersul.com.br", papel: "Vendedor", ativo: true },
  { nome: "Carla Dias", email: "carla@impersul.com.br", papel: "Vendedor", ativo: true },
] as const;
const PAPEL_TOM = { Gestor: "roxo", Vendedor: "azul", Atendente: "cinza" } as const;
const iniciais = (nome: string) => nome.split(" ").map((parte) => parte[0]).slice(0, 2).join("");

export default async function ConfiguracoesPage() {
  const perfil = await obterPerfil();
  return (
    <ConfiguracoesAbas perfil={perfil}>
      <Cabecalho titulo="Configurações" subtitulo="Voz da marca, operação, calendário e equipe." acoes={<Botao><Save aria-hidden="true" className="h-4 w-4" /> Salvar</Botao>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitulo icone={MessageSquareQuote} titulo="Voz da marca" subtitulo="Tom das mensagens geradas." />
          <div className="grid grid-cols-3 gap-2">
            {["Consultivo", "Direto", "Próximo"].map((v, i) => (
              <label key={v} className={`cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition ${i === 0 ? "border-acento bg-blue-50 text-acento" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                <input type="radio" name="voz" defaultChecked={i === 0} className="sr-only" /> {v}
              </label>
            ))}
          </div>
          <textarea aria-label="Assinatura de e-mail" placeholder="Assinatura de e-mail" className="mt-3 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-acento" rows={2} />
        </Card>
        <Card>
          <CardTitulo icone={ShieldCheck} titulo="Modo de operação" />
          <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm">
            <span><b className="text-navy">Autopilot</b> — enviar sem aprovação</span>
            <input type="checkbox" className="h-4 w-4 accent-blue-600" />
          </label>
          <p className="mt-2 text-xs text-slate-500">Desligado = Copiloto (padrão): tudo passa pela fila de aprovação.</p>
        </Card>
        <Card>
          <CardTitulo icone={CalendarDays} titulo="Integração de calendário" />
          <div className="flex flex-wrap gap-3">
            <Botao variante="secundario">Conectar Google Agenda</Botao>
            <Botao variante="secundario">Conectar Outlook</Botao>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardTitulo icone={Users} titulo="Equipe" subtitulo={`${USUARIOS.length} usuários com acesso ao Momint`} extra={<Botao><UserPlus aria-hidden="true" className="h-4 w-4" /> Adicionar usuário</Botao>} />
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Nome</th>
                  <th scope="col" className="px-4 py-3 font-medium">E-mail</th>
                  <th scope="col" className="px-4 py-3 font-medium">Papel</th>
                  <th scope="col" className="px-4 py-3 font-medium">Situação</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {USUARIOS.map((u) => (
                  <tr key={u.email} className="transition hover:bg-blue-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-acento/10 text-xs font-semibold text-acento">{iniciais(u.nome)}</span>
                        <span className="font-semibold text-navy">{u.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3"><Badge tom={PAPEL_TOM[u.papel]}>{u.papel}</Badge></td>
                    <td className="px-4 py-3"><Badge tom={u.ativo ? "verde" : "cinza"}>{u.ativo ? "Ativo" : "Inativo"}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" aria-label={`Ações de ${u.nome}`} title="Ações" className="inline-grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-navy">
                        <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </ConfiguracoesAbas>
  );
}
