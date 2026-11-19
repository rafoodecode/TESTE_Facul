# Sistema de Gerenciamento de Eventos

Aplicação Next.js, TypeScript, Tailwind, Prisma e PostgreSQL para reservar auditórios e salas. Interface em português do Brasil; datas de negócio em America/Recife.

## Execução

Requer Node.js 20+, PostgreSQL 15+ e npm. Copie `.env.example` para `.env`, configure `DATABASE_URL`, `SESSION_SECRET` e o domínio institucional. Execute:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Abra `http://localhost:3000`. Para testar: `npm test` e `npm run test:e2e`. O teste Playwright exige banco migrado, seed e Google Chrome instalado (canal `chrome` em `playwright.config.ts`). `npm run build` verifica o projeto. Para usar Chromium empacotado pelo Playwright, instale-o com `npx playwright install chromium` e remova o canal da configuração.

## Publicação para testes

No Vercel, conecte o repositório GitHub e o banco Neon Free ao projeto. O banco criado para esta implantação se chama `teste-facul-db` e fica na região de São Paulo. Use a URL agrupada do Neon como `DATABASE_URL` para a aplicação. Antes de liberar o endereço de testes, configure `SESSION_SECRET` com um valor aleatório de 32 ou mais caracteres, `INSTITUTIONAL_EMAIL_DOMAIN` e um `MANAGER_INVITE_CODE` privado. Execute `npm run db:deploy` e `npm run db:seed` uma vez contra o banco hospedado; a migração não deve depender do processo de build. Configure `SEED_PASSWORD` com uma senha de demonstração temporária e troque-a antes de compartilhar as contas. As credenciais e o arquivo `.env` não entram no Git.

O ambiente de testes está em [teste-facul.vercel.app](https://teste-facul.vercel.app). O banco Neon Free está ligado ao projeto e recebeu as migrações inicial e `20261105000000_admin_geral` e os dados de demonstração pelo editor SQL em 05/11/2026. Esse caminho não registrou as migrações em `_prisma_migrations`; antes de uma próxima migração com `prisma migrate deploy`, faça o baseline das duas migrações com `prisma migrate resolve --applied <nome_da_migração>` usando uma conexão direta ao Neon. O site está público para testes; os segredos de sessão e convite de gerente ficam apenas nas variáveis protegidas do Vercel. O domínio institucional não foi definido nesse ambiente de teste, portanto qualquer e-mail válido pode se cadastrar como usuário; o cadastro de gerente exige o código privado. O SMTP ainda não está configurado, portanto e-mails de notificação são registrados no console do servidor.

## Variáveis de ambiente

`DATABASE_URL`: PostgreSQL. `SESSION_SECRET`: segredo aleatório com 32+ caracteres. `INSTITUTIONAL_EMAIL_DOMAIN`: domínio permitido, sem `@`; sem configuração aceita qualquer e-mail válido. `MANAGER_INVITE_CODE`: opcional, desligado por padrão conforme especificação. Em produção, configure-o antes de abrir cadastro público. `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: SMTP; sem host, e-mails são registrados no console. `SEED_PASSWORD`: senha das contas de demonstração.

`ADMIN_EMAIL` e `ADMIN_PASSWORD`: opcionais no seed para criar ou atualizar uma conta de administrador geral; a senha deve ter 12+ caracteres. O cadastro público não aceita `ADMIN_GERAL`. No painel, esse perfil pode executar as ações do gerente, listar contas e alterar perfis. A promoção para gerente ou administrador geral exige CPF já validado no cadastro; a tela não permite remover o perfil de um administrador geral.

## Arquitetura e decisões

- `app/api`: regras e autorização no servidor. `lib/rules.ts`: cálculo puro de disponibilidade. `prisma`: modelo, migração e dados iniciais. `app/usuario` e `app/gerente`: interfaces.
- Reservas canceladas permanecem no histórico e liberam o turno. O índice único parcial de PostgreSQL protege concorrência entre solicitações. Uma colisão retorna HTTP 409.
- A cor é calculada por local: branco se algum turno está livre; amarelo se nenhum está livre e algum está pendente; vermelho se todos agendados; cinza para fim de semana, feriado e passado. Um dia amarelo não pode receber novos pedidos.
- Feriado não é criado sobre reservas ativas. Local com reservas futuras ativas não pode ser removido; remoção desativa o local, preservando o histórico.
- CPF só existe para gerente, é validado e nunca aparece nas respostas de listagem. Data de nascimento também não aparece. Nome e matrícula do solicitante vêm da sessão, nunca do corpo do pedido.
- O e-mail inclui local, evento, data, turno e status. Falha SMTP após atualização é comunicada ao gerente; reenvio automático fica como evolução futura.
- O cadastro de gerente é público quando `MANAGER_INVITE_CODE` está vazio, conforme decisão do TXT. É recomendável configurar convite em produção.
- Feriados nacionais móveis não entram no seed por dependerem do calendário anual; o gerente pode cadastrá-los. O seed inclui feriados nacionais de data fixa.
- A interface de acesso, nova reserva e painel do gestor segue os três quadros visíveis do [protótipo Figma](https://www.figma.com/design/8K7jRWjzfytVUSEuclwkcR/Untitled?node-id=1-3): cabeçalho institucional, escolha de perfil, configuração da reserva ao lado do calendário e painel com indicadores, agenda e fila de aprovações. A seleção de data no painel do gestor filtra as solicitações do dia.
- Elementos do protótipo que sugerem CAFe/Gov.br, inteligência artificial ou número fixo de espaços não foram reproduzidos como funcionalidades, pois não existem integrações correspondentes no projeto. A verificação de disponibilidade é determinística e feita no servidor.

## Rastreabilidade

| Requisito | Implementação |
|---|---|
| RF01–RF02, RF16, RN10 | `app/acesso`, `app/api/auth`, `lib/validators`, `lib/rules.ts` |
| RF03–RF09, RN01–RN05, RN08–RN09, RN11–RN12 | `app/usuario`, `components/Calendar.tsx`, `app/api/calendar`, `app/api/bookings`, `lib/rules.ts`, migração Prisma |
| RF10–RF13, RN06–RN07 | `app/gerente`, `app/api/manage/bookings` |
| RF14–RF15 | `app/api/holidays`, `app/api/locals`, `app/gerente` |
| RF17 | `lib/mail.ts`, `app/api/manage/bookings/[id]` |
| RNF01–RNF03 | `app/globals.css`, `components/Calendar.tsx`, `lib/auth.ts`, verificações de perfil nas rotas |
| Administração geral (evolução solicitada) | `prisma/migrations/20261105000000_admin_geral`, `app/api/admin/users`, `app/gerente`, `lib/http.ts`, testes de acesso |

## Lacunas conhecidas

- A miniatura anual mostra as cores para o primeiro local quando o filtro está em “Todos”; selecione um local para ver suas cores específicas.
- O teste unitário verifica o conteúdo do e-mail de desenvolvimento; entrega real por SMTP ainda requer servidor configurado e teste integrado próprio.
- O protótipo visual mostra campos de finalidade/recursos e um fluxo de recuperação de senha que não constam do modelo de dados ou das regras-base. Eles ainda não têm comportamento implementado.
- O quadro Jira KAN fornecido não pôde ser lido nesta sessão porque exige autenticação Atlassian. Nenhum item do Jira foi alterado nem usado como requisito sem verificação.

## Validação realizada

Em 05/11/2026: instalação de dependências, geração do cliente Prisma, migração em PostgreSQL 17 isolado, seed, checagem TypeScript, compilação Next.js, 8 testes Vitest e fluxo Playwright no Chrome passaram. O Playwright também confirmou HTTP 409 para reserva duplicada e HTTP 403 para tentativa de confirmação por usuário comum. O banco isolado de validação usa a porta 55432 e sua configuração local está no `.env` ignorado pelo Git.

O teste anterior `e2e/concurrency.spec.ts` cobre a RN09 com duas solicitações simultâneas e permanece como referência. A configuração atual executa apenas a suíte rastreável em `tests/`.

## Automação de QA da entrega de 17/11

A suíte nova está em `tests/sge.spec.ts`; os fluxos reutilizáveis ficam em `tests/pages/`, a autenticação e limpeza em `tests/fixtures.ts`, e o capturador SMTP local em `tests/support/smtp.ts`. Ela usa somente PostgreSQL em `localhost` ou `127.0.0.1` e inicia o SGE na porta 3100. O banco deve estar migrado. Um Chrome local é usado fora do CI; no GitHub Actions, o fluxo instala Chromium. Instale o vídeo com `npx playwright install ffmpeg`.

```bash
npm install
npm run test:smoke
npm run test:sanity
npm run test:regression
python -m pip install -r requirements-qa.txt
npm run test:report
```

Cada caso termina em PASS ou FAIL, sem `test.skip` e sem nova tentativa automática. Os títulos contêm ID e tags. A captura de cada caso fica em `evidencias/<ID>.png`; rastros e vídeo ficam em `test-results/` somente para falhas. O relatório baseado no JSON real da última execução sai em `relatorios/` nos formatos Markdown e Word. Execute a regressão completa imediatamente antes de gerar o relatório final, pois uma execução parcial substitui o JSON. O autor do relatório pode ser definido em `QA_AUTOR`.

| Casos | Cobertura |
|---|---|
| RF10-CT01/02 | 12 meses e filtro; local inválido |
| RF11-CT01/02 | resumo do dia com reserva; dia vazio sem resumo antigo |
| RF12-CT01/02 | legendas e estados; feriado não livre |
| RF13-CT01/02 | confirmação visível ao usuário; cancelamentos e turno liberado |
| RN06-CT01/02 | URL direta e API de gestor vedadas ao usuário comum |
| RF14-CT01/02 | cadastro e remoção de feriado; duplicidade rejeitada |
| RF15-CT01/02 | cadastro, edição e remoção refletidos ao usuário; remoção com reserva futura vedada |
| RF17-CT01/02 | e-mail capturado ao confirmar e cancelar |

Os testes usam papéis, rótulos acessíveis e os IDs de seções `#feriados`, `#locais` e `#aprovacoes`. Para reduzir dependência do texto da interface, recomenda-se adicionar `data-testid` a mês da agenda anual, linha da reserva, linha do feriado, linha do local e estado de cada dia. Esses atributos não são necessários para a suíte atual.

Os dois RF novos e seus quatro casos, assim como o Documento de Casos de Teste e o template do relatório, não estavam disponíveis nesta sessão. A suíte cobre apenas os resultados esperados descritos acima. Ao receber os documentos, a matriz e o gerador devem ser ajustados às versões oficiais. A execução local de 12/11/2026 terminou com 16 PASS e 0 FAIL; o relatório classifica o conjunto como aprovado com ressalvas pela lacuna documental. O SMTP local valida a geração e o envio pelo aplicativo até o capturador; não comprova entrega a uma caixa de e-mail externa ou o SMTP do site publicado.

## Validação geral de sete fluxos

Execute `npm run test:geral` para os sete casos integrados `SGE-CT01` a `SGE-CT07`, com banco PostgreSQL local migrado. O plano, os resultados reais, as evidências e as limitações estão em [docs/VALIDACAO_GERAL_7_TESTES.md](docs/VALIDACAO_GERAL_7_TESTES.md). Para emitir um relatório separado da suíte de 16 casos, defina `QA_RELATORIO_NOME=Validacao_Geral_7_Testes` e `QA_RELATORIO_LACUNA` antes de `npm run test:report`.

Para apresentação acadêmica, consulte [relatorios/Relatorio_Academico_7_Testes.md](relatorios/Relatorio_Academico_7_Testes.md), [Word](relatorios/Relatorio_Academico_7_Testes.docx) ou [PDF](relatorios/Relatorio_Academico_7_Testes.pdf). O relatório tem uma parte por teste e pode ser recriado com o Python empacotado e `scripts/gerar_relatorio_academico.py`.
