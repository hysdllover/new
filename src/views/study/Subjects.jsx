// 과목 페이지: 과목마다 공부 시간 · 진도 · 할 일 · 노트 · 복습 · 최근 기록을 한 화면에
import { useColl, useSettings } from '../../store/store.js'
import { addTask } from '../../store/actions.js'
import { startStopwatch } from '../../lib/timer.js'
import { setParams, go, openNote } from '../../nav.js'
import { today, addDays, weekStart, fmtDur, fmtShort, fmtTime, tsToMin } from '../../engine/date.js'
import { Card, Empty, AddInput, Icon } from '../../components/ui.jsx'
import TaskItem from '../../components/TaskItem.jsx'
import { Roll } from '../../components/Roll.jsx'

const hm = (m) => `${Math.floor((m || 0) / 60)}:${String((m || 0) % 60).padStart(2, '0')}`

export default function Subjects({ params }) {
  const subjects = useColl('subjects'), sessions = useColl('sessions'), st = useSettings()
  const sid = params?.sid, s = subjects.find((x) => x.id === sid)
  if (s) return <SubjectPage s={s} />
  const t0 = today(), ws = weekStart(t0, st.weekStart ?? 1)
  const stat = (id) => { let wk = 0, all = 0, td = 0; for (const x of sessions) if (x.subjectId === id) { all += x.dur || 0; if (x.date >= ws) wk += x.dur || 0; if (x.date === t0) td += x.dur || 0 } return { wk, all, td } }
  const rows = subjects.map((x) => ({ s: x, ...stat(x.id) }))
  const mx = Math.max(60, ...rows.map((r) => r.wk)), mxAll = Math.max(60, ...rows.map((r) => r.all))
  return (
    <div className="subj-grid">
      {rows.map(({ s, wk, all, td }) => (
        <button key={s.id} className="card subj-card" style={{ '--sc': s.color || 'var(--accent)' }} onClick={() => setParams('study', { sid: s.id })}>
          <div className="row between"><span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: s.color }} /><b>{s.name}</b></span><Icon name="next" size={14} /></div>
          <div className="subj-big"><Roll value={hm(wk)} /></div>
          <div className="tiny muted">이번 주 · 오늘 {hm(td)} · 전체 {fmtDur(all) || '0분'}</div>
          <div className="subj-bar"><i style={{ width: (wk / mx) * 100 + '%' }} /></div>
          <div className="row between tiny muted" style={{ marginTop: 8 }}><span>누적</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{hm(all)}</span></div>
          <div className="subj-cum" title={`누적 ${fmtDur(all)}`}><i style={{ width: (all / mxAll) * 100 + '%' }} /></div>
        </button>
      ))}
      {!subjects.length && <Empty>설정에서 과목을 추가하세요</Empty>}
    </div>
  )
}

function SubjectPage({ s }) {
  const st = useSettings(), sessions = useColl('sessions').filter((x) => x.subjectId === s.id)
  const tasks = useColl('tasks').filter((t) => t.subjectId === s.id && !t.archived), subjects = useColl('subjects'), projects = useColl('projects')
  const textbooks = useColl('textbooks').filter((x) => x.subjectId === s.id), lectures = useColl('lectures').filter((x) => x.subjectId === s.id)
  const notes = useColl('notes').filter((n) => n.subjectId === s.id && !n.trashed), reviews = useColl('reviews').filter((r) => r.subjectId === s.id)
  const t0 = today(), ws = weekStart(t0, st.weekStart ?? 1)
  const by = {}; for (const x of sessions) by[x.date] = (by[x.date] || 0) + (x.dur || 0)
  const days = Array.from({ length: 14 }, (_, i) => addDays(t0, i - 13)), mx = Math.max(30, ...days.map((d) => by[d] || 0))
  const wk = sessions.filter((x) => x.date >= ws).reduce((a, x) => a + (x.dur || 0), 0), all = sessions.reduce((a, x) => a + (x.dur || 0), 0)
  const open = tasks.filter((t) => !t.done).sort((a, b) => (a.due || '9').localeCompare(b.due || '9') || (a.order ?? 0) - (b.order ?? 0))
  const recent = sessions.slice().sort((a, b) => (b.start || 0) - (a.start || 0)).slice(0, 6)
  const dueRev = reviews.filter((r) => r.next && r.next <= t0)
  return (
    <div className="col" style={{ '--sc': s.color || 'var(--accent)' }}>
      <div className="row between">
        <button className="btn sm" onClick={() => setParams('study', { sid: null })}><Icon name="back" size={14} />과목</button>
        <button className="btn sm primary" onClick={() => { startStopwatch(s.id); go('study', 'timer') }}>공부 시작</button>
      </div>
      <div className="subj-head"><span className="dot" style={{ background: s.color, width: 10, height: 10 }} /><h2>{s.name}</h2></div>
      <div className="bento">
        <Card className="b-2"><div className="tiny muted">이번 주</div><div className="subj-big"><Roll value={hm(wk)} /></div><div className="tiny muted">전체 {fmtDur(all) || '0분'} · 기록 {sessions.length}번</div></Card>
        <Card className="b-2" title="최근 2주">
          <div className="row" style={{ gap: 3, alignItems: 'flex-end', height: 52 }}>{days.map((d) => <i key={d} title={`${fmtShort(d)} ${fmtDur(by[d] || 0)}`} style={{ flex: 1, height: Math.max(2, Math.round(((by[d] || 0) / mx) * 52)), borderRadius: 2, background: by[d] ? 'var(--sc)' : 'var(--line)', opacity: by[d] ? 0.45 + 0.55 * ((by[d] || 0) / mx) : 1 }} />)}</div>
        </Card>
        {(textbooks.length > 0 || lectures.length > 0) && <Card className="b-4" title="진도" action={<button className="tiny muted" onClick={() => go('study', 'progress')}>진도 →</button>}>
          {[...textbooks.map((x) => ({ t: x.title, n: x.current || 0, of: x.total, u: x.unit || 'p' })), ...lectures.map((x) => ({ t: x.title, n: Object.keys(x.done || {}).length, of: x.total, u: '강' }))].map((x, i) => (
            <div key={i} style={{ marginBottom: 6 }}><div className="row between small"><span className="ellipsis">{x.t}</span><span className="muted">{x.n}/{x.of || '?'}{x.u}</span></div><div className="subj-bar"><i style={{ width: x.of ? Math.min(100, (x.n / x.of) * 100) + '%' : 0 }} /></div></div>
          ))}
        </Card>}
        <Card className="b-4" title={`할 일 ${open.length}`}>
          <AddInput placeholder={`+ ${s.name} 할 일`} onAdd={(title) => addTask({ title, subjectId: s.id })} />
          <div className="list">{open.slice(0, 12).map((t) => <TaskItem key={t.id} t={t} subjects={subjects} projects={projects} />)}</div>
          {!open.length && <div className="tiny muted" style={{ padding: '6px 0' }}>남은 할 일이 없어요</div>}
        </Card>
        {reviews.length > 0 && <Card className="b-2" title="복습" action={<button className="tiny muted" onClick={() => go('study', 'review')}>복습 →</button>}><div className="small">오늘 볼 것 {dueRev.length} · 전체 {reviews.length}</div></Card>}
        {notes.length > 0 && <Card className="b-2" title="노트">{notes.slice(0, 5).map((n) => <button key={n.id} className="small ellipsis" style={{ display: 'block', textAlign: 'left', width: '100%', padding: '3px 0' }} onClick={() => openNote(n.id)}>{n.icon || '·'} {n.title || '제목 없음'}</button>)}</Card>}
        <Card className="b-4" title="최근 기록">
          {recent.map((x) => <div key={x.id} className="row between small" style={{ padding: '3px 0' }}><span>{fmtShort(x.date)} {x.start != null ? fmtTime(tsToMin(x.start)) : ''}</span><span className="grow ellipsis muted" style={{ margin: '0 8px' }}>{x.note || ''}</span><span>{fmtDur(x.dur)}</span></div>)}
          {!recent.length && <div className="tiny muted">아직 기록이 없어요</div>}
        </Card>
      </div>
    </div>
  )
}
