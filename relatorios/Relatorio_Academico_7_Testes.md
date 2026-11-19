# Relatório acadêmico dos sete testes automatizados do SGE

**Projeto:** Sistema de Gestão de Eventos e Espaços (SGE)

**Versão:** 1.0.0

**Execução analisada:** 18/11/2026, ambiente local

**Ferramentas:** Playwright com TypeScript, Chrome, PostgreSQL local e capturador SMTP local
**Resultado:** 7 testes executados, 7 aprovados, 0 reprovados.

O objetivo foi verificar os fluxos principais dos painéis do usuário, do gestor e do administrador geral. Os testes automatizados executam ações reais na interface e nas APIs, com dados temporários que são removidos após cada caso. Cada parte abaixo pode ser apresentada separadamente em sala.

## Parte 1 — SGE-CT01: autenticação e controle de acesso

**Pergunta do teste:** uma pessoa sem permissão consegue entrar nas funções do gestor?

**Procedimento automatizado:** o teste tenta entrar com senha incorreta, acessa a URL `/gerente` com uma conta de usuário comum, consulta uma API de gestão com essa conta e verifica o painel com a conta de gestor.

**Resultado esperado:** a senha incorreta recebe HTTP 401; o usuário comum é redirecionado e recebe HTTP 403 na API; o gestor vê o Painel de Gestão.

**Resultado obtido:** **PASS**. Todos os bloqueios e o acesso autorizado ocorreram como esperado.

**Importância:** protege as funções administrativas mesmo quando alguém tenta acessar a URL diretamente.

**Evidência:** [captura do caso SGE-CT01](../evidencias/SGE-CT01.png). As respostas HTTP são verificadas pelas asserções do [teste automatizado](../tests/validacao-geral.spec.ts).

## Parte 2 — SGE-CT02: calendário, reserva e conflito

**Pergunta do teste:** o sistema mostra o ano completo e impede duas solicitações para o mesmo turno?

**Procedimento automatizado:** o teste conta os 12 meses da agenda anual, cria um local temporário, solicita pela tela um turno livre e tenta repetir o pedido por API para a mesma data, local e turno.

**Resultado esperado:** 12 meses disponíveis; primeira solicitação com status `PENDENTE`; duplicidade rejeitada com HTTP 409.

**Resultado obtido:** **PASS**. A solicitação foi registrada e o conflito foi bloqueado.

**Importância:** evita reservas concorrentes para o mesmo espaço e horário.

**Evidência:** [captura do caso SGE-CT02](../evidencias/SGE-CT02.png).

## Parte 3 — SGE-CT03: confirmação e aviso ao usuário

**Pergunta do teste:** a confirmação feita pelo gestor aparece para o usuário e gera aviso?

**Procedimento automatizado:** o teste cria uma reserva pendente, confirma pelo painel do gestor, atualiza o painel do usuário e consulta as mensagens recebidas pelo capturador de e-mail local.

**Resultado esperado:** reserva com status `AGENDADO` nos dois painéis e uma mensagem contendo o nome do evento.

**Resultado obtido:** **PASS**. O status foi atualizado e o capturador recebeu uma mensagem.

**Importância:** garante que a decisão do gestor chegue ao histórico do solicitante e ao serviço de e-mail configurado para o teste.

**Evidência:** [captura do caso SGE-CT03](../evidencias/SGE-CT03.png). A entrega em caixa externa não foi testada.

## Parte 4 — SGE-CT04: cancelamento e liberação do turno

**Pergunta do teste:** cancelar uma reserva devolve a disponibilidade do turno e avisa o usuário?

**Procedimento automatizado:** o teste cria uma reserva agendada, solicita o cancelamento como gestor, consulta o calendário, verifica o histórico do usuário e consulta o capturador SMTP local.

**Resultado esperado:** resposta HTTP 200; dia livre (`BRANCO`) sem ocupação do turno da manhã; histórico `CANCELADA`; uma mensagem de cancelamento.

**Resultado obtido:** **PASS**. O turno foi liberado, o histórico mudou e a mensagem foi capturada.

**Importância:** permite que o horário cancelado volte a ser utilizado.

**Evidência:** [captura do caso SGE-CT04](../evidencias/SGE-CT04.png).

## Parte 5 — SGE-CT05: cadastro e remoção de feriado

**Pergunta do teste:** um feriado impede reservas e deixa a data disponível após a remoção?

**Procedimento automatizado:** o gestor cadastra um feriado temporário pela tela; o usuário tenta reservar a data; o gestor remove o feriado; o teste consulta novamente o calendário.

**Resultado esperado:** feriado visível; pedido bloqueado com HTTP 400; registro removido do banco; data com estado `BRANCO`.

**Resultado obtido:** **PASS**. O bloqueio e a liberação ocorreram na sequência esperada.

**Importância:** evita solicitações em dias indisponíveis e confirma que a remoção realmente restaura a data.

**Evidência:** [captura do caso SGE-CT05](../evidencias/SGE-CT05.png).

## Parte 6 — SGE-CT06: gestão de auditórios e salas

**Pergunta do teste:** alterações de locais feitas pelo gestor chegam à lista usada pelo usuário?

**Procedimento automatizado:** o gestor cadastra um auditório, altera seu nome e o remove. Depois de cada ação, o teste atualiza a tela do usuário e confere a lista de locais.

**Resultado esperado:** local novo aparece; nome editado substitui o antigo; local removido desaparece da seleção.

**Resultado obtido:** **PASS**. As três mudanças foram refletidas na tela do usuário.

**Importância:** mantém o cadastro administrativo e a experiência de reserva sincronizados.

**Evidência:** [captura do caso SGE-CT06](../evidencias/SGE-CT06.png).

## Parte 7 — SGE-CT07: acesso do administrador geral e proteção de dados

**Pergunta do teste:** somente o Admin Geral consegue consultar perfis, sem receber dados sensíveis desnecessários?

**Procedimento automatizado:** o teste cria uma conta administrativa temporária, verifica que um gestor comum recebe HTTP 403 na API de contas, entra como Admin Geral, abre a área de perfis e examina os campos retornados pela API.

**Resultado esperado:** acesso negado ao gestor comum; acesso autorizado ao Admin Geral; resposta sem `senhaHash`, `cpf` e `dataNascimento`.

**Resultado obtido:** **PASS**. A separação de perfis e a restrição dos campos foram confirmadas.

**Importância:** reduz exposição de informações pessoais e limita a administração de contas ao perfil correto.

**Evidência:** [captura do caso SGE-CT07](../evidencias/SGE-CT07.png).

**Conclusão para apresentação:** os sete cenários selecionados passaram na execução local. Isso demonstra que os fluxos verificados funcionaram nas condições testadas. A suíte não substitui a homologação do site publicado, o teste de entrega real de e-mail nem a verificação completa de todos os requisitos. O relatório técnico com os resultados de execução está em [Validacao_Geral_7_Testes.md](Validacao_Geral_7_Testes.md).
