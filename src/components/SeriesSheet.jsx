// 시리즈 할 일 만들기: 앞 글자 + 번호 범위 + 뒤 글자 → 시작 날짜부터 하루 n개씩 (고른 요일만)
import { useState } from 'react'
import { batch, remove, uid, setSettings } from '../store/store.js'
import { PALETTE } from '../store/schema.js'
import { addTask } from '../store/actions.js'
import { planSeries } from '../lib/series.js'
import { today, fmtShort, WD } from '../engine/date.js'
import { Field, toast } from './ui.jsx'
import { SubjectSelect, ColorPick } from './common.jsx'

export default function SeriesSheet({ close, subjectId = null }) {
  const [f, setF] = useState({ prefix: '', suffix: '', from: 1, to: 10, start: today(), perDay: 1, days: [], subjectId, color: null })
  const set = (p) => setF((x) => ({ ...x, ...p }))
  const plan = planSeries(f)
  const name = `${f.prefix}${Math.min(f.from, f.to)}~${Math.max(f.from, f.to)}${f.suffix}`.trim()
  const make = () => {
    if (!f.prefix.trim() && !f.suffix.trim()) return toast('이름을 적어 주세요')
    const sid = uid(), base = Date.now()
    const made = batch(() => plan.map((x, i) => addTask({ title: x.title, due: x.due, subjectId: f.subjectId, seriesId: sid, seriesName: name, seriesN: x.n, inbox: false, order: base + i })))
    if (f.color) setSettings((s) => ({ seriesColors: { ...(s.seriesColors || {}), [sid]: f.color } }))
    close()
    toast(`${made.length}개 만들었어요 · ${fmtShort(plan[0].due)}~${fmtShort(plan[plan.length - 1].due)}`, { label: '되돌리기', fn: () => batch(() => made.forEach((t) => remove('tasks', t.id))) })
  }
  const num = (k) => (e) => set({ [k]: Math.max(0, Math.min(999, parseInt(e.target.value) || 0)) })
  return (
    <div className="form">
      <div className="row" style={{ gap: 6, alignItems: 'flex-end' }}>
        <Field label="앞 글자"><input className="input" value={f.prefix} placeholder="파피루스 day" onChange={(e) => set({ prefix: e.target.value })} autoFocus /></Field>
        <Field label="번호"><div className="row" style={{ gap: 4, flexWrap: 'nowrap' }}><input className="input" inputMode="numeric" style={{ width: 56 }} value={f.from} onChange={num('from')} /><span className="muted">~</span><input className="input" inputMode="numeric" style={{ width: 56 }} value={f.to} onChange={num('to')} /></div></Field>
        <Field label="뒤 글자"><input className="input" style={{ width: 72 }} value={f.suffix} placeholder="강" onChange={(e) => set({ suffix: e.target.value })} /></Field>
      </div>
      <div className="row">
        <Field label="시작 날짜"><input className="input" type="date" value={f.start} onChange={(e) => e.target.value && set({ start: e.target.value })} /></Field>
        <Field label="하루에"><div className="seg">{[1, 2, 3].map((n) => <button key={n} className={f.perDay === n ? 'on' : ''} onClick={() => set({ perDay: n })}>{n}개</button>)}</div></Field>
      </div>
      <Field label="요일 (안 고르면 매일)">
        <div className="row" style={{ gap: 4 }}>{[1, 2, 3, 4, 5, 6, 0].map((d) => <button key={d} className={'chip' + (f.days.includes(d) ? ' on' : '')} onClick={() => set({ days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d] })}>{WD[d]}</button>)}</div>
      </Field>
      <Field label="과목"><SubjectSelect value={f.subjectId} onChange={(v) => set({ subjectId: v })} /></Field>
      <Field label="시리즈 색 (안 고르면 과목 색)"><ColorPick value={f.color} onChange={(c) => set({ color: c })} colors={PALETTE} /></Field>
      {plan.length > 0 && (
        <div className="series-prev">
          <div className="tiny muted">{plan.length}개 · {fmtShort(plan[0].due)} ~ {fmtShort(plan[plan.length - 1].due)}</div>
          {(plan.length > 4 ? [...plan.slice(0, 3), null, plan[plan.length - 1]] : plan).map((x, i) => x ? <div key={i} className="row between small"><span className="ellipsis">{x.title || '(이름 없음)'}</span><span className="muted tiny">{fmtShort(x.due)} {WD[new Date(x.due + 'T00:00').getDay()]}</span></div> : <div key={i} className="tiny muted">⋮</div>)}
        </div>
      )}
      <button className="btn primary" onClick={make} disabled={!plan.length}>만들기</button>
    </div>
  )
}
