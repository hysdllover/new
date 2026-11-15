// 하위 할 일 칩을 길게 눌렀을 때: 이름 · 날짜 · 중요 표시 · 할 일로 꺼내기 · 지우기 (편집 화면을 열지 않고)
import { useState } from 'react'
import { openSheet, Icon } from './ui.jsx'
import { useColl, find } from '../store/store.js'
import { patchSub, deleteSub, promoteSub, QUICK_DATES, quickDate } from '../store/actions.js'
import { today, fmtShort } from '../engine/date.js'

export function openSubMenu(taskId, subId) {
  try { navigator.vibrate?.(10) } catch {}
  const t = find('tasks', taskId), s = t && (t.subtasks || []).find((x) => x.id === subId)
  if (!s) return
  openSheet((close) => <SubMenu taskId={taskId} subId={subId} close={close} />, { title: s.title || '하위 할 일' })
}

function SubMenu({ taskId, subId, close }) {
  useColl('tasks')
  const t = find('tasks', taskId), s = t && (t.subtasks || []).find((x) => x.id === subId)
  const [name, setName] = useState(s?.title || '')
  if (!s) return null
  const save = () => { const v = name.trim(); if (v && v !== s.title) patchSub(taskId, subId, { title: v }) }
  const act = (fn) => () => { save(); fn(); close() }
  return (
    <div className="form qmenu">
      <div className="tiny muted">↳ {t.title}</div>
      <form onSubmit={(e) => { e.preventDefault(); save(); close() }}><input className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={save} aria-label="이름" /></form>
      <div className="qm-row"><span className="tiny muted">날짜{s.due ? ' · ' + (s.due === today() ? '오늘' : fmtShort(s.due)) : ''}</span>
        <div className="row wrap" style={{ gap: 6 }}>
          {QUICK_DATES.map(([k, l]) => <button key={k} className="chip" onClick={act(() => patchSub(taskId, subId, { due: quickDate(k) }))}>{l}</button>)}
          <label className="chip sub-due"><Icon name="calendar" size={13} />날짜 고르기<input type="date" value={s.due || ''} onChange={(e) => { patchSub(taskId, subId, { due: e.target.value || null }); close() }} /></label>
        </div></div>
      <div className="list qm-acts">
        <button className="item" onClick={act(() => patchSub(taskId, subId, { star: !s.star || undefined }))}><Icon name="star" size={16} />{s.star ? '중요 표시 빼기' : '중요 표시 (맨 앞에 · 진하게)'}</button>
        <button className="item" onClick={act(() => promoteSub(taskId, subId))}><Icon name="upload" size={16} />따로 할 일로 꺼내기</button>
        <button className="item" style={{ color: 'var(--danger)' }} onClick={act(() => deleteSub(taskId, subId))}><Icon name="trash" size={16} />지우기 (30일 동안 되살릴 수 있어요)</button>
      </div>
    </div>
  )
}
