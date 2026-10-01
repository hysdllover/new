import { useState } from 'react'
import { put, list } from '../store/store.js'
import { Seg, openDetail, toast } from './ui.jsx'
import { SubjectSelect } from './common.jsx'
import { today, fmtDate, fmtTime } from '../engine/date.js'
import { parseQuick } from '../lib/quick.js'
import TaskQuickInput from './TaskQuickInput.jsx'
import RecordEditor from './RecordEditor.jsx'
import { startStopwatch, startCountdown } from '../lib/timer.js'
import { go } from '../nav.js'
import { eventTemplates, addFromTemplate, removeEventTemplate } from '../lib/eventTemplates.js'
import { useSettings } from '../store/store.js'

export { parseQuick }

export default function QuickAdd({ close, initial = 'task' }) {
  const [type, setType] = useState(initial)
  const [text, setText] = useState('')
  const [subject, setSubject] = useState(null)
  const [added, setAdded] = useState([])
  const p = parseQuick(text)
  useSettings()
  const tpls = eventTemplates()
  const useTpl = (tpl) => { const date = p.date || today(); const e2 = addFromTemplate(tpl, { date, start: p.time, title: p.title && p.title !== tpl.name ? p.title : null }); toast(`${fmtDate(date)} ${tpl.name} 추가`, { label: '열기', fn: () => openDetail('event', e2.id) }); close() }

  const submit = (e) => {
    e?.preventDefault()
    if (type === 'timer') { startStopwatch(subject || list('subjects')[0]?.id); go('study', 'timer'); close(); return }
    if (!p.title) return
    if (type === 'event') {
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
    <div className="form">
      <Seg value={type} onChange={setType} options={[['task', '할 일'], ['record', '공부 기록'], ['event', '일정'], ['memo', '메모'], ['timer', '타이머']]} />
      {type === 'task' && (
        <>
          <TaskQuickInput autoFocus onAdded={(t) => setAdded((a) => [t, ...a].slice(0, 6))} />
          {added.length > 0 && (
            <div className="list small">
              {added.map((t) => <button key={t.id} className="row" style={{ minHeight: 32, textAlign: 'left' }} onClick={() => { close(); openDetail('task', t.id) }}><span style={{ color: 'var(--ok)' }}>✓</span><span className="grow ellipsis">{t.title}</span><span className="tiny muted">수정 ›</span></button>)}
            </div>
          )}
          <div className="tiny muted">계속 입력할 수 있어요 · @내일 15:00 처럼 쓰면 시간도 지정 · 다 쓰면 바깥을 눌러 닫기</div>
        </>
      )}
      {type === 'record' && <RecordEditor compact onDone={close} />}
      {(type === 'event' || type === 'memo') && (
        <form className="form" onSubmit={submit}>
          {type === 'memo'
            ? <textarea className="input" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="빠른 메모" style={{ minHeight: 120 }} />
            : <input className="input" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="예: 스터디 모임 @9/30 15:00" />}
          {type === 'event' && p.date && <div className="row small"><span className="badge acc">{fmtDate(p.date)}{p.time != null ? ' ' + fmtTime(p.time) : ''}</span></div>}
          {type === 'event' && (tpls.length ? (
            <div className="col" style={{ gap: 4 }}>
              <span className="tiny muted">템플릿 · 날짜·시간을 적고 누르면 그대로 넣어요 (예: @내일 18:00)</span>
              <div className="row wrap" style={{ gap: 6 }}>{tpls.map((t) => <button key={t.id} type="button" className="chip" onClick={() => useTpl(t)}
                onContextMenu={(e) => { e.preventDefault(); if (confirm(`'${t.name}' 템플릿을 지울까요?`)) removeEventTemplate(t.id) }}><span className="dot" style={{ background: t.color || 'var(--accent)' }} />{t.name} <span className="tiny muted">{t.dur}분</span></button>)}</div>
            </div>
          ) : <span className="tiny muted">일정 화면의 ‘템플릿으로 저장’으로 자주 쓰는 일정을 저장할 수 있어요</span>)}
          <button className="btn primary" type="submit">추가</button>
        </form>
      )}
      {type === 'timer' && (
        <form className="form" onSubmit={submit}>
          <SubjectSelect value={subject} onChange={setSubject} allowEmpty={false} />
          <div className="row">
            <button type="button" className="btn grow" onClick={() => { let m = 50; try { m = +localStorage.getItem('tmMin') || 50 } catch {} startCountdown(subject || list('subjects')[0]?.id, m); go('study', 'timer'); close() }}>타이머</button>
            <button type="submit" className="btn primary grow">스톱워치 시작</button>
          </div>
        </form>
      )}
    </div>
  )
}
