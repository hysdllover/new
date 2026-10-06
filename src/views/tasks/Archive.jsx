import { useState } from 'react'
import { useRaw, useColl, patch, restore, batch, TRASH_DAYS } from '../../store/store.js'
import { Card, Empty, Icon, toast, confirmSheet } from '../../components/ui.jsx'
import TaskItem from '../../components/TaskItem.jsx'
import { fmtShort } from '../../engine/date.js'

const KIND = { tasks: '할 일', notes: '노트', events: '일정', files: '파일', blocks: '타임블록', sessions: '공부 기록', ddays: 'D-day', habits: '습관', lectures: '인강', textbooks: '교재' }

export default function Archive() {
  const tasks = useColl('tasks')
  const subjects = useColl('subjects')
  const raws = { tasks: useRaw('tasks'), notes: useRaw('notes'), events: useRaw('events'), files: useRaw('files'), blocks: useRaw('blocks'), sessions: useRaw('sessions'), ddays: useRaw('ddays'), habits: useRaw('habits'), lectures: useRaw('lectures'), textbooks: useRaw('textbooks') }
  const [kind, setKind] = useState('')
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
        <div className="tiny muted" style={{ marginBottom: 6 }}>삭제 후 {TRASH_DAYS}일 동안 복원할 수 있고, 지나면 저절로 비워져요</div>
        {trash.length > 0 && <div className="row wrap" style={{ gap: 4, marginBottom: 6 }}><button className={'chip' + (!kind ? ' on' : '')} onClick={() => setKind('')}>전체</button>{[...new Set(trash.map((x) => x.c))].map((c) => <button key={c} className={'chip' + (kind === c ? ' on' : '')} onClick={() => setKind(c)}>{KIND[c]} {trash.filter((x) => x.c === c).length}</button>)}</div>}
        <div className="list">
          {trash.filter((x) => !kind || x.c === kind).map(({ c, r }) => (
            <div key={c + r.id} className="item">
              <span className="badge">{KIND[c]}</span>
              <div className="t ellipsis">{r.title || r.name || (c === 'sessions' ? `${r.date || ''} ${r.dur || 0}분` : '(제목 없음)')}</div>
              <span className="tiny muted nowrap">{r.deletedAt ? `${Math.max(0, TRASH_DAYS - Math.floor((Date.now() - r.deletedAt) / 86400000))}일 남음` : ''}</span>
              <button className="icon-btn" onClick={() => { restore(c, r.id); toast(`${KIND[c]} 복원했어요`) }} aria-label="복원"><Icon name="repeat" size={16} /></button>
              <button className="icon-btn" onClick={() => purgeOne(c, r)} aria-label="영구 삭제"><Icon name="trash" size={16} /></button>
            </div>
          ))}
          {!trash.length && <Empty>휴지통이 비어 있어요</Empty>}
        </div>
      </Card>
    </div>
  )
}
