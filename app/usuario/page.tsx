'use client'
import { useEffect, useState } from 'react'
import AppHeader from '@/components/AppHeader'
import Calendar, { TURNOS } from '@/components/Calendar'
import { api, formatDate } from '@/components/Client'
import type { Turno, Status } from '@/lib/rules'

type Local = { id: string; nome: string; tipo: string }
type Day = { date: string; statuses: Partial<Record<Turno, Status>> }
type Booking = { id: string; data: string; turno: Turno; status: Status; nomeEvento: string; local: { nome: string } }

export default function UserPage() {
  const [me, setMe] = useState<{ nome: string; matricula: string }>()
  const [locals, setLocals] = useState<Local[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [localId, setLocalId] = useState('')
  const [event, setEvent] = useState('')
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [day, setDay] = useState<Day>()
  const [turno, setTurno] = useState<Turno>()
  const [message, setMessage] = useState('')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    api('/me').then(u => { if (u.papel !== 'USUARIO') location.href = '/gerente'; else setMe(u) }).catch(() => location.href = '/acesso')
    api('/locals').then((v: Local[]) => { setLocals(v); setLocalId(current => current || v[0]?.id || '') })
    api('/bookings').then(setBookings).catch(() => {})
  }, [refresh])
  async function send() {
    try {
      const r = await api('/bookings', 'POST', { localId, nomeEvento: event, data: day?.date, turno })
      setMessage(r.mensagem); setDay(undefined); setTurno(undefined); setEvent(''); setRefresh(n => n + 1)
    } catch (e) { setMessage((e as Error).message) }
  }
  const selectedLocal = locals.find(l => l.id === localId)
  return <><AppHeader role="USUARIO" name={me?.nome} /><main className="max-w-6xl mx-auto px-4 py-6 space-y-5"><section className="card flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Painel do solicitante · Nova reserva</p><h1 className="text-xl font-extrabold mt-1">{me?.nome || 'Carregando perfil'}</h1><p className="text-xs text-slate-500">Matrícula {me?.matricula || '—'} · Solicitação institucional de espaços</p></div><span className="role-badge">● Perfil ativo: Solicitante</span></section><div className="grid lg:grid-cols-[.85fr_1.55fr] gap-5"><div className="space-y-5"><section className="card"><h2 className="section-title mb-1">▣ Configuração da Reserva</h2><p className="text-xs text-slate-500 mb-4">Espaço, evento e recursos necessários</p><label className="text-xs font-semibold">Espaço / Auditório / Sala<select aria-label="Auditório ou sala" value={localId} onChange={e => { setLocalId(e.target.value); setDay(undefined); setTurno(undefined) }} className="block w-full mt-1"><option value="">Selecione</option>{locals.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.tipo === 'SALA' ? 'Sala' : 'Auditório'})</option>)}</select></label><div className="auditorium-art h-36 rounded-lg mt-3"><div className="art-caption"><small>{selectedLocal?.tipo === 'SALA' ? 'Sala' : 'Auditório'}</small><strong>{selectedLocal?.nome || 'Selecione um local'}</strong></div></div><label className="text-xs font-semibold block mt-4">Nome do Evento Institucional<input aria-label="Nome do evento" value={event} onChange={e => setEvent(e.target.value)} placeholder="Ex.: Simpósio de Inovação" className="block w-full mt-1" /></label><div className="soft-panel text-xs p-3 mt-4"><strong>Solicitante</strong><div className="grid sm:grid-cols-2 gap-2 mt-2"><label>Nome<input value={me?.nome || ''} readOnly aria-label="Solicitante" className="block w-full bg-slate-100 text-xs" /></label><label>Matrícula<input value={me?.matricula || ''} readOnly aria-label="Matrícula" className="block w-full bg-slate-100 text-xs" /></label></div></div><p className="text-[11px] text-slate-500 mt-3">A disponibilidade e as regras de reserva são confirmadas pelo servidor no momento do envio.</p></section><section className="card text-xs"><h2 className="section-title mb-2">♧ Regulamento e Cancelamento</h2><ul className="space-y-2 text-slate-600"><li>◉ A confirmação depende da aprovação do gestor.</li><li>◉ Reservas são permitidas apenas em dias úteis não feriados.</li><li>◉ Cancelamentos liberam o turno para nova solicitação.</li></ul></section></div><div className="space-y-5">{localId && <Calendar key={refresh} localId={localId} month={month} setMonth={setMonth} selected={day?.date} onSelect={d => { setDay(d); setTurno(undefined) }} />}<section className="card"><div className="flex items-center justify-between gap-2 mb-3"><h2 className="section-title">Turnos {day ? `disponíveis para ${formatDate(day.date)}` : 'da reserva'}</h2><span className="text-xs text-slate-500">{selectedLocal?.nome}</span></div>{day ? <div className="grid sm:grid-cols-3 gap-2">{Object.entries(TURNOS).map(([k, hours]) => { const status = day.statuses[k as Turno]; return <button key={k} type="button" disabled={!!status} onClick={() => setTurno(k as Turno)} className={`border text-left p-3 min-h-24 ${turno === k ? 'border-blue-800 bg-blue-50 ring-1 ring-blue-800' : status ? 'bg-slate-100 border-slate-200' : 'bg-white border-green-300'}`}><strong className="block">{k === 'MANHA' ? 'Manhã' : k === 'TARDE' ? 'Tarde' : 'Noite'}</strong><span className="text-xs">{hours}</span><small className={`block mt-2 ${status ? 'text-red-700' : 'text-green-700'}`}>{status || 'Livre para solicitar'}</small></button> })}</div> : <p className="text-sm text-slate-500">Selecione uma data branca no calendário para ver os três turnos.</p>}<div className="flex flex-wrap justify-end gap-2 border-t mt-4 pt-4"><button className="border border-slate-300" onClick={() => { setEvent(''); setDay(undefined); setTurno(undefined); setMessage('') }}>Limpar campos</button><button aria-label="Enviar" className="primary" disabled={!me || !localId || !event.trim() || !day || !turno} onClick={send}>Enviar Solicitação de Reserva</button></div>{message && <p role="status" className="soft-panel p-3 mt-3 text-sm">{message}</p>}</section></div></div><section className="card"><h2 className="section-title mb-3">Minhas solicitações</h2>{bookings.length === 0 ? <p className="text-sm text-slate-500">Nenhuma solicitação.</p> : <ul className="grid md:grid-cols-2 gap-2">{bookings.map(b => <li key={b.id} className="soft-panel p-3 text-sm"><strong>{b.nomeEvento}</strong><span className="block text-xs text-slate-500 mt-1">{formatDate(b.data)} · {b.local.nome} · {b.turno}</span><span className={`inline-block text-[11px] font-bold mt-2 ${b.status === 'AGENDADO' ? 'text-green-700' : b.status === 'PENDENTE' ? 'text-amber-700' : 'text-slate-600'}`}>{b.status}</span></li>)}</ul>}</section></main></>
}
