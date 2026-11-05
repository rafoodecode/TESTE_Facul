export const TURNOS = { MANHA: '07h30–11h30', TARDE: '13h–17h', NOITE: '18h–21h' } as const
export type Turno = keyof typeof TURNOS
export type Estado = 'BRANCO' | 'AMARELO' | 'VERMELHO' | 'CINZA'
export type Status = 'PENDENTE' | 'AGENDADO' | 'CANCELADA'
export function dateOnly(s: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error('Data inválida.')
  const d = new Date(`${s}T12:00:00.000Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw new Error('Data inválida.')
  return d
}
export function todayRecife(now = new Date()): string { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Recife', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now) }
export function blocked(date: string, holidays: Set<string>, today = todayRecife()): boolean {
  const day = dateOnly(date).getUTCDay()
  return date < today || day === 0 || day === 6 || holidays.has(date)
}
export function dayState(date: string, statuses: Partial<Record<Turno, Status>>, holidays: Set<string>, today = todayRecife()): Estado {
  if (blocked(date, holidays, today)) return 'CINZA'
  const occupied = Object.values(statuses).filter(s => s === 'PENDENTE' || s === 'AGENDADO')
  if (occupied.length < 3) return 'BRANCO'
  return occupied.includes('PENDENTE') ? 'AMARELO' : 'VERMELHO'
}
export function validCpf(input: string): boolean {
  const s = input.replace(/\D/g, '')
  if (s.length !== 11 || /^(\d)\1+$/.test(s)) return false
  for (const length of [9, 10]) {
    const n = [...s.slice(0, length)].reduce((sum, digit, i) => sum + Number(digit) * (length + 1 - i), 0)
    const check = (n * 10) % 11 % 10
    if (check !== Number(s[length])) return false
  }
  return true
}
