// Dados fictícios para apresentação. Não executa envios ou apaga registros.
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const dia = 86400000, agora = new Date();
try {
  const admin = await db.usuario.findUnique({ where: { email: 'jadiframe@gmail.com' }, include: { cliente: true } });
  if (!admin?.ativo || !admin.cliente.ativo || !admin.cliente.demonstrativo) throw new Error('Ambiente demonstrativo não encontrado.');
  const outros = await db.cliente.count({ where: { id: { not: admin.clienteId } } });
  if (outros) throw new Error('Existem outros ambientes: dados compartilhados impedem a carga segura.');
  const clienteId = admin.clienteId;
  const tipo = await db.tipoDeGatilho.findUniqueOrThrow({ where: { codigo: 'PNCP' } });
  const oferta = { produto:'impermeabilização', descricao:'Demonstração: impermeabilização de lajes e fundações.', proposta:'atendemos empresas da construção com soluções de impermeabilização', beneficio:'planejar a proteção reduz riscos de retrabalho', compradores:'responsáveis pela obra', pauta:'necessidades da obra e soluções possíveis' };
  await db.$transaction(async tx => {
    await tx.cliente.update({ where: { id: clienteId }, data: { modoOperacao: 'COPILOTO' } });
    await tx.ofertaCliente.upsert({ where: { clienteId }, create: { clienteId, ...oferta }, update: {} });
    const perfil = await tx.perfilICP.findUnique({ where: { clienteId } });
    if (!perfil?.cnaes.length || !perfil.portes.length || !perfil.fontesAtivas.includes('PNCP')) throw new Error('Configure o perfil com CNAE, porte e PNCP ativo.');
    const etapas = ['APTO','AGUARDANDO_APROVACAO','EM_CADENCIA','ENGAJADO','QUALIFICANDO','REUNIAO_MARCADA','REUNIAO_REALIZADA','GANHO'];
    for (let i=0; i<etapas.length; i++) {
      const cnpj = `99999999000${String(i+1).padStart(3,'0')}`;
      const externalId = `DEMO:PNCP:${i+1}`;
      const existente = await tx.eventoDeGatilho.findUnique({ where: { externalId } });
      if (existente) continue;
      if (await tx.empresaAlvo.findUnique({ where: { cnpj } })) throw new Error('Identificador de demonstração já está em uso.');
      const nome = `Empresa fictícia ${i+1} — DEMONSTRAÇÃO`;
      const empresa = await tx.empresaAlvo.create({ data: { cnpj, razaoSocial:nome, nomeFantasia:nome, cnae:perfil.cnaes[0], cnaeDescricao:'Atividade para demonstração', porte:perfil.portes[0], situacao:perfil.situacaoExigida, dataInicioAtividade:new Date(agora.getTime()-Math.max(1,perfil.idadeMinAnos+1)*365.25*dia), uf:perfil.ufBase, municipio:perfil.cidadeBase.toUpperCase(), lat:perfil.latBase, lng:perfil.lngBase } });
      const contato = await tx.contato.create({ data: { empresaId:empresa.id, nome:'Contato fictício', cargo:'Responsável pela obra', email:`demo${i+1}@example.invalid` } });
      const detectadoEm = new Date(agora.getTime()-(i+1)*dia);
      const bruto = { numeroControlePNCP:externalId, objetoCompra:'Obra fictícia para demonstração', orgaoEntidade:{cnpj:'00000000000000',razaoSocial:'Órgão fictício de demonstração'}, unidadeOrgao:{municipioNome:'Curitiba',ufSigla:'PR',nomeUnidade:'Demonstração'}, modalidadeNome:'Demonstração', valorTotalEstimado:100000, dataPublicacaoPncp:detectadoEm.toISOString(), cnpjInteressado:cnpj, resultado:{niFornecedor:cnpj,nomeRazaoSocialFornecedor:nome,valorTotalHomologado:100000,dataResultado:detectadoEm.toISOString().slice(0,10)} };
      const evento = await tx.eventoDeGatilho.create({ data: { externalId, empresaId:empresa.id, tipoId:tipo.id, detectadoEm, resumo:'DEMONSTRAÇÃO: licitação fictícia de construção', dadosBrutos:bruto } });
      const lead = await tx.lead.create({ data: { clienteId, empresaId:empresa.id, eventoId:evento.id, estagio:etapas[i], scorePrioridade:90-i*5, forcaFit:0.9, donoId:admin.id } });
      if (i===1) await tx.mensagem.create({ data: { leadId:lead.id, contatoId:contato.id, canal:'EMAIL', direcao:'SAIDA', status:'RASCUNHO', assunto:'DEMONSTRAÇÃO: obra fictícia', conteudo:'Exemplo fictício: identificamos a obra de demonstração e gostaríamos de apresentar nossas soluções.', passo:1 } });
      if (i===5 || i===6 || i===7) await tx.reuniao.create({ data: { leadId:lead.id, vendedorId:admin.id, inicio:new Date(agora.getTime()+(i===5?2:-i)*dia), fim:new Date(agora.getTime()+(i===5?2:-i)*dia+2700000), status:i===5?'AGENDADA':'REALIZADA', briefing:'DEMONSTRAÇÃO: reunião fictícia.' } });
    }
  }, { timeout: 30000 });
  console.log('Carga fictícia concluída. Confira radar, leads, fila e reuniões.');
} catch (e) { console.error('Carga cancelada:', e.message); process.exitCode=1; }
finally { await db.$disconnect(); }
