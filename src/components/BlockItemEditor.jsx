import { useRec, patch, remove, restore, useColl } from '../store/store.js'
import { Icon, Field, closeDetail, toast, openDetail } from './ui.jsx'
import { TimeInput, SubjectSelect } from './common.jsx'
import { applyCascadeChange } from '../views/planner/timeline.js'

// 타임블록(타임박스) 편집
export default function BlockItemEditor({ id }) {
  const b = useRec('blocks', id)
  const tasks = useColl('tasks')
  if (!b) return <div className="pane-b empty">삭제된 블록입니다.</div>
  const task = tasks.find((t) => t.id === b.taskId)
  const up = (p) => patch('blocks', id, p)
  return (
    <>
      <div className="pane-h">
        <h2 className="ellipsis">{task?.title || b.title || '타임블록'}</h2>
        <button className="icon-btn" onClick={() => { remove('blocks', id); closeDetail(); toast('블록 삭제됨', { label: '되돌리기', fn: () => restore('blocks', id) }) }} aria-label="삭제"><Icon name="trash" /></button>
        <button className="icon-btn" onClick={closeDetail} aria-label="닫기"><Icon name="close" /></button>
      </div>
      <div className="pane-b form">
        {!task && <Field label="제목"><input className="input" value={b.title || ''} onChange={(e) => up({ title: e.target.value })} /></Field>}
        {task && <button className="btn" onClick={() => openDetail('task', task.id)}>할 일 열기</button>}
        <Field label="날짜"><input className="input" type="date" value={b.date} onChange={(e) => up({ date: e.target.value })} /></Field>
        <div className="row">
          <Field label="시작"><TimeInput allowEmpty={false} value={b.start} onChange={(v) => v != null && applyCascadeChange({ ...b, start: v })} /></Field>
          <Field label="길이(분)"><input className="input" type="number" min="10" step="10" value={b.dur} onChange={(e) => applyCascadeChange({ ...b, dur: Math.max(10, +e.target.value) })} /></Field>
        </div>
        <Field label="종류">
          <select className="input" value={b.kind || 'custom'} onChange={(e) => up({ kind: e.target.value })}>
            <option value="task">할 일</option><option value="study">공부</option><option value="break">휴식</option><option value="custom">기타</option>
          </select>
        </Field>
        <Field label="과목"><SubjectSelect value={b.subjectId} onChange={(v) => up({ subjectId: v })} /></Field>
        {b.carriedFrom && <div className="small muted">{b.carriedFrom}에서 이월됨</div>}
      </div>
    </>
  )
}
