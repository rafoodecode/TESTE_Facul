'use client'
import { useEffect, useState } from 'react'
import AppHeader from '@/components/AppHeader'
import ManagerCalendar from '@/components/ManagerCalendar'
import MonthPreview from '@/components/MonthPreview'
import { api, formatDate, monthName } from '@/components/Client'

type Local = { id: string; nome: string; tipo: 'SALA'|'AUDITORIO' }
type Holiday = { id: string; data: string; descricao: string }
type Booking = { id: string; data: string; turno: string; status: string; nomeEvento: string; local: { nome: string }; usuario: { nome: string } }
type ManagedUser = { id: string; nome: string; email: string; matricula: string; papel: 'USUARIO' | 'GERENTE' | 'ADMIN_GERAL'; podeGerenciar: boolean }

function UserRoleRow({ user, onChange }: { user: ManagedUser; onChange: (id: string, papel: ManagedUser['papel']) => Promise<void> }) {
  const [papel, setPapel] = useState(user.papel)
  useEffect(() => setPapel(user.papel), [user.papel])
  return <div className="flex flex-wrap items-center justify-between gap-2 border-t py-3 text-sm">
    <div><strong>{user.nome}</strong><p className="text-xs text-slate-500">{user.email} · Matrícula {user.matricula}</p></div>
    {user.papel === 'ADMIN_GERAL' ? <span className="role-badge">Admin Geral</span> : <div className="flex gap-2 items-center"><select aria-label={`Perfil de ${user.nome}`} value={papel} onChange={e => setPapel(e.target.value as ManagedUser['papel'])}><option value="USUARIO">Usuário</option>{user.podeGerenciar && <><option value="GERENTE">Gerente</option><option value="ADMIN_GERAL">Admin Geral</option></>}</select><button disabled={papel === user.papel} onClick={() => { if (papel === 'ADMIN_GERAL' && !window.confirm(`Conceder acesso de administrador geral a ${user.nome}?`)) return; void onChange(user.id, papel) }}>Salvar perfil</button></div>}
  </div>
}

function AdminUsers({ users, onChange }: { users: ManagedUser[]; onChange: (id: string, papel: ManagedUser['papel']) => Promise<void> }) {
  return <section id="usuarios" className="card"><h2 className="section-title">Administração geral · Perfis</h2><p className="text-xs text-slate-500 mb-3">Apenas o administrador geral vê esta lista. Dados sensíveis não são exibidos. Promoções para gestão exigem CPF validado no cadastro.</p>{users.map(user => <UserRoleRow key={user.id} user={user} onChange={onChange} />)}{users.length === 0 && <p className="text-sm text-slate-500">Nenhuma conta encontrada.</p>}</section>
}

export default function ManagerPage() {
  const [me, setMe] = useState<{ nome: string; papel: 'GERENTE' | 'ADMIN_GERAL' }>()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [locals, setLocals] = useState<Local[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [localId, setLocalId] = useState('')
  const [month, setMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`)
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedDay, setSelectedDay] = useState<string>()
  const [message, setMessage] = useState('')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    api('/me').then(u => { if (u.papel !== 'GERENTE' && u.papel !== 'ADMIN_GERAL') location.href = '/acesso'; else { setMe(u); if (u.papel === 'ADMIN_GERAL') api('/admin/users').then(setUsers).catch(e => setMessage(e.message)) } }).catch(() => location.href = '/acesso')
    api('/locals').then(setLocals).catch(() => {})
    api('/holidays').then(setHolidays).catch(() => {})
  }, [refresh])
  useEffect(() => {
    setSelectedDay(undefined)
    api(`/manage/bookings?month=${month}${localId ? `&localId=${localId}` : ''}`).then(setBookings).catch(e => setMessage(e.message))
  }, [month, localId, refresh])
  async function action(path: string, method: string, body?: unknown) {
    try { const r = await api(path, method, body); setMessage(r.aviso || 'Alteração salva.'); setRefresh(n => n + 1) }
    catch (e) { setMessage((e as Error).message) }
  }
  async function changeRole(id: string, papel: ManagedUser['papel']) {
    try { await api(`/admin/users/${id}`, 'PATCH', { papel }); setMessage('Perfil atualizado.'); setRefresh(n => n + 1) }
    catch (e) { setMessage((e as Error).message) }
  }
  const current = selectedDay ? bookings.filter(b => b.data.startsWith(selectedDay)) : bookings
  const pending = bookings.filter(b => b.status === 'PENDENTE').length
  const confirmed = bookings.filter(b => b.status === 'AGENDADO').length
  const cancelled = bookings.filter(b => b.status === 'CANCELADA').length
  return <><AppHeader role={me?.papel || "GERENTE"} name={me?.nome} /><main className="max-w-7xl mx-auto px-4 py-6 grid lg:grid-cols-[190px_1fr] gap-5"><aside className="space-y-4"><div className="card p-3"><p className="eyebrow mb-2">Administração</p><nav aria-label="Menu do gestor" className="grid text-sm"><a className="primary" href="#visao-geral">▣ Visão Geral</a><a className="px-3 py-2" href="#locais">▤ Salas e Auditórios</a><a className="px-3 py-2" href="#aprovacoes">☑ Aprovações</a><a className="px-3 py-2" href="#feriados">◇ Feriados</a>{me?.papel === "ADMIN_GERAL" && <a className="px-3 py-2" href="#usuarios">♧ Perfis</a>}</nav></div><div className="soft-panel p-3 text-xs"><strong>● Sistema ativo</strong><p className="text-slate-500 mt-1">Agenda e solicitações atualizadas neste painel.</p></div></aside><div className="space-y-5"><section id="visao-geral"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Módulo administrativo · Gestão de espaços</p><h1 className="text-2xl font-extrabold">Painel de Gestão e Aprovação de Reservas</h1><p className="text-xs text-slate-500">Coordenação Geral de Infraestrutura · Gestor de Controle e Governança de Auditórios</p></div><span className="role-badge">▣ Gestão de Reservas</span></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">{[[bookings.length,'Solicitações no mês','text-[#075481]'],[pending,'Pendentes de análise','text-amber-700'],[confirmed,'Confirmadas','text-green-700'],[cancelled,'Canceladas','text-red-700']].map(([value,label,style])=><div key={String(label)} className="card p-4"><p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">{label}</p><strong className={`block text-3xl mt-2 ${style}`}>{value}</strong></div>)}</div></section>{message && <p role="status" className="soft-panel p-3 text-sm">{message}</p>}<div className="grid xl:grid-cols-[1.45fr_.85fr] gap-5"><div className="space-y-5"><div className="flex flex-wrap items-center gap-2"><label className="text-xs font-semibold">Filtrar local<select value={localId} onChange={e => setLocalId(e.target.value)} className="ml-2"><option value="">Todos</option>{locals.map(l=><option key={l.id} value={l.id}>{l.nome}</option>)}</select></label></div><ManagerCalendar localId={localId || locals[0]?.id || ''} month={month} setMonth={setMonth} selected={selectedDay} setSelected={setSelectedDay} /><section id="aprovacoes" className="card"><div className="flex justify-between items-center gap-2 mb-3"><div><h2 className="section-title">{selectedDay ? `Resumo diário · ${formatDate(selectedDay)}` : `Solicitações de ${monthName(month)}`}</h2><p className="text-xs text-slate-500">{current.length} solicitações encontradas</p></div>{selectedDay && <button onClick={() => setSelectedDay(undefined)} className="text-xs border">Ver mês inteiro</button>}</div><div className="space-y-2">{current.map(b=><article key={b.id} className={`soft-panel p-3 border-l-4 ${b.status==='PENDENTE'?'border-l-amber-500':b.status==='AGENDADO'?'border-l-green-600':'border-l-slate-400'}`}><p className="text-sm"><strong>{b.nomeEvento}</strong> · {formatDate(b.data)} · {b.turno} · {b.local.nome} · {b.usuario.nome} · <span className="font-bold">{b.status}</span></p><div className="flex flex-wrap gap-2 mt-2">{b.status==='PENDENTE' && <button className="primary text-xs" onClick={() => action(`/manage/bookings/${b.id}`,'PATCH',{status:'AGENDADO'})}>Confirmar</button>}{b.status!=='CANCELADA' && <button className="danger text-xs" onClick={() => action(`/manage/bookings/${b.id}`,'PATCH',{status:'CANCELADA'})}>Cancelar</button>}</div></article>)}{current.length===0 && <p className="text-sm text-slate-500">Nenhuma solicitação nesta seleção.</p>}</div></section></div><div className="space-y-5"><section className="card"><h2 className="section-title">Verificação de disponibilidade</h2><p className="text-xs text-slate-600 mt-2">O sistema valida no servidor dias úteis, feriados, datas passadas e conflitos de turno antes de registrar uma solicitação.</p><div className="soft-panel p-3 mt-3 text-xs"><strong>Próxima ação</strong><p className="mt-1">Selecione uma data no calendário para analisar as solicitações e confirmar ou cancelar reservas.</p></div></section><section className="card"><h2 className="section-title">Agenda anual</h2><p className="text-xs text-slate-500">Escolha um mês para abrir sua agenda.</p><div className="flex items-center justify-between my-3"><button onClick={() => setYear(y => y-1)} aria-label="Ano anterior">←</button><strong>{year}</strong><button onClick={() => setYear(y => y+1)} aria-label="Próximo ano">→</button></div><div className="grid grid-cols-2 gap-2">{Array.from({length:12},(_,i)=>{ const m=`${year}-${String(i+1).padStart(2,'0')}`; return <div key={m} className={`border rounded p-2 ${m===month?'border-[#075481]':'border-slate-200'}`}><button className="text-xs text-left w-full capitalize" onClick={() => setMonth(m)}>{monthName(m)}</button><MonthPreview month={m} localId={localId || locals[0]?.id || ''} onSelect={() => setMonth(m)} /></div> })}</div></section></div></div><div className="grid md:grid-cols-2 gap-5"><section id="feriados" className="card"><h2 className="section-title">Feriados</h2><form className="grid gap-2 my-3" onSubmit={e=>{e.preventDefault();action('/holidays','POST',Object.fromEntries(new FormData(e.currentTarget)));e.currentTarget.reset()}}><label className="text-xs">Data<input name="data" type="date" required className="block w-full mt-1" /></label><label className="text-xs">Descrição<input name="descricao" required className="block w-full mt-1" /></label><button className="primary">Cadastrar feriado</button></form>{holidays.map(h=><div key={h.id} className="flex justify-between items-center border-t py-2 text-xs"><span>{formatDate(h.data)} · {h.descricao}</span><button onClick={() => action(`/holidays/${h.id}`,'DELETE')}>Remover</button></div>)}</section><section id="locais" className="card"><h2 className="section-title">Auditórios e salas</h2><form className="grid gap-2 my-3" onSubmit={e=>{e.preventDefault();action('/locals','POST',Object.fromEntries(new FormData(e.currentTarget)));e.currentTarget.reset()}}><label className="text-xs">Nome<input name="nome" required className="block w-full mt-1" /></label><label className="text-xs">Tipo<select name="tipo" className="block w-full mt-1"><option value="AUDITORIO">Auditório</option><option value="SALA">Sala</option></select></label><button className="primary">Cadastrar local</button></form>{locals.map(l=><div key={l.id} className="flex gap-2 border-t py-2"><input aria-label={`Nome de ${l.nome}`} defaultValue={l.nome} id={`name-${l.id}`} className="min-w-0 flex-1 text-xs" /><button onClick={() => action(`/locals/${l.id}`,'PATCH',{nome:(document.getElementById(`name-${l.id}`) as HTMLInputElement).value,tipo:l.tipo})}>Salvar</button><button onClick={() => action(`/locals/${l.id}`,'DELETE')}>Remover</button></div>)}</section></div>{me?.papel === "ADMIN_GERAL" && <AdminUsers users={users} onChange={changeRole} />}</div></main></>
}
