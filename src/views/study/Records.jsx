import { useMemo, useState } from 'react'
import { useColl, useSettings, put, patch, remove } from '../../store/store.js'
import { Card, Ring, Icon, Empty, AddInput, openSheet, Field } from '../../components/ui.jsx'
import { SubjectSelect } from '../../components/common.jsx'
import { Heatmap, Bars, WeekBars, LineChart, MonthHeat } from '../../components/charts.jsx'
import { today, addDays, weekStart, fmtDur, fmtShort, fmtDate, fmtTime, tsToMin, diffDays } from '../../engine/date.js'
import { PALETTE } from '../../store/schema.js'
import { DdayCard } from './Plan.jsx'

export function useStudyStats() {
  const st = useSettings()
  const sessions = useColl('sessions')
  return useMemo(() => {
    const byDay = {}
    for (const s of sessions) byDay[s.date] = (byDay[s.date] || 0) + s.dur
    const d = today()
    const ws = weekStart(d, st.weekStart)
    let week = 0
    for (let i = 0; i < 7; i++) week += byDay[addDays(ws, i)] || 0
    let streak = 0
    for (let k = byDay[d] ? 0 : 1; byDay[addDays(d, -k)]; k++) streak++
    return { byDay, today: byDay[d] || 0, week, streak, ws }
  }, [sessions, st.weekStart])
}

export default function Records() {
  const st = useSettings()
  const sessions = useColl('sessions')
  const subjects = useColl('subjects')
  const tasks = useColl('tasks')
  const s = useStudyStats()
  const weekSess = sessions.filter((x) => x.date >= s.ws)
  const subBars = subjects.map((sb) => ({ label: sb.name, color: sb.color, value: weekSess.filter((x) => x.subjectId === sb.id).reduce((a, x) => a + x.dur, 0) }))
    .filter((x) => x.value).map((x) => ({ ...x, text: fmtDur(x.value) })).sort((a, b) => b.value - a.value)
  const weekTasks = tasks.filter((t) => t.due >= s.ws && t.due <= addDays(s.ws, 6))
  const doneRate = weekTasks.length ? weekTasks.filter((t) => t.done).length / weekTasks.length : 0
  return (
    <div className="grid two">
      <Card title="목표 달성">
        <div className="row" style={{ justifyContent: 'space-around' }}>
          <div className="col center" style={{ alignItems: 'center', gap: 4 }}>
            <Ring value={s.today / st.goalDaily} size={96}><b>{Math.round(s.today / st.goalDaily * 100)}%</b></Ring>
            <span className="small">오늘 {fmtDur(s.today)}</span>
          </div>
          <div className="col center" style={{ alignItems: 'center', gap: 4 }}>
            <Ring value={s.week / st.goalWeekly} size={96} color="var(--c2)"><b>{Math.round(s.week / st.goalWeekly * 100)}%</b></Ring>
            <span className="small">이번 주 {fmtDur(s.week)}</span>
          </div>
          <div className="col center" style={{ alignItems: 'center', gap: 4 }}>
            <Ring value={doneRate} size={96} color="var(--c3)"><b>{Math.round(doneRate * 100)}%</b></Ring>
            <span className="small">주간 할 일</span>
          </div>
        </div>
        <div className="small muted center" style={{ marginTop: 8 }}>연속 공부 {s.streak}일 🔥</div>
      </Card>
      <Card title="최근 7일">
        <WeekBars values={s.byDay} goal={st.goalDaily} />
        {subBars.length > 0 && <div style={{ marginTop: 10 }}><Bars items={subBars} /></div>}
      </Card>
      <Card title="공부 캘린더">
        <MonthHeat values={s.byDay} goal={st.goalDaily} weekStartDow={st.weekStart} onPick={(d) => openSheet(() => <DayRecords date={d} />, { title: fmtDate(d) })} />
      </Card>
      <DdayCard />
      <Habits />
      <Grades />
    </div>
  )
}

// 달력에서 고른 날의 공부 기록
export function DayRecords({ date }) {
  const sessions = useColl('sessions').filter((x) => x.date === date).sort((a, b) => (a.start ?? 0) - (b.start ?? 0))
  const subjects = useColl('subjects')
  const total = sessions.reduce((a, x) => a + x.dur, 0)
  return (
    <div className="col">
      <div className="small muted">합계 {fmtDur(total)}</div>
      <div className="list">
        {sessions.map((x) => { const sb = subjects.find((s) => s.id === x.subjectId); return (
          <div key={x.id} className="item" style={{ padding: '6px 0', alignItems: 'center' }}>
            <span className="dot" style={{ background: sb?.color || 'var(--muted)' }} />
            <span className="grow ellipsis">{sb?.name || '기타'}{x.note ? ` · ${x.note}` : ''}</span>
            {x.start != null && <span className="tiny muted">{fmtTime(tsToMin(x.start))}</span>}
            <span className="small">{fmtDur(x.dur)}</span>
          </div>
        ) })}
        {!sessions.length && <Empty>기록이 없어요</Empty>}
      </div>
    </div>
  )
}

function Habits() {
  const habits = useColl('habits')
  const d = today()
  return (
    <Card title="습관 트래커">
      <div className="col">
        {habits.map((h) => {
          const days = h.days || {}
          let streak = 0
          for (let k = days[d] ? 0 : 1; days[addDays(d, -k)]; k++) streak++
          return (
            <div key={h.id}>
              <div className="row" style={{ marginBottom: 4 }}>
                <button className={'check' + (days[d] ? ' on' : '')} style={{ borderColor: h.color, background: days[d] ? h.color : null }} onClick={() => patch('habits', h.id, { days: { ...days, [d]: !days[d] } })} aria-label="오늘 체크" />
                <span className="grow">{h.title}</span>
                <span className="tiny muted">{streak}일 연속</span>
                <button className="icon-btn" onClick={() => remove('habits', h.id)} aria-label="삭제"><Icon name="close" size={14} /></button>
              </div>
              <Heatmap values={Object.fromEntries(Object.entries(days).filter(([, v]) => v).map(([k]) => [k, 1]))} max={1} color={h.color} weeks={15} onPick={(day) => patch('habits', h.id, { days: { ...days, [day]: !days[day] } })} />
            </div>
          )
        })}
        {!habits.length && <Empty>매일 반복할 습관을 추가하세요</Empty>}
        <AddInput placeholder="습관 추가 (예: 아침 영단어)" onAdd={(title) => put('habits', { title, color: PALETTE[habits.length % PALETTE.length], days: {} })} />
      </div>
    </Card>
  )
}

function Grades() {
  const grades = useColl('grades')
  const subjects = useColl('subjects')
  const [sel, setSel] = useState(null)
  const withData = subjects.filter((s) => grades.some((g) => g.subjectId === s.id))
  const cur = sel || withData[0]?.id
  const list = grades.filter((g) => g.subjectId === cur).sort((a, b) => a.date.localeCompare(b.date))
  const sub = subjects.find((s) => s.id === cur)
  const first = list[0]?.date, last = list[list.length - 1]?.date
  const span = first && last ? Math.max(1, diffDays(last, first)) : 1
  const target = list[list.length - 1]?.target
  return (
    <Card title="성적 기록" action={<button className="btn sm" onClick={() => openSheet((c) => <GradeForm close={c} subjectId={cur} />, { title: '성적 추가' })}><Icon name="plus" size={14} />추가</button>}>
      {withData.length > 0 ? (
        <>
          <div className="scroll-x"><div className="row" style={{ gap: 6 }}>{withData.map((s) => <button key={s.id} className={'chip' + (cur === s.id ? ' on' : '')} onClick={() => setSel(s.id)}>{s.name}</button>)}</div></div>
          <LineChart height={140} yMax={Math.max(100, ...list.map((g) => g.max || 100))} goal={target}
            series={[{ points: list.map((g) => [list.length === 1 ? .5 : diffDays(g.date, first) / span, (g.score / (g.max || 100)) * 100]), color: sub?.color || 'var(--accent)' }]}
            labels={list.map((g) => [list.length === 1 ? .5 : diffDays(g.date, first) / span, fmtShort(g.date)])} />
          <div className="list small">
            {[...list].reverse().map((g) => (
              <div key={g.id} className="item" style={{ padding: '6px 0', alignItems: 'center' }}>
                <span className="t">{g.name} <span className="muted tiny">{fmtShort(g.date)}</span></span>
                <b>{g.score}</b><span className="muted">/{g.max}</span>
                {g.target && <span className="badge">목표 {g.target}</span>}
                <button className="icon-btn" onClick={() => remove('grades', g.id)} aria-label="삭제"><Icon name="close" size={12} /></button>
              </div>
            ))}
          </div>
        </>
      ) : <Empty>시험 점수를 기록하면 추이와 목표를 보여줘요</Empty>}
    </Card>
  )
}

function GradeForm({ close, subjectId }) {
  const [f, setF] = useState({ subjectId: subjectId || null, name: '', date: today(), score: '', max: 100, target: '' })
  return (
    <div className="form">
      <SubjectSelect value={f.subjectId} onChange={(v) => setF({ ...f, subjectId: v })} allowEmpty={false} />
      <Field label="시험 이름"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="예: 2학기 중간" /></Field>
      <div className="row">
        <Field label="날짜"><input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="점수"><input className="input" type="number" value={f.score} onChange={(e) => setF({ ...f, score: e.target.value })} /></Field>
      </div>
      <div className="row">
        <Field label="만점"><input className="input" type="number" value={f.max} onChange={(e) => setF({ ...f, max: +e.target.value })} /></Field>
        <Field label="목표 점수"><input className="input" type="number" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} /></Field>
      </div>
      <button className="btn primary" onClick={() => { if (f.score === '' || !f.subjectId) return; put('grades', { ...f, subjectId: f.subjectId, score: +f.score, target: f.target ? +f.target : null }); close() }}>저장</button>
    </div>
  )
}
