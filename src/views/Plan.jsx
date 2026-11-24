// 계획: 할 일 (날짜별 묶음) · 주간 (7칸) · 교재 · 강의 진도
import { useState } from 'react'
import { useColl, useSettings, list } from '../store/store.js'
import { byOrder, upcoming, weekDays, toggleTask } from '../store/actions.js'
import { Card, Seg, Empty, Icon, Check, Line, Toggle } from '../components/ui.jsx'
import { TaskRow, QuickAdd, MaterialRow } from '../components/parts.jsx'
import { openTask, openMaterial } from '../components/editors.jsx'
import { openSheet, toast } from '../components/toast.js'
import { today, addDays, fmtDate, rel, WD, parseYmd, fmtShort, dday, diffDays } from '../lib/date.js'
import { examName } from '../lib/exams.js'
import { setSeg } from '../lib/nav.js'
import { PLANS, planCount, planDays, importPlan, planTitle } from '../lib/plans.js'

export default function Plan({ seg = 'list' }) {
  return (
    <>
      <header className="page-h"><h1>계획</h1><span className="grow" /><Seg small value={seg} onChange={(v) => setSeg('plan', v)} options={[['list', '할 일'], ['sheet', '진도표'], ['week', '주간'], ['books', '교재 · 강의']]} /></header>
      {seg === 'week' ? <Week /> : seg === 'books' ? <Books /> : seg === 'sheet' ? <Sheet /> : <List />}
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
      <div className="row end" style={{ marginTop: 12 }}><button className="btn sm" onClick={openPlanImport}>진도표 불러오기</button><button className="btn sm" onClick={() => setShowDone(!showDone)}>{showDone ? '끝낸 지난 할 일 숨기기' : '끝낸 지난 할 일 보기'}</button></div>
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

// 영역 표시 색 (옅은 칸)
const AREA_C = { LC: 'lc', RC: 'rc', 보카: 'vo', 토스: 'ts', 기타: 'et', 모의: 'lc', 오답: 'et', 복습: 'et' }

// 진도표 불러오기 시트
export const openPlanImport = () => openSheet((close) => <PlanImport close={close} />, { title: '진도표 불러오기' })
function PlanImport({ close }) {
  const [books, setBooks] = useState(true)
  return (
    <div className="form">
      {PLANS.map((p) => (
        <div key={p.id} className="col" style={{ gap: 8 }}>
          <b>{p.title}</b>
          <div className="small muted">{p.note}</div>
          <div className="meta"><span>{planDays(p)}일 · 할 일 {planCount(p)}개</span><span>{fmtShort(Object.keys(p.days)[0])} – {fmtShort(Object.keys(p.days).slice(-1)[0])}</span><span>시험 {Object.values(p.exams).map((e) => e.name && e.kind === 'custom' ? e.name : '토익').join(' · ')}</span></div>
          <Toggle label={`교재 진도도 함께 (${p.materials.map((m) => m.title).join(' · ')})`} checked={books} onChange={setBooks} />
          <div className="row end"><button className="btn primary" onClick={() => { const r = importPlan(p, { books }); close(); setSeg('plan', 'sheet'); toast(r.added ? `할 일 ${r.added}개를 넣었어요${r.removed ? ` · 예전 진도표 ${r.removed}개는 뺐어요` : ''}` : r.fixed ? `할 일 ${r.fixed}개를 고쳤어요` : '이미 넣은 진도표예요') }}>{list('tasks').some((t) => !t.done && (p.replaces || []).includes(t.plan)) ? '예전 진도표를 이걸로 바꾸기' : list('tasks').some((t) => t.plan === p.id) ? '바뀐 내용 반영하기' : '넣기'}</button></div>
        </div>
      ))}
    </div>
  )
}

// 진도표: 시험까지 날짜별 할 일을 주 단위로 (영역 · 체크) — 모의고사 날 · 시험 날은 옅게 칠함
function Sheet() {
  const st = useSettings(), exams = useColl('exams'), all = useColl('tasks')
  // 보는 단위: 불러온 진도표(여러 시험을 한 달력에) · 그 밖에는 시험마다
  const plans = [...new Set(all.filter((t) => t.plan && t.due).map((t) => t.plan))].filter((id) => PLANS.some((p) => p.id === id))
  const olds = PLANS.flatMap((p) => p.replaces || []), inPlan = (t) => plans.includes(t.plan) || olds.includes(t.plan) // 바꾼 예전 진도표의 끝낸 기록은 따로 보이지 않게
  const loose = upcoming(exams).filter((e) => e.date && all.some((t) => t.examId === e.id && t.due && !inPlan(t)))
  const opts = [...plans.map((id) => ({ key: 'p:' + id, title: planTitle(id), tasks: all.filter((t) => t.plan === id && t.due) })), ...loose.map((e) => ({ key: 'e:' + e.id, title: examName(e) + ' 진도표', tasks: all.filter((t) => t.examId === e.id && t.due && !inPlan(t)) }))]
  const [pick, setPick] = useState(null)
  const cur = opts.find((o) => o.key === pick) || opts[0]
  if (!cur) return <Card><Empty>시험에 날짜를 정한 할 일이 아직 없어요<br /><button className="btn sm" style={{ marginTop: 8 }} onClick={openPlanImport}>진도표 불러오기</button></Empty></Card>
  const L = [...cur.tasks].sort((a, b) => a.due.localeCompare(b.due) || byOrder(a, b))
  const exs = [...new Set(L.map((t) => t.examId))].map((id) => exams.find((e) => e.id === id)).filter((e) => e?.date).sort((a, b) => a.date.localeCompare(b.date))
  const done = L.filter((t) => t.done).length, t0 = today()
  const days = [...new Set(L.map((t) => t.due))]
  const ws0 = weekDays(days[0], st.weekStart)[0], weeks = []
  for (const d of days) { const k = Math.floor(diffDays(d, ws0) / 7); (weeks[k] = weeks[k] || []).push(d) }
  const lastK = weeks.length - 1
  const toToday = () => document.getElementById('sh-' + (days.find((d) => d >= t0) || days[days.length - 1]))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return (
    <>
      {opts.length > 1 && <div className="chips" style={{ marginBottom: 12 }}>{opts.map((o) => <button key={o.key} className={'chip' + (o.key === cur.key ? ' on' : '')} onClick={() => setPick(o.key)}>{o.title}</button>)}</div>}
      <Card className="sheet-card">
        <h2 className="sheet-title">{cur.title}</h2>
        <div className="row wrap" style={{ alignItems: 'flex-end', gap: 22, marginTop: 10 }}>
          {exs.map((e) => <div key={e.id}><div className="small soft">{examName(e)} {fmtShort(e.date)}</div><div className="big num" style={{ color: e.color || 'var(--accent)' }}>{dday(e.date)}</div></div>)}
        </div>
        <div style={{ margin: '12px 0 6px' }}><Line value={L.length ? done / L.length : 0} /></div>
        <div className="row"><span className="small soft grow">완료 {done} / {L.length}</span><button className="btn sm" onClick={toToday}>오늘로 이동</button><button className="btn sm" onClick={openPlanImport}>불러오기</button></div>
        {weeks.map((W, k) => W && (
          <div key={k}>
            <div className="sh-week">{k === lastK && k > 0 ? '마지막 주' : `${k + 1}주`} · {fmtShort(addDays(ws0, k * 7))}–{fmtShort(addDays(ws0, k * 7 + 6))}</div>
            {W.map((d) => {
              const T = L.filter((t) => t.due === d), wd = parseYmd(d).getDay(), mock = T.some((t) => t.mock || t.area === '모의'), exam = T.some((t) => t.examDay) || exs.some((e) => e.date === d)
              return (
                <div key={d} id={'sh-' + d} className={'sh-day' + (mock ? ' tint' : '') + (exam ? ' exam' : '') + (d === t0 ? ' today' : '') + (d < t0 ? ' past' : '')}>
                  <div className="sh-date"><b className="num">{+d.slice(5, 7)}/{+d.slice(8)}</b><span className={wd === 0 ? 'bad-t' : wd === 6 ? 'acc-t' : ''}>{WD[wd]}{mock ? ' · 모의고사' : ''}{d === t0 ? ' · 오늘' : ''}</span></div>
                  <div className="sh-rows">{T.map((t) => (
                    <div key={t.id} className={'sh-row' + (t.done ? ' done' : '') + (t.imp || t.examDay ? ' imp' : '')}>
                      <Check on={t.done} onClick={() => toggleTask(t.id)} />
                      <span className={'sh-area a-' + (AREA_C[t.area] || 'x')}>{t.area || (t.examDay ? '시험' : '할일')}</span>
                      <button className="sh-t" onClick={() => openTask(t.id)}>{t.title}</button>
                    </div>
                  ))}</div>
                </div>
              )
            })}
          </div>
        ))}
      </Card>
    </>
  )
}
