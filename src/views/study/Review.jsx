import { useColl, useSettings, remove } from '../../store/store.js'
import { addReview, completeReview } from '../../store/actions.js'
import { Card, Empty, Icon, AddInput } from '../../components/ui.jsx'
import { SubjectTag } from '../../components/common.jsx'
import { today, fmtShort, diffDays } from '../../engine/date.js'
import { openNote } from '../../nav.js'
import { openDetail } from '../../components/ui.jsx'

export function Stages({ stage, n }) {
  return <span className="stages">{Array.from({ length: n }, (_, i) => <i key={i} className={i < stage ? 'on' : ''} />)}</span>
}

export default function Review() {
  const st = useSettings()
  const reviews = useColl('reviews')
  const subjects = useColl('subjects')
  const d = today()
  const due = reviews.filter((r) => !r.done && r.next && r.next <= d).sort((a, b) => a.next.localeCompare(b.next))
  const upcoming = reviews.filter((r) => !r.done && r.next > d).sort((a, b) => a.next.localeCompare(b.next))
  const done = reviews.filter((r) => r.done)
  const n = st.reviewIntervals.length
  const src = (r) => r.sourceType === 'note' ? () => openNote(r.sourceId) : r.sourceType === 'task' ? () => openDetail('task', r.sourceId) : null
  return (
    <div className="grid two">
      <Card title={`오늘 복습 ${due.length}`} action={<span className="tiny muted">간격 {st.reviewIntervals.join('·')}일</span>}>
        <div className="list">
          {due.map((r) => (
            <div key={r.id} className="item" style={{ alignItems: 'center' }}>
              <div className="t">
                <button className="title" style={{ textAlign: 'left' }} onClick={src(r) || undefined}>{r.title}</button>
                <div className="meta"><SubjectTag id={r.subjectId} subjects={subjects} /><Stages stage={r.stage} n={n} />{r.next < d && <span className="badge warn">{diffDays(d, r.next)}일 밀림</span>}</div>
              </div>
              <button className="btn sm" onClick={() => completeReview(r.id, false)}>헷갈림</button>
              <button className="btn sm primary" onClick={() => completeReview(r.id, true)}>기억남</button>
            </div>
          ))}
          {!due.length && <Empty>오늘 복습할 항목이 없어요</Empty>}
        </div>
        <div style={{ marginTop: 10 }}><AddInput placeholder="오늘 배운 것 복습 등록" onAdd={(title) => addReview({ title })} /></div>
      </Card>
      <Card title={`예정 ${upcoming.length}`}>
        <div className="list">
          {upcoming.map((r) => (
            <div key={r.id} className="item" style={{ alignItems: 'center' }}>
              <span className="badge nowrap">{fmtShort(r.next)}</span>
              <div className="t"><div className="ellipsis">{r.title}</div><div className="meta"><SubjectTag id={r.subjectId} subjects={subjects} /><Stages stage={r.stage} n={n} /></div></div>
              <button className="icon-btn" onClick={() => remove('reviews', r.id)} aria-label="삭제"><Icon name="close" size={14} /></button>
            </div>
          ))}
          {!upcoming.length && <Empty>노트·할 일에서 ‘복습 등록’을 누르면 망각곡선 간격으로 다시 알려줘요</Empty>}
        </div>
        {done.length > 0 && <div className="small muted" style={{ marginTop: 8 }}>완전히 익힌 항목 {done.length}개</div>}
      </Card>
    </div>
  )
}
