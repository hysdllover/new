// 계획: 할 일 (날짜별 묶음) · 주간 (7칸) · 교재 · 강의 진도
import { useState } from 'react'
import { useColl, useSettings } from '../store/store.js'
import { byOrder, upcoming, weekDays } from '../store/actions.js'
import { Card, Seg, Empty, Icon } from '../components/ui.jsx'
import { TaskRow, QuickAdd, MaterialRow } from '../components/parts.jsx'
import { openTask, openMaterial } from '../components/editors.jsx'
import { today, addDays, fmtDate, rel, WD, parseYmd, fmtShort } from '../lib/date.js'
import { examName } from '../lib/exams.js'
import { setSeg } from '../lib/nav.js'

export default function Plan({ seg = 'list' }) {
  return (
    <>
      <header className="page-h"><h1>계획</h1><span className="grow" /><Seg small value={seg} onChange={(v) => setSeg('plan', v)} options={[['list', '할 일'], ['week', '주간'], ['books', '교재 · 강의']]} /></header>
      {seg === 'week' ? <Week /> : seg === 'books' ? <Books /> : <List />}
    </>
  )
}

function ExamFilter({ value, onChange }) {
  const exams = upcoming(useColl('exams'))
  if (!exams.length) return null
  return <div className="chips" style={{ marginBottom: 12 }}><button className={'chip' + (!value ? ' on' : '')} onClick={() => onChange(null)}>전체</button>{exams.map((e) => <button key={e.id} className={'chip' + (value === e.id ? ' on' : '')} onClick={() => onChange(value === e.id ? null : e.id)}><i className="sw" style={{ background: e.color }} />{examName(e)}</button>)}</div>
}

function List() {
  const exams = useColl('exams'), all = useColl('tasks')
  const [ex, setEx] = useState(null), [showDone, setShowDone] = useState(false)
  const t0 = today(), t1 = addDays(t0, 1), t7 = addDays(t0, 7)
  const tasks = all.filter((t) => (!ex || t.examId === ex) && (showDone || !t.done || (t.due && t.due >= t0) || (t.doneAt && Date.now() - t.doneAt < 864e5))).sort(byOrder)
  const groups = [
    ['지난 할 일', tasks.filter((t) => t.due && t.due < t0 && !t.done), true],
    ['오늘', tasks.filter((t) => t.due === t0), false, t0],
    ['내일', tasks.filter((t) => t.due === t1), false, t1],
    ['이번 주', tasks.filter((t) => t.due > t1 && t.due <= t7), true],
    ['나중', tasks.filter((t) => t.due > t7), true],
    ['날짜 없음', tasks.filter((t) => !t.due), false, null],
    ...(showDone ? [['끝낸 지난 할 일', tasks.filter((t) => t.due && t.due < t0 && t.done), true]] : []),
  ]
  return (
    <>
      <ExamFilter value={ex} onChange={setEx} />
      <div className="grid two">
        {groups.map(([name, L, dated, due]) => (L.length > 0 || due !== undefined) && (
          <Card key={name} title={`${name}${L.length ? ' ' + L.filter((t) => !t.done).length : ''}`} action={due !== undefined && <button className="lnk" onClick={() => openTask(null, { due, examId: ex })}>+ 자세히</button>}>
            <div className="rows">{(dated ? [...L].sort((a, b) => (a.due || '').localeCompare(b.due || '') || byOrder(a, b)) : L).map((t) => <TaskRow key={t.id} t={t} exams={exams} showDate={dated} />)}</div>
            {!L.length && <Empty>비어 있어요</Empty>}
            {due !== undefined && <QuickAdd due={due} examId={ex} placeholder={`${name} 할 일 적고 엔터`} />}
          </Card>
        ))}
      </div>
      <div className="row end" style={{ marginTop: 12 }}><button className="btn sm" onClick={() => setShowDone(!showDone)}>{showDone ? '끝낸 지난 할 일 숨기기' : '끝낸 지난 할 일 보기'}</button></div>
    </>
  )
}

function Week() {
  const st = useSettings(), exams = useColl('exams'), tasks = useColl('tasks')
  const [base, setBase] = useState(today())
  const days = weekDays(base, st.weekStart), t0 = today()
  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="icon-btn" onClick={() => setBase(addDays(base, -7))} aria-label="지난주"><Icon name="back" /></button>
        <b className="num">{fmtShort(days[0])} – {fmtShort(days[6])}</b>
        <button className="icon-btn" onClick={() => setBase(addDays(base, 7))} aria-label="다음 주"><Icon name="next" /></button>
        <span className="grow" />
        {!days.includes(t0) && <button className="btn sm" onClick={() => setBase(t0)}>이번 주</button>}
      </div>
      <div className="week">
        {days.map((d) => {
          const L = tasks.filter((t) => t.due === d).sort(byOrder), wd = parseYmd(d).getDay()
          return (
            <Card key={d} className={'wk-col' + (d === t0 ? ' today' : '')} title={<span><span className={wd === 0 ? 'bad-t' : ''}>{WD[wd]}</span> {+d.slice(8)}{d === t0 ? ' · 오늘' : ''}</span>} action={<button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => openTask(null, { due: d })} aria-label={fmtDate(d) + ' 할 일 추가'}><Icon name="plus" size={15} /></button>}>
              <div className="rows">{L.map((t) => <TaskRow key={t.id} t={t} exams={exams} />)}</div>
              {!L.length && <div className="empty" style={{ padding: '6px 0' }}>—</div>}
            </Card>
          )
        })}
      </div>
    </>
  )
}

function Books() {
  const exams = useColl('exams'), mats = useColl('materials')
  const [ex, setEx] = useState(null)
  const L = mats.filter((m) => !ex || m.examId === ex), going = L.filter((m) => (m.current || 0) < m.total), done = L.filter((m) => (m.current || 0) >= m.total)
  return (
    <>
      <ExamFilter value={ex} onChange={setEx} />
      <div className="grid two">
        <Card title={`진행 중 ${going.length}`} action={<button className="lnk" onClick={() => openMaterial()}>+ 추가</button>}>
          <div className="rows">{going.map((m) => <MaterialRow key={m.id} m={m} exams={exams} />)}</div>
          {!going.length && <Empty>교재나 강의를 추가하면 진도를 선으로 볼 수 있어요</Empty>}
        </Card>
        {done.length > 0 && <Card title={`다 끝낸 것 ${done.length}`}><div className="rows">{done.map((m) => <MaterialRow key={m.id} m={m} exams={exams} />)}</div></Card>}
      </div>
    </>
  )
}
export { rel }
