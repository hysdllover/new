import { useColl } from '../store/store.js'
import { dday, fmtShort, fmtTime, today, diffDays } from '../engine/date.js'
import { describeRule } from '../engine/recurrence.js'

export const PRI = [['0', '없음'], ['1', '낮음'], ['2', '보통'], ['3', '높음']]
export const PRI_COLOR = ['var(--muted)', 'var(--c2)', 'var(--c3)', 'var(--c4)']

export function SubjectTag({ id, subjects }) {
  const s = subjects?.find((x) => x.id === id)
  if (!s) return null
  return <span className="tag" style={{ background: s.color + '22', color: s.color }}>{s.name}</span>
}

export function SubjectSelect({ value, onChange, allowEmpty = true, className = 'input' }) {
  const subjects = useColl('subjects')
  return (
    <select className={className} value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
      {allowEmpty && <option value="">과목 없음</option>}
      {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  )
}

export function ProjectSelect({ value, onChange }) {
  const projects = useColl('projects')
  return (
    <select className="input" value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">프로젝트 없음</option>
      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  )
}

export function DueBadge({ task }) {
  if (!task.due) return null
  const n = diffDays(task.due, today())
  const cls = !task.done && n < 0 ? 'badge warn' : n <= 1 && !task.done ? 'badge acc' : 'badge'
  const label = n === 0 ? '오늘' : n === 1 ? '내일' : n === -1 ? '어제' : fmtShort(task.due)
  return <span className={cls}>{label}{task.dueTime != null ? ' ' + fmtTime(task.dueTime) : ''}{Math.abs(n) > 1 && !task.done ? ' · ' + dday(task.due) : ''}</span>
}

export const RepeatBadge = ({ rule, start }) => rule ? <span className="badge">↻ {describeRule(rule, start)}</span> : null

export function ColorPick({ value, onChange, colors }) {
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      {colors.map((c) => (
        <button key={c} onClick={() => onChange(c)} aria-label={c}
          style={{ width: 26, height: 26, borderRadius: 13, background: c, outline: value === c ? '2px solid var(--text)' : 'none', outlineOffset: 2 }} />
      ))}
    </div>
  )
}

// 반복 규칙 편집
export function RepeatEditor({ rule, start, onChange }) {
  const r = rule || null
  const set = (p) => onChange({ freq: 'weekly', interval: 1, ...r, ...p })
  const WD = ['일', '월', '화', '수', '목', '금', '토']
  return (
    <div className="col" style={{ gap: 8 }}>
      <select className="input" value={r?.freq || ''} onChange={(e) => e.target.value ? set({ freq: e.target.value }) : onChange(null)}>
        <option value="">반복 안 함</option>
        <option value="daily">매일</option>
        <option value="weekly">매주</option>
        <option value="monthly">매월</option>
        <option value="yearly">매년</option>
      </select>
      {r && (
        <>
          <div className="row">
            <input className="input" type="number" min="1" max="12" value={r.interval || 1} onChange={(e) => set({ interval: +e.target.value || 1 })} style={{ width: 80 }} />
            <span className="muted small">{{ daily: '일', weekly: '주', monthly: '개월', yearly: '년' }[r.freq]}마다</span>
          </div>
          {r.freq === 'weekly' && (
            <div className="row wrap" style={{ gap: 4 }}>
              {WD.map((w, i) => {
                const on = (r.byDay || []).includes(i)
                return <button key={i} className={'chip' + (on ? ' on' : '')} onClick={() => set({ byDay: on ? r.byDay.filter((x) => x !== i) : [...(r.byDay || []), i] })}>{w}</button>
              })}
            </div>
          )}
          {r.freq === 'monthly' && (
            <select className="input" value={r.monthMode || 'date'} onChange={(e) => set({ monthMode: e.target.value })}>
              <option value="date">같은 날짜</option>
              <option value="nth">N번째 요일</option>
              <option value="last">마지막 요일</option>
            </select>
          )}
          <div className="row">
            <span className="small muted nowrap">종료일</span>
            <input className="input" type="date" value={r.until || ''} onChange={(e) => set({ until: e.target.value || null })} />
          </div>
          <div className="small muted">{describeRule(r, start || today())}</div>
          {r.except?.length > 0 && (
            <div className="row wrap small">예외: {r.except.map((d) => <button key={d} className="chip" onClick={() => set({ except: r.except.filter((x) => x !== d) })}>{d.slice(5)} ✕</button>)}</div>
          )}
          <div className="row">
            <span className="small muted nowrap">예외일 추가</span>
            <input className="input" type="date" onChange={(e) => e.target.value && set({ except: [...(r.except || []), e.target.value] })} />
          </div>
        </>
      )}
    </div>
  )
}

export function TimeInput({ value, onChange, placeholder }) {
  return <input className="input" type="time" value={value == null ? '' : fmtTime(value)} placeholder={placeholder}
    onChange={(e) => onChange(e.target.value ? +e.target.value.split(':')[0] * 60 + +e.target.value.split(':')[1] : null)} />
}
