import { Building2, CalendarPlus, Check, CheckSquare, FileText, Mail, MessageCircle, SkipForward, XCircle, Zap } from "lucide-react";
import { Badge, Botao, Card, CardTitulo } from "@/components/ui";

// TODO: GET /api/leads/:id + ações (qualificação, agendar, avançar, desqualificar)
const ETAPAS = [
  { rotulo: "Gatilho detectado", detalhe: "Nova obra no CNO: corporativo de 15.200 m² no Batel (Curitiba), detectada em 20/08/2026." },
  { rotulo: "Rascunho gerado pela IA" },
  { rotulo: "Aprovado por você" },
  { rotulo: "Enviado por e-mail", mensagem: { envio: true, texto: "Olá, Cláudio, vi que vocês registraram a obra no Batel…" } },
  { rotulo: "Respondido", mensagem: { envio: false, texto: "Podemos conversar na quinta? O corporativo tem 4 subsolos…" } },
  { rotulo: "Qualificado" },
  { rotulo: "Reunião marcada", atual: true },
];

export default async function LeadDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <Card className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-acento"><Building2 aria-hidden="true" className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-semibold text-navy">Monteiro Engenharia</h1>
              <p className="mt-1 text-sm text-slate-500">CNPJ 10.111.***/0001-90 · Construção de edifícios · Curitiba/PR</p>
              <div className="mt-2 flex flex-wrap gap-2"><Badge tom="azul">Reunião marcada</Badge><Badge tom="vermelho">Prioridade alta</Badge></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Botao><CalendarPlus aria-hidden="true" className="h-4 w-4" /> Agendar</Botao>
            <Botao variante="secundario"><SkipForward aria-hidden="true" className="h-4 w-4" /> Avançar etapa</Botao>
            <Botao variante="perigo"><XCircle aria-hidden="true" className="h-4 w-4" /> Desqualificar</Botao>
          </div>
        </div>
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50 p-4">
          <Zap aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-800">Por que agora</p>
            <p className="text-sm leading-6 text-amber-800/90">Nova obra no CNO: corporativo de 15.200 m² no Batel (Curitiba), detectada em 20/08/2026.</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="space-y-6">
          <Card>
            <CardTitulo titulo="Dados da empresa" subtitulo={`Lead #${id}`} />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div><dt className="text-xs text-slate-500">CNPJ</dt><dd className="font-medium tabular-nums text-navy">10.111.***/0001-90</dd></div>
              <div><dt className="text-xs text-slate-500">Município</dt><dd className="font-medium text-navy">Curitiba/PR</dd></div>
              <div className="col-span-2"><dt className="text-xs text-slate-500">Setor</dt><dd className="font-medium text-navy">Construção de edifícios</dd></div>
            </dl>
          </Card>

          <Card>
            <CardTitulo icone={CheckSquare} titulo="Qualificação" subtitulo="Obrigatória antes de agendar." />
            <div className="space-y-2">
              {["Necessidade", "Momento", "Encaixe"].map((c) => (
                <label key={c} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-navy transition hover:bg-slate-50">
                  <input type="checkbox" defaultChecked className="h-4 w-4 accent-blue-600" /> {c}
                </label>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" /> Forçar manualmente</label>
          </Card>

          <Card>
            <CardTitulo icone={FileText} titulo="Briefing pré-reunião" />
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center">
              <FileText aria-hidden="true" className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-navy">Briefing ainda não gerado</p>
              <p className="text-xs text-slate-500">Ele é criado automaticamente ao agendar a reunião.</p>
            </div>
          </Card>
        </div>

        <Card>
          <CardTitulo titulo="Linha do tempo" subtitulo="Cada etapa desde a detecção do gatilho." />
          <ol className="ml-2 space-y-5 border-l border-slate-200 pl-6">
            {ETAPAS.map((e) => (
              <li key={e.rotulo} className="relative">
                <span className={`absolute -left-8 top-0.5 grid h-4 w-4 place-items-center rounded-full text-white ${e.atual ? "bg-acento ring-4 ring-blue-100" : "bg-emerald-500"}`}>
                  {!e.atual && <Check aria-hidden="true" className="h-2.5 w-2.5" />}
                </span>
                <p className={`text-sm font-semibold ${e.atual ? "text-acento" : "text-navy"}`}>
                  {e.rotulo}
                  {e.atual && <span className="ml-2 text-xs font-normal text-slate-500">etapa atual</span>}
                </p>
                {e.detalhe && <p className="mt-1 text-sm leading-6 text-slate-600">{e.detalhe}</p>}
                {e.mensagem && (
                  <div className={`mt-2 max-w-[90%] rounded-lg p-3 text-sm leading-6 ${e.mensagem.envio ? "bg-blue-50 text-slate-700" : "ml-auto bg-emerald-50 text-slate-700"}`}>
                    <p className="mb-1 flex items-center gap-1 text-xs text-slate-500">
                      {e.mensagem.envio ? <Mail aria-hidden="true" className="h-3 w-3" /> : <MessageCircle aria-hidden="true" className="h-3 w-3" />}
                      {e.mensagem.envio ? "Enviado · e-mail" : "Resposta · e-mail"}
                    </p>
                    {e.mensagem.texto}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
