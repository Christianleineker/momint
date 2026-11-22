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

A exclusão possui uma segunda confirmação depois de digitar o nome. O servidor emite uma autorização de uso único vinculada ao cliente, administrador e versão da sessão, exige uma espera de cinco segundos e expira essa autorização em cinco minutos. Cancelar ou editar o cadastro invalida a confirmação.

O sininho da administração lista os 50 eventos mais recentes, com leitura persistida no banco e contador de não lidas. Cadastros de cliente e sistema, exclusões, suspensões e edições geram eventos na mesma transação da alteração. O cadastro de um sistema é considerado uma venda para esses avisos; os eventos não representam pagamentos financeiros.

O suporte administrativo edita nome e contato do cliente, nome e plano do sistema e nome, e-mail, telefone e senha dos usuários. Esses endpoints não aceitam alterações em documentos ou registros operacionais. A aba Meu perfil, também acessível por Editar perfil, permite que qualquer usuário atualize os próprios dados. Mudanças no e-mail ou senha exigem a senha atual e revogam sessões e links de recuperação anteriores, mantendo uma nova sessão no navegador atual. O e-mail do administrador continua fixo.

Os indicadores representam os cadastros atuais: clientes não excluídos, sistemas vendidos (incluindo os suspensos), sistemas ativos e usuários ativos dos sistemas ativos. A demonstração e clientes excluídos ficam fora dos totais. Não representam um histórico financeiro de vendas.

## Primeiro acesso e segundo fator por e-mail

Novos usuários escolhem no dashboard se mantêm a senha recebida ou definem outra (com confirmação da senha atual). Depois podem ativar o segundo fator ou adiar a escolha para Meu perfil. Instalações existentes não recebem novamente a escolha de senha inicial. Redefinições feitas pelo administrador reapresentam a escolha de senha e preservam o segundo fator já ativo.

O código possui seis dígitos gerados por `crypto.randomInt`, expira em cinco minutos e admite cinco tentativas. O banco guarda o hash do identificador e um HMAC do código; o valor legível só é enviado ao e-mail do titular pelo transporte já configurado. O desafio fica associado ao propósito, usuário, e-mail e versão da sessão. O consumo é transacional e apaga o desafio. Reenvios aguardam um minuto e invalidam o código anterior. O cookie do desafio é HttpOnly e não equivale a uma sessão autenticada.

Configure `OTP_SECRET` com um segredo aleatório de pelo menos 32 caracteres, fora do Git. Ele deve ser o mesmo entre reinícios e instâncias da API. Na ausência da configuração, a API usa uma chave aleatória em memória; reinícios invalidam códigos pendentes. O remetente vem das variáveis SMTP existentes, e o destinatário é sempre o e-mail da conta. Nunca publique o arquivo `.env` nem códigos recebidos.

Ativar requer confirmação por e-mail. Desativar requer senha atual e confirmação pelo e-mail já cadastrado. Para trocar o e-mail de uma conta protegida, o titular deve primeiro desativar o segundo fator e reativá-lo no novo endereço.

## Atendimento de suporte

Falar com o suporte abre um chat suspenso que pode ser minimizado. Visitantes não precisam de conta. A conversa é acessada apenas por um cookie HttpOnly, SameSite e Secure em produção, válido por 30 dias; o banco guarda somente o hash do identificador de acesso. A conversa fica vinculada a esse navegador, e o e-mail informado no chat é um contato declarado pelo visitante, sem comprovação de titularidade.

O painel Atendimentos é exclusivo de ADMIN, consultado no banco em cada requisição. Permite ler, responder, buscar por nome ou e-mail e encerrar conversas. Uma mensagem nova reabre o atendimento. Respostas aparecem automaticamente no chat do visitante por consulta periódica, a cada três segundos enquanto aberto. Mensagens não lidas também são indicadas no chat minimizado e no painel. Cada envio possui identificador para evitar duplicação em tentativas repetidas, e o histórico possui paginação. Conteúdo é exibido como texto, sem executar HTML.

## Verificação

`npm test` usa exclusivamente `momint_test` e reinicializa esse banco. `npm run typecheck -w apps/api`, `npm run typecheck -w apps/web` e `npm run build -w apps/web` verificam a aplicação. Os testes cobrem administração, isolamento de sistemas e conversas, primeiro acesso, segundo fator, expiração, limites de tentativas, uso único concorrente e respostas exclusivas de ADMIN.

## Proteção de login e senhas

Três falhas consecutivas bloqueiam o login daquele e-mail por 30 segundos. O servidor devolve HTTP 429, `Retry-After` e o tempo restante; a tela mostra a contagem regressiva. O estado é compartilhado pelo banco entre reinícios e instâncias, independentemente do IP. Um acerto ou o término do bloqueio inicia uma nova sequência. As chaves de controle são hashes dos e-mails normalizados.

E-mails de acesso são armazenados em minúsculas e sem espaços nas extremidades. O banco exige esse formato e garante unicidade, inclusive em cadastros concorrentes. A recuperação recusa a senha atual e todas as senhas anteriores registradas, sem consumir o link nem encerrar sessões quando a senha é recusada. A migração registra as senhas atuais; alterações posteriores, inclusive pelo admin e pelo perfil, preservam o hash anterior automaticamente no banco. Senhas anteriores à instalação desse histórico não podem ser reconstruídas.

`npm run admin:limpar-usuarios -w apps/api` é uma operação pontual que remove todos os usuários exceto `jadiframe@gmail.com`. Não faz parte da inicialização. O comando aborta se o admin estiver ausente ou inativo, preserva suas credenciais e mantém leads, mensagens e reuniões. Referências aos usuários removidos ficam sem responsável; links de recuperação, códigos e históricos desses usuários são excluídos junto com as contas. Novos cadastros legítimos continuam disponíveis após a limpeza.

## Inicialização e desempenho

`iniciar-momint.cmd` inicia a interface com `next start`. Na primeira execução ou após mudanças no código/dependências, `scripts/preparar-web.mjs` compila a interface antes de abri-la. As execuções seguintes reutilizam o build quando sua assinatura corresponde aos arquivos atuais. `npm run dev` continua disponível para desenvolvimento com recarga automática; não execute `next dev` e `next start` simultaneamente sobre a mesma pasta `.next`.

A validação de sessão continua consultando o banco em cada requisição para revogar acessos imediatamente, usando uma única consulta que seleciona somente o ID. Leituras de perfil repetidas no mesmo render do servidor são deduplicadas, e as consultas independentes do dashboard executam em paralelo.

## Publicação na Render

`render.yaml` descreve a hospedagem. São três recursos, todos em Virginia (EUA), a região da Render mais próxima do Brasil:

- `momint-web`: a interface, pública.
- `momint-api`: a API, um serviço privado que só a interface acessa.
- `momint-db`: o Postgres.

O custo aproximado é de US$ 20/mês (dois serviços Starter e um Postgres Basic). A Render publica a partir do GitHub: cada push no `master` gera uma nova versão.

1. No painel da Render, abra **New → Blueprint**, conecte o repositório `momint` e confirme os três recursos.
2. Preencha as variáveis pedidas. Em produção a API não sobe sem SMTP e sem `URL_WEB` em HTTPS.
   - `URL_WEB`: o endereço público da interface, por exemplo `https://momint-web.onrender.com`. A Render acrescenta um sufixo quando o nome já existe; confira o endereço final no painel do `momint-web` e corrija a variável se for diferente.
   - `SMTP_USER` e `SMTP_FROM`: a conta Gmail que envia códigos e links.
   - `SMTP_PASS`: a senha de aplicativo do Gmail.
3. Não troque `JWT_SECRET` nem `OTP_SECRET`, que a Render gera sozinha. A troca derruba todas as sessões e invalida os códigos pendentes.
4. Antes de cada versão da API entrar no ar, as migrações são aplicadas (`preDeployCommand`). Isso inclui os dados de referência: tipos de gatilho, CNAEs e municípios iniciais.
5. Para o primeiro acesso do administrador, abra a aba **Shell** do `momint-api` e rode, na raiz do projeto (`/opt/render/project/src`):
   - `npm run admin:preparar -w apps/api`
   - `cat .acesso-admin/primeiro-acesso.txt`

   O link vale 24 horas, e o arquivo desaparece na publicação seguinte. Depois disso, os clientes são cadastrados pelo painel do administrador.
6. Para usar um domínio próprio, adicione-o em **Settings → Custom Domains** do `momint-web` e troque `URL_WEB` pelo novo endereço.

O banco não aceita conexões de fora da Render (`ipAllowList: []`). Para copiar dados do banco local:

1. Libere temporariamente o seu IP em **Networking** do `momint-db`.
2. Rode `pg_dump` e `pg_restore` com a URL externa do banco.
3. Retire a liberação.

A API só recebe tráfego pela interface. Por isso os limites de requisição usam o IP do visitante (`CF-Connecting-IP` ou o primeiro endereço de `X-Forwarded-For`), e não o IP do proxy.
