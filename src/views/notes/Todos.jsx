// 노트 할 일 모아 보기: 여러 노트에 흩어진 체크 줄을 노트별로 모아 바로 체크
import { useState } from 'react'
import { useColl, patch } from '../../store/store.js'
import { toggleTask } from '../../store/actions.js'
import { commitBlock, noteTitle } from '../../lib/notes.js'
import { openNote } from '../../nav.js'
import { Check, Empty } from '../../components/ui.jsx'
import { SubjectTag } from '../../components/common.jsx'

export default function Todos() {
  const notes = useColl('notes'), tasks = useColl('tasks'), subjects = useColl('subjects')
  const [all, setAll] = useState(false), [q, setQ] = useState('')
  const taskOf = (b) => (b.taskId ? tasks.find((t) => t.id === b.taskId) : null)
  const groups = notes
    .map((n) => ({ n, items: (n.blocks || []).filter((b) => b.type === 'todo' && (b.text || '').trim()).map((b) => ({ b, t: taskOf(b) })) }))
    .map((g) => ({ ...g, items: g.items.filter((x) => (all || !x.t?.done) && (!q || x.b.text.includes(q) || (g.n.title || '').includes(q))) }))
    .filter((g) => g.items.length)
    .sort((a, b) => (b.n.updatedAt || 0) - (a.n.updatedAt || 0))
  // 체크: 이미 할 일과 연결된 줄은 그 할 일을, 아니면 할 일을 만들어 연결한 뒤 완료
  const check = (n, b, t) => {
    if (t) return toggleTask(t.id)
    const nb = commitBlock(b, n)
    patch('notes', n.id, { blocks: (n.blocks || []).map((x) => (x.id === b.id ? nb : x)) })
    if (nb.taskId) toggleTask(nb.taskId)
  }
  const left = groups.reduce((a, g) => a + g.items.filter((x) => !x.t?.done).length, 0)
  return (
    <div className="col">
      <div className="row wrap" style={{ gap: 6 }}>
        <input className="input grow" style={{ minWidth: 140 }} placeholder="할 일 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className={'chip' + (all ? ' on' : '')} onClick={() => setAll(!all)}>{all ? '모두 보기' : '남은 것만'}</button>
      </div>
      <div className="tiny muted">노트 {groups.length}개 · 남은 할 일 {left}개</div>
      {groups.map(({ n, items }) => (
        <div key={n.id} className="card" style={{ padding: '10px 14px' }}>
          <div className="card-h" style={{ marginBottom: 4 }}>
            <button className="row" style={{ gap: 6, minWidth: 0, textAlign: 'left' }} onClick={() => openNote(n.id)}><b className="ellipsis small" style={{ fontWeight: 'var(--fw-b)' }}>{noteTitle(n)}</b><SubjectTag id={n.subjectId} subjects={subjects} /></button>
            <span className="tiny muted">{items.filter((x) => x.t?.done).length}/{items.length}</span>
          </div>
          <div className="list">
            {items.map(({ b, t }) => (
              <div key={b.id} className={'item task-item' + (t?.done ? ' done' : '')} style={{ alignItems: 'center' }}>
                <Check on={!!t?.done} onClick={() => check(n, b, t)} color={subjects.find((s) => s.id === n.subjectId)?.color} />
                <div className="t"><div className="title"><span className="ttl">{b.text.trim()}</span></div>{t?.due && <div className="meta"><span className="tiny muted">{t.due.slice(5).replace('-', '/')}</span></div>}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {!groups.length && <Empty>{all ? '노트에 체크 줄이 없어요' : '남은 할 일이 없어요'}</Empty>}
    </div>
  )
}
