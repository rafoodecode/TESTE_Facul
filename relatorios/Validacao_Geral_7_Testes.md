# Relatório de Execução de Casos de Teste

## I. Informações Gerais

- Projeto: SGE – Sistema de Gestão de Eventos e Espaços
- Versão: 1.0.0
- Autor: Equipe QA
- Data de execução: 18/11/2026 21:37

## II. Resumo de Execução

| Planejados | Executados | Passaram | Falharam | Percentual PASS | Percentual FAIL |
|---:|---:|---:|---:|---:|---:|
| 7 | 7 | 7 | 0 | 100.0% | 0.0% |

## III. Detalhamento dos Resultados

| Caso de Teste | Resultado | Observações | Evidência |
|---|---|---|---|
| SGE-CT01 – autenticação e bloqueio de acesso indevido | PASS | Comportamento esperado confirmado. | [Captura](../evidencias/SGE-CT01.png) |
| SGE-CT02 – calendário, solicitação e conflito de turno | PASS | Comportamento esperado confirmado. | [Captura](../evidencias/SGE-CT02.png) |
| SGE-CT03 – confirmação atualiza usuário e envia e-mail local | PASS | Comportamento esperado confirmado. | [Captura](../evidencias/SGE-CT03.png) |
| SGE-CT04 – cancelamento libera turno e envia e-mail local | PASS | Comportamento esperado confirmado. | [Captura](../evidencias/SGE-CT04.png) |
| SGE-CT05 – feriado bloqueia reservas e remoção libera a data | PASS | Comportamento esperado confirmado. | [Captura](../evidencias/SGE-CT05.png) |
| SGE-CT06 – gestor cadastra, edita e remove local visível ao usuário | PASS | Comportamento esperado confirmado. | [Captura](../evidencias/SGE-CT06.png) |
| SGE-CT07 – Admin Geral acessa perfis sem expor dados sensíveis | PASS | Comportamento esperado confirmado. | [Captura](../evidencias/SGE-CT07.png) |

## IV. Lista de Defeitos

| ID | Caso | Descrição | Severidade |
|---|---|---|---|
| — | — | Nenhum defeito identificado nesta execução. | — |

## V. Conclusão e Recomendações

Resultado: **Aprovada com ressalvas**.

A classificação considera somente os casos executados. Nenhuma falha foi identificada nos casos executados.
A validacao cobre sete fluxos locais. Testes manuais e homologacao do ambiente publicado continuam necessarios.
