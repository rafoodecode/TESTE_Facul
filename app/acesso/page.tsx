'use client'
import { useEffect, useState } from 'react'
import AppHeader from '@/components/AppHeader'
import { api } from '@/components/Client'

type Role = 'USUARIO' | 'GERENTE' | 'ADMIN_GERAL'
const profiles: { role: Role; title: string; description: string }[] = [
  { role: 'USUARIO', title: 'Servidor', description: 'Solicitações de auditórios e salas' },
  { role: 'GERENTE', title: 'Gestor / Admin', description: 'Aprovações e gestão de espaços' },
  { role: 'ADMIN_GERAL', title: 'Admin Geral', description: 'Gestão de perfis e do sistema' },
]

export default function Access() {
  const [register, setRegister] = useState(false)
  const [papel, setPapel] = useState<Role>('USUARIO')
  const [message, setMessage] = useState('')
  const [ready, setReady] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  useEffect(() => setReady(true), [])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const values = Object.fromEntries(new FormData(e.currentTarget))
    try {
      const result = await api(register ? '/auth/register' : '/auth/login', 'POST', register ? { ...values, papel } : values)
      location.href = result.papel === 'USUARIO' ? '/usuario' : '/gerente'
    } catch (err) { setMessage((err as Error).message) }
  }

  return <><AppHeader /><main className="max-w-5xl mx-auto px-4 py-5">
    <div className="text-center text-[10px] font-semibold tracking-wide text-slate-500 mb-4">♧ AUTENTICAÇÃO INSTITUCIONAL &nbsp; · &nbsp; SISTEMA DE GESTÃO DE EVENTOS E ESPAÇOS</div>
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
      <div className="grid md:grid-cols-[1.55fr_1fr] bg-[#f5f8fd]"><div className="p-7 md:p-10"><p className="eyebrow">✦ Portal de acesso integrado</p><h1 className="text-2xl md:text-4xl font-extrabold leading-tight mt-2 max-w-xl">Reserve auditórios e salas com precisão institucional.</h1><p className="text-slate-600 mt-3 text-sm max-w-lg">Acesso para solicitantes, gestores e administradores cadastrados.</p><div className="flex flex-wrap gap-4 text-[11px] text-slate-600 mt-5"><span>▣ Espaços cadastrados</span><span>♧ Prevenção de conflitos ativa</span><span>♢ Dados pessoais protegidos</span></div></div><div className="auditorium-art min-h-52"><div className="art-caption"><small>Espaços institucionais</small><strong>Eventos e encontros</strong></div></div></div>
      <div className="max-w-xl mx-auto p-6 md:p-8"><div className="grid grid-cols-2 bg-slate-100 p-1 rounded-md mb-6 text-sm"><button aria-label="Entrar" disabled={!ready} onClick={() => { setRegister(false); setMessage('') }} className={!register ? 'bg-white shadow text-[#075481]' : 'text-slate-600'}>↪ Entrar (Login)</button><button aria-label="Cadastrar" disabled={!ready} onClick={() => { setRegister(true); setPapel('USUARIO'); setMessage('') }} className={register ? 'bg-white shadow text-[#075481]' : 'text-slate-600'}>♧ Criar Conta (Cadastro)</button></div>
        <form method="post" onSubmit={submit} className="grid gap-4">
          {register && <div className="grid md:grid-cols-2 gap-3"><label>Nome completo<input name="nome" required className="block w-full mt-1" /></label><label>Matrícula<input name="matricula" required className="block w-full mt-1" /></label><label>Data de nascimento<input type="date" name="dataNascimento" required className="block w-full mt-1" /></label>{papel === 'GERENTE' && <><label>CPF<input name="cpf" required className="block w-full mt-1" /></label><label>Código de convite, se exigido<input name="convite" className="block w-full mt-1" /></label></>}</div>}
          <label className="text-xs font-bold">E-mail institucional<input type="email" name="email" placeholder="nome@instituicao.edu.br" required className="block w-full mt-1 font-normal" /><span className="block mt-1 text-[11px] font-normal text-slate-500">Utilize o domínio institucional autorizado.</span></label>
          <div className="text-xs font-bold"><label htmlFor="access-password">Senha de Acesso</label><div className="flex mt-1"><input id="access-password" type={showPassword ? 'text' : 'password'} name="senha" minLength={register ? 12 : undefined} required className="w-full font-normal rounded-r-none" /><button type="button" className="border border-l-0 border-slate-400 rounded-l-none text-slate-600" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword(v => !v)}>{showPassword ? '◉' : '◎'}</button></div></div>
          {register ? <div><p className="text-[10px] font-extrabold uppercase tracking-wide mb-2">Selecione o perfil para cadastro</p><div className="grid grid-cols-2 gap-2">{profiles.filter(p => p.role !== 'ADMIN_GERAL').map(p => <button key={p.role} type="button" disabled={!ready} onClick={() => setPapel(p.role)} className={`text-left border p-3 ${papel === p.role ? 'border-[#075481] bg-[#edf5fb]' : 'border-slate-200'}`}><strong className="block text-sm">{p.title}</strong><span className="text-[11px]">{p.description}</span></button>)}</div></div> : <p className="text-xs text-slate-600">O perfil de acesso, inclusive Admin Geral, é identificado automaticamente pelo e-mail e senha.</p>}
          <button disabled={!ready} className="primary w-full">{register ? 'Cadastrar' : 'Entrar'}</button>
        </form>{message && <p role="alert" className="mt-4 text-red-700 text-sm">{message}</p>}
      </div>
    </div><div className="soft-panel p-4 mt-4 text-xs text-slate-600">♧ <strong>Autenticação protegida.</strong> O acesso é direcionado conforme o perfil cadastrado.</div>
  </main><footer className="max-w-5xl mx-auto px-4 py-5 text-[11px] text-slate-500 border-t">© {new Date().getFullYear()} SGE · Sistema de Gestão de Eventos e Espaços</footer></>
}
