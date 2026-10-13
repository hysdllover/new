// 하루 마감: 오늘 돌아보기 → 남은 일 정리 → 내일 Top 3 (아침 '오늘 계획 세우기'의 짝)
import { useState } from 'react'
import { goalFor } from '../engine/goal.js'
import { useColl, useSettings } from '../store/store.js'
import { moveTasks, dayRec, setDay } from '../store/actions.js'
import { today, addDays, fmtDur, fmtShort } from '../engine/date.js'
import { openSheet, toast } from './ui.jsx'
import { sortTasks } from '../views/tasks/filter.js'

export const openCloseDay = () => openSheet((close) => <CloseDay close={close} />, { title: '오늘 마감하기', full: true })

const STEPS = ['오늘 돌아보기', '남은 일', '내일 Top 3']

function CloseDay({ close }) {
  const [step, setStep] = useState(0)
  const tasks = useColl('tasks'), sessions = useColl('sessions'), subjects = useColl('subjects'), st = useSettings()
  useColl('days')
  const d = today(), tmr = addDays(d, 1)
  const live = tasks.filter((t) => !t.archived)
  const ymd = (ts) => { const x = new Date(ts); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
  const doneToday = live.filter((t) => t.done && t.doneAt && ymd(t.doneAt) === d)
  const left = sortTasks(live.filter((t) => !t.done && t.due && t.due <= d), 'due')
  const ss = sessions.filter((s) => s.date === d), mins = ss.reduce((a, s) => a + (s.dur || 0), 0), goal = goalFor(st, d)
  const bySub = subjects.map((s) => ({ s, m: ss.filter((x) => x.subjectId === s.id).reduce((a, x) => a + (x.dur || 0), 0) })).filter((x) => x.m).sort((a, b) => b.m - a.m)
  const rec = dayRec(d), top = (dayRec(tmr).top3 || []).filter((id) => live.some((t) => t.id === id && !t.done))
  // 내일 후보: 내일 마감 → 오늘까지 남은 일 → 날짜 없는 일
  const cand = [...sortTasks(live.filter((t) => !t.done && t.due === tmr), 'due'), ...left, ...live.filter((t) => !t.done && !t.due && !t.inbox).slice(0, 12)]
  const pick = (id) => setDay(tmr, { top3: top.includes(id) ? top.filter((x) => x !== id) : [...top, id].slice(0, 3) })
  const finish = () => { setDay(d, { closed: true }); toast('오늘 마감 · 푹 쉬어요'); close() }
  const B = (label, fn) => <button className="chip sm" onClick={fn}>{label}</button>
  return (
    <div className="col plan-day">
      <div className="row" style={{ gap: 4 }}>{STEPS.map((s, i) => <button key={s} className={'plan-step' + (i === step ? ' on' : i < step ? ' done' : '')} onClick={() => setStep(i)}>{i + 1}. {s}</button>)}</div>
      {step === 0 && <>
        <div className="cd-sum">
          <div className="row between"><span className="small">공부 {fmtDur(mins)}</span><span className="tiny muted">목표 {fmtDur(goal)} · {Math.round(Math.min(1, mins / goal) * 100)}%</span></div>
          <div className="cd-line"><i style={{ width: Math.min(100, (mins / goal) * 100) + '%' }} /></div>
          {bySub.map((x) => <div key={x.s.id} className="row between tiny"><span><span className="dot" style={{ background: x.s.color }} /> {x.s.name}</span><span className="muted">{fmtDur(x.m)}</span></div>)}
        </div>
        <div className="small muted">끝낸 일 {doneToday.length}개</div>
        {!!doneToday.length && <div className="list">{doneToday.slice(0, 8).map((t) => <div key={t.id} className="item small"><span className="grow ellipsis" style={{ textDecoration: 'line-through', color: 'var(--muted)' }}>{t.title}</span></div>)}</div>}
        <div className="field"><label>오늘 한 줄</label>
          <textarea className="input" rows={3} defaultValue={rec.comment || ''} placeholder="오늘 어땠나요? 잘한 점 · 아쉬운 점 한 줄" onBlur={(e) => setDay(d, { comment: e.target.value.trim() })} />
        </div>
      </>}
      {step === 1 && <>
        <div className="small muted">오늘까지 못 끝낸 일이에요. 언제 할지 정해요.</div>
        <div className="list">{left.map((t) => (
          <div key={t.id} className="item" style={{ alignItems: 'center', gap: 8 }}>
            <span className="grow ellipsis small">{t.title}{t.due < d && <span className="tiny muted"> · {fmtShort(t.due)}</span>}</span>
            <div className="row" style={{ gap: 4, flexShrink: 0 }}>{B('내일', () => moveTasks([t.id], 'tomorrow'))}{B('주말', () => moveTasks([t.id], 'weekend'))}{B('날짜 없음', () => moveTasks([t.id], 'none'))}</div>
          </div>
        ))}</div>
        {left.length > 1 && <button className="btn sm" onClick={() => moveTasks(left.map((t) => t.id), 'tomorrow')}>모두 내일로</button>}
        {!left.length && <div className="empty">남은 일이 없어요</div>}
      </>}
      {step === 2 && <>
        <div className="small muted">내일 꼭 할 세 가지를 골라요. 홈 · 위젯에 그대로 떠요.</div>
        <div className="list">{[...new Map(cand.map((t) => [t.id, t])).values()].map((t) => {
          const k = top.indexOf(t.id)
          return (
            <button key={t.id} className="item" style={{ textAlign: 'left', alignItems: 'center', gap: 8 }} onClick={() => pick(t.id)}>
              <span className={'cd-n' + (k >= 0 ? ' on' : '')}>{k >= 0 ? k + 1 : ''}</span><span className="grow ellipsis">{t.title}</span>
              {t.due && <span className="tiny muted">{t.due === tmr ? '내일' : fmtShort(t.due)}</span>}
            </button>
          )
        })}</div>
        {!cand.length && <div className="empty">고를 할 일이 없어요 · 할 일을 먼저 적어 주세요</div>}
      </>}
      <div className="row" style={{ marginTop: 'auto' }}>
        {step > 0 && <button className="btn" onClick={() => setStep(step - 1)}>이전</button>}
        <span className="grow" />
        {step < 2 ? <button className="btn primary" onClick={() => setStep(step + 1)}>다음 →</button> : <button className="btn primary" onClick={finish}>마감</button>}
      </div>
    </div>
  )
}
