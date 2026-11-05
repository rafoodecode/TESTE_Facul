import { test, expect } from '@playwright/test'

type CalendarDay = {
  date: string
  state: 'BRANCO' | 'AMARELO' | 'VERMELHO' | 'CINZA'
  statuses: Partial<Record<'MANHA' | 'TARDE' | 'NOITE', string>>
}

test('RN09: duas solicitações simultâneas disputam o mesmo turno', async ({ request }) => {
  const login = await request.post('/api/auth/login', {
    data: {
      email: 'usuario1@instituicao.edu.br',
      senha: process.env.SEED_PASSWORD || 'TroqueEstaSenha123!',
    },
  })
  expect(login.ok()).toBeTruthy()

  const localsResponse = await request.get('/api/locals')
  expect(localsResponse.ok()).toBeTruthy()
  const locals: { id: string; nome: string }[] = await localsResponse.json()
  const localId = locals.find(local => local.nome === 'Sala 202')?.id
  expect(localId).toBeTruthy()

  let day: CalendarDay | undefined
  for (let offset = 0; offset < 3 && !day; offset++) {
    const monthDate = new Date()
    monthDate.setUTCDate(1)
    monthDate.setUTCMonth(monthDate.getUTCMonth() + offset)
    const month = monthDate.toISOString().slice(0, 7)
    const calendarResponse = await request.get(`/api/calendar?localId=${localId}&month=${month}`)
    expect(calendarResponse.ok()).toBeTruthy()
    const days: CalendarDay[] = await calendarResponse.json()
    day = days.find(item => item.state === 'BRANCO')
  }
  expect(day).toBeDefined()
  const turno = (['MANHA', 'TARDE', 'NOITE'] as const).find(item => !day!.statuses[item])
  expect(turno).toBeDefined()

  const nomeEvento = `Teste concorrência ${Date.now()}`
  const payload = { localId, nomeEvento, data: day!.date, turno }
  const responses = await Promise.all([
    request.post('/api/bookings', { data: payload }),
    request.post('/api/bookings', { data: payload }),
  ])
  expect(responses.map(response => response.status()).sort()).toEqual([201, 409])

  const bookings = await request.get('/api/bookings')
  expect(bookings.ok()).toBeTruthy()
  const mine: { nomeEvento: string; data: string; turno: string; localId: string }[] = await bookings.json()
  expect(mine.filter(item => item.nomeEvento === nomeEvento && item.localId === localId && item.turno === turno && item.data.startsWith(day!.date))).toHaveLength(1)
})
