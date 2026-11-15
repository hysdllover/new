// 할 일을 길게 눌렀을 때 뜨는 빠른 메뉴 (날짜·중요도·과목·자주 쓰는 동작)
import { openSheet, toast, Icon, confirmSheet } from './ui.jsx'
import { useColl, find, remove } from '../store/store.js'
import { updateTask, moveTasks, QUICK_DATES, addTask, setDay, weekGoals, demoteTask } from '../store/actions.js'
import { useState } from 'react'
import { today } from '../engine/date.js'

export function openTaskMenu(t) {
  try { navigator.vibrate?.(10) } catch {}
  openSheet((close) => <TaskQuickMenu id={t.id} close={close} />, { title: t.title || '할 일' })
}

function TaskQuickMenu({ id, close }) {
  useColl('tasks')
  const subjects = useColl('subjects')
  useColl('days'); const goals = weekGoals()
  const t = find('tasks', id)
  if (!t) return null
  const act = (fn, msg) => () => { fn(); if (msg) toast(msg); close() }
  return (
    <div className="form qmenu">
      <div className="qm-row"><span className="tiny muted">날짜</span>
        <div className="row wrap" style={{ gap: 6 }}>{QUICK_DATES.map(([k, l]) => <button key={k} className="chip" onClick={act(() => moveTasks([id], k))}>{l}</button>)}</div></div>
      <div className="qm-row"><span className="tiny muted">중요도</span>
        <div className="row wrap" style={{ gap: 6 }}>{[[0, '없음'], [2, '!'], [3, '!!']].map(([v, l]) => <button key={v} className={'chip' + ((t.priority || 0) === v || (v === 2 && t.priority === 1) ? ' on' : '')} onClick={act(() => updateTask(id, { priority: v }))}>{l}</button>)}</div></div>
      {subjects.length > 0 && <div className="qm-row"><span className="tiny muted">과목</span>
        <div className="row wrap" style={{ gap: 6 }}>{subjects.map((s) => <button key={s.id} className={'chip' + (t.subjectId === s.id ? ' on' : '')} onClick={act(() => updateTask(id, { subjectId: t.subjectId === s.id ? null : s.id }))}><span className="dot" style={{ background: s.color }} />{s.name}</button>)}</div></div>}
      {goals.length > 0 && <div className="qm-row"><span className="tiny muted">이번 주 목표</span>
        <div className="row wrap" style={{ gap: 6 }}>{goals.map((g) => <button key={g.id} className={'chip' + (t.goalId === g.id ? ' on' : '')} onClick={act(() => updateTask(id, { goalId: t.goalId === g.id ? null : g.id }))}>🎯 {g.title}</button>)}</div></div>}
      <div className="list qm-acts">
        <button className="item" onClick={act(() => updateTask(id, { hl: !t.hl }))}><Icon name="pen" size={16} />{t.hl ? '형광펜 지우기' : '형광펜으로 강조 (과목 색)'}</button>
        <button className="item" onClick={act(() => setDay(today(), { one: { taskId: id } }), '오늘의 하나로 정했어요')}><Icon name="star" size={16} />오늘의 하나로</button>
        {!t.inbox && <button className="item" onClick={act(() => updateTask(id, { inbox: true, due: null, dueTime: null }), '받은 편지함으로 옮겼어요')}><Icon name="download" size={16} />받은 편지함으로</button>}
        <button className="item" onClick={act(() => { const { id: _, createdAt, updatedAt, done, doneAt, ...rest } = t; addTask({ ...rest, title: t.title + ' (복제)' }) }, '복제했어요')}><Icon name="plus" size={16} />복제</button>
        <button className="item" onClick={() => { close(); setTimeout(() => openSheet((c) => <PickParent id={id} close={c} />, { title: '어느 할 일의 하위로 넣을까요?' }), 250) }}><Icon name="layers" size={16} />다른 할 일의 하위로 넣기</button>
        <button className="item" onClick={act(() => updateTask(id, { archived: true }), '보관했어요')}><Icon name="archive" size={16} />보관</button>
        <button className="item" style={{ color: 'var(--danger)' }} onClick={() => { close(); confirmSheet('삭제', `‘${t.title}’을 삭제할까요?`, () => remove('tasks', id), '삭제') }}><Icon name="trash" size={16} />삭제</button>
      </div>
    </div>
  )
}

// 할 일 → 다른 할 일의 하위: 남은 할 일 중에서 고르기 (찾기)
function PickParent({ id, close }) {
  const tasks = useColl('tasks')
  const [q, setQ] = useState('')
  const me = find('tasks', id)
  const L = tasks.filter((t) => t.id !== id && !t.done && !t.archived && !t.deleted && (!q || (t.title || '').includes(q)))
    .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')).slice(0, 40)
  return (
    <div className="form">
      <input className="input" placeholder="찾기" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="list">
        {L.map((t) => <button key={t.id} className="item" onClick={() => { demoteTask(id, t.id); close() }}><span className="grow" style={{ textAlign: 'left' }}>{t.title}</span>{(t.subtasks || []).length > 0 && <span className="tiny muted">하위 {t.subtasks.length}</span>}</button>)}
        {!L.length && <div className="tiny muted">고를 할 일이 없어요</div>}
      </div>
      {(me?.subtasks || []).length > 0 && <div className="tiny muted">이 할 일의 하위 {me.subtasks.length}개도 함께 옮겨져요.</div>}
    </div>
  )
}
