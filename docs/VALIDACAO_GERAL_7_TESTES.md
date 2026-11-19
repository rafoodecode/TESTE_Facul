# Plano e documentação de testes — SGE

## Objetivo e ambiente

Validar sete fluxos integrados do Sistema de Gestão de Eventos e Espaços nos painéis de usuário, gestor e Admin Geral. A execução registrada abaixo ocorreu em 18/11/2026, com Next.js local em `http://127.0.0.1:3100`, PostgreSQL 17 local na porta 55432, Chrome e Playwright 1.64.1. O envio de e-mail foi verificado em um capturador SMTP local nas portas 1025/1026.

Os testes usam contas e registros com prefixo `QA-`, criados em banco local. A fixture recusa `DATABASE_URL` fora de `localhost` ou `127.0.0.1`, remove reservas, feriados, locais e conta administrativa criados por cada caso. Os dados iniciais de gestor e usuário permanecem para as execuções seguintes. Nenhuma operação desta suíte usa o banco publicado.

## Casos automatizados

| Caso | Área e comportamento esperado | Resultado |
|---|---|---|
| SGE-CT01 | Login inválido retorna 401; usuário comum não acessa painel nem API de gestor; gestor acessa painel. | PASS |
| SGE-CT02 | Agenda anual apresenta 12 meses; usuário solicita turno livre; pedido fica pendente; duplicidade do turno retorna 409. | PASS |
| SGE-CT03 | Gestor confirma pendência; usuário vê `AGENDADO`; capturador SMTP recebe e-mail do evento. | PASS |
| SGE-CT04 | Gestor cancela reserva agendada; turno volta a `BRANCO`; usuário vê `CANCELADA`; capturador recebe e-mail de cancelamento. | PASS |
| SGE-CT05 | Feriado cadastrado aparece na lista e bloqueia reserva; remoção apaga o feriado e libera a data. | PASS |
| SGE-CT06 | Gestor cadastra, edita e remove local; lista do usuário reflete cada mudança. | PASS |
| SGE-CT07 | Gestor comum não consulta contas; Admin Geral entra no painel e consulta contas sem hash de senha, CPF ou nascimento na resposta. | PASS |

**Resultado real:** 7 planejados, 7 executados, 7 PASS, 0 FAIL (100% PASS). A primeira tentativa exigiu instalar o FFmpeg do Playwright e aplicar a migração local `20261105000000_admin_geral`; a execução final acima passou integralmente. Não foram alteradas as asserções para acomodar falhas do SGE.

## Evidências e reprodução

O código está em [`tests/validacao-geral.spec.ts`](../tests/validacao-geral.spec.ts). Cada captura fica em `evidencias/SGE-CT01.png` a `evidencias/SGE-CT07.png`. A configuração mantém trace e vídeo somente para falha; a última execução não deixou traces ou vídeos por ter passado. O JSON de execução é `test-results/resultados.json`, e o gerador produz relatório Markdown e Word em `relatorios/`.

```bash
npm install
npx prisma migrate deploy
npx playwright install chrome ffmpeg
npm run test:geral
$env:QA_RELATORIO_NOME = 'Validacao_Geral_7_Testes'
$env:QA_RELATORIO_LACUNA = 'A validação cobre sete fluxos locais. Testes manuais e homologação do ambiente publicado continuam necessários.'
npm run test:report
```

Configure antes `.env` para um PostgreSQL local e um `SESSION_SECRET` de teste. A suíte inicia o servidor e o SMTP local pela configuração Playwright. A geração Word requer `python-docx` conforme `requirements-qa.txt`.

## Cobertura e limites

Os sete casos percorrem as áreas principais e regras de autorização, conflito, feriado, disponibilidade, gestão de locais e e-mail. Constituem uma amostra integrada, não uma prova exaustiva de todos os requisitos, combinações de turnos, navegadores, concorrência, acessibilidade ou segurança. A entrega real de e-mail pelo SMTP publicado e o ambiente Vercel não foram testados nesta execução. Os documentos de casos de teste e o template mencionados anteriormente não foram anexados nesta conversa; os IDs `SGE-CT` são próprios desta validação e não substituem uma matriz oficial.

Os seletores usam papéis e rótulos acessíveis. Para maior estabilidade futura, recomenda-se `data-testid` nos itens do calendário anual, linha de reserva, linha de feriado, linha de local e estado do dia.
