// 오늘: 시험 D-day · 오늘 할 일 · 오늘 상세 계획(진도표) · 교재 진도
import { useColl } from '../store/store.js'
import { upcoming, byOrder } from '../store/actions.js'
import { Card, Empty, Icon } from '../components/ui.jsx'
import { TaskRow, QuickAdd, ExamSummary, MaterialRow, PlanDetail, detailTotal } from '../components/parts.jsx'
import { openExam } from '../components/editors.jsx'
import { today, fmtDate, tsYmd, dur } from '../lib/date.js'
import { detailFor } from '../lib/plans.js'
import { go } from '../lib/nav.js'

export default function Home() {
  const exams = useColl('exams'), scores = useColl('scores'), tasks = useColl('tasks'), mats = useColl('materials')
  const t0 = today()
  const ups = upcoming(exams)
  const mine = tasks.filter((t) => t.due && (t.due < t0 ? !t.done : t.due === t0 && (!t.done || tsYmd(t.doneAt || 0) === t0))).sort((a, b) => (a.due < t0) - (b.due < t0) || byOrder(a, b))
  const left = mine.filter((t) => !t.done).length
  const det = detailFor(tasks, t0)
  return (
    <>
      <header className="page-h"><h1>오늘</h1><span className="sub">{fmtDate(t0)}</span></header>
      <div className="grid three dense">
        <Card title="시험" action={<button className="lnk" onClick={() => openExam()}>+ 시험</button>}>
          {ups.slice(0, 3).map((e) => <ExamSummary key={e.id} exam={e} scores={scores} big />)}
          {!ups.length && <Empty>다가오는 시험을 추가해 보세요<br /><button className="btn sm" style={{ marginTop: 8 }} onClick={() => openExam()}><Icon name="plus" size={14} />JLPT · 토익 · 직접</button></Empty>}
        </Card>
        <Card title={`오늘 할 일${mine.length ? ` ${mine.length - left}/${mine.length}` : ''}`} className="span2" action={<button className="lnk" onClick={() => go('plan', 'list')}>계획 →</button>}>
          <div className="rows">{mine.map((t) => <TaskRow key={t.id} t={t} exams={exams} />)}</div>
          {!mine.length && <Empty>오늘 할 일이 없어요</Empty>}
          <QuickAdd />
        </Card>
        {det.length > 0 && (
          <Card title={`오늘 상세 계획 · 총 ${dur(detailTotal(det))}`} className="span2" action={<button className="lnk" onClick={() => go('plan', 'sheet')}>진도 달력 →</button>}>
            <PlanDetail rows={det} />
          </Card>
        )}
        {mats.some((m) => (m.current || 0) < m.total) && (
          <Card title="교재 · 강의" action={<button className="lnk" onClick={() => go('plan', 'books')}>전체 →</button>}>
            <div className="rows">{mats.filter((m) => (m.current || 0) < m.total).slice(0, 4).map((m) => <MaterialRow key={m.id} m={m} exams={exams} />)}</div>
          </Card>
        )}
      </div>
    </>
  )
}
