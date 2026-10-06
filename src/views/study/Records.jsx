import { useEffect, useMemo, useState } from 'react'
import { drawShareCard, shareBlob } from '../../lib/shareCard.js'
import { pickQuote } from '../../lib/quote.js'
import { useColl, useSettings, put, patch, remove } from '../../store/store.js'
import { Card, Ring, Icon, Empty, AddInput, openSheet, Field, toast } from '../../components/ui.jsx'
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
    return { byDay, today: byDay[d] || 0, yesterday: byDay[addDays(d, -1)] || 0, week, ws }
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
      <WeekSwipe sessions={sessions} subjects={subjects} s={s} st={st} />
      <Card title="목표 달성" action={<button className="btn sm" onClick={() => openSheet(() => <ShareCardSheet />, { title: '공부 인증 카드' })}><Icon name="share" size={14} />인증 카드</button>}>
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
        <div className="small muted center" style={{ marginTop: 8 }}>어제 {fmtDur(s.yesterday) || '0분'} · 이번 주 {fmtDur(s.week) || '0분'}</div>
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

// 이번 주 요약: 좌우로 넘기는 한 장 카드들
const hmS = (m) => `${Math.floor((m || 0) / 60)}:${String((m || 0) % 60).padStart(2, '0')}`
function WeekSwipe({ sessions, subjects, s, st }) {
  const [i, setI] = useState(0)
  const t0 = today(), ws = s.ws, days = Array.from({ length: 7 }, (_, k) => addDays(ws, k)).filter((d) => d <= t0)
  const lws = addDays(ws, -7), lastSame = Array.from({ length: days.length }, (_, k) => s.byDay[addDays(lws, k)] || 0).reduce((a, v) => a + v, 0)
  const wk = sessions.filter((x) => x.date >= ws && x.date <= t0)
  const bySub = {}; for (const x of wk) bySub[x.subjectId || '-'] = (bySub[x.subjectId || '-'] || 0) + (x.dur || 0)
  const topSub = Object.entries(bySub).sort((a, b) => b[1] - a[1])[0], sub = topSub && subjects.find((x) => x.id === topSub[0])
  const bestDay = days.reduce((a, d) => ((s.byDay[d] || 0) > (s.byDay[a] || 0) ? d : a), days[0])
  const hit = days.filter((d) => (s.byDay[d] || 0) >= (st.goalDaily || 240)).length
  const fc = { 3: 0, 2: 0, 1: 0 }; for (const x of wk) if (x.focus) fc[x.focus >= 4 ? 3 : x.focus >= 3 ? 2 : 1]++
  const slot = { '오전': 0, '오후': 0, '저녁': 0, '밤': 0 }
  for (const x of wk) if (x.start != null) { const h = new Date(x.start).getHours(); slot[h < 12 ? '오전' : h < 18 ? '오후' : h < 22 ? '저녁' : '밤'] += x.dur || 0 }
  const topSlot = Object.entries(slot).sort((a, b) => b[1] - a[1])[0]
  const diff = s.week - lastSame
  const cards = [
    ['이번 주', hmS(s.week), `하루 평균 ${hmS(Math.round(s.week / Math.max(1, days.length)))}`],
    ['지난주 같은 때와', (diff >= 0 ? '+' : '−') + hmS(Math.abs(diff)), `지난주 ${hmS(lastSame)}`],
    ['가장 많이 한 과목', topSub ? (sub?.name || '과목 없음') : '—', topSub ? `${hmS(topSub[1])} · ${Math.round((topSub[1] / Math.max(1, s.week)) * 100)}%` : '기록 없음', sub?.color],
    ['가장 많이 한 날', bestDay && s.byDay[bestDay] ? `${'일월화수목금토'[new Date(bestDay + 'T00:00').getDay()]}요일` : '—', bestDay && s.byDay[bestDay] ? hmS(s.byDay[bestDay]) : '기록 없음'],
    ['목표를 채운 날', `${hit}일`, `지난 ${days.length}일 중`],
    ['집중', fc[3] + fc[2] + fc[1] ? `상 ${fc[3]}` : '—', fc[3] + fc[2] + fc[1] ? `중 ${fc[2]} · 하 ${fc[1]}` : '기록을 마칠 때 집중도를 남겨 보세요'],
    ['잘 되는 시간대', topSlot && topSlot[1] ? topSlot[0] : '—', topSlot && topSlot[1] ? hmS(topSlot[1]) : '기록 없음'],
  ]
  const onScroll = (e) => { const el = e.currentTarget; setI(Math.round(el.scrollLeft / Math.max(1, el.firstChild?.offsetWidth || 1))) }
  return (
    <div className="wswipe-wrap" style={{ gridColumn: '1 / -1' }}>
      <div className="wswipe" onScroll={onScroll}>
        {cards.map(([cap, big, sub2, color], k) => (
          <div key={k} className="card wswipe-card" style={color ? { '--wc': color } : null}>
            <span className="tiny muted wsw-cap">{cap}</span>
            <span className="wsw-big">{color && <i className="wsw-dot" />}{big}</span>
            <span className="small muted">{sub2}</span>
          </div>
        ))}
      </div>
      <div className="row center" style={{ gap: 5, marginTop: 6, justifyContent: 'center' }}>{cards.map((_, k) => <i key={k} className={'wsw-pip' + (k === i ? ' on' : '')} />)}</div>
    </div>
  )
}

// 공부 인증 카드 미리보기 + 공유/저장
function ShareCardSheet() {
  const st = useSettings(), s = useStudyStats()
  const sessions = useColl('sessions'), subjects = useColl('subjects'), quotes = useColl('quotes')
  const [url, setUrl] = useState(null), [blob, setBlob] = useState(null)
  const d = today()
  useEffect(() => {
    const todays = sessions.filter((x) => x.date === d)
    const subs = subjects.map((sb) => ({ name: sb.name, color: sb.color, m: todays.filter((x) => x.subjectId === sb.id).reduce((a, x) => a + x.dur, 0) })).filter((x) => x.m).sort((a, b) => b.m - a.m)
    const other = todays.filter((x) => !subjects.some((sb) => sb.id === x.subjectId)).reduce((a, x) => a + x.dur, 0)
    if (other) subs.push({ name: '기타', m: other })
    let u
    drawShareCard({ date: fmtDate(d, { year: true }), mins: s.today, goal: st.goalDaily, subjects: subs, week: s.week, yesterday: s.yesterday, quote: pickQuote([...quotes].sort((a, b) => a.id.localeCompare(b.id)))?.text })
      .then((b) => { setBlob(b); u = URL.createObjectURL(b); setUrl(u) })
    return () => u && URL.revokeObjectURL(u)
  }, []) // eslint-disable-line
  return (
    <div className="col">
      {url ? <img src={url} alt="공부 인증 카드" style={{ width: '100%', maxWidth: 420, alignSelf: 'center', borderRadius: 12, boxShadow: 'var(--shadow)' }} /> : <div className="small muted">만드는 중…</div>}
      <button className="btn primary" disabled={!blob} onClick={async () => { const r = await shareBlob(blob, `study-${d}.png`); if (r === 'saved') toast('이미지를 저장했어요') }}><Icon name="share" size={16} />공유 · 저장</button>
      <div className="tiny muted center">사진 앱에 저장하려면 공유 › 이미지 저장</div>
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
          let wk = 0 // 최근 7일 체크 수
          for (let k = 0; k < 7; k++) if (days[addDays(d, -k)]) wk++
          return (
            <div key={h.id}>
              <div className="row" style={{ marginBottom: 4 }}>
                <button className={'check' + (days[d] ? ' on' : '')} style={{ borderColor: h.color, background: days[d] ? h.color : null }} onClick={() => patch('habits', h.id, { days: { ...days, [d]: !days[d] } })} aria-label="오늘 체크" />
                <span className="grow">{h.title}</span>
                <span className="tiny muted">최근 7일 {wk}/7</span>
                <button className="icon-btn" onClick={() => remove('habits', h.id)} aria-label="삭제"><Icon name="close" size={14} /></button>
              </div>
              <Heatmap values={Object.fromEntries(Object.entries(days).filter(([, v]) => v).map(([k]) => [k, 1]))} max={1} color={h.color} weeks={15} onPick={(day) => patch('habits', h.id, { days: { ...days, [day]: !days[day] } })} />
            </div>
          )
        })}
        {!habits.length && <Empty>습관이 없어요</Empty>}
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
      ) : <Empty>성적 기록이 없어요</Empty>}
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
