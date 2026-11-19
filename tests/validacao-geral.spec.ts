import { hash } from 'bcryptjs'
import { test, expect, db, senha } from './fixtures'
import { GestorPage } from './pages/GestorPage'
import { UsuarioPage } from './pages/UsuarioPage'

function proximoDiaUtil(dias = 16) {
  const dia = new Date()
  dia.setUTCDate(dia.getUTCDate() + dias)
  while ([0, 6].includes(dia.getUTCDay())) dia.setUTCDate(dia.getUTCDate() + 1)
  return dia.toISOString().slice(0, 10)
}
const noBanco = (data: string) => new Date(`${data}T12:00:00Z`)
const novoLocal = (prefixo: string) => db.local.create({ data: { nome: `${prefixo} Sala`, tipo: 'SALA' } })
async function novaReserva(prefixo: string, localId: string, data: string, status: 'PENDENTE' | 'AGENDADO') {
  const usuario = await db.user.findUniqueOrThrow({ where: { email: 'qa-usuario@instituicao.edu.br' } })
  return db.reserva.create({ data: { usuarioId: usuario.id, localId, data: noBanco(data), turno: 'MANHA', status, nomeEvento: `${prefixo} Encontro` } })
}
async function mensagens() { return await (await fetch('http://127.0.0.1:1026/messages')).json() as string[] }

test('SGE-CT01 – autenticação e bloqueio de acesso indevido @regression', async ({ page, usuario, gestor }) => {
  const invalido = await page.request.post('/api/auth/login', { data: { email: 'qa-gestor@instituicao.edu.br', senha: 'incorreta' } })
  expect(invalido.status()).toBe(401)
  await usuario.goto('/gerente')
  await expect(usuario).toHaveURL(/acesso/)
  const restrito = await usuario.request.get('/api/manage/bookings?month=2026-11')
  expect(restrito.status()).toBe(403)
  await expect(gestor.getByRole('heading', { name: /Painel de Gestão/ })).toBeVisible()
})

test('SGE-CT02 – calendário, solicitação e conflito de turno @regression', async ({ usuario, gestor, prefixo }) => {
  const local = await novoLocal(prefixo); const data = proximoDiaUtil()
  const anual = gestor.getByRole('heading', { name: 'Agenda anual' }).locator('..')
  await expect(anual.getByRole('button', { name: /janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro/i })).toHaveCount(12)
  const tela = new UsuarioPage(usuario)
  await tela.selecionarLocal(local.nome); await tela.selecionarMes(data.slice(0, 7))
  await tela.solicitar(data, `${prefixo} Encontro`)
  await expect(tela.minhas).toContainText('PENDENTE')
  const repetida = await usuario.request.post('/api/bookings', { data: { localId: local.id, data, turno: 'MANHA', nomeEvento: `${prefixo} Duplicada` } })
  expect(repetida.status()).toBe(409)
})

test('SGE-CT03 – confirmação atualiza usuário e envia e-mail local @regression', async ({ gestor, usuario, prefixo }) => {
  await fetch('http://127.0.0.1:1026/messages', { method: 'DELETE' })
  const local = await novoLocal(prefixo); const data = proximoDiaUtil(); const item = await novaReserva(prefixo, local.id, data, 'PENDENTE')
  const tela = new GestorPage(gestor); await tela.filtrarLocal(local.nome); await tela.selecionarMes(data.slice(0, 7))
  await tela.reserva(item.nomeEvento).getByRole('button', { name: 'Confirmar' }).click()
  await expect(tela.reserva(item.nomeEvento)).toContainText('AGENDADO')
  await usuario.reload(); await expect(new UsuarioPage(usuario).minhas).toContainText('AGENDADO')
  await expect.poll(async () => (await mensagens()).length).toBe(1)
  expect((await mensagens())[0]).toContain(item.nomeEvento)
})

test('SGE-CT04 – cancelamento libera turno e envia e-mail local @regression', async ({ gestor, usuario, prefixo }) => {
  await fetch('http://127.0.0.1:1026/messages', { method: 'DELETE' })
  const local = await novoLocal(prefixo); const data = proximoDiaUtil(); const item = await novaReserva(prefixo, local.id, data, 'AGENDADO')
  const resposta = await gestor.request.patch(`/api/manage/bookings/${item.id}`, { data: { status: 'CANCELADA' } })
  expect(resposta.status()).toBe(200)
  const calendario = await usuario.request.get(`/api/calendar?localId=${local.id}&month=${data.slice(0, 7)}`)
  const dia = (await calendario.json()).find((valor: { date: string }) => valor.date === data)
  expect(dia.state).toBe('BRANCO'); expect(dia.statuses.MANHA).toBeUndefined()
  await usuario.reload(); await expect(new UsuarioPage(usuario).minhas).toContainText('CANCELADA')
  await expect.poll(async () => (await mensagens()).length).toBe(1)
  expect((await mensagens())[0]).toContain('cancelada')
})

test('SGE-CT05 – feriado bloqueia reservas e remoção libera a data @regression', async ({ gestor, usuario, prefixo }) => {
  const local = await novoLocal(prefixo); const data = proximoDiaUtil()
  const tela = new GestorPage(gestor)
  await tela.cadastrarFeriado(data, `${prefixo} Feriado`)
  await expect(tela.feriados).toContainText(`${prefixo} Feriado`)
  const bloqueada = await usuario.request.post('/api/bookings', { data: { localId: local.id, data, turno: 'MANHA', nomeEvento: `${prefixo} Evento` } })
  expect(bloqueada.status()).toBe(400)
  const feriado = await db.feriado.findUniqueOrThrow({ where: { data: noBanco(data) } })
  await tela.feriados.getByText(`${prefixo} Feriado`).locator('..').getByRole('button', { name: 'Remover' }).click()
  await expect.poll(async () => db.feriado.count({ where: { id: feriado.id } })).toBe(0)
  const calendario = await usuario.request.get(`/api/calendar?localId=${local.id}&month=${data.slice(0, 7)}`)
  expect((await calendario.json()).find((valor: { date: string }) => valor.date === data).state).toBe('BRANCO')
})

test('SGE-CT06 – gestor cadastra, edita e remove local visível ao usuário @regression', async ({ gestor, usuario, prefixo }) => {
  const tela = new GestorPage(gestor); const nome = `${prefixo} Auditório`; const editado = `${prefixo} Editado`
  await tela.cadastrarLocal(nome, 'AUDITORIO')
  await expect(tela.locais.getByLabel(`Nome de ${nome}`)).toBeVisible()
  await usuario.reload(); await expect(usuario.getByLabel('Auditório ou sala').locator('option', { hasText: nome })).toHaveCount(1)
  await tela.locais.getByLabel(`Nome de ${nome}`).fill(editado)
  await tela.locais.getByLabel(`Nome de ${nome}`).locator('..').getByRole('button', { name: 'Salvar' }).click()
  await expect(tela.locais.getByLabel(`Nome de ${editado}`)).toBeVisible()
  await usuario.reload(); await expect(usuario.getByLabel('Auditório ou sala').locator('option', { hasText: editado })).toHaveCount(1)
  await tela.locais.getByLabel(`Nome de ${editado}`).locator('..').getByRole('button', { name: 'Remover' }).click()
  await expect(tela.locais.getByLabel(`Nome de ${editado}`)).toHaveCount(0)
  await usuario.reload(); await expect(usuario.getByLabel('Auditório ou sala').locator('option', { hasText: editado })).toHaveCount(0)
})

test('SGE-CT07 – Admin Geral acessa perfis sem expor dados sensíveis @regression', async ({ page, gestor, prefixo }) => {
  const email = `qa-sge-ct07-${Date.now()}@instituicao.edu.br`
  await db.user.create({ data: { nome: 'Admin QA', email, matricula: prefixo, dataNascimento: noBanco('1985-01-01'), senhaHash: await hash(senha, 12), papel: 'ADMIN_GERAL' } })
  const negado = await gestor.request.get('/api/admin/users')
  expect(negado.status()).toBe(403)
  const login = await page.request.post('/api/auth/login', { data: { email, senha } })
  expect(login.status()).toBe(200)
  await page.goto('/gerente')
  await expect(page.getByRole('heading', { name: 'Administração geral · Perfis' })).toBeVisible()
  const resposta = await page.request.get('/api/admin/users')
  expect(resposta.status()).toBe(200)
  const usuarios = await resposta.json() as Record<string, unknown>[]
  expect(usuarios.some(conta => conta.email === email)).toBe(true)
  expect(usuarios.every(conta => !('senhaHash' in conta) && !('cpf' in conta) && !('dataNascimento' in conta))).toBe(true)
})
