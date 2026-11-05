import { beforeEach, describe, expect, it, vi } from 'vitest'

const { currentUser } = vi.hoisted(() => ({ currentUser: vi.fn() }))
vi.mock('./auth', () => ({ currentUser }))
import { requireRole } from './http'
import { registerSchema } from './validators'

describe('perfis de acesso', () => {
  beforeEach(() => currentUser.mockReset())

  it('permite ao administrador geral usar ações de gerente', async () => {
    currentUser.mockResolvedValue({ id: 'admin', papel: 'ADMIN_GERAL' })
    expect((await requireRole('GERENTE')).user?.id).toBe('admin')
    expect((await requireRole('ADMIN_GERAL')).user?.id).toBe('admin')
  })

  it('impede gerente e usuário de acessar administração geral', async () => {
    for (const papel of ['GERENTE', 'USUARIO']) {
      currentUser.mockResolvedValue({ id: papel, papel })
      const response = await requireRole('ADMIN_GERAL')
      expect(response.error?.status).toBe(403)
    }
  })

  it('não permite cadastro público de administrador geral', () => {
    const result = registerSchema.safeParse({ nome: 'Admin Teste', email: 'admin@instituicao.edu.br', matricula: 'A123', dataNascimento: '1990-01-01', senha: 'SenhaSegura123!', papel: 'ADMIN_GERAL', cpf: '11144477735' })
    expect(result.success).toBe(false)
  })
})
