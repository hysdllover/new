import { useState } from 'react'
// 학교 시간표: 요일 × 교시 격자 편집, 오늘·지금 교시 강조
import { useSettings, setSettings, useColl, put, remove, restore } from '../../store/store.js'
import { DEFAULT_TIMETABLE, defaultPeriods, isSchoolDay } from '../../engine/timetable.js'
import { WD, fmtTime, today, nowMin, parseYmd } from '../../engine/date.js'
import { Card, Field, Toggle, openSheet, useNow, Icon, openDetail, toast } from '../../components/ui.jsx'
import { SubjectSelect, TimeInput } from '../../components/common.jsx'

const ORDER = [1, 2, 3, 4, 5, 6, 0]
export const getTT = (st) => ({ ...DEFAULT_TIMETABLE, ...(st.timetable || {}) })
const saveTT = (p) => setSettings((s) => ({ timetable: { ...getTT(s), ...(typeof p === 'function' ? p(getTT(s)) : p) } }))

export default function Timetable() {
  const st = useSettings()
  const subjects = useColl('subjects')
  useNow(60000)
  const tt = getTT(st)
  const days = ORDER.filter((d) => tt.days.includes(d))
  const d0 = today(), wd = parseYmd(d0).getDay(), m = nowMin()
  const school = isSchoolDay(tt, d0)
  const cur = school ? tt.periods.findIndex((p) => p.start <= m && p.end > m) : -1
  const cell = (d, i) => tt.cells[`${d}-${i + 1}`]
  const sub = (c) => c?.subjectId && subjects.find((s) => s.id === c.subjectId)
  return (
    <div className="col">
      <Card title="시간표" className="tt-card" action={<div className="row no-print" style={{ gap: 4 }}>
        <button className="btn sm" onClick={() => window.print()}>인쇄</button>
        <button className="btn sm" onClick={() => openSheet(() => <TTSettings />, { title: '시간표 설정' })}><Icon name="settings" size={14} /> 설정</button>
      </div>}>
        {tt.on === false && <div className="small muted" style={{ marginBottom: 8 }}>시간표가 꺼져 있어요. 설정에서 켤 수 있어요.</div>}
        <div className="tt-grid" style={{ gridTemplateColumns: `44px repeat(${days.length}, minmax(0, 1fr))` }}>
          <div />
          {days.map((d) => <div key={d} className={'tt-h' + (d === wd && school ? ' on' : '')}>{WD[d]}</div>)}
          {tt.periods.map((p, i) => [
            <div key={'p' + i} className={'tt-p' + (i === cur ? ' on' : '')}><b>{i + 1}</b><span>{fmtTime(p.start)}</span></div>,
            ...days.map((d) => {
              const c = cell(d, i), s = sub(c)
              const now = d === wd && i === cur
              return (
                <button key={d + '-' + i} className={'tt-c' + (c ? ' has' : '') + (d === wd && school ? ' today' : '') + (now ? ' now' : '')} style={{ '--c': s?.color || 'var(--accent)' }}
                  onClick={() => openSheet((close) => <CellEdit d={d} i={i} close={close} />, { title: `${WD[d]}요일 ${i + 1}교시 · ${fmtTime(p.start)}–${fmtTime(p.end)}` })}>
                  {c && <span className="ellipsis">{c.title || s?.name}</span>}
                  {c?.room && <span className="tiny muted ellipsis">{c.room}</span>}
                </button>
              )
            }),
          ])}
        </div>
      </Card>
      <div className="tiny muted no-print">칸을 눌러 과목을 넣어요. 수업 시간은 캘린더·지금 위젯·빈 시간 계산에 반영돼요.</div>
      <Academy />
    </div>
  )
}

function CellEdit({ d, i, close }) {
  const st = useSettings()
  const k = `${d}-${i + 1}`
  const c = getTT(st).cells[k] || {}
  const set = (p) => saveTT((t) => ({ cells: { ...t.cells, [k]: { ...c, ...p } } }))
  return (
    <div className="col">
      <Field label="과목"><SubjectSelect value={c.subjectId} onChange={(v) => set({ subjectId: v })} /></Field>
      <Field label="이름 (과목과 다르게 표시할 때)"><input className="input" defaultValue={c.title || ''} placeholder="예: 창체, 자습" onBlur={(e) => set({ title: e.target.value.trim() })} /></Field>
      <Field label="교실"><input className="input" defaultValue={c.room || ''} placeholder="예: 과학실" onBlur={(e) => set({ room: e.target.value.trim() })} /></Field>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn danger" onClick={() => { saveTT((t) => { const cells = { ...t.cells }; delete cells[k]; return { cells } }); close() }}>비우기</button>
        <button className="btn primary" onClick={close}>완료</button>
      </div>
    </div>
  )
}

function TTSettings() {
  const st = useSettings()
  const tt = getTT(st)
  const setP = (i, p) => saveTT((t) => ({ periods: t.periods.map((x, j) => (j === i ? { ...x, ...p } : x)) }))
  return (
    <div className="col">
      <Toggle label="시간표 사용" checked={tt.on !== false} onChange={(v) => saveTT({ on: v })} />
      <Field label="수업 요일">
        <div className="row wrap" style={{ gap: 4 }}>
          {ORDER.map((d) => <button key={d} className={'chip' + (tt.days.includes(d) ? ' on' : '')} onClick={() => saveTT((t) => ({ days: t.days.includes(d) ? t.days.filter((x) => x !== d) : [...t.days, d] }))}>{WD[d]}</button>)}
        </div>
      </Field>
      <Field label="교시 시간">
        <div className="col" style={{ gap: 6 }}>
          {tt.periods.map((p, i) => (
            <div key={i} className="row" style={{ gap: 6 }}>
              <span className="small nowrap" style={{ width: 36 }}>{i + 1}교시</span>
              <TimeInput value={p.start} allowEmpty={false} onChange={(v) => setP(i, { start: v, end: v + (p.end - p.start) })} />
              <span className="muted">–</span>
              <TimeInput value={p.end} allowEmpty={false} onChange={(v) => v > p.start && setP(i, { end: v })} />
            </div>
          ))}
          <div className="row" style={{ gap: 6 }}>
            <button className="btn sm" onClick={() => saveTT((t) => { const l = t.periods.at(-1); return { periods: [...t.periods, l ? { start: l.end + 10, end: l.end + 10 + (l.end - l.start) } : { start: 520, end: 570 }] } })}>교시 추가</button>
            {tt.periods.length > 1 && <button className="btn sm" onClick={() => saveTT((t) => ({ periods: t.periods.slice(0, -1) }))}>마지막 교시 삭제</button>}
            <button className="btn sm" onClick={() => saveTT({ periods: defaultPeriods(tt.periods.length) })}>기본값</button>
          </div>
        </div>
      </Field>
      <Field label="수업 없는 기간 (방학·시험·휴업)">
        <div className="col" style={{ gap: 6 }}>
          {tt.off.map((o, i) => (
            <div key={i} className="row" style={{ gap: 6 }}>
              <input className="input" type="date" value={o.from || ''} onChange={(e) => saveTT((t) => ({ off: t.off.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)) }))} />
              <span className="muted">~</span>
              <input className="input" type="date" value={o.to || ''} onChange={(e) => saveTT((t) => ({ off: t.off.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)) }))} />
              <button className="icon-btn" aria-label="삭제" onClick={() => saveTT((t) => ({ off: t.off.filter((_, j) => j !== i) }))}><Icon name="close" size={12} /></button>
            </div>
          ))}
          <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => saveTT((t) => ({ off: [...t.off, { from: today(), to: today() }] }))}>기간 추가</button>
        </div>
      </Field>
    </div>
  )
}

// 학원 시간표: 매주 반복하는 학원·과외 일정 (캘린더에선 '학원' 레이어로 따로 켜고 끔)
function Academy() {
  const subjects = useColl('subjects')
  const list = useColl('events').filter((e) => e.layer === 'academy').sort((a, b) => (a.repeat?.byDay?.[0] ?? 9) - (b.repeat?.byDay?.[0] ?? 9) || (a.start ?? 0) - (b.start ?? 0))
  const sc = (id) => subjects.find((s) => s.id === id)
  return (
    <Card title="학원 시간표" action={<button className="btn sm no-print" onClick={() => openSheet((c) => <AcademyForm close={c} />, { title: '학원 추가' })}><Icon name="plus" size={14} />추가</button>}>
      {list.length ? <div className="list">{list.map((e) => (
        <button key={e.id} className="item" style={{ textAlign: 'left', alignItems: 'center' }} onClick={() => openDetail('event', e.id)}>
          <span className="mpeek-bar" style={{ background: e.color || sc(e.subjectId)?.color || 'var(--accent)', minHeight: 26 }} />
          <div className="t"><div>{e.title}</div><div className="meta">{(e.repeat?.byDay || []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => WD[d]).join('·')} · {fmtTime(e.start)}–{fmtTime(e.end)}{e.location ? ' · ' + e.location : ''}</div></div>
          {e.studyLog && <span className="badge">공부 기록</span>}
        </button>
      ))}</div> : <div className="small muted">학원·과외처럼 매주 같은 시간 일정을 넣어 두세요</div>}
    </Card>
  )
}

function AcademyForm({ close }) {
  const [f, setF] = useState({ title: '', days: [], start: 18 * 60, end: 20 * 60, subjectId: null, location: '', studyLog: true })
  const set = (p) => setF((x) => ({ ...x, ...p }))
  const save = () => {
    if (!f.title.trim() || !f.days.length) return toast('이름과 요일을 정해 주세요')
    const wd = parseYmd(today()).getDay(), first = [0, 1, 2, 3, 4, 5, 6].map((k) => (wd + k) % 7).find((d) => f.days.includes(d))
    const date = new Date(); date.setDate(date.getDate() + ((first - wd + 7) % 7))
    const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const e = put('events', { title: f.title.trim(), date: ymd, start: f.start, end: Math.max(f.start + 10, f.end), subjectId: f.subjectId, location: f.location, studyLog: f.studyLog, layer: 'academy', repeat: { freq: 'weekly', interval: 1, byDay: f.days } })
    close(); toast('학원 시간표에 넣었어요', { label: '되돌리기', fn: () => remove('events', e.id) })
  }
  return (
    <div className="form">
      <Field label="이름"><input className="input" autoFocus value={f.title} placeholder="예: 국어 학원" onChange={(e) => set({ title: e.target.value })} /></Field>
      <Field label="요일"><div className="row" style={{ gap: 4 }}>{ORDER.map((d) => <button key={d} className={'chip' + (f.days.includes(d) ? ' on' : '')} onClick={() => set({ days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d] })}>{WD[d]}</button>)}</div></Field>
      <div className="row">
        <Field label="시작"><TimeInput allowEmpty={false} value={f.start} onChange={(v) => set({ start: v, end: Math.max(v + 10, f.end) })} /></Field>
        <Field label="끝"><TimeInput allowEmpty={false} value={f.end} onChange={(v) => set({ end: v })} /></Field>
      </div>
      <div className="row">
        <Field label="과목 (색도 과목 색)"><SubjectSelect value={f.subjectId} onChange={(v) => set({ subjectId: v })} /></Field>
        <Field label="장소"><input className="input" value={f.location} onChange={(e) => set({ location: e.target.value })} /></Field>
      </div>
      <Toggle label="끝나면 공부 기록으로 넣기" checked={f.studyLog} onChange={(v) => set({ studyLog: v })} />
      <button className="btn primary" onClick={save}>추가</button>
    </div>
  )
}
