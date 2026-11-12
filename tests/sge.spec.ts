import { test, expect, db } from './fixtures'
import { GestorPage } from './pages/GestorPage'
import { UsuarioPage } from './pages/UsuarioPage'

const meses = /janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro/i
const dataFutura = (dias = 20) => {
  const d = new Date(); d.setUTCDate(d.getUTCDate() + dias)
  while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}
const dataBanco = (s: string) => new Date(`${s}T12:00:00Z`)
const novoLocal = async (prefixo: string) => db.local.create({ data: { nome: `${prefixo} Sala`, tipo: 'SALA' } })
const usuarioQa = async () => (await db.user.findUniqueOrThrow({ where: { email: 'qa-usuario@instituicao.edu.br' } })).id
const reserva = async (prefixo: string, localId: string, data: string, turno: 'MANHA' | 'TARDE' | 'NOITE', status: 'PENDENTE' | 'AGENDADO' = 'PENDENTE') => db.reserva.create({ data: { usuarioId: await usuarioQa(), localId, data: dataBanco(data), turno, status, nomeEvento: `${prefixo} Evento ${turno}` } })

test('RF10-CT01 – calendário anual mostra 12 meses clicáveis e filtra local @smoke @regression', async ({ gestor, prefixo }) => {
  const local = await novoLocal(prefixo); const tela = new GestorPage(gestor)
  await tela.filtrarLocal(local.nome)
  const anual = gestor.getByRole('heading', { name: 'Agenda anual' }).locator('..')
  await expect(anual.getByRole('button', { name: meses })).toHaveCount(12)
  await tela.selecionarMes(dataFutura().slice(0, 7))
  await expect(tela.dia(dataFutura())).toBeVisible()
})

test('RF10-CT02 – filtro com local inexistente não retorna calendário @regression', async ({ gestor }) => {
  const resposta = await gestor.request.get('/api/calendar?localId=inexistente&month=2027-01')
  expect(resposta.status()).toBe(404)
  expect((await resposta.json()).erro).toContain('indisponível')
})

test('RF11-CT01 – seleção do dia mostra resumo de reserva e turno @smoke @regression', async ({ gestor, prefixo }) => {
  const local = await novoLocal(prefixo); const data = dataFutura(); await reserva(prefixo, local.id, data, 'MANHA')
  const tela = new GestorPage(gestor); await tela.filtrarLocal(local.nome); await tela.selecionarMes(data.slice(0, 7)); await tela.dia(data).click()
  await expect(tela.aprovacoes).toContainText(`${prefixo} Evento MANHA`)
  await expect(tela.aprovacoes).toContainText('MANHA')
  await expect(tela.aprovacoes).toContainText(local.nome)
})

test('RF11-CT02 – dia sem reservas não reaproveita resumo anterior @regression', async ({ gestor, prefixo }) => {
  const local = await novoLocal(prefixo); const data = dataFutura(); await reserva(prefixo, local.id, data, 'MANHA')
  const outroDia = dataFutura(22); const tela = new GestorPage(gestor)
  await tela.filtrarLocal(local.nome); await tela.selecionarMes(data.slice(0, 7)); await tela.dia(data).click()
  await expect(tela.reserva(`${prefixo} Evento MANHA`)).toBeVisible()
  if (outroDia.slice(0, 7) !== data.slice(0, 7)) await tela.selecionarMes(outroDia.slice(0, 7))
  await tela.dia(outroDia).click()
  await expect(tela.reserva(`${prefixo} Evento MANHA`)).toHaveCount(0)
  await expect(tela.aprovacoes).toContainText('Nenhuma solicitação')
})

test('RF12-CT01 – gestor vê cores livre pendente agendado indisponível @sanity @regression', async ({ gestor, prefixo }) => {
  const local = await novoLocal(prefixo); const data = dataFutura()
  await reserva(prefixo, local.id, data, 'MANHA', 'PENDENTE')
  await reserva(prefixo, local.id, data, 'TARDE', 'PENDENTE')
  await reserva(prefixo, local.id, data, 'NOITE', 'PENDENTE')
  const tela = new GestorPage(gestor); await tela.filtrarLocal(local.nome); await tela.selecionarMes(data.slice(0, 7))
  await expect(tela.dia(data)).toContainText('Pendente')
  await expect(gestor.getByText('● Livre').first()).toBeVisible()
  await expect(gestor.getByText('● Agendado').first()).toBeVisible()
  await expect(gestor.getByText('● Indisponível').first()).toBeVisible()
})

test('RF12-CT02 – feriado não aparece como dia livre @regression', async ({ gestor, prefixo }) => {
  const local = await novoLocal(prefixo); const data = dataFutura()
  await db.feriado.create({ data: { data: dataBanco(data), descricao: `${prefixo} Feriado` } })
  const tela = new GestorPage(gestor); await tela.filtrarLocal(local.nome); await tela.selecionarMes(data.slice(0, 7))
  await expect(tela.dia(data)).toContainText('—')
  await expect(tela.dia(data)).not.toContainText('Livre')
})

test('RF13-CT01 – confirmar pendente atualiza gestor e usuário @smoke @regression', async ({ gestor, usuario, prefixo }) => {
  const local = await novoLocal(prefixo); const data = dataFutura(); const item = await reserva(prefixo, local.id, data, 'MANHA')
  const tela = new GestorPage(gestor); await tela.filtrarLocal(local.nome); await tela.selecionarMes(data.slice(0, 7))
  await tela.reserva(item.nomeEvento).getByRole('button', { name: 'Confirmar' }).click()
  await expect(tela.reserva(item.nomeEvento)).toContainText('AGENDADO')
  await usuario.reload(); await expect(new UsuarioPage(usuario).minhas).toContainText(item.nomeEvento)
  await expect(new UsuarioPage(usuario).minhas).toContainText('AGENDADO')
})

test('RF13-CT02 – cancelar pendente e agendada libera turno e impede reconfirmação @sanity @regression', async ({ gestor, prefixo }) => {
  const local = await novoLocal(prefixo); const data = dataFutura()
  const pendente = await reserva(prefixo, local.id, data, 'MANHA')
  const agendada = await reserva(prefixo, local.id, data, 'TARDE', 'AGENDADO')
  const tela = new GestorPage(gestor); await tela.filtrarLocal(local.nome); await tela.selecionarMes(data.slice(0, 7))
  await tela.reserva(pendente.nomeEvento).getByRole('button', { name: 'Cancelar' }).click()
  await expect(tela.reserva(pendente.nomeEvento)).toContainText('CANCELADA')
  await tela.reserva(agendada.nomeEvento).getByRole('button', { name: 'Cancelar' }).click()
  await expect(tela.reserva(agendada.nomeEvento)).toContainText('CANCELADA')
  const dias = await gestor.request.get(`/api/calendar?localId=${local.id}&month=${data.slice(0, 7)}`)
  const dia = (await dias.json()).find((d: { date: string }) => d.date === data)
  expect(dia.statuses.MANHA).toBeUndefined(); expect(dia.statuses.TARDE).toBeUndefined()
  const reconfirmar = await gestor.request.patch(`/api/manage/bookings/${pendente.id}`, { data: { status: 'AGENDADO' } })
  expect(reconfirmar.status()).toBe(400)
})

test('RN06-CT01 – usuário não acessa painel do gestor por URL direta @smoke @regression', async ({ usuario }) => {
  await usuario.goto('/gerente')
  await expect(usuario).toHaveURL(/acesso/)
})

test('RN06-CT02 – usuário não executa funções de gerente pela API @regression', async ({ usuario, prefixo }) => {
  const resposta = await usuario.request.post('/api/holidays', { data: { data: dataFutura(), descricao: `${prefixo} Bloqueado` } })
  expect(resposta.status()).toBe(403)
})

test('RF14-CT01 – cadastrar feriado bloqueia dia e remover libera @sanity @regression', async ({ gestor, usuario, prefixo }) => {
  const local = await novoLocal(prefixo); const data = dataFutura(); const tela = new GestorPage(gestor)
  await tela.cadastrarFeriado(data, `${prefixo} Feriado`)
  await expect(tela.feriados).toContainText(`${prefixo} Feriado`)
  await new UsuarioPage(usuario).selecionarLocal(local.nome)
  await new UsuarioPage(usuario).selecionarMes(data.slice(0, 7))
  await expect(usuario.getByRole('button', { name: `${data} CINZA` })).toBeDisabled()
  await tela.feriados.getByText(`${prefixo} Feriado`).locator('..').getByRole('button', { name: 'Remover' }).click()
  await usuario.reload(); await new UsuarioPage(usuario).selecionarLocal(local.nome); await new UsuarioPage(usuario).selecionarMes(data.slice(0, 7))
  await expect(usuario.getByRole('button', { name: `${data} BRANCO` })).toBeEnabled()
})

test('RF14-CT02 – feriado duplicado é recusado e não reagendado @regression', async ({ gestor, prefixo }) => {
  const data = dataFutura(); const tela = new GestorPage(gestor)
  await tela.cadastrarFeriado(data, `${prefixo} Original`)
  await tela.cadastrarFeriado(data, `${prefixo} Duplicado`)
  await expect(gestor.getByRole('status')).toContainText(/ocupado|já existe|cadastrado/i)
  expect(await db.feriado.count({ where: { data: dataBanco(data) } })).toBe(1)
})

test('RF15-CT01 – cadastrar editar remover local atualiza lista do usuário @sanity @regression', async ({ gestor, usuario, prefixo }) => {
  const tela = new GestorPage(gestor); const nome = `${prefixo} Auditório`; const novoNome = `${prefixo} Editado`
  await tela.cadastrarLocal(nome, 'AUDITORIO')
  await expect(usuario.getByLabel('Auditório ou sala').locator('option', { hasText: nome })).toHaveCount(0)
  await usuario.reload(); await expect(usuario.getByLabel('Auditório ou sala').locator('option', { hasText: nome })).toHaveCount(1)
  await tela.locais.getByLabel(`Nome de ${nome}`).fill(novoNome)
  await tela.locais.getByLabel(`Nome de ${nome}`).locator('..').getByRole('button', { name: 'Salvar' }).click()
  await expect(tela.locais.getByLabel(`Nome de ${novoNome}`)).toBeVisible()
  await usuario.reload(); await expect(usuario.getByLabel('Auditório ou sala').locator('option', { hasText: novoNome })).toHaveCount(1)
  await tela.locais.getByLabel(`Nome de ${novoNome}`).locator('..').getByRole('button', { name: 'Remover' }).click()
  await expect(tela.locais.getByLabel(`Nome de ${novoNome}`)).toHaveCount(0)
  await usuario.reload(); await expect(usuario.getByLabel('Auditório ou sala').locator('option', { hasText: novoNome })).toHaveCount(0)
})

test('RF15-CT02 – local com reserva futura não pode ser removido @regression', async ({ gestor, prefixo }) => {
  const local = await novoLocal(prefixo); await reserva(prefixo, local.id, dataFutura(), 'MANHA')
  const resposta = await gestor.request.delete(`/api/locals/${local.id}`)
  expect(resposta.status()).toBe(409)
  expect((await db.local.findUniqueOrThrow({ where: { id: local.id } })).ativo).toBe(true)
})

test('RF17-CT01 – confirmação envia e-mail com reserva e status @sanity @regression', async ({ gestor, prefixo }) => {
  await fetch('http://127.0.0.1:1026/messages', { method: 'DELETE' })
  const local = await novoLocal(prefixo); const item = await reserva(prefixo, local.id, dataFutura(), 'MANHA')
  const resposta = await gestor.request.patch(`/api/manage/bookings/${item.id}`, { data: { status: 'AGENDADO' } })
  expect(resposta.ok()).toBeTruthy()
  await expect.poll(async () => (await (await fetch('http://127.0.0.1:1026/messages')).json() as string[]).length).toBe(1)
  const [email] = await (await fetch('http://127.0.0.1:1026/messages')).json() as string[]
  expect(email).toContain('qa-usuario@instituicao.edu.br'); expect(email).toContain(item.nomeEvento); expect(email).toContain('agendado')
})

test('RF17-CT02 – cancelamento envia e-mail com reserva e status @regression', async ({ gestor, prefixo }) => {
  await fetch('http://127.0.0.1:1026/messages', { method: 'DELETE' })
  const local = await novoLocal(prefixo); const item = await reserva(prefixo, local.id, dataFutura(), 'MANHA', 'AGENDADO')
  const resposta = await gestor.request.patch(`/api/manage/bookings/${item.id}`, { data: { status: 'CANCELADA' } })
  expect(resposta.ok()).toBeTruthy()
  await expect.poll(async () => (await (await fetch('http://127.0.0.1:1026/messages')).json() as string[]).length).toBe(1)
  const [email] = await (await fetch('http://127.0.0.1:1026/messages')).json() as string[]
  expect(email).toContain('qa-usuario@instituicao.edu.br'); expect(email).toContain(item.nomeEvento); expect(email).toContain('cancelada')
})
