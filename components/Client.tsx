'use client'
export async function api(path: string, method = 'GET', body?: unknown) { const r = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); const data = await r.json(); if (!r.ok) throw new Error(data.erro || 'Ocorreu um erro.'); return data }
export function formatDate(s: string) { return s.slice(0, 10).split('-').reverse().join('/') }
export const monthName = (s: string) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${s}-01T12:00:00Z`))
export function shiftMonth(s: string, n: number) { const [y, m] = s.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7) }
