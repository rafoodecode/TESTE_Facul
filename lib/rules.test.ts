import { describe, it, expect } from 'vitest'
import { blocked, dayState, validCpf, TURNOS } from './rules'
const date = '2026-11-06', today = '2026-11-04'
describe('RN01–RN12: regras puras', () => {
  it('define três turnos fixos', () => expect(Object.keys(TURNOS)).toEqual(['MANHA','TARDE','NOITE']))
  it('branco com turnos livres', () => expect(dayState(date, {}, new Set(), today)).toBe('BRANCO'))
  it('amarelo sem livres e com pendente', () => expect(dayState(date, {MANHA:'PENDENTE',TARDE:'AGENDADO',NOITE:'AGENDADO'}, new Set(), today)).toBe('AMARELO'))
  it('vermelho quando todos agendados', () => expect(dayState(date, {MANHA:'AGENDADO',TARDE:'AGENDADO',NOITE:'AGENDADO'}, new Set(), today)).toBe('VERMELHO'))
  it('cinza em fim de semana, feriado e passado', () => { expect(dayState('2026-11-07', {}, new Set(), today)).toBe('CINZA'); expect(dayState(date, {}, new Set([date]), today)).toBe('CINZA'); expect(dayState('2026-11-03', {}, new Set(), today)).toBe('CINZA') })
  it('cancelamento libera turno', () => expect(dayState(date, {MANHA:'CANCELADA',TARDE:'AGENDADO',NOITE:'AGENDADO'}, new Set(), today)).toBe('BRANCO'))
  it('bloqueia data passada e valida CPF', () => { expect(blocked('2026-11-03',new Set(),today)).toBe(true); expect(validCpf('529.982.247-25')).toBe(true); expect(validCpf('111.111.111-11')).toBe(false) })
})
