'use client'
import { useEffect, useState } from 'react'
import { api } from './Client'
type Day = { date: string; state: 'BRANCO'|'AMARELO'|'VERMELHO'|'CINZA' }
const color = { BRANCO: 'bg-white border-slate-500', AMARELO: 'bg-amber-200 border-amber-500', VERMELHO: 'bg-red-300 border-red-600', CINZA: 'bg-slate-300 border-slate-400' }
export default function MonthPreview({ month, localId, onSelect }: { month: string; localId: string; onSelect: () => void }) {
  const [days, setDays] = useState<Day[]>([])
  useEffect(() => { if (localId) api(`/calendar?localId=${localId}&month=${month}`).then(setDays).catch(() => setDays([])); else setDays([]) }, [month,localId])
  return <div className="grid grid-cols-7 gap-0.5 mt-2" onClick={onSelect}>{days.map(d => <span key={d.date} title={`${d.date}: ${d.state}`} className={`text-[10px] text-center border text-black ${color[d.state]}`}>{Number(d.date.slice(-2))}</span>)}</div>
}
