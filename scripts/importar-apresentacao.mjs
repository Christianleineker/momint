// Executar na raiz do repositório com: npx --no-install tsx scripts/importar-apresentacao.mjs
// Somente fontes HTTP reais; não envia mensagens nem cria histórico comercial fictício.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { criarContainer, criarRelogio } from "../apps/api/src/container.ts";
import { fontesHttp } from "../apps/api/src/infra/fontes-publicas/http.ts";

const db = new PrismaClient();
const falhas = new Set();
let processados = 0;
try {
  const admin = await db.usuario.findUnique({
    where: { email: "jadiframe@gmail.com" },
    include: { cliente: { include: { icp: true } } },
  });
  if (!admin?.ativo || !admin.cliente.ativo || !admin.cliente.demonstrativo) {
    throw new Error("Importação permitida apenas no sistema demonstrativo ativo do administrador.");
  }
  if (!admin.cliente.icp) {
    throw new Error("Configure Filtro e Segmentação no sistema antes da importação, para gerar leads com os critérios reais.");
  }
  const clienteId = admin.clienteId;
  const contar = async () => ({
    empresas: await db.empresaAlvo.count(),
    eventosPncp: await db.eventoDeGatilho.count({ where: { externalId: { startsWith: "PNCP:" } } }),
    leadsDoSistema: await db.lead.count({ where: { clienteId } }),
  });
  console.log("Contagens antes:", await contar());
  const hoje = new Date();
  const dia = 86_400_000;
  // Amostras semanais: o adaptador PNCP consulta apenas o último dia completo
  // de cada bloco e informa a cobertura parcial; não cobre os 28 dias inteiros.
  for (let bloco = 0; bloco < 4; bloco++) {
    const ate = new Date(hoje.getTime() - bloco * 7 * dia);
    const desde = new Date(hoje.getTime() - ((bloco + 1) * 7 - 1) * dia);
    console.log(`Consultando PNCP PR: ${desde.toISOString().slice(0, 10)} a ${ate.toISOString().slice(0, 10)}`);
    const fontes = {
      ...fontesHttp,
      pncp: { contratacoesPublicadas: () => fontesHttp.pncp.contratacoesPublicadas(desde, ate) },
    };
    const container = criarContainer({ prisma: db, fontes, relogio: criarRelogio() });
    const ingestao = await container.radar.ingerirFontes();
    processados += ingestao.eventosProcessados;
    for (const falha of ingestao.fontesIndisponiveis) falhas.add(falha);
    console.log("Eventos processados no bloco:", ingestao.eventosProcessados);
    console.log("Leads:", await container.radar.processarCliente(clienteId));
    console.log("Contagens persistidas:", await contar());
  }
  console.log("Eventos processados (inclui atualizações):", processados);
  console.log("Fontes não consultadas:", [...falhas]);
  if (!processados) {
    process.exitCode = 2;
    console.error("Nenhum evento confirmado nesta execução. Não considerar a base populada: verificar as fontes e filtros.");
  }
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : "Falha na importação");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
