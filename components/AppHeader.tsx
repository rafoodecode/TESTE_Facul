'use client'
import Link from 'next/link'
import { api } from './Client'
export default function AppHeader({ role, name }: { role?: 'USUARIO'|'GERENTE'; name?: string }) {
  return <header className="app-header"><div className="brand"><span className="brand-mark">SGE</span><span className="brand-copy">GESTÃO DE EVENTOS<br />E ESPAÇOS</span></div><nav aria-label="Navegação principal"><Link href="/acesso">Início / Login</Link><Link className={role === 'USUARIO' ? 'active' : ''} href="/usuario">Nova Reserva <small>(Usuário)</small></Link><Link className={role === 'GERENTE' ? 'active' : ''} href="/gerente">Painel do Gestor <small>(Admin)</small></Link></nav><div className="header-account"><span className="role-badge">{role === 'GERENTE' ? 'Gestor / Admin' : role === 'USUARIO' ? 'Servidor / Solicitante' : 'Acesso institucional'}</span>{name && <span className="account-name">{name}</span>}{role && <button onClick={async () => { await api('/auth/logout','POST'); location.href = '/acesso' }}>Sair</button>}</div></header>
}
