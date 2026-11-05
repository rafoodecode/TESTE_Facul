import { describe, it, expect, vi } from 'vitest'
import { notify } from './mail'
describe('RF17: notificação de mudança de status', () => {
  it('inclui os dados da reserva no e-mail de desenvolvimento', async () => {
    vi.stubEnv('SMTP_HOST', '')
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    await notify('usuario@instituicao.edu.br', { local: 'Sala 101', evento: 'Reunião', data: '2026-11-06', turno: 'MANHA', status: 'AGENDADO' })
    expect(log).toHaveBeenCalledWith('E-mail de desenvolvimento:', expect.objectContaining({ to: 'usuario@instituicao.edu.br', subject: expect.stringContaining('Reunião'), text: expect.stringContaining('06/11/2026') }))
    expect(log.mock.calls[0][1].text).toContain('Sala 101')
    log.mockRestore(); vi.unstubAllEnvs()
  })
})
