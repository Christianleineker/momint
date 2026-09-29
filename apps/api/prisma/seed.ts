// Seed do MVP: roda o pipeline REAL (adapters mock → ingestão → motor de match)
// e depois conduz alguns leads pelo funil usando os mesmos serviços da API.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, type Prisma } from "@prisma/client";
import { criarContainer, criarRelogio } from "../src/container.js";
import { fontesMock } from "../src/infra/fontes-publicas/mock.js";
import { contatosFixture } from "../src/infra/fontes-publicas/fixtures/index.js";

const HOJE_ISO = process.env.MOMINT_HOJE ?? "2026-09-30";
export const SENHA_DEMO = "momint123";

export async function seed(db: PrismaClient) {
  const app = criarContainer({ prisma: db, fontes: fontesMock, relogio: criarRelogio(HOJE_ISO) });

  // Limpa na ordem de dependência (seed idempotente).
  await db.desfecho.deleteMany();
  await db.reuniao.deleteMany();
  await db.mensagem.deleteMany();
  await db.lead.deleteMany();
  await db.contato.deleteMany();
  await db.eventoDeGatilho.deleteMany();
  await db.empresaAlvo.deleteMany();
  await db.supressao.deleteMany();
  await db.passoCadencia.deleteMany();
  await db.perfilICP.deleteMany();
  await db.usuario.deleteMany();
  await db.cliente.deleteMany();
  await db.tipoDeGatilho.deleteMany();

  await db.tipoDeGatilho.createMany({
    data: [
      { codigo: "CNO", nome: "Nova obra (CNO)", janelaFrescorDias: 60, peso: 1.0 },
      { codigo: "PNCP", nome: "Licitação (PNCP)", janelaFrescorDias: 30, peso: 0.8 },
      { codigo: "CNPJ_NOVO", nome: "Empresa nova (CNPJ)", janelaFrescorDias: 45, peso: 0.6 },
    ],
  });

  const senhaHash = await bcrypt.hash(SENHA_DEMO, 10);
  const impersul = await db.cliente.create({
    data: { nome: "ImperSul Impermeabilizações", plano: "piloto", vozMarca: "consultivo", assinaturaEmail: "Equipe ImperSul · (41) 3333-0000", taxaConversaoHist: 0.35 },
  });
  const gestor = await db.usuario.create({ data: { clienteId: impersul.id, nome: "Gestor ImperSul", email: "gestor@impersul.com.br", senhaHash, papel: "ADMIN" } });
  const rafael = await db.usuario.create({ data: { clienteId: impersul.id, nome: "Rafael Nunes", email: "rafael@impersul.com.br", senhaHash, papel: "VENDEDOR" } });
  const carla = await db.usuario.create({ data: { clienteId: impersul.id, nome: "Carla Dias", email: "carla@impersul.com.br", senhaHash, papel: "VENDEDOR" } });

  await db.perfilICP.create({
    data: {
      clienteId: impersul.id, cnaes: ["4120400", "4110700", "4299599"], portes: ["EMPRESA DE PEQUENO PORTE", "DEMAIS"],
      cidadeBase: "CURITIBA", ufBase: "PR", latBase: -25.4284, lngBase: -49.2733, raioKm: 40, idadeMinAnos: 0, idadeMaxAnos: 30,
    },
  });
  await db.passoCadencia.createMany({
    data: [
      { clienteId: impersul.id, ordem: 1, dia: 0, canal: "EMAIL", titulo: "Primeira abordagem citando o gatilho" },
      { clienteId: impersul.id, ordem: 2, dia: 2, canal: "WHATSAPP", titulo: "Follow-up curto" },
      { clienteId: impersul.id, ordem: 3, dia: 5, canal: "EMAIL", titulo: "Case de obra similar" },
      { clienteId: impersul.id, ordem: 4, dia: 9, canal: "WHATSAPP", titulo: "Último toque" },
    ],
  });

  // Segundo cliente — prova de isolamento multi-cliente.
  const outro = await db.cliente.create({ data: { nome: "Esquadrias Paraná", vozMarca: "direto" } });
  await db.usuario.create({ data: { clienteId: outro.id, nome: "Admin Esquadrias", email: "admin@esquadrias.com.br", senhaHash, papel: "ADMIN" } });
  await db.perfilICP.create({
    data: { clienteId: outro.id, cnaes: ["4120400"], portes: ["DEMAIS"], cidadeBase: "CURITIBA", ufBase: "PR", latBase: -25.4284, lngBase: -49.2733, raioKm: 30, idadeMinAnos: 3, idadeMaxAnos: 40 },
  });

  // Contatos precisam existir antes do radar (empresas vêm da ingestão, então
  // pré-cadastramos após a ingestão pelas próprias fixtures).
  await app.radar.sincronizar();
  for (const c of contatosFixture) {
    const emp = await db.empresaAlvo.findUnique({ where: { cnpj: c.cnpj } });
    if (emp) await db.contato.create({ data: { empresaId: emp.id, nome: c.nome, cargo: c.cargo, email: c.email, telefone: c.telefone } });
  }
  // Opt-out prévio (global): a compradora da Horizonte pediu para não ser contatada.
  await db.supressao.create({ data: { email: "juliana@horizonte.example.com.br", telefone: "41991110002", motivo: "Pediu remoção (jul/2026)" } });

  await historico(db, impersul.id, [rafael.id, carla.id]);

  // ── Conduz os leads atuais pelo funil ────────────────────
  const lead = async (cnpj: string) => {
    const emp = await db.empresaAlvo.findUniqueOrThrow({ where: { cnpj } });
    return db.lead.findUniqueOrThrow({ where: { clienteId_empresaId: { clienteId: impersul.id, empresaId: emp.id } } });
  };
  const C = impersul.id;
  const enviarPrimeira = async (id: string, canal: "EMAIL" | "WHATSAPP" = "EMAIL") => {
    const m = await app.abordagem.abordar(C, id, canal);
    await app.abordagem.aprovar(C, gestor.id, m.id);
  };

  // Fila de aprovação (Copiloto): 4 rascunhos. Bauen fica "Apto" para demo no Radar.
  await app.abordagem.abordar(C, (await lead("22333444000172")).id); // Prisma (2 gatilhos)
  await app.abordagem.abordar(C, (await lead("11222333000181")).id); // Horizonte
  await app.abordagem.abordar(C, (await lead("33444555000163")).id, "WHATSAPP"); // Edifica
  await app.abordagem.abordar(C, (await lead("55666777000145")).id); // Alicerce (CNPJ novo)

  const solidez = await lead("13141516000172");
  await enviarPrimeira(solidez.id);

  const ribeira = await lead("12131415000181");
  await enviarPrimeira(ribeira.id);
  await app.abordagem.registrarResposta(C, ribeira.id, { canal: "EMAIL", quente: true, conteudo: "Oi! Estamos justamente fechando os fornecedores dessa obra no Mossunguê. Pode me mandar uma proposta?" });

  const prime = await lead("14151617000163");
  await enviarPrimeira(prime.id, "WHATSAPP");
  await app.abordagem.registrarResposta(C, prime.id, { canal: "WHATSAPP", quente: true, conteudo: "Temos interesse sim, a fundação começa em outubro." });
  await app.leads.atualizarQualificacao(C, prime.id, { necessidade: true, momento: true });

  const monteiro = await lead("10111222000190");
  await enviarPrimeira(monteiro.id);
  await app.abordagem.registrarResposta(C, monteiro.id, { canal: "EMAIL", quente: true, conteudo: "Cláudio aqui. Podemos conversar na quinta? O corporativo do Batel tem 4 subsolos, impermeabilização é crítica." });
  await app.leads.atualizarQualificacao(C, monteiro.id, { necessidade: true, momento: true, encaixe: true });
  await app.reunioes.agendar(C, monteiro.id, { inicio: new Date("2026-10-02T17:00:00Z"), duracaoMin: 45 });

  const cotaZero = await lead("16171819000145");
  await enviarPrimeira(cotaZero.id);
  await app.abordagem.registrarResposta(C, cotaZero.id, { canal: "EMAIL", quente: true, conteudo: "Vamos participar da licitação dos reservatórios. Quero entender o sistema de vocês." });
  await app.leads.atualizarQualificacao(C, cotaZero.id, { necessidade: true, momento: true, encaixe: true });
  await app.reunioes.agendar(C, cotaZero.id, { inicio: new Date("2026-09-24T13:00:00Z"), duracaoMin: 60 });
  await app.leads.moverEstagio(C, cotaZero.id, "REUNIAO_REALIZADA");

  const novaBase = await lead("15161718000154");
  await enviarPrimeira(novaBase.id, "WHATSAPP");
  await app.abordagem.registrarResposta(C, novaBase.id, { canal: "WHATSAPP", quente: true, conteudo: "Opa, bora conversar. Estamos cotando agora." });
  await app.leads.atualizarQualificacao(C, novaBase.id, { necessidade: true, momento: true, encaixe: true });
  await app.reunioes.agendar(C, novaBase.id, { inicio: new Date("2026-09-10T14:00:00Z"), duracaoMin: 45 });
  await app.leads.moverEstagio(C, novaBase.id, "REUNIAO_REALIZADA");
  await app.leads.moverEstagio(C, novaBase.id, "GANHO", "Contrato de impermeabilização das lajes — R$ 186 mil");

  const andaime = await lead("17181920000136");
  await enviarPrimeira(andaime.id);
  await app.abordagem.registrarResposta(C, andaime.id, { canal: "EMAIL", quente: false, conteudo: "Obrigado, mas já temos fornecedor para essa obra." });
  await app.leads.moverEstagio(C, andaime.id, "PERDIDO", "Já possui fornecedor contratado");

  // Datas de criação das reuniões atuais ficam em setembro (métrica "no mês").
  await db.reuniao.updateMany({ where: { lead: { clienteId: C }, criadoEm: { gte: new Date("2026-09-01") } }, data: { criadoEm: new Date("2026-09-20T12:00:00Z") } });
}

/** Pipeline histórico (abr–ago/2026) para métricas e gráfico de evolução. */
async function historico(db: PrismaClient, clienteId: string, vendedores: string[]) {
  const nomes = [
    "Construtora Tinguí", "Paraná Edificações", "Bosque Engenharia", "Atlântica Obras", "Mirante Incorporadora",
    "Base Forte Engenharia", "Ipê Construções", "Serra do Mar Obras", "Barigui Empreendimentos", "Pilar Engenharia",
    "Capital Construtora", "Jardim Botânico Incorporações", "Cruzeiro Obras", "Graciosa Engenharia", "Iguaçu Construtora",
    "Guairá Edificações", "Portal Sul Engenharia", "Rebouças Construtora", "Tarumã Incorporadora", "Cabral Engenharia",
  ];
  // [mês (0=jan), dia, resultado]
  const plano: Array<[number, number, "GANHO" | "PERDIDO" | "REUNIAO_REALIZADA"]> = [
    [3, 8, "PERDIDO"], [3, 22, "GANHO"],
    [4, 6, "PERDIDO"], [4, 14, "GANHO"], [4, 27, "PERDIDO"],
    [5, 3, "GANHO"], [5, 11, "PERDIDO"], [5, 18, "PERDIDO"], [5, 25, "GANHO"],
    [6, 2, "PERDIDO"], [6, 9, "GANHO"], [6, 16, "PERDIDO"], [6, 23, "GANHO"], [6, 30, "PERDIDO"],
    [7, 4, "GANHO"], [7, 11, "PERDIDO"], [7, 18, "GANHO"], [7, 21, "PERDIDO"], [7, 26, "REUNIAO_REALIZADA"], [7, 29, "PERDIDO"],
  ];
  const tipoCno = await db.tipoDeGatilho.findUniqueOrThrow({ where: { codigo: "CNO" } });

  for (let i = 0; i < plano.length; i++) {
    const [mes, dia, resultado] = plano[i];
    const reuniaoEm = new Date(Date.UTC(2026, mes, dia, 14));
    const detectado = new Date(reuniaoEm.getTime() - 20 * 86_400_000);
    const cnpj = `2${String(i).padStart(3, "0")}0000000100`.slice(0, 14);
    const emp = await db.empresaAlvo.create({
      data: {
        cnpj, razaoSocial: `${nomes[i].toUpperCase()} LTDA`, nomeFantasia: nomes[i], cnae: "4120400", cnaeDescricao: "Construção de edifícios",
        porte: i % 3 ? "DEMAIS" : "EMPRESA DE PEQUENO PORTE", situacao: "ATIVA", dataInicioAtividade: new Date(Date.UTC(2008 + (i % 12), i % 12, 5)),
        uf: "PR", municipio: "CURITIBA", bairro: "CENTRO", lat: -25.4284, lng: -49.2733,
      },
    });
    const bruto = { cno: `80.${String(100 + i)}.00000/7${i % 10}`, situacao: "ATIVA", dataInicioObra: detectado.toISOString().slice(0, 10), dataRegistro: detectado.toISOString().slice(0, 10), uf: "PR", municipio: "CURITIBA", bairro: "CENTRO", areas: [{ categoria: "Obra nova", destinacao: "Residencial multifamiliar", metragem: 4000 + i * 350 }], niResponsavel: cnpj };
    const ev = await db.eventoDeGatilho.create({
      data: { externalId: `CNO:hist-${i}`, empresaId: emp.id, tipoId: tipoCno.id, detectadoEm: detectado, resumo: `Nova obra no CNO: residencial multifamiliar de ${(4000 + i * 350).toLocaleString("pt-BR")} m² no Centro (Curitiba)`, dadosBrutos: bruto as Prisma.InputJsonValue },
    });
    const vendedor = vendedores[i % vendedores.length];
    const lead = await db.lead.create({
      data: { clienteId, empresaId: emp.id, eventoId: ev.id, estagio: resultado, scorePrioridade: 40 + (i % 5) * 8, forcaFit: 0.8, donoId: vendedor, necessidade: true, momento: true, encaixe: true, criadoEm: detectado },
    });
    await db.reuniao.create({
      data: { leadId: lead.id, vendedorId: vendedor, inicio: reuniaoEm, fim: new Date(reuniaoEm.getTime() + 45 * 60_000), status: "REALIZADA", briefing: "Reunião histórica (seed).", criadoEm: new Date(reuniaoEm.getTime() - 5 * 86_400_000) },
    });
    await db.desfecho.create({
      data: { leadId: lead.id, criadoEm: reuniaoEm, resultado: resultado === "GANHO" ? "NEGOCIO_FECHADO" : resultado === "PERDIDO" ? "PERDIDO" : "REUNIAO_REALIZADA", motivo: resultado === "PERDIDO" ? "Preço acima do orçado" : null },
    });
  }
}

// Execução direta: `tsx prisma/seed.ts`
if (process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/seed.ts")) {
  const db = new PrismaClient();
  seed(db)
    .then(() => console.log(`Seed concluído. Login: gestor@impersul.com.br / ${SENHA_DEMO}`))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => db.$disconnect());
}
