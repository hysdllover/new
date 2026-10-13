import { useState } from 'react'
// 학교 시간표 · 주말 독서실 시간표: 요일 × 교시 격자 편집, 오늘·지금 교시 강조
import { useSettings, setSettings, useColl, put, remove, restore } from '../../store/store.js'
import { DEFAULT_TIMETABLE, DEFAULT_WEEKEND, defaultPeriods, isSchoolDay, isWeekendDay, weekendOf } from '../../engine/timetable.js'
import { WD, fmtTime, today, nowMin, parseYmd } from '../../engine/date.js'
import { Card, Field, Toggle, openSheet, useNow, Icon, openDetail, toast } from '../../components/ui.jsx'
import { SubjectSelect, TimeInput } from '../../components/common.jsx'

const ORDER = [1, 2, 3, 4, 5, 6, 0]
export const getTT = (st) => ({ ...DEFAULT_TIMETABLE, ...(st.timetable || {}) })
const saveTT = (p) => setSettings((s) => ({ timetable: { ...getTT(s), ...(typeof p === 'function' ? p(getTT(s)) : p) } }))
const saveWK = (p) => saveTT((t) => { const w = weekendOf(t); return { wk: { ...w, ...(typeof p === 'function' ? p(w) : p) } } })

export default function Timetable() {
  const st = useSettings()
  useNow(60000)
  const tt = getTT(st), wk = weekendOf(tt)
  const d0 = today()
  return (
    <div className="col">
      <Card title="시간표" className="tt-card" action={<div className="row no-print" style={{ gap: 4 }}>
        <button className="btn sm" onClick={() => window.print()}>인쇄 (A4)</button>
        <button className="btn sm" onClick={() => openSheet(() => <TTSettings />, { title: '시간표 설정' })}><Icon name="settings" size={14} /> 설정</button>
      </div>}>
        {tt.on === false && <div className="small muted" style={{ marginBottom: 8 }}>시간표가 꺼져 있어요. 설정에서 켤 수 있어요.</div>}
        <TTGrid t={tt} live={isSchoolDay(tt, d0)} save={saveTT} />
      </Card>
      <div className="tiny muted no-print">칸을 눌러 과목을 넣어요. 수업 시간은 캘린더·지금 위젯·빈 시간 계산에 반영돼요.</div>
      <Card title="주말 독서실" className="tt-card" action={<button className="btn sm no-print" onClick={() => openSheet(() => <WKSettings />, { title: '주말 독서실 시간표 설정' })}><Icon name="settings" size={14} /> 설정</button>}>
        {wk.on === false ? <div className="small muted">주말 시간표가 꺼져 있어요. 설정에서 켤 수 있어요.</div>
          : <TTGrid t={wk} live={isWeekendDay(tt, d0)} save={saveWK} wk />}
      </Card>
      <div className="tiny muted no-print">주말에 독서실에서 공부할 과목을 교시마다 넣어요. 방학에도 매주 그대로 나오고, 위젯·캘린더에도 같이 보여요.</div>
      <Academy />
    </div>
  )
}

// 요일 × 교시 격자 (학교 · 주말 공용): live = 오늘 이 시간표를 쓰는 날
function TTGrid({ t, live, save, wk }) {
  const subjects = useColl('subjects')
  const days = ORDER.filter((d) => t.days.includes(d))
  const wd = parseYmd(today()).getDay(), m = nowMin()
  const cur = live ? t.periods.findIndex((p) => p.start <= m && p.end > m) : -1
  const sub = (c) => c?.subjectId && subjects.find((s) => s.id === c.subjectId)
  if (!days.length) return <div className="small muted">설정에서 요일을 골라 주세요</div>
  return (
    <div className="tt-grid" style={{ gridTemplateColumns: `44px repeat(${days.length}, minmax(0, 1fr))` }}>
      <div />
      {days.map((d) => <div key={d} className={'tt-h' + (d === wd && live ? ' on' : '')}>{WD[d]}</div>)}
      {t.periods.map((p, i) => [
        <div key={'p' + i} className={'tt-p' + (i === cur ? ' on' : '')}><b>{i + 1}</b><span>{fmtTime(p.start)}</span></div>,
        ...days.map((d) => {
          const c = t.cells[`${d}-${i + 1}`], s = sub(c)
          const now = d === wd && i === cur
          return (
            <button key={d + '-' + i} aria-label={`${WD[d]}요일 ${i + 1}교시 ${c ? c.title || s?.name || '' : '비어 있음'}`} className={'tt-c' + (c ? ' has' : '') + (d === wd && live ? ' today' : '') + (now ? ' now' : '')} style={{ '--c': s?.color || 'var(--accent)' }}
              onClick={() => openSheet((close) => <CellEdit d={d} i={i} close={close} save={save} wk={wk} />, { title: `${wk ? '주말 ' : ''}${WD[d]}요일 ${i + 1}교시 · ${fmtTime(p.start)}–${fmtTime(p.end)}` })}>
              {c && <span className="ellipsis">{c.title || s?.name}</span>}
              {c?.room && <span className="tiny muted ellipsis">{c.room}</span>}
            </button>
          )
        }),
      ])}
    </div>
  )
}

function CellEdit({ d, i, close, save, wk }) {
  const st = useSettings()
  const k = `${d}-${i + 1}`
  const c = (wk ? weekendOf(getTT(st)) : getTT(st)).cells[k] || {}
  const set = (p) => save((t) => ({ cells: { ...t.cells, [k]: { ...c, ...p } } }))
  return (
    <div className="col">
      <Field label={wk ? '공부할 과목' : '과목'}><SubjectSelect value={c.subjectId} onChange={(v) => set({ subjectId: v })} /></Field>
      <Field label="이름 (과목과 다르게 표시할 때)"><input className="input" defaultValue={c.title || ''} placeholder={wk ? '예: 수학 문제집, 영어 인강' : '예: 창체, 자습'} onBlur={(e) => set({ title: e.target.value.trim() })} /></Field>
      <Field label={wk ? '장소' : '교실'}><input className="input" defaultValue={c.room || ''} placeholder={wk ? '예: 독서실 23번' : '예: 과학실'} onBlur={(e) => set({ room: e.target.value.trim() })} /></Field>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn danger" onClick={() => { save((t) => { const cells = { ...t.cells }; delete cells[k]; return { cells } }); close() }}>비우기</button>
        <button className="btn primary" onClick={close}>완료</button>
      </div>
    </div>
  )
}

// 요일 고르기 · 교시 시간 편집 (학교 · 주말 공용)
function DaysField({ label, days, save }) {
  return (
    <Field label={label}>
      <div className="row wrap" style={{ gap: 4 }}>
        {ORDER.map((d) => <button key={d} className={'chip' + (days.includes(d) ? ' on' : '')} onClick={() => save((t) => ({ days: t.days.includes(d) ? t.days.filter((x) => x !== d) : [...t.days, d] }))}>{WD[d]}</button>)}
      </div>
    </Field>
  )
}
function PeriodsField({ periods, save, reset }) {
  const setP = (i, p) => save((t) => ({ periods: t.periods.map((x, j) => (j === i ? { ...x, ...p } : x)) }))
  return (
    <Field label="교시 시간">
      <div className="col" style={{ gap: 6 }}>
        {periods.map((p, i) => (
          <div key={i} className="row" style={{ gap: 6 }}>
            <span className="small nowrap" style={{ width: 36 }}>{i + 1}교시</span>
            <TimeInput value={p.start} allowEmpty={false} onChange={(v) => setP(i, { start: v, end: v + (p.end - p.start) })} />
            <span className="muted">–</span>
            <TimeInput value={p.end} allowEmpty={false} onChange={(v) => v > p.start && setP(i, { end: v })} />
          </div>
        ))}
        <div className="row" style={{ gap: 6 }}>
          <button className="btn sm" onClick={() => save((t) => { const l = t.periods.at(-1); return { periods: [...t.periods, l ? { start: l.end + 10, end: l.end + 10 + (l.end - l.start) } : { start: 520, end: 570 }] } })}>교시 추가</button>
          {periods.length > 1 && <button className="btn sm" onClick={() => save((t) => ({ periods: t.periods.slice(0, -1) }))}>마지막 교시 삭제</button>}
          <button className="btn sm" onClick={() => save({ periods: reset })}>기본값</button>
        </div>
      </div>
    </Field>
  )
}

function TTSettings() {
  const st = useSettings()
  const tt = getTT(st)
  return (
    <div className="col">
      <Toggle label="시간표 사용" checked={tt.on !== false} onChange={(v) => saveTT({ on: v })} />
      <DaysField label="수업 요일" days={tt.days} save={saveTT} />
      <PeriodsField periods={tt.periods} save={saveTT} reset={defaultPeriods(tt.periods.length)} />
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

function WKSettings() {
  const st = useSettings()
  const wk = weekendOf(getTT(st))
  return (
    <div className="col">
      <Toggle label="주말 독서실 시간표 사용" checked={wk.on !== false} onChange={(v) => saveWK({ on: v })} />
      <DaysField label="요일" days={wk.days} save={saveWK} />
      <PeriodsField periods={wk.periods} save={saveWK} reset={DEFAULT_WEEKEND.periods} />
      <div className="tiny muted">학교 수업 요일과 겹치는 날엔 학교 시간표가 먼저 나와요.</div>
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
