import { useColl } from '../../store/store.js'
import { projectProgress, taskProgress, addTask } from '../../store/actions.js'
import { Card, Prog, Empty, Icon, AddInput, openDetail } from '../../components/ui.jsx'
import TaskItem from '../../components/TaskItem.jsx'
import { FileThumb } from '../../components/Attach.jsx'
import { setParams, openNote } from '../../nav.js'
import { fmtDur, fmtShort, today, dday } from '../../engine/date.js'
import { noteTitle, newBlock } from '../../lib/notes.js'
import { put } from '../../store/store.js'

// 프로젝트/과목 허브: 관련 할 일·일정·노트·파일·공부시간을 한곳에
export default function Hub({ hubId }) {
  const projects = useColl('projects')
  const subjects = useColl('subjects')
  const tasks = useColl('tasks')
  const sessions = useColl('sessions')
  if (!hubId) {
    return (
      <div className="col">
        <h4>프로젝트</h4>
        <div className="note-grid">
          {projects.map((p) => {
            const ts = tasks.filter((t) => t.projectId === p.id && !t.archived)
            return (
              <button key={p.id} className="card note-card" onClick={() => setParams('notes', { hubId: 'p:' + p.id })}>
                <div className="row"><span className="dot" style={{ background: p.color }} /><b className="grow ellipsis">{p.name}</b><span className="small">{Math.round(projectProgress(p.id, tasks) * 100)}%</span></div>
                <Prog value={projectProgress(p.id, tasks)} color={p.color} />
                <div className="tiny muted">할 일 {ts.filter((t) => t.done).length}/{ts.length}</div>
              </button>
            )
          })}
          {!projects.length && <Empty>설정에서 프로젝트를 추가하세요</Empty>}
        </div>
        <h4>과목</h4>
        <div className="note-grid">
          {subjects.map((s) => {
            const m = sessions.filter((x) => x.subjectId === s.id).reduce((a, x) => a + x.dur, 0)
            const open = tasks.filter((t) => t.subjectId === s.id && !t.done).length
            return (
              <button key={s.id} className="card note-card" onClick={() => setParams('notes', { hubId: 's:' + s.id })}>
                <div className="row"><span className="dot" style={{ background: s.color }} /><b className="grow">{s.name}</b></div>
                <div className="tiny muted">누적 {fmtDur(m)} · 남은 할 일 {open}</div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }
  return <HubPage hubId={hubId} />
}

function HubPage({ hubId }) {
  const [kind, id] = hubId.split(':')
  const isP = kind === 'p'
  const projects = useColl('projects'), subjects = useColl('subjects')
  const tasks = useColl('tasks'), events = useColl('events'), notes = useColl('notes'), files = useColl('files')
  const sessions = useColl('sessions'), textbooks = useColl('textbooks'), lectures = useColl('lectures'), reviews = useColl('reviews'), ddays = useColl('ddays')
  const rec = isP ? projects.find((p) => p.id === id) : subjects.find((s) => s.id === id)
  if (!rec) return <Empty>삭제된 허브입니다</Empty>
  const key = isP ? 'projectId' : 'subjectId'
  const ts = tasks.filter((t) => t[key] === id && !t.archived)
  const open = ts.filter((t) => !t.done).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'))
  const done = ts.filter((t) => t.done)
  const evs = events.filter((e) => e[key] === id && (e.repeat || (e.endDate || e.date) >= today())).slice(0, 8)
  const ns = notes.filter((n) => n[key] === id)
  const taskIds = new Set(ts.map((t) => t.id))
  const fs = files.filter((f) => f[key] === id || (f.taskId && taskIds.has(f.taskId)) || ns.some((n) => n.id === f.noteId))
  const ss = sessions.filter((s) => (isP ? taskIds.has(s.taskId) : s.subjectId === id))
  const mins = ss.reduce((a, s) => a + s.dur, 0)
  const prog = isP ? projectProgress(id, tasks) : ts.length ? ts.reduce((a, t) => a + taskProgress(t), 0) / ts.length : 0
  const name = rec.name
  return (
    <div className="col">
      <div className="row">
        <button className="btn ghost sm" onClick={() => setParams('notes', { hubId: null })}><Icon name="back" size={14} />허브</button>
      </div>
      <div className="row"><span className="dot" style={{ background: rec.color, width: 14, height: 14 }} /><h1>{name}</h1></div>
      <div className="hub-stats">
        <div><b>{Math.round(prog * 100)}%</b><span>진행률</span></div>
        <div><b>{open.length}</b><span>남은 할 일</span></div>
        <div><b>{fmtDur(mins)}</b><span>공부 시간</span></div>
        <div><b>{ns.length}</b><span>노트</span></div>
      </div>
      <Prog value={prog} color={rec.color} h={6} />
      <div className="grid two">
        <Card title={`할 일 ${open.length}`}>
          <div className="list">{open.map((t) => <TaskItem key={t.id} t={t} subjects={subjects} projects={projects} />)}</div>
          <AddInput placeholder="+ 할 일" onAdd={(title) => addTask({ title, [key]: id })} />
          {done.length > 0 && <div className="tiny muted" style={{ marginTop: 6 }}>완료 {done.length}개</div>}
        </Card>
        <div className="col">
          <Card title="노트" action={<button className="btn sm" onClick={() => openNote(put('notes', { title: '', type: 'page', [key]: id, blocks: [newBlock()] }).id)}><Icon name="plus" size={14} /></button>}>
            <div className="list">{ns.map((n) => <button key={n.id} className="item" style={{ textAlign: 'left' }} onClick={() => openNote(n.id)}><span>{n.icon || '📄'}</span><span className="t ellipsis">{noteTitle(n)}</span></button>)}</div>
            {!ns.length && <Empty>관련 노트가 없어요</Empty>}
          </Card>
          {evs.length > 0 && (
            <Card title="일정">
              <div className="list">{evs.map((e) => <button key={e.id} className="item" style={{ textAlign: 'left' }} onClick={() => openDetail('event', e.id)}><span className="badge">{fmtShort(e.date)}</span><span className="t">{e.title}</span></button>)}</div>
            </Card>
          )}
          {!isP && (textbooks.some((t) => t.subjectId === id) || lectures.some((l) => l.subjectId === id) || ddays.length > 0) && (
            <Card title="교재 · 복습">
              {textbooks.filter((t) => t.subjectId === id).map((t) => <div key={t.id} style={{ marginBottom: 8 }}><div className="row between small"><span>{t.title}</span><span>{t.current}/{t.total}{t.unit}</span></div><Prog value={t.current / t.total} color={rec.color} /></div>)}
              {lectures.filter((l) => l.subjectId === id).map((l) => { const n = Object.keys(l.done || {}).filter((k) => +k <= l.total).length; return <div key={l.id} style={{ marginBottom: 8 }}><div className="row between small"><span>▶ {l.title}</span><span>{n}/{l.total}강</span></div><Prog value={n / (l.total || 1)} color={rec.color} /></div> })}
              <div className="small muted">복습 대기 {reviews.filter((r) => r.subjectId === id && !r.done && r.next <= today()).length}개 · 가까운 D-day {ddays[0] ? `${ddays[0].title} ${dday(ddays[0].date)}` : '-'}</div>
            </Card>
          )}
          {fs.length > 0 && (
            <Card title={`파일 ${fs.length}`}><div className="row wrap" style={{ gap: 6 }}>{fs.map((f) => <FileThumb key={f.id} file={f} />)}</div></Card>
          )}
        </div>
      </div>
    </div>
  )
}
