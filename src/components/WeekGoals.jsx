// 이번 주 목표 3개: 할 일을 연결해 진행률 표시 (직접 체크도 가능)
import { useState } from 'react'
import { useColl, uid, patch } from '../store/store.js'
import { weekId, weekGoals, setWeekGoals, goalProgress } from '../store/actions.js'
import { fmtShort } from '../engine/date.js'
import { Check, Icon, openSheet, AddInput } from './ui.jsx'

export function WeekGoals({ compact }) {
  useColl('days'); const tasks = useColl('tasks')
  const id = weekId(), goals = weekGoals(id)
  const set = (g) => setWeekGoals(g, id)
  const upd = (gid, p) => set(goals.map((g) => (g.id === gid ? { ...g, ...p } : g)))
  return (
    <div className="col" style={{ gap: 8 }}>
      {goals.map((g) => {
        const p = goalProgress(g, tasks)
        return (
          <div key={g.id} className={'wgoal' + (p.ratio >= 1 ? ' done' : '')}>
            <div className="row" style={{ gap: 8 }}>
              <Check on={!!g.done} round onClick={() => upd(g.id, { done: !g.done })} />
              {compact ? <span className="grow ellipsis small wgoal-t">{g.title}</span>
                : <input className="input-plain grow wgoal-t" defaultValue={g.title} onBlur={(e) => e.target.value.trim() && e.target.value !== g.title && upd(g.id, { title: e.target.value.trim() })} />}
              <span className="tiny muted nowrap">{p.linked ? `${p.done}/${p.linked}` : ''}</span>
              {!compact && <button className="icon-btn" aria-label="할 일 연결" onClick={() => openSheet((c) => <LinkTasks goal={g} close={c} />, { title: `‘${g.title}’에 할 일 연결` })}><Icon name="link" size={14} /></button>}
              {!compact && <button className="icon-btn" aria-label="삭제" onClick={() => set(goals.filter((x) => x.id !== g.id))}><Icon name="close" size={12} /></button>}
            </div>
            <div className="bar-t" style={{ height: 5, marginTop: 5 }}><i style={{ width: p.ratio * 100 + '%' }} /></div>
          </div>
        )
      })}
      {!compact && goals.length < 3 && <AddInput placeholder={goals.length ? '목표 추가 (최대 3개)' : '이번 주 꼭 이룰 목표 (최대 3개)'} onAdd={(title) => set([...goals, { id: uid(), title, done: false }])} />}
      {compact && !goals.length && <div className="small muted">할 일 › 이번 주 목표에서 정해요</div>}
    </div>
  )
}

function LinkTasks({ goal }) {
  const tasks = useColl('tasks').filter((t) => !t.archived && (!t.done || t.goalId === goal.id))
  return (
    <div className="list">
      {tasks.map((t) => (
        <button key={t.id} className="item" style={{ textAlign: 'left', alignItems: 'center', gap: 8 }} onClick={() => patch('tasks', t.id, { goalId: t.goalId === goal.id ? null : goal.id })}>
          <span className={'radio' + (t.goalId === goal.id ? ' on' : '')} />
          <span className="grow ellipsis">{t.title}</span>
          {t.due && <span className="tiny muted">{fmtShort(t.due)}</span>}
        </button>
      ))}
      {!tasks.length && <div className="small muted">연결할 할 일이 없어요</div>}
    </div>
  )
}

// 할 일 목록 위 접히는 카드
export function WeekGoalsCard() {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem('wgOpen') !== '0' } catch { return true } })
  useColl('days')
  const n = weekGoals().length
  const toggle = () => { setOpen(!open); try { localStorage.setItem('wgOpen', open ? '0' : '1') } catch {} }
  return (
    <div className="card" style={{ padding: '10px 14px' }}>
      <button className="row between" style={{ width: '100%' }} onClick={toggle}>
        <b className="small">이번 주 목표 {n ? <span className="muted tiny">{n}/3</span> : null}</b>
        <span className="tiny muted">{open ? '접기' : '펼치기'}</span>
      </button>
      {open && <div style={{ marginTop: 8 }}><WeekGoals /></div>}
    </div>
  )
}
