// 기록: 타이머 · 기록 목록 · 통계 (7일 막대 · 영역별 · 한 달 칸)
import { useMemo, useState } from 'react'
import { useColl, useSettings } from '../store/store.js'
import { weekDays, byArea } from '../store/actions.js'
import { Card, Seg, Empty, Icon } from '../components/ui.jsx'
import { TimerCard } from '../components/parts.jsx'
import { openSession, ExamTag } from '../components/editors.jsx'
import { Bars7, MonthGrid } from '../components/charts.jsx'
import { today, addDays, fmtDate, hm, dur } from '../lib/date.js'
import { setSeg } from '../lib/nav.js'

export default function Record({ seg = 'timer' }) {
  return (
    <>
      <header className="page-h"><h1>기록</h1><span className="grow" /><Seg small value={seg} onChange={(v) => setSeg('record', v)} options={[['timer', '타이머'], ['log', '기록'], ['stats', '통계']]} /></header>
      {seg === 'log' ? <Log /> : seg === 'stats' ? <Stats /> : <TimerPage />}
    </>
  )
}

function SessionRows({ list, exams }) {
  return <div className="rows">{list.map((s) => (
    <button key={s.id} className="row-line" style={{ textAlign: 'left', width: '100%' }} onClick={() => openSession(s.id)}>
      <span className="num small" style={{ width: 52 }}>{dur(s.min)}</span>
      <span className="t"><span className="meta"><ExamTag exam={exams.find((e) => e.id === s.examId)} area={s.area} />{s.memo && <span className="ellipsis">{s.memo}</span>}</span></span>
      {s.start && <span className="tiny soft num">{new Date(s.start).toTimeString().slice(0, 5)}</span>}
    </button>
  ))}</div>
}

function TimerPage() {
  const exams = useColl('exams'), sessions = useColl('sessions'), st = useSettings(), t0 = today()
  const L = sessions.filter((s) => s.date === t0).sort((a, b) => (b.start || b.createdAt || 0) - (a.start || a.createdAt || 0)), tot = L.reduce((a, s) => a + s.min, 0)
  return (
    <div className="grid two">
      <TimerCard />
      <Card title={`오늘 ${hm(tot)} / ${hm(st.goalDaily)}`} action={<button className="lnk" onClick={() => openSession()}>+ 직접 기록</button>}>
        <SessionRows list={L} exams={exams} />
        {!L.length && <Empty>오늘 기록이 없어요</Empty>}
      </Card>
    </div>
  )
}

function Log() {
  const exams = useColl('exams'), sessions = useColl('sessions')
  const [n, setN] = useState(14)
  const t0 = today(), days = Array.from({ length: n }, (_, i) => addDays(t0, -i))
  const by = useMemo(() => { const m = {}; for (const s of sessions) (m[s.date] = m[s.date] || []).push(s); return m }, [sessions])
  const shown = days.filter((d) => by[d]?.length)
  return (
    <>
      <div className="grid two">
        {shown.map((d) => <Card key={d} title={`${fmtDate(d)} · ${hm(by[d].reduce((a, s) => a + s.min, 0))}`}><SessionRows list={[...by[d]].sort((a, b) => (b.start || b.createdAt || 0) - (a.start || a.createdAt || 0))} exams={exams} /></Card>)}
      </div>
      {!shown.length && <Card><Empty>최근 {n}일 기록이 없어요</Empty></Card>}
      <div className="row end" style={{ marginTop: 12 }}><button className="btn sm" onClick={() => openSession()}><Icon name="plus" size={14} />기록 추가</button>{n < 120 && <button className="btn sm" onClick={() => setN(n + 30)}>더 지난 기록</button>}</div>
    </>
  )
}

function Stats() {
  const st = useSettings(), exams = useColl('exams'), sessions = useColl('sessions')
  const t0 = today(), [month, setMonth] = useState(t0.slice(0, 7)), [range, setRange] = useState('week')
  const mins = useMemo(() => { const m = {}; for (const s of sessions) m[s.date] = (m[s.date] || 0) + s.min; return m }, [sessions])
  const days = weekDays(t0, st.weekStart), last = Array.from({ length: 7 }, (_, i) => addDays(t0, i - 6))
  const from = range === 'week' ? days[0] : range === 'month' ? month + '-01' : addDays(t0, -29), to = range === 'month' ? month + '-31' : t0
  const inR = sessions.filter((s) => s.date >= from && s.date <= to), tot = inR.reduce((a, s) => a + s.min, 0), areas = byArea(inR), mx = Math.max(1, ...areas.map((a) => a.min))
  const studied = new Set(inR.map((s) => s.date)).size
  const mv = (k) => { const [y, m] = month.split('-').map(Number), d = new Date(y, m - 1 + k, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`) }
  return (
    <div className="grid two">
      <Card title="최근 7일"><Bars7 days={last} mins={mins} goal={st.goalDaily} /></Card>
      <Card title="영역별" action={<Seg small value={range} onChange={setRange} options={[['week', '이번 주'], ['d30', '30일'], ['month', '이 달']]} />}>
        <div className="kv" style={{ marginBottom: 12 }}><div><span className="k">TOTAL</span><span className="mid num">{hm(tot)}</span></div><div><span className="k">DAYS</span><span className="mid num">{studied}</span></div><div><span className="k">AVG</span><span className="mid num">{hm(studied ? tot / studied : 0)}</span></div></div>
        <div className="col" style={{ gap: 8 }}>{areas.map((a) => { const ex = exams.find((e) => e.id === a.examId); return (
          <div key={a.examId + a.area}><div className="row small"><span className="grow">{ex || a.area ? <ExamTag exam={ex} area={a.area} /> : <span className="soft">정하지 않음</span>}</span><span className="num">{hm(a.min)}</span></div><i className="area-bar"><b style={{ width: (a.min / mx) * 100 + '%', background: ex?.color || 'var(--soft)' }} /></i></div>
        ) })}</div>
        {!areas.length && <Empty>기록이 없어요</Empty>}
      </Card>
      <Card title={`${+month.slice(5)}월`} action={<span className="row" style={{ gap: 0 }}><button className="icon-btn" onClick={() => mv(-1)} aria-label="지난달"><Icon name="back" size={16} /></button><button className="icon-btn" onClick={() => mv(1)} aria-label="다음 달"><Icon name="next" size={16} /></button></span>}>
        <MonthGrid month={month} mins={mins} goal={st.goalDaily} weekStart={st.weekStart} />
        <div className="meta" style={{ marginTop: 8 }}><span>이 달 {hm(Object.entries(mins).filter(([k]) => k.startsWith(month)).reduce((a, [, v]) => a + v, 0))}</span><span>진할수록 하루 목표({hm(st.goalDaily)})에 가까워요</span></div>
      </Card>
    </div>
  )
}
