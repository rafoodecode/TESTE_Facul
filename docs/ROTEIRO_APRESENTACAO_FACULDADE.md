# Roteiro de apresentação do SGE

Este roteiro responde aos tópicos legíveis nas duas imagens enviadas em 19/11/2026. As imagens orientam a apresentação da disciplina; os fatos sobre o projeto abaixo foram conferidos no código e nos relatórios de execução. Ajuste os nomes dos integrantes antes de apresentar.

## 1. Como classificar os casos de teste

| Categoria | Para que serve | Exemplo real no projeto | Comando |
|---|---|---|---|
| Smoke | Conferir rapidamente se o fluxo essencial está utilizável. | `RF13-CT01`: o gestor confirma uma solicitação e o usuário vê o novo status. | `npm run test:smoke` |
| Sanity | Verificar uma funcionalidade específica após alteração. | `RF14-CT01`: cadastrar um feriado bloqueia a data e removê-lo libera a data. | `npm run test:sanity` |
| Regression | Conferir novamente comportamentos existentes após mudanças. | `RF15-CT01`: cadastro, edição e remoção de local continuam aparecendo corretamente para o usuário. | `npm run test:regression` |

**Fala sugerida:** “Smoke é a checagem rápida do caminho principal; sanity olha com foco uma mudança; regression verifica se o conjunto de funções continua correto. Um caso pode pertencer a mais de uma categoria. As sete verificações integradas `SGE-CT01` a `SGE-CT07` estão marcadas como `@regression`; os exemplos de smoke e sanity estão na suíte rastreável `tests/sge.spec.ts`.”

Os títulos dos testes contêm tags e IDs. O Playwright seleciona os casos com `--grep` nos scripts do `package.json`. Não use o resultado 7/7 para afirmar que toda a regressão de 23 casos foi executada nessa mesma rodada: ele descreve a suíte `test:geral`.

## 2. Backend: tecnologias e um método central

**Tecnologias:** Next.js com rotas de API em TypeScript, Prisma para acesso ao PostgreSQL, Zod para validação de entrada e sessão com controle de perfil no servidor.

**Exemplo para o slide:** o método `POST` de [`app/api/bookings/route.ts`](../app/api/bookings/route.ts) recebe um pedido de reserva. Ele exige perfil de usuário, valida local, evento, data e turno, consulta feriados e reservas ativas dentro de uma transação e cria a solicitação como `PENDENTE` quando o turno está disponível. Pedido conflitante é recusado. O teste `SGE-CT02` verificou o bloqueio da repetição com HTTP 409.

**Fala sugerida:** “A regra não fica apenas na tela. Mesmo que alguém envie a requisição diretamente, o servidor confere autorização e disponibilidade antes de gravar no banco.”

## 3. Frontend: telas e fluxo resumido

**Tecnologias:** Next.js, React, TypeScript e Tailwind CSS.

**Telas para demonstrar:**

1. `/acesso`: entrada e escolha de perfil.
2. `/usuario`: escolha do local, calendário, solicitação e histórico da reserva.
3. `/gerente`: agenda anual, fila de aprovações, feriados e locais.
4. Área de perfis no painel de gestão: visível somente ao Admin Geral.

**Fluxo de demonstração:** usuário solicita um turno livre → o pedido fica `PENDENTE` → gestor confirma → usuário vê `AGENDADO` → o capturador SMTP local registra o aviso. Esse fluxo é sustentado por `SGE-CT02` e `SGE-CT03`.

## 4. Testes automatizados: exemplos para distribuir entre integrantes

| Integrante | Caso para explicar | Ação e asserção em Playwright | Evidência |
|---|---|---|---|
| 1 | `SGE-CT01` | `page.request.post` verifica login inválido com HTTP 401; URL direta e API de gestor são bloqueadas ao usuário. | [`SGE-CT01.png`](../evidencias/SGE-CT01.png) |
| 2 | `SGE-CT02` | `getByRole` conta 12 meses; `UsuarioPage.solicitar` cria pedido; `expect` verifica `PENDENTE` e HTTP 409 na duplicidade. | [`SGE-CT02.png`](../evidencias/SGE-CT02.png) |
| 3 | `SGE-CT03` | O botão `Confirmar` atualiza o status; `expect.poll` espera a mensagem no capturador SMTP local. | [`SGE-CT03.png`](../evidencias/SGE-CT03.png) |
| 4 | `SGE-CT05` | `GestorPage.cadastrarFeriado` usa a interface; a API recusa a reserva no feriado com HTTP 400; a remoção libera a data. | [`SGE-CT05.png`](../evidencias/SGE-CT05.png) |

Se houver menos integrantes, distribua os exemplos conforme o grupo. Os outros três casos são: `SGE-CT04` (cancelamento), `SGE-CT06` (locais) e `SGE-CT07` (Admin Geral). O [relatório acadêmico](../relatorios/Relatorio_Academico_7_Testes.md) explica os sete casos, um por parte.

**Recursos usados de fato:** fixtures de login para gestor e usuário, Page Object Model em `tests/pages/`, seletores por papel e rótulo, asserções `expect`, consulta de API, espera `expect.poll`, capturas em `evidencias/` e limpeza de dados após cada caso. Trace e vídeo são guardados apenas quando um teste falha.

## 5. Atenção à menção a Robot Framework

A segunda imagem pede exemplos de testes automatizados **em Robot**. O projeto atual usa **Playwright com TypeScript**, como mostram [`package.json`](../package.json), [`playwright.config.ts`](../playwright.config.ts) e os arquivos em `tests/`. Nenhum dos sete casos foi executado em Robot Framework. Na apresentação, descrevam os recursos do Playwright acima e não atribuam a ele palavras-chave ou relatórios do Robot. Se Robot Framework for um critério obrigatório da avaliação, será preciso implementar e executar uma suíte Robot separada antes de afirmar que esse item foi atendido.

## 6. Resultado que pode ser afirmado

Na execução local documentada em 18/11/2026, os sete casos `SGE-CT01` a `SGE-CT07` passaram. Os 11 testes unitários Vitest e o build de produção também passaram nessa validação. O e-mail foi recebido por um capturador SMTP **local**; o relatório não comprova a entrega em caixa externa nem a homologação do site publicado.
