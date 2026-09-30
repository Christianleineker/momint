import { Bot, Mail, MessageCircle, Plus, Save, ShieldCheck, StopCircle } from "lucide-react";
import { Botao, Cabecalho, Card, CardTitulo } from "@/components/ui";

// TODO: GET/PUT /api/cadencia
const PASSOS = [
  { dia: 0, canal: "EMAIL", titulo: "Primeira abordagem citando o gatilho" },
  { dia: 2, canal: "WHATSAPP", titulo: "Follow-up curto" },
  { dia: 5, canal: "EMAIL", titulo: "Case de obra similar" },
  { dia: 9, canal: "WHATSAPP", titulo: "Último toque" },
];
const PARADAS = ["Lead respondeu", "Opt-out do contato", "Reunião marcada"];

export default function AutomacaoPage() {
  return (
    <>
      <Cabecalho titulo="Automação" subtitulo="Cadência de contato por canal e modo de operação." acoes={<Botao><Save className="h-4 w-4" /> Salvar</Botao>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitulo icone={Bot} titulo="Passos da cadência" subtitulo="Dias contados a partir da primeira abordagem." extra={<Botao variante="secundario"><Plus className="h-4 w-4" /> Passo</Botao>} />
          <ol className="relative space-y-3 border-l-2 border-slate-100 pl-6">
            {PASSOS.map((p) => (
              <li key={p.dia} className="flex items-center gap-4 rounded-xl border border-slate-100 p-4">
                <span className="w-16 font-semibold text-navy">Dia {p.dia}</span>
                {p.canal === "EMAIL" ? <Mail className="h-5 w-5 text-acento" /> : <MessageCircle className="h-5 w-5 text-emerald-600" />}
                <span className="flex-1 text-sm">{p.titulo}</span>
              </li>
            ))}
          </ol>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardTitulo icone={ShieldCheck} titulo="Modo de operação" />
            <label className="flex items-start gap-3 rounded-xl border-2 border-acento p-3">
              <input type="radio" name="modo" defaultChecked className="mt-1" />
              <span><b>Copiloto</b> (padrão)<br /><span className="text-xs text-slate-500">Toda mensagem passa pela fila de aprovação.</span></span>
            </label>
            <label className="mt-2 flex items-start gap-3 rounded-xl border border-slate-200 p-3">
              <input type="radio" name="modo" className="mt-1" />
              <span><b>Autopilot</b><br /><span className="text-xs text-slate-500">Envia sem revisão humana.</span></span>
            </label>
          </Card>
          <Card>
            <CardTitulo icone={StopCircle} titulo="Condições de parada" />
            {PARADAS.map((c) => (
              <label key={c} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" defaultChecked /> {c}</label>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}
