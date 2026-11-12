import { test as base, expect, type Page } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const url = process.env.DATABASE_URL
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
  throw new Error('Os testes E2E só podem alterar um PostgreSQL local. Configure DATABASE_URL em .env.')
}

export const db = new PrismaClient()
export const senha = process.env.SEED_PASSWORD || 'TroqueEstaSenha123!'
let paginaAtiva: Page | undefined

type Perfis = { gestor: Page; usuario: Page; prefixo: string }
export const test = base.extend<Perfis>({
  prefixo: async ({}, use, info) => { await use(`QA-${info.title.match(/[A-Z]+\d*-CT\d+/)?.[0] || 'CASO'}-${Date.now()}`) },
  gestor: async ({ browser }, use) => {
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:3100' })
    const page = await context.newPage()
    await entrar(page, 'qa-gestor@instituicao.edu.br')
    paginaAtiva = page
    await use(page)
    await context.close()
  },
  usuario: async ({ browser }, use) => {
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:3100' })
    const page = await context.newPage()
    await entrar(page, 'qa-usuario@instituicao.edu.br')
    paginaAtiva = page
    await use(page)
    await context.close()
  },
})

async function entrar(page: Page, email: string) {
  const resposta = await page.context().request.post('/api/auth/login', { data: { email, senha } })
  expect(resposta.status()).toBe(200)
  await page.goto(email.includes('gestor') ? '/gerente' : '/usuario')
  await expect(page).toHaveURL(email.includes('gestor') ? /gerente/ : /usuario/)
}

test.beforeAll(async () => {
  const senhaHash = await hash(senha, 12)
  await db.user.upsert({ where: { email: 'qa-gestor@instituicao.edu.br' }, update: { senhaHash, papel: 'GERENTE' }, create: { nome: 'Gestor QA', email: 'qa-gestor@instituicao.edu.br', matricula: 'QA-GESTOR', cpf: '12345678909', dataNascimento: new Date('1980-01-01T12:00:00Z'), senhaHash, papel: 'GERENTE' } })
  await db.user.upsert({ where: { email: 'qa-usuario@instituicao.edu.br' }, update: { senhaHash, papel: 'USUARIO' }, create: { nome: 'Usuário QA', email: 'qa-usuario@instituicao.edu.br', matricula: 'QA-USUARIO', dataNascimento: new Date('1990-01-01T12:00:00Z'), senhaHash, papel: 'USUARIO' } })
})

test.afterEach(async ({ page }, info) => {
  const id = info.title.match(/[A-Z]+\d*-CT\d+/)?.[0] || 'SEM-ID'
  await mkdir('evidencias', { recursive: true })
  await (paginaAtiva || page).screenshot({ path: join('evidencias', `${id}.png`), fullPage: true }).catch(() => {})
  paginaAtiva = undefined
  // Remove só os registros criados pelo caso, mesmo quando uma asserção falha.
  const marcador = `QA-${id}-`
  await db.reserva.deleteMany({ where: { nomeEvento: { startsWith: marcador } } })
  await db.feriado.deleteMany({ where: { descricao: { startsWith: marcador } } })
  await db.local.deleteMany({ where: { nome: { startsWith: marcador } } })
})

export { expect }
