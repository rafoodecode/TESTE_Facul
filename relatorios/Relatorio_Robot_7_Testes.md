# Relatório dos sete testes automatizados em Robot Framework

**Projeto:** SGE – Sistema de Gestão de Eventos e Espaços

**Execução:** 19/11/2026 08:24 (ambiente local)

**Ferramentas:** Robot Framework, SeleniumLibrary, Chrome, PostgreSQL local e capturador SMTP local.

**Resultado geral:** 7 executados; 7 PASS; 0 FAIL.

Cada parte abaixo corresponde a um caso. O resultado é lido de `robot-results/output.xml`, sem alteração manual das falhas.

## Parte 1 — RBT-CT01: Autenticação e acesso

**Objetivo e resultado esperado:** Senha inválida recebe HTTP 401; usuário comum é bloqueado na URL e na API de gestor; gestor acessa seu painel.

**Palavras-chave usadas:** Login Inválido Retorna; Abrir Painel; Wait Until Location Contains; API De Gestão Como Usuário Retorna.

**Resultado obtido:** **PASS**.

**Evidência visual:** [captura RBT-CT01](../evidencias/RBT-CT01.png). A sequência de palavras-chave, asserções e respostas consta no [log Robot](../robot-results/log.html).

## Parte 2 — RBT-CT02: Calendário e conflito

**Objetivo e resultado esperado:** Agenda anual tem 12 meses; pedido feito pela tela fica PENDENTE; repetição para o mesmo turno recebe HTTP 409.

**Palavras-chave usadas:** Contar Meses Da Agenda; Solicitar Reserva Pela Tela; Status Da Reserva Na Tela; Pedido Duplicado Retorna.

**Resultado obtido:** **PASS**.

**Evidência visual:** [captura RBT-CT02](../evidencias/RBT-CT02.png). A sequência de palavras-chave, asserções e respostas consta no [log Robot](../robot-results/log.html).

## Parte 3 — RBT-CT03: Confirmação e e-mail

**Objetivo e resultado esperado:** Gestor confirma a reserva pela tela; usuário vê AGENDADO; capturador SMTP local recebe o aviso.

**Palavras-chave usadas:** Confirmar Reserva Pela Tela; Status Da Reserva Na Tela; Wait Until Keyword Succeeds.

**Resultado obtido:** **PASS**.

**Evidência visual:** [captura RBT-CT03](../evidencias/RBT-CT03.png). A sequência de palavras-chave, asserções e respostas consta no [log Robot](../robot-results/log.html).

## Parte 4 — RBT-CT04: Cancelamento e turno livre

**Objetivo e resultado esperado:** Cancelamento retorna HTTP 200; calendário volta a BRANCO; usuário vê CANCELADA; capturador recebe aviso.

**Palavras-chave usadas:** Cancelar Reserva Como Gestor; Estado Da Data No Calendário; Mensagem De Cancelamento Deve Existir.

**Resultado obtido:** **PASS**.

**Evidência visual:** [captura RBT-CT04](../evidencias/RBT-CT04.png). A sequência de palavras-chave, asserções e respostas consta no [log Robot](../robot-results/log.html).

## Parte 5 — RBT-CT05: Feriado

**Objetivo e resultado esperado:** Gestor cadastra feriado; reserva na data recebe HTTP 400; remoção apaga o feriado e libera a data.

**Palavras-chave usadas:** Preencher Data Do Feriado; Click Button; Reserva Em Feriado Retorna; Feriado Deve Estar Removido.

**Resultado obtido:** **PASS**.

**Evidência visual:** [captura RBT-CT05](../evidencias/RBT-CT05.png). A sequência de palavras-chave, asserções e respostas consta no [log Robot](../robot-results/log.html).

## Parte 6 — RBT-CT06: Auditórios e salas

**Objetivo e resultado esperado:** Local criado, editado e removido pelo gestor aparece, muda e desaparece na lista do usuário.

**Palavras-chave usadas:** Input Text; Select From List By Value; Click Button; Wait Until Page Contains Element.

**Resultado obtido:** **PASS**.

**Evidência visual:** [captura RBT-CT06](../evidencias/RBT-CT06.png). A sequência de palavras-chave, asserções e respostas consta no [log Robot](../robot-results/log.html).

## Parte 7 — RBT-CT07: Admin Geral e privacidade

**Objetivo e resultado esperado:** Gestor comum recebe HTTP 403 na API de perfis; Admin Geral acessa a área; resposta não expõe hash, CPF ou nascimento.

**Palavras-chave usadas:** Criar Admin Temporário; Abrir Painel; Wait Until Page Contains; API De Perfis Do Admin É Segura.

**Resultado obtido:** **PASS**.

**Evidência visual:** [captura RBT-CT07](../evidencias/RBT-CT07.png). A sequência de palavras-chave, asserções e respostas consta no [log Robot](../robot-results/log.html).

**Conclusão:** a classificação se limita aos sete cenários executados contra o banco local. O SMTP local confirma a geração e o envio ao capturador; a entrega externa e o site publicado requerem homologação própria. A suíte Playwright anterior permanece disponível como referência independente.
