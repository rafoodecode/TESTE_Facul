import { expect, type Page } from '@playwright/test'

export class UsuarioPage {
  constructor(readonly page: Page) {}
  get minhas() { return this.page.getByRole('heading', { name: 'Minhas solicitações' }).locator('..') }
  async selecionarLocal(nome: string) {
    const filtro = this.page.getByLabel('Auditório ou sala')
    if (await filtro.locator('option', { hasText: nome }).count() === 0) await this.page.reload()
    const opcao = filtro.locator('option', { hasText: nome })
    await expect(opcao).toHaveCount(1)
    await filtro.selectOption((await opcao.getAttribute('value'))!)
  }
  async selecionarMes(mes: string) {
    const nome = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${mes}-01T12:00:00Z`))
    for (let tentativa = 0; tentativa < 12; tentativa++) {
      if (await this.page.getByText(nome, { exact: true }).count()) return
      await this.page.getByRole('button', { name: 'Próximo mês' }).click()
    }
    throw new Error(`Mês ${nome} não encontrado no calendário do usuário.`)
  }
  async solicitar(data: string, nomeEvento: string) {
    await this.page.getByLabel('Nome do evento').fill(nomeEvento)
    await this.page.getByRole('button', { name: new RegExp(`^${data} BRANCO$`) }).click()
    await this.page.getByRole('button', { name: /Manhã[\s\S]*Livre para solicitar/ }).click()
    await this.page.getByRole('button', { name: 'Enviar' }).click()
    await expect(this.page.getByRole('status')).toContainText('Aguarde a confirmação')
  }
}
