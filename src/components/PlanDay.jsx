// 오늘 계획 세우기: 밀린 일 → 받은 편지함 → 오늘 할 일 확인 → 오늘의 하나 (Sunsama식 아침 루틴)
import { useState } from 'react'
import { useColl, useSettings, patch } from '../store/store.js'
import { moveTasks, dayRec, setDay, updateTask } from '../store/actions.js'
import { today, fmtDur, fmtShort } from '../engine/date.js'
import { openSheet, toast } from './ui.jsx'
import { WeekGoals } from './WeekGoals.jsx'

export const openPlanDay = () => openSheet((close) => <PlanDay close={close} />, { title: '오늘 계획 세우기', full: true })

const STEPS = ['밀린 일', '받은 편지함', '오늘 할 일', '오늘의 하나']

function PlanDay({ close }) {
  const [step, setStep] = useState(0)
  const tasks = useColl('tasks'), st = useSettings()
  useColl('days')
  const d = today()
  const open = tasks.filter((t) => !t.done && !t.archived)
  const overdue = open.filter((t) => t.due && t.due < d)
  const inbox = open.filter((t) => t.inbox)
  const todays = open.filter((t) => t.due === d)
  const est = todays.reduce((a, t) => a + (t.estimate || 0), 0)
  const one = dayRec(d).one
  const finish = () => { setDay(d, { planned: true }); toast('오늘 계획 완료 · 좋은 하루 보내세요'); close() }
  const Row = ({ t, children }) => (
    <div className="item" style={{ alignItems: 'center', gap: 8 }}>
      <span className="grow ellipsis small">{t.title}{t.due && t.due < d && <span className="tiny muted"> · {fmtShort(t.due)}</span>}</span>
      <div className="row" style={{ gap: 4, flexShrink: 0 }}>{children}</div>
    </div>
  )
  const B = (label, fn) => <button className="chip sm" onClick={fn}>{label}</button>
  return (
    <div className="col plan-day">
      <div className="row" style={{ gap: 4 }}>{STEPS.map((s, i) => <button key={s} className={'plan-step' + (i === step ? ' on' : i < step ? ' done' : '')} onClick={() => setStep(i)}>{i + 1}. {s}</button>)}</div>
      {step === 0 && <>
        <div className="small muted">어제까지 끝내지 못한 일이에요. 오늘 할지, 미룰지 정해요.</div>
        <div className="list">{overdue.map((t) => <Row key={t.id} t={t}>{B('오늘', () => moveTasks([t.id], 'today'))}{B('내일', () => moveTasks([t.id], 'tomorrow'))}{B('날짜 없음', () => moveTasks([t.id], 'none'))}{B('보관', () => updateTask(t.id, { archived: true }))}</Row>)}</div>
        {overdue.length > 1 && <button className="btn sm" onClick={() => moveTasks(overdue.map((t) => t.id), 'today')}>모두 오늘로</button>}
        {!overdue.length && <div className="empty">밀린 일이 없어요 👍</div>}
      </>}
      {step === 1 && <>
        <div className="small muted">받은 편지함을 정리해요. 오늘 할 것만 오늘로.</div>
        <div className="list">{inbox.map((t) => <Row key={t.id} t={t}>{B('오늘', () => moveTasks([t.id], 'today'))}{B('주말', () => moveTasks([t.id], 'weekend'))}{B('정리됨', () => patch('tasks', t.id, { inbox: false }))}</Row>)}</div>
        {!inbox.length && <div className="empty">받은 편지함이 비었어요</div>}
      </>}
      {step === 2 && <>
        <div className="plan-goals"><span className="tiny muted">이번 주 목표</span><WeekGoals compact /></div>
        <div className="small muted">오늘 할 일 {todays.length}개{est ? ` · 예상 ${fmtDur(est)}` : ''} · 공부 목표 {fmtDur(st.goalDaily)}</div>
        {est > st.goalDaily * 1.2 && <div className="small" style={{ color: 'var(--danger)' }}>예상 시간이 목표보다 많아요. 몇 개는 내일로 옮겨 보세요.</div>}
        <div className="list">{todays.map((t) => <Row key={t.id} t={t}>{t.estimate ? <span className="tiny muted">{t.estimate}분</span> : null}{B('내일로', () => moveTasks([t.id], 'tomorrow'))}</Row>)}</div>
        {!todays.length && <div className="empty">오늘 할 일이 없어요</div>}
      </>}
      {step === 3 && <>
        <div className="small muted">오늘 꼭 끝낼 한 가지를 골라요.</div>
        <div className="list">{todays.map((t) => (
          <button key={t.id} className="item" style={{ textAlign: 'left', alignItems: 'center', gap: 8 }} onClick={() => setDay(d, { one: { taskId: t.id } })}>
            <span className={'radio' + (one?.taskId === t.id ? ' on' : '')} /><span className="grow ellipsis">{t.title}</span>
          </button>
        ))}</div>
        {!todays.length && <div className="empty">오늘 할 일이 없어요 · 홈에서 직접 적을 수도 있어요</div>}
      </>}
      <div className="row" style={{ marginTop: 'auto' }}>
        {step > 0 && <button className="btn" onClick={() => setStep(step - 1)}>이전</button>}
        <span className="grow" />
        {step < 3 ? <button className="btn primary" onClick={() => setStep(step + 1)}>다음 →</button> : <button className="btn primary" onClick={finish}>계획 완료</button>}
      </div>
    </div>
  )
}
