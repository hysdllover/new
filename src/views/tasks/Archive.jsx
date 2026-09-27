import { useRaw, useColl, patch, restore, batch } from '../../store/store.js'
import { Card, Empty, Icon, toast, confirmSheet } from '../../components/ui.jsx'
import TaskItem from '../../components/TaskItem.jsx'
import { fmtShort } from '../../engine/date.js'

const KIND = { tasks: '할 일', notes: '노트', events: '일정', files: '파일', blocks: '타임블록' }

export default function Archive() {
  const tasks = useColl('tasks')
  const subjects = useColl('subjects')
  const raws = { tasks: useRaw('tasks'), notes: useRaw('notes'), events: useRaw('events'), files: useRaw('files'), blocks: useRaw('blocks') }
  const archived = tasks.filter((t) => t.archived)
  const oldDone = tasks.filter((t) => t.done && !t.archived && t.doneAt < Date.now() - 86400000)
  const trash = Object.entries(raws).flatMap(([c, o]) => Object.values(o).filter((r) => r.deleted && !r.purged).map((r) => ({ c, r })))
    .sort((a, b) => (b.r.deletedAt || 0) - (a.r.deletedAt || 0))
  const purgeOne = (c, r) => patch(c, r.id, { purged: true, title: '', blocks: [], note: '' })

  return (
    <div className="grid two">
      <Card title={`보관함 ${archived.length}`} action={oldDone.length > 0 && <button className="btn sm" onClick={() => { batch(() => oldDone.forEach((t) => patch('tasks', t.id, { archived: true }))); toast(`${oldDone.length}개 보관`) }}>완료 {oldDone.length}개 보관</button>}>
        <div className="list">
          {archived.map((t) => <TaskItem key={t.id} t={t} subjects={subjects} extra={<button className="chip" onClick={(e) => { e.stopPropagation(); patch('tasks', t.id, { archived: false }) }}>꺼내기</button>} />)}
          {!archived.length && <Empty>보관된 항목이 없어요</Empty>}
        </div>
      </Card>
      <Card title={`휴지통 ${trash.length}`} action={trash.length > 0 && <button className="btn sm danger" onClick={() => confirmSheet('휴지통 비우기', '휴지통 항목을 모두 영구 삭제할까요?', () => batch(() => trash.forEach(({ c, r }) => purgeOne(c, r))), '비우기')}>비우기</button>}>
        <div className="tiny muted" style={{ marginBottom: 6 }}>삭제 후 7일 동안 복원할 수 있어요</div>
        <div className="list">
          {trash.map(({ c, r }) => (
            <div key={c + r.id} className="item">
              <span className="badge">{KIND[c]}</span>
              <div className="t ellipsis">{r.title || r.name || '(제목 없음)'}</div>
              <span className="tiny muted nowrap">{r.deletedAt ? fmtShort(new Date(r.deletedAt).toISOString().slice(0, 10)) : ''}</span>
              <button className="icon-btn" onClick={() => { restore(c, r.id); toast('복원됨') }} aria-label="복원"><Icon name="repeat" size={16} /></button>
              <button className="icon-btn" onClick={() => purgeOne(c, r)} aria-label="영구 삭제"><Icon name="trash" size={16} /></button>
            </div>
          ))}
          {!trash.length && <Empty>휴지통이 비어 있어요</Empty>}
        </div>
      </Card>
    </div>
  )
}
