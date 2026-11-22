import { LeadDetalhe } from "./LeadDetalhe";

export default async function LeadDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LeadDetalhe id={id} />;
}
