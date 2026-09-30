import { CalendarDays, MessageSquareQuote, Save, ShieldCheck, UserPlus, Users } from "lucide-react";
import { Badge, Botao, Cabecalho, Card, CardTitulo } from "@/components/ui";

// TODO: GET/PUT /api/configuracoes + POST/PATCH /api/usuarios
const USUARIOS = [
  { nome: "Gestor ImperSul", email: "gestor@impersul.com.br", papel: "Admin" },
  { nome: "Rafael Nunes", email: "rafael@impersul.com.br", papel: "Vendedor" },
  { nome: "Carla Dias", email: "carla@impersul.com.br", papel: "Vendedor" },
];

export default function ConfiguracoesPage() {
  return (
    <>
      <Cabecalho titulo="Configurações" subtitulo="Voz da marca, operação, calendário e equipe." acoes={<Botao><Save className="h-4 w-4" /> Salvar</Botao>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitulo icone={MessageSquareQuote} titulo="Voz da marca" subtitulo="Tom das mensagens geradas." />
          <div className="grid grid-cols-3 gap-2">
            {["Consultivo", "Direto", "Próximo"].map((v, i) => (
              <label key={v} className={`rounded-xl border p-3 text-center text-sm ${i === 0 ? "border-acento bg-blue-50 text-acento" : "border-slate-200"}`}>
                <input type="radio" name="voz" defaultChecked={i === 0} className="sr-only" /> {v}
              </label>
            ))}
          </div>
          <textarea placeholder="Assinatura de e-mail" className="mt-3 w-full rounded-lg border border-slate-200 p-3 text-sm" rows={2} />
        </Card>
        <Card>
          <CardTitulo icone={ShieldCheck} titulo="Modo de operação" />
          <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm">
            <span><b>Autopilot</b> — enviar sem aprovação</span>
            <input type="checkbox" />
          </label>
          <p className="mt-2 text-xs text-slate-500">Desligado = Copiloto (padrão): tudo passa pela fila de aprovação.</p>
        </Card>
        <Card>
          <CardTitulo icone={CalendarDays} titulo="Integração de calendário" />
          <div className="flex gap-3">
            <Botao variante="secundario">Conectar Google Agenda</Botao>
            <Botao variante="secundario">Conectar Outlook</Botao>
          </div>
        </Card>
        <Card>
          <CardTitulo icone={Users} titulo="Usuários" extra={<Botao variante="secundario"><UserPlus className="h-4 w-4" /> Convidar</Botao>} />
          <ul className="divide-y divide-slate-100">
            {USUARIOS.map((u) => (
              <li key={u.email} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-navy">{u.nome}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
                <Badge tom={u.papel === "Admin" ? "roxo" : "azul"}>{u.papel}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
