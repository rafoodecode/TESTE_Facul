# Relatório técnico de execução Robot Framework

## I. Informações gerais

- Projeto: SGE – Sistema de Gestão de Eventos e Espaços
- Versão: 1.0.0
- Responsável: equipe do projeto (nomes não informados)
- Execução: 19/11/2026 08:24
- Ambiente: Next.js e PostgreSQL locais; Chrome; capturador SMTP local

## II. Resumo de execução

7 casos planejados e executados; 7 PASS (100%); 0 FAIL (0%).

## III. Detalhamento

| Caso | Categoria | Resultado | Evidência |
|---|---|---|---|
| RBT-CT01 — Autenticação e acesso | regression, smoke | PASS | [captura](../evidencias/RBT-CT01.png) |
| RBT-CT02 — Calendário e conflito | regression, smoke | PASS | [captura](../evidencias/RBT-CT02.png) |
| RBT-CT03 — Confirmação e e-mail | regression, sanity, smoke | PASS | [captura](../evidencias/RBT-CT03.png) |
| RBT-CT04 — Cancelamento e turno livre | regression, sanity | PASS | [captura](../evidencias/RBT-CT04.png) |
| RBT-CT05 — Feriado | regression, sanity | PASS | [captura](../evidencias/RBT-CT05.png) |
| RBT-CT06 — Auditórios e salas | regression, sanity | PASS | [captura](../evidencias/RBT-CT06.png) |
| RBT-CT07 — Admin Geral e privacidade | regression, sanity | PASS | [captura](../evidencias/RBT-CT07.png) |

## IV. Defeitos observados

Nenhum defeito do SGE foi identificado nos sete casos desta execução.

## V. Conclusão e recomendações

Aprovada com ressalvas para os sete fluxos locais.
O resultado não representa cobertura integral dos requisitos. O capturador SMTP confirma o aviso local, mas não a entrega em caixa externa. O site publicado não foi avaliado nesta rodada.

Artefatos de auditoria: `robot-results/output.xml`, `robot-results/report.html`, `robot-results/log.html` e sete capturas `evidencias/RBT-CTxx.png`.
