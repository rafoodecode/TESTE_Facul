# Roteiro de apresentação do SGE

Este roteiro responde aos tópicos legíveis nas duas imagens enviadas em 19/11/2026. As imagens orientam a apresentação da disciplina; os fatos sobre o projeto abaixo foram conferidos no código e nos relatórios de execução. Ajuste os nomes dos integrantes antes de apresentar.

## 1. Como classificar os casos de teste

| Categoria | Para que serve | Exemplo real no projeto | Comando |
|---|---|---|---|
| Smoke | Conferir rapidamente se o fluxo essencial está utilizável. | `RBT-CT03`: o gestor confirma uma solicitação e o usuário vê o novo status. | `npm run test:robot -- --include smoke` |
| Sanity | Verificar uma funcionalidade específica após alteração. | `RBT-CT05`: cadastrar um feriado bloqueia a data e removê-lo libera a data. | `npm run test:robot -- --include sanity` |
| Regression | Conferir novamente comportamentos existentes após mudanças. | `RBT-CT06`: cadastro, edição e remoção de local continuam aparecendo corretamente para o usuário. | `npm run test:robot -- --include regression` |

**Fala sugerida:** “Smoke é a checagem rápida do caminho principal; sanity olha com foco uma mudança; regression verifica se o conjunto de funções continua correto. Um caso pode pertencer a mais de uma categoria. Todos os sete casos Robot têm a tag `regression`; os casos críticos também têm `smoke` e os casos de funcionalidades alteradas têm `sanity`.”

Os títulos Robot contêm IDs e cada caso declara tags. O Robot filtra com `--include`. O resultado 7/7 descreve somente a suíte `tests/robot/sge.robot`, não os demais testes Playwright do projeto.

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
| 1 | `RBT-CT01` | `Abrir Painel` entra com a conta; `Wait Until Location Contains` confere o redirecionamento; `Should Be Equal As Integers` valida HTTP 401 e 403. | [`RBT-CT01.png`](../evidencias/RBT-CT01.png) |
| 2 | `RBT-CT02` | `Contar Meses Da Agenda` confirma 12 meses; `Solicitar Reserva Pela Tela` faz o pedido; `Should Contain` e HTTP 409 verificam pendência e conflito. | [`RBT-CT02.png`](../evidencias/RBT-CT02.png) |
| 3 | `RBT-CT03` | `Confirmar Reserva Pela Tela` altera o status; `Wait Until Keyword Succeeds` espera o aviso no capturador SMTP local. | [`RBT-CT03.png`](../evidencias/RBT-CT03.png) |
| 4 | `RBT-CT05` | `Input Text` e `Click Button` cadastram o feriado; HTTP 400 bloqueia a reserva; `Feriado Deve Estar Removido` confirma a remoção. | [`RBT-CT05.png`](../evidencias/RBT-CT05.png) |

Se houver menos integrantes, distribua os exemplos conforme o grupo. Os outros três casos são: `RBT-CT04` (cancelamento), `RBT-CT06` (locais) e `RBT-CT07` (Admin Geral). O [relatório Robot](../relatorios/Relatorio_Robot_7_Testes.md) explica os sete casos, um por parte.

**Recursos Robot usados de fato:** `Test Setup` e `Test Teardown`, tags, palavras-chave próprias, SeleniumLibrary, asserções `Should Be Equal` e `Should Contain`, `Wait Until Keyword Succeeds`, capturas em `evidencias/`, além de `report.html`, `log.html` e `output.xml`. A biblioteca Python prepara e limpa os dados de cada caso.

## 5. Testes automatizados em Robot Framework

Após as imagens, os sete fluxos foram migrados para [Robot Framework](../tests/robot/sge.robot) com SeleniumLibrary. A execução local de 19/11/2026 registrou **7 PASS e 0 FAIL**. Para a parte da apresentação que pede Robot, mostrem o [relatório em sete partes](../relatorios/Relatorio_Robot_7_Testes.md), o `robot-results/report.html` e exemplos de palavras-chave como `Input Text`, `Click Button`, `Wait Until Page Contains Element` e `Should Be Equal As Integers`. A biblioteca Python `SgeSupport.py` prepara dados isolados, chama APIs e consulta o capturador SMTP. Os relatórios Robot incluem a sequência de palavras-chave, e cada caso salva uma captura `RBT-CTxx.png`.

Os exemplos Playwright da seção 4 e o relatório anterior continuam válidos como histórico de outra suíte. Durante a fala sobre Robot, usem os IDs `RBT-CT01` a `RBT-CT07` e as capturas correspondentes, sem misturar resultados das duas execuções.

## 6. Resultado que pode ser afirmado

Na execução local documentada em 18/11/2026, os sete casos Playwright `SGE-CT01` a `SGE-CT07` passaram. Na nova execução Robot de 19/11/2026, os sete casos `RBT-CT01` a `RBT-CT07` também passaram. Os 11 testes unitários Vitest e o build de produção passaram na validação anterior. O e-mail foi recebido por um capturador SMTP **local**; os relatórios não comprovam a entrega em caixa externa nem a homologação do site publicado.
