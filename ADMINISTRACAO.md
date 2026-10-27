# Administração do Momint

O único administrador geral é `jadiframe@gmail.com`. O banco restringe o papel ADMIN a esse e-mail e permite no máximo um administrador. Gestores podem administrar a equipe e as preferências do próprio sistema, sem acesso ao painel geral.

## Atualização de uma instalação existente

Execute `npm run db:migrate -w apps/api` e `npx prisma generate --schema apps/api/prisma/schema.prisma` antes de iniciar a versão atualizada. A migração preserva os dados e transforma os demais administradores em gestores, invalidando suas sessões anteriores.

Execute `npm run admin:preparar -w apps/api` para criar ou renovar o acesso do administrador. Esse comando **invalida a senha, as sessões e o link de recuperação anteriores** dessa conta. Um link de uso único para definir a senha, válido por 24 horas, fica em `.acesso-admin/primeiro-acesso.txt`, fora do Git. Não execute esse comando em cada inicialização. A recuperação comum continua disponível pela tela de login.

A preparação identifica o sistema existente da ImperSul como demonstração; não executa o seed nem apaga dados operacionais. Quando a conta do administrador já existe, utiliza o sistema ao qual ela está vinculada como demonstração.

## Clientes, sistemas e equipe

`ContaCliente` representa o cadastro comercial. Cada registro `Cliente` do modelo original representa um sistema independente, vinculado ao cadastro por `contaClienteId`. Leads, mensagens, reuniões, segmentação, cadência e usuários continuam isolados pelo identificador desse sistema, obtido da sessão autenticada. E-mails de acesso são únicos; sistemas adicionais recebem um responsável com outro e-mail.

Novos sistemas começam sem leads, reuniões ou segmentação preenchida. O gestor configura a segmentação e cadastra gestores, vendedores e atendentes em Configurações. As telas dos clientes consultam a API; as telas demonstrativas existentes são mantidas no ambiente demonstrativo.

O painel permite cadastrar clientes com seu primeiro sistema, acrescentar sistemas, consultar as equipes e suspender ou reativar acessos. A exclusão é lógica, exige o nome do cliente, encerra todos os seus acessos e links de recuperação e preserva o histórico para suporte. A demonstração e a conta administrativa são protegidas.

Os indicadores representam os cadastros atuais: clientes não excluídos, sistemas vendidos (incluindo os suspensos), sistemas ativos e usuários ativos dos sistemas ativos. A demonstração e clientes excluídos ficam fora dos totais. Não representam um histórico financeiro de vendas.

## Verificação

`npm test` usa exclusivamente `momint_test` e reinicializa esse banco. `npm run typecheck -w apps/api`, `npm run typecheck -w apps/web` e `npm run build -w apps/web` verificam a aplicação. Os testes de administração cobrem acesso exclusivo, cadastros atômicos, vários sistemas por cliente, equipes e configurações separadas, bloqueio de elevação de privilégios, suspensão, reativação e exclusão.
