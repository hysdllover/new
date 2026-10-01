// 위젯에서 누른 할 일: 완료 확인 (잘못 누른 경우 대비)
import { useRec, useColl } from '../store/store.js'
import { toggleTask } from '../store/actions.js'
import { openDetail, toast } from './ui.jsx'
import { DueBadge } from './common.jsx'

export default function DoneConfirm({ id, close }) {
  const t = useRec('tasks', id)
  const subjects = useColl('subjects')
  if (!t) return <div className="small muted">삭제되었거나 아직 동기화되지 않은 할 일이에요.</div>
  const sub = subjects.find((s) => s.id === t.subjectId)
  return (
    <div className="col">
      <div className="row" style={{ gap: 8 }}>
        <b className="grow" style={{ fontWeight: 500, fontSize: '1.05em', textDecoration: t.done ? 'line-through' : null }}>{t.title}</b>
      </div>
      <div className="row" style={{ gap: 6 }}><DueBadge task={t} />{sub && <span className="badge">{sub.name}</span>}</div>
      <div className="row" style={{ gap: 6, marginTop: 4 }}>
        <button className="btn primary grow" onClick={() => { toggleTask(t.id); toast(t.done ? '완료를 취소했어요' : '완료했어요', { label: '되돌리기', fn: () => toggleTask(t.id) }); close() }}>{t.done ? '완료 취소' : '완료'}</button>
        <button className="btn" onClick={() => { close(); openDetail('task', t.id) }}>열기</button>
      </div>
    </div>
  )
}
