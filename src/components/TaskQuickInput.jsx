import { useRef, useState } from 'react'
import { useColl, batch, remove } from '../store/store.js'
import { addTask } from '../store/actions.js'
import { Icon, toast } from './ui.jsx'
import { parseQuick } from '../lib/quick.js'
import { today, addDays, weekStart } from '../engine/date.js'

const DATES = [['', '날짜 없음'], ['today', '오늘'], ['tomorrow', '내일'], ['week', '이번 주']]
const dateOf = (k) => k === 'today' ? today() : k === 'tomorrow' ? addDays(today(), 1) : k === 'week' ? addDays(weekStart(today()), 6) : null

// 한 줄 입력 + 칩: 엔터로 연속 추가, 여러 줄 붙여넣기 → 여러 할 일
export default function TaskQuickInput({ defaults = {}, defaultDate = '', autoFocus, onAdded }) {
  const subjects = useColl('subjects')
  const [text, setText] = useState('')
  const [dk, setDk] = useState(defaultDate)
  const [sub, setSub] = useState(defaults.subjectId || null)
  const [star, setStar] = useState(false)
  const ref = useRef(null)

  const make = (line) => {
    const p = parseQuick(line)
    if (!p.title) return null
    const due = p.date || dateOf(dk) || defaults.due || null
    // 날짜·프로젝트 없이 적은 할 일은 받은 편지함으로
    return addTask({ ...defaults, inbox: defaults.inbox ?? (!due && !defaults.projectId), title: p.title, due, dueTime: p.time, subjectId: p.subjectId || sub, priority: star ? 3 : defaults.priority || 0, order: Date.now() * -1 })
  }
  const submit = (e) => {
    e?.preventDefault()
    const t = make(text)
    if (!t) return
    setText('')
    onAdded?.(t)
    ref.current?.focus()
  }
  const onPaste = (e) => {
    const v = e.clipboardData.getData('text')
    const lines = v.split(/\r?\n/).map((x) => x.replace(/^\s*([-*•]|\d+[.)]|\[ ?\])\s*/, '').trim()).filter(Boolean)
    if (lines.length < 2) return
    e.preventDefault()
    const made = batch(() => lines.map(make).filter(Boolean))
    toast(`할 일 ${made.length}개 추가`, { label: '되돌리기', fn: () => batch(() => made.forEach((t) => remove('tasks', t.id))) })
  }

  return (
    <form className="tqi" onSubmit={submit}>
      <div className="row">
        <input ref={ref} className="input" value={text} autoFocus={autoFocus} enterKeyHint="done"
          onChange={(e) => setText(e.target.value)} onPaste={onPaste} placeholder="할 일 입력 후 엔터 · 여러 줄 붙여넣기 가능" />
        <button className="btn primary" type="submit" aria-label="추가"><Icon name="plus" size={16} /></button>
      </div>
      <div className="tqi-chips">
        {DATES.map(([k, l]) => <button key={k} type="button" className={'chip' + (dk === k ? ' on' : '')} onClick={() => setDk(k)}>{l}</button>)}
        <span className="tqi-sep" />
        <button type="button" className={'chip' + (star ? ' on' : '')} onClick={() => setStar(!star)}>★ 중요</button>
        <span className="tqi-sep" />
        {subjects.map((s) => (
          <button key={s.id} type="button" className={'chip' + (sub === s.id ? ' on' : '')} style={sub === s.id ? { borderColor: s.color, color: s.color } : null}
            onClick={() => setSub(sub === s.id ? null : s.id)}><span className="dot" style={{ background: s.color }} />{s.name}</button>
        ))}
      </div>
    </form>
  )
}
