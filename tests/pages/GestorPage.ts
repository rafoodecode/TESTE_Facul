import { expect, type Page } from '@playwright/test'

export class GestorPage {
  constructor(readonly page: Page) {}
  get calendario() { return this.page.getByRole('heading', { name: /novembro|dezembro|janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro/i }).first() }
  get feriados() { return this.page.locator('#feriados') }
  get locais() { return this.page.locator('#locais') }
  get aprovacoes() { return this.page.locator('#aprovacoes') }
  dia(data: string) { return this.page.getByRole('button', { name: `Agenda de ${data}` }) }
  reserva(nome: string) { return this.aprovacoes.locator('article').filter({ hasText: nome }) }
  async filtrarLocal(nome: string) {
    const filtro = this.page.getByLabel('Filtrar local')
    if (await filtro.locator('option', { hasText: nome }).count() === 0) await this.page.reload()
    await filtro.selectOption({ label: nome })
  }
  async selecionarMes(mes: string) {
    const nome = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${mes}-01T12:00:00Z`))
    await this.page.getByRole('button', { name: nome, exact: true }).click()
    await expect(this.page.getByRole('heading', { name: nome, exact: true })).toBeVisible()
  }
  async cadastrarFeriado(data: string, descricao: string) {
    await this.feriados.getByLabel('Data').fill(data)
    await this.feriados.getByLabel('Descrição').fill(descricao)
    await this.feriados.getByRole('button', { name: 'Cadastrar feriado' }).click()
  }
  async cadastrarLocal(nome: string, tipo: 'SALA' | 'AUDITORIO') {
    await this.locais.getByLabel('Nome', { exact: true }).fill(nome)
    await this.locais.getByLabel('Tipo').selectOption(tipo)
    await this.locais.getByRole('button', { name: 'Cadastrar local' }).click()
  }
}
