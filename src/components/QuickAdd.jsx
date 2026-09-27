import { useState } from 'react'
import { put, list } from '../store/store.js'
import { addTask } from '../store/actions.js'
import { Seg, openDetail, toast } from './ui.jsx'
import { SubjectSelect } from './common.jsx'
import { parseMention, today, fmtDate, fmtTime } from '../engine/date.js'
import { startStopwatch, startPomodoro } from '../lib/timer.js'
import { go } from '../nav.js'

// '#과목' 과 '@날짜 시각' 을 인식
export function parseQuick(text) {
  let rest = text
  let subjectId = null
  const m = rest.match(/#(\S+)/)
  if (m) {
    const s = list('subjects').find((x) => x.name === m[1])
    if (s) { subjectId = s.id; rest = rest.replace(m[0], '').trim() }
  }
  const mm = parseMention(rest)
  return { title: mm ? mm.rest : rest.trim(), date: mm?.date || null, time: mm?.time ?? null, subjectId }
}

export default function QuickAdd({ close }) {
  const [type, setType] = useState('task')
  const [text, setText] = useState('')
  const [subject, setSubject] = useState(null)
  const p = parseQuick(text)

  const submit = (e) => {
    e?.preventDefault()
    if (type === 'timer') { startStopwatch(subject); go('study', 'timer'); close(); return }
    if (!p.title) return
    if (type === 'task') {
      const t = addTask({ title: p.title, due: p.date || null, dueTime: p.time, subjectId: p.subjectId || subject })
      toast('할 일 추가', { label: '열기', fn: () => openDetail('task', t.id) })
    } else if (type === 'event') {
      const date = p.date || today()
      const e2 = put('events', { title: p.title, date, start: p.time ?? 9 * 60, end: (p.time ?? 9 * 60) + 60 })
      toast(`${fmtDate(date)} 일정 추가`, { label: '열기', fn: () => openDetail('event', e2.id) })
    } else if (type === 'memo') {
      put('notes', { title: p.title.slice(0, 30), type: 'memo', pinned: false, blocks: [{ id: 'b0', type: 'text', text: text }] })
      toast('메모 저장')
    }
    setText('')
    close()
  }

  return (
    <form className="form" onSubmit={submit}>
      <Seg value={type} onChange={setType} options={[['task', '할 일'], ['event', '일정'], ['memo', '메모'], ['timer', '타이머']]} />
      {type !== 'timer' ? (
        <>
          {type === 'memo'
            ? <textarea className="input" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="빠른 메모" style={{ minHeight: 120 }} />
            : <input className="input" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={type === 'task' ? '예: 수학 문제집 @내일 #수학' : '예: 스터디 모임 @9/30 15:00'} />}
          {type !== 'memo' && (p.date || p.subjectId) && (
            <div className="row small muted wrap">
              {p.date && <span className="badge acc">{fmtDate(p.date)}{p.time != null ? ' ' + fmtTime(p.time) : ''}</span>}
              {p.subjectId && <span className="badge acc">{list('subjects').find((s) => s.id === p.subjectId)?.name}</span>}
            </div>
          )}
          {type === 'task' && !p.subjectId && <SubjectSelect value={subject} onChange={setSubject} />}
          <div className="tiny muted">@오늘 · @내일 · @모레 · @9/30 · @2026-10-02 15:00 · #과목</div>
        </>
      ) : (
        <>
          <SubjectSelect value={subject} onChange={setSubject} allowEmpty={false} />
          <div className="row">
            <button type="button" className="btn grow" onClick={() => { startPomodoro(subject || list('subjects')[0]?.id); go('study', 'timer'); close() }}>뽀모도로</button>
            <button type="submit" className="btn primary grow">스톱워치 시작</button>
          </div>
        </>
      )}
      {type !== 'timer' && <button className="btn primary" type="submit">추가</button>}
    </form>
  )
}
