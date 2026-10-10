import { useState } from 'react'
import { useColl, put, patch, remove, find } from '../../store/store.js'
import { regeneratePlan, planChunks } from '../../store/actions.js'
import { Card, Icon, Field, openSheet, toast, Empty, Prog, confirmSheet } from '../../components/ui.jsx'
import { SubjectSelect } from '../../components/common.jsx'
import { Burndown } from '../../components/charts.jsx'
import { today, addDays, dday, fmtDate, fmtShort, WD } from '../../engine/date.js'
import { PALETTE, SOFT_PALETTE } from '../../store/schema.js'
import { ColorPick } from '../../components/common.jsx'

export default function Plan() {
  const plans = useColl('plans')
  const textbooks = useColl('textbooks')
  const tasks = useColl('tasks')
  return (
    <div className="grid two">
      <div className="col">
        <DdayCard />
      </div>
      <div className="col">
        <Card title="자동 학습 계획" action={<button className="btn sm primary" onClick={() => openSheet((c) => <PlanForm close={c} />, { title: '학습 계획 만들기', full: true })}><Icon name="plus" size={14} />계획</button>}>
          <div className="small muted" style={{ marginBottom: 8 }}>시험일·범위·쉬는 요일을 넣으면 날짜별 분량을 할 일로 만들어요. 진도를 입력하거나 계획 할 일을 완료하면 남은 분량을 자동으로 다시 나눕니다.</div>
          {!plans.length && <Empty hint="시험 범위와 날짜를 넣으면 하루 분량으로 나눠 할 일로 만들어요">계획이 없어요</Empty>}
        </Card>
        {plans.map((p) => {
          const tb = textbooks.find((x) => x.id === p.textbookId)
          const done = Math.max(0, (tb?.current || 0) - p.from + 1)
          const total = p.to - p.from + 1
          const info = planChunks(p, tb)
          const todayTask = tasks.find((t) => t.planId === p.id && t.due === today() && t.range)
          return (
            <Card key={p.id} title={<span>{p.title} <span className="badge acc">{dday(p.examDate)}</span></span>} action={
              <div className="row" style={{ gap: 2 }}>
                <button className="icon-btn" onClick={() => { regeneratePlan(p.id); toast('남은 분량을 다시 나눴어요') }} title="재배분" aria-label="재배분"><Icon name="sync" size={16} /></button>
                <button className="icon-btn" onClick={() => openSheet((c) => <PlanForm close={c} plan={p} />, { title: '계획 수정', full: true })} aria-label="수정"><Icon name="edit" size={16} /></button>
                <button className="icon-btn" onClick={() => confirmSheet('계획 삭제', '계획과 남은 계획 할 일을 삭제할까요?', () => { tasks.filter((t) => t.planId === p.id && !t.done).forEach((t) => remove('tasks', t.id)); remove('plans', p.id) }, '삭제')} aria-label="삭제"><Icon name="trash" size={16} /></button>
              </div>
            }>
              <div className="row between small"><span>{tb?.title} · {p.from}–{p.to}{p.unit}</span><b>{Math.round(Math.min(1, done / total) * 100)}%</b></div>
              <Prog value={done / total} />
              <div className="row wrap small muted" style={{ gap: 10, marginTop: 6 }}>
                <span>남은 {Math.max(0, info.remaining)}{p.unit}</span><span>하루 {info.perDay}{p.unit}</span><span>공부일 {info.days}일</span><span>복습 {p.reviewDays || 0}일</span>
              </div>
              {todayTask && <div className="badge acc" style={{ marginTop: 6, display: 'inline-block' }}>오늘: {todayTask.title}{todayTask.done ? ' ✓' : ''}</div>}
              <div style={{ marginTop: 8 }}><Burndown plan={p} textbook={tb} /></div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// D-day: 줄을 누르면 고치기(이름·날짜·색·별표) · 별표는 홈 맨 위와 리포트에 나옴
export const openDday = (id) => openSheet((c) => <DdayEditor id={id} close={c} />, { title: id ? 'D-day 고치기' : 'D-day 추가' })
export function DdayCard() {
  const ddays = useColl('ddays').sort((a, b) => a.date.localeCompare(b.date))
  const t0 = today()
  return (
    <Card title="D-day" action={<button className="btn sm ghost" onClick={() => openDday(null)}><Icon name="plus" size={14} />추가</button>}>
      <div className="list">
        {ddays.map((d) => (
          <div key={d.id} className={'item dd-row' + (d.date < t0 ? ' past' : '')} onClick={() => openDday(d.id)}>
            <span className="dd-dot" style={{ background: d.color || 'var(--accent)' }} />
            <div className="t"><div className="ellipsis">{d.title}</div><div className="meta">{fmtDate(d.date, { year: true })}</div></div>
            <span className="dday-n" style={{ color: d.color || 'var(--accent)' }}>{dday(d.date)}</span>
            <button className="icon-btn" style={d.pinned ? { color: d.color || 'var(--accent)' } : null} onClick={(e) => { e.stopPropagation(); patch('ddays', d.id, { pinned: !d.pinned }) }} title="별표 (홈·리포트)" aria-label="별표"><Icon name="star" size={16} fill={d.pinned ? 'currentColor' : 'none'} /></button>
          </div>
        ))}
        {!ddays.length && <Empty hint="시험·발표 날짜를 넣으면 남은 날을 세어 줘요" action={{ label: 'D-day 추가', fn: () => openDday(null) }}>D-day 가 없어요</Empty>}
      </div>
    </Card>
  )
}

function DdayEditor({ id, close }) {
  const cur = id ? find('ddays', id) : null
  const n = useColl('ddays').length
  const [f, setF] = useState(() => cur ? { title: cur.title, date: cur.date, color: cur.color || PALETTE[0], pinned: !!cur.pinned } : { title: '', date: addDays(today(), 30), color: PALETTE[n % 4], pinned: !n })
  const up = (p) => setF((x) => ({ ...x, ...p }))
  const save = () => {
    if (!f.title.trim() || !f.date) return toast('이름과 날짜를 넣어 주세요')
    if (cur) patch('ddays', id, { ...f, title: f.title.trim() }); else put('ddays', { ...f, title: f.title.trim() })
    close()
  }
  return (
    <div className="form">
      <Field label="이름"><input className="input" autoFocus={!cur} placeholder="시험·발표 이름" value={f.title} onChange={(e) => up({ title: e.target.value })} /></Field>
      <Field label="날짜"><input className="input dd-date" type="date" value={f.date} onChange={(e) => up({ date: e.target.value })} /></Field>
      <div className="tiny muted" style={{ marginTop: -4 }}>{f.date ? `${fmtDate(f.date, { year: true })} · ${dday(f.date)}` : ''}</div>
      <Field label="색">
        <div className="row wrap" style={{ gap: 8, alignItems: 'center' }}>
          <ColorPick value={f.color} onChange={(c) => up({ color: c })} colors={SOFT_PALETTE} />
          <label className="dd-custom" style={{ background: SOFT_PALETTE.includes(f.color) ? 'var(--surface-2)' : f.color }} title="직접 고르기">
            <input type="color" value={f.color} onChange={(e) => up({ color: e.target.value })} aria-label="직접 고르기" />
            {SOFT_PALETTE.includes(f.color) && <Icon name="plus" size={13} />}
          </label>
        </div>
      </Field>
      <button type="button" className="row dd-star" onClick={() => up({ pinned: !f.pinned })}>
        <Icon name="star" size={16} fill={f.pinned ? 'currentColor' : 'none'} style={{ color: f.pinned ? f.color : 'var(--muted)' }} />
        <span className="small">별표 <span className="tiny muted">· 홈 맨 위 · 리포트에 나와요</span></span>
      </button>
      <div className="row" style={{ gap: 6 }}>
        {cur && <button className="btn danger" onClick={() => confirmSheet('D-day 삭제', `‘${cur.title}’ 을 지울까요?`, () => { remove('ddays', id); close() }, '삭제')}>삭제</button>}
        <button className="btn primary grow" onClick={save}>{cur ? '저장' : '추가'}</button>
      </div>
    </div>
  )
}

function PlanForm({ close, plan }) {
  const textbooks = useColl('textbooks')
  const [f, setF] = useState(plan || { title: '', textbookId: textbooks[0]?.id || '', subjectId: null, from: 1, to: 100, unit: 'p', startDate: today(), examDate: addDays(today(), 21), reviewDays: 2, offDays: [], minPerUnit: 3 })
  const [newTb, setNewTb] = useState(textbooks.length ? '' : '교재')
  const set = (p) => setF({ ...f, ...p })
  const tb = textbooks.find((x) => x.id === f.textbookId)
  const preview = planChunks(f, tb || { current: 0 })
  const save = () => {
    let tbId = f.textbookId
    if (!tbId || newTb) tbId = put('textbooks', { title: newTb || '교재', subjectId: f.subjectId, unit: f.unit, total: f.to, current: f.from - 1, history: [] }).id
    const p = put('plans', { ...f, textbookId: tbId, title: f.title || find('textbooks', tbId)?.title || '학습 계획' })
    regeneratePlan(p.id)
    toast('계획 할 일을 만들었어요')
    close()
  }
  return (
    <div className="form">
      <Field label="계획 이름"><input className="input" placeholder="예: 중간고사 수학" value={f.title} onChange={(e) => set({ title: e.target.value })} /></Field>
      <Field label="교재">
        <select className="input" value={newTb ? '__new' : f.textbookId} onChange={(e) => { if (e.target.value === '__new') setNewTb('새 교재'); else { setNewTb(''); const t = textbooks.find((x) => x.id === e.target.value); set({ textbookId: e.target.value, unit: t?.unit || f.unit, subjectId: t?.subjectId || f.subjectId }) } }}>
          {textbooks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          <option value="__new">+ 새 교재</option>
        </select>
        {newTb !== '' && <input className="input" value={newTb} onChange={(e) => setNewTb(e.target.value)} placeholder="교재 이름" />}
      </Field>
      <SubjectSelect value={f.subjectId} onChange={(v) => set({ subjectId: v })} />
      <div className="row">
        <Field label="시작"><input className="input" type="number" value={f.from} onChange={(e) => set({ from: +e.target.value })} /></Field>
        <Field label="끝"><input className="input" type="number" value={f.to} onChange={(e) => set({ to: +e.target.value })} /></Field>
        <Field label="단위"><select className="input" value={f.unit} onChange={(e) => set({ unit: e.target.value })}><option value="p">쪽(p)</option><option value="강">강</option><option value="단원">단원</option><option value="문제">문제</option></select></Field>
      </div>
      <div className="row">
        <Field label="계획 시작일"><input className="input" type="date" value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} /></Field>
        <Field label="시험일"><input className="input" type="date" value={f.examDate} onChange={(e) => set({ examDate: e.target.value })} /></Field>
      </div>
      <div className="row">
        <Field label="시험 전 복습일"><input className="input" type="number" min="0" value={f.reviewDays} onChange={(e) => set({ reviewDays: +e.target.value })} /></Field>
        <Field label={`단위당 분(예상)`}><input className="input" type="number" min="0" value={f.minPerUnit} onChange={(e) => set({ minPerUnit: +e.target.value })} /></Field>
      </div>
      <Field label="쉬는 요일">
        <div className="row wrap" style={{ gap: 4 }}>
          {WD.map((w, i) => { const on = f.offDays.includes(i); return <button key={i} className={'chip' + (on ? ' on' : '')} onClick={() => set({ offDays: on ? f.offDays.filter((x) => x !== i) : [...f.offDays, i] })}>{w}</button> })}
        </div>
      </Field>
      <div className="card" style={{ background: 'var(--surface-2)' }}>
        <div className="small">하루 <b>{preview.perDay}{f.unit}</b> × {preview.days}일 → {fmtShort(addDays(f.examDate, -(f.reviewDays || 0) - 1))}까지, 이후 {f.reviewDays}일 총복습</div>
        <div className="row wrap tiny muted" style={{ gap: 6, marginTop: 4 }}>{preview.chunks.slice(0, 6).map((c) => <span key={c.date}>{fmtShort(c.date)} {c.a}–{c.b}</span>)}{preview.chunks.length > 6 && '…'}</div>
      </div>
      <button className="btn primary" onClick={save}>{plan ? '저장하고 재배분' : '계획 만들기'}</button>
    </div>
  )
}
