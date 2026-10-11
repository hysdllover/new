// 켜 두고 잊은 타이머: 실제로 끝낸 시각만 골라 그때까지 기록
import { useState } from 'react'
import { getTimer, stopAt } from '../lib/timer.js'
import { find } from '../store/store.js'
import { fmtDur } from '../engine/date.js'
import { Field, toast } from './ui.jsx'

const hm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
export default function TimerFix({ close }) {
  const t = getTimer()
  const start = new Date(t?.segStart || Date.now())
  const [v, setV] = useState(() => hm(new Date(Math.min(Date.now(), (t?.segStart || 0) + 90 * 60000))))
  if (!t) return <div className="small muted">타이머가 이미 멈췄어요.</div>
  // 고른 시각 → 시작 이후 가장 가까운 그 시각 (자정 넘김 포함)
  const at = (() => { const [h, m] = v.split(':').map(Number); const d = new Date(start); d.setHours(h, m, 0, 0); if (d < start) d.setDate(d.getDate() + 1); return d.getTime() })()
  const sub = t.subjectId ? find('subjects', t.subjectId) : null
  const mins = Math.max(0, Math.round((Math.min(at, Date.now()) - t.segStart) / 60000) + Math.round((t.acc || 0) / 60000))
  return (
    <div className="form">
      <div className="small">{sub?.name || '공부'} 타이머가 {hm(start)}부터 {fmtDur(Math.round((Date.now() - t.segStart) / 60000))}째 켜져 있어요. 실제로 끝낸 시각을 고르면 그때까지만 기록해요.</div>
      <Field label="끝낸 시각"><input className="input" type="time" value={v} onChange={(e) => e.target.value && setV(e.target.value)} /></Field>
      <div className="tiny muted">기록될 공부 {fmtDur(mins)}</div>
      <div className="row" style={{ gap: 6 }}>
        <button className="btn" onClick={close}>계속 공부 중</button>
        <button className="btn primary grow" onClick={() => { stopAt(at); close(); toast(`${hm(new Date(at))}에 끝낸 걸로 기록했어요`) }}>이 시각에 끝내기</button>
      </div>
    </div>
  )
}
