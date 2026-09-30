import { Building2, CalendarPlus, CheckSquare, FileText, Mail, MessageCircle, SkipForward, XCircle, Zap } from "lucide-react";
import { Badge, Botao, Card, CardTitulo, Esboco } from "@/components/ui";

// TODO: GET /api/leads/:id + ações (qualificação, agendar, avançar, desqualificar)
export default async function LeadDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <Card className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="rounded-xl bg-blue-50 p-3 text-acento"><Building2 className="h-7 w-7" /></div>
            <div>
              <h1 className="text-2xl font-bold text-navy">Monteiro Engenharia</h1>
              <p className="text-sm text-slate-500">CNPJ 10.111.***/0001-90 · Construção de edifícios · Curitiba/PR · lead #{id}</p>
              <div className="mt-2 flex gap-2"><Badge tom="azul">Reunião marcada</Badge><Badge tom="vermelho">Prioridade alta</Badge></div>
            </div>
          </div>
          <div className="flex gap-2">
            <Botao><CalendarPlus className="h-4 w-4" /> Agendar</Botao>
            <Botao variante="secundario"><SkipForward className="h-4 w-4" /> Avançar etapa</Botao>
            <Botao variante="perigo"><XCircle className="h-4 w-4" /> Desqualificar</Botao>
          </div>
        </div>
        <div className="mt-5 flex items-start gap-3 rounded-xl bg-amber-50 p-4">
          <Zap className="h-5 w-5 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-800">Por que agora</p>
            <p className="text-sm text-amber-700">Nova obra no CNO: corporativo de 15.200 m² no Batel (Curitiba) — detectada em 20/08/2026.</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitulo titulo="Conversa" subtitulo="E-mail e WhatsApp em ordem cronológica." />
          <div className="space-y-3">
            <div className="max-w-[80%] rounded-xl bg-blue-50 p-3 text-sm"><p className="mb-1 flex items-center gap-1 text-xs text-slate-500"><Mail className="h-3 w-3" /> Enviado · e-mail</p>Olá, Cláudio, vi que vocês registraram a obra no Batel…</div>
            <div className="ml-auto max-w-[80%] rounded-xl bg-emerald-50 p-3 text-sm"><p className="mb-1 flex items-center gap-1 text-xs text-slate-500"><MessageCircle className="h-3 w-3" /> Resposta · e-mail</p>Podemos conversar na quinta? O corporativo tem 4 subsolos…</div>
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardTitulo icone={CheckSquare} titulo="Qualificação" subtitulo="Obrigatória antes de agendar." />
            {["Necessidade", "Momento", "Encaixe"].map((c) => (
              <label key={c} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" defaultChecked /> {c}</label>
            ))}
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" /> Forçar manualmente</label>
          </Card>
          <Card>
            <CardTitulo icone={FileText} titulo="Briefing pré-reunião" />
            <Esboco>Briefing gerado ao agendar</Esboco>
          </Card>
        </div>
      </div>
    </>
  );
}
