import { Check, Mail, MessageCircle, Pencil, Sparkles, X, Zap } from "lucide-react";
import { Badge, Botao, Cabecalho, Card, FONTE_ROTULO, FONTE_TOM, PRIORIDADE_ROTULO, PRIORIDADE_TOM } from "@/components/ui";

// TODO: GET /api/abordagens/fila + aprovar/editar/rejeitar (e atualizar contador da sidebar)
const FILA = [
  { id: "1", empresa: "Prisma Incorporadora", contato: "Luciana Prado · Diretora de Engenharia", canal: "EMAIL", gatilho: "PNCP", prioridade: "ALTA", resumo: "Licitação: conjunto habitacional — Companhia de Habitação do Paraná", texto: "Olá, Luciana,\n\nAcompanhei a licitação publicada por Companhia de Habitação do Paraná (construção de conjunto habitacional com 96 unidades)…" },
  { id: "2", empresa: "Construtora Horizonte", contato: "Marcelo Tavares · Diretor de Obras", canal: "EMAIL", gatilho: "CNO", prioridade: "MEDIA", resumo: "Nova obra: residencial 8.400 m² no Água Verde", texto: "Olá, Marcelo,\n\nVi que vocês registraram a obra no Água Verde — residencial multifamiliar com 8.400 m²…" },
  { id: "3", empresa: "Edifica Engenharia", contato: "André Kowalski · Sócio-Engenheiro", canal: "WHATSAPP", gatilho: "PNCP", prioridade: "MEDIA", resumo: "Licitação: impermeabilização de 6 escolas — Município de Colombo", texto: "Olá, André! Aqui é Rafael, da ImperSul. Acompanhei a licitação publicada por Município de Colombo…" },
];

export default function AbordagensPage() {
  return (
    <>
      <Cabecalho titulo="Fila de Aprovação" subtitulo="Mensagens rascunhadas pela IA aguardando revisão (modo Copiloto)." />
      <div className="space-y-4">
        {FILA.map((m) => (
          <Card key={m.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-navy">{m.empresa}</h3>
                  <Badge tom={PRIORIDADE_TOM[m.prioridade]}>{PRIORIDADE_ROTULO[m.prioridade]}</Badge>
                </div>
                <p className="text-sm text-slate-500">{m.contato}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tom="cinza">{m.canal === "EMAIL" ? <Mail className="mr-1 h-3 w-3" /> : <MessageCircle className="mr-1 h-3 w-3" />}{m.canal === "EMAIL" ? "E-mail" : "WhatsApp"}</Badge>
                <Badge tom="roxo"><Sparkles className="mr-1 h-3 w-3" /> Gerada por IA</Badge>
              </div>
            </div>
            <div className="my-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <Zap className="h-4 w-4" /> <Badge tom={FONTE_TOM[m.gatilho]}>{FONTE_ROTULO[m.gatilho]}</Badge> {m.resumo}
            </div>
            <pre className="whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 p-4 font-sans text-sm text-slate-700">{m.texto}</pre>
            <div className="mt-4 flex justify-end gap-2">
              <Botao variante="perigo"><X className="h-4 w-4" /> Rejeitar</Botao>
              <Botao variante="secundario"><Pencil className="h-4 w-4" /> Editar</Botao>
              <Botao><Check className="h-4 w-4" /> Aprovar e enviar</Botao>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
