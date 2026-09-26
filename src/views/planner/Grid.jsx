import { useState } from 'react'
import { useColl, useRec, useSettings } from '../../store/store.js'
import { dayRec, setDay } from '../../store/actions.js'
import { tsToMin, fmtDur } from '../../engine/date.js'
import { Card } from '../../components/ui.jsx'
import { lockScroll } from '../../lib/drag.js'

// 10분 스터디 플래너: 실제 기록은 자동으로 칠해지고, 계획은 과목을 골라 직접 칠함
export default function Grid({ date }) {
  const st = useSettings()
  const subjects = useColl('subjects')
  const sessions = useColl('sessions').filter((s) => s.date === date)
  useRec('days', date)
  const day = dayRec(date)
  const plan = day.grid || {}
  const [brush, setBrush] = useState(subjects[0]?.id || null)
  const [painting, setPainting] = useState(false)
  const h0 = Math.floor(st.dayStart / 60), h1 = Math.ceil(st.dayEnd / 60)
  const color = (id) => subjects.find((s) => s.id === id)?.color

  // 실제: 10분 칸 단위로 과목 매핑
  const actual = {}
  for (const s of sessions) {
    const a = tsToMin(s.start)
    for (let m = Math.floor(a / 10) * 10; m < a + s.dur; m += 10) actual[m / 10] = s.subjectId
  }
  const bySub = {}
  for (const s of sessions) bySub[s.subjectId] = (bySub[s.subjectId] || 0) + s.dur
  const planBy = {}
  for (const v of Object.values(plan)) planBy[v] = (planBy[v] || 0) + 10

  const cellFromPoint = (x, y) => document.elementFromPoint(x, y)?.closest('[data-cell]')?.dataset.cell
  const down = (e) => {
    const idx = e.target.closest('[data-cell]')?.dataset.cell
    if (idx == null) return
    e.preventDefault()
    setPainting(true); lockScroll(true)
    const seen = new Set([idx])
    const next = { ...plan }
    const erase = brush === 'erase' || plan[idx] === brush
    const apply = (i) => { if (erase) delete next[i]; else next[i] = brush }
    apply(idx)
    setDay(date, { grid: { ...next } })
    const mv = (ev) => { const i = cellFromPoint(ev.clientX, ev.clientY); if (i != null && !seen.has(i)) { seen.add(i); apply(i); setDay(date, { grid: { ...next } }) } }
    const up = () => { setPainting(false); lockScroll(false); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up)
  }

  return (
    <div className="today-grid">
      <Card>
        <div className="scroll-x" style={{ marginBottom: 8 }}><div className="row" style={{ gap: 6 }}>
          {subjects.map((s) => <button key={s.id} className={'chip' + (brush === s.id ? ' on' : '')} onClick={() => setBrush(s.id)}><span className="dot" style={{ background: s.color }} />{s.name}</button>)}
          <button className={'chip' + (brush === 'erase' ? ' on' : '')} onClick={() => setBrush('erase')}>지우개</button>
        </div></div>
        <div className={'tgrid' + (painting ? ' painting' : '')} onPointerDown={down}>
          {Array.from({ length: h1 - h0 }, (_, i) => {
            const h = h0 + i
            return (
              <div key={h} className="trow">
                <span className="thour">{String(h % 24).padStart(2, '0')}</span>
                {Array.from({ length: 6 }, (_, k) => {
                  const idx = h * 6 + k
                  const a = actual[idx], p = plan[idx]
                  return <div key={k} data-cell={idx} className="tcell"
                    style={{ background: a ? color(a) : p ? `color-mix(in srgb, ${color(p)} 28%, transparent)` : null, borderColor: p && !a ? color(p) : null }} />
                })}
              </div>
            )
          })}
        </div>
        <div className="tiny muted" style={{ marginTop: 8 }}>진한 칸 = 실제 공부(타이머 기록) · 옅은 칸 = 계획 · 과목을 고르고 칸을 누르거나 끌어 칠하기</div>
      </Card>
      <Card title="과목별 합계">
        <div className="list">
          {subjects.filter((s) => bySub[s.id] || planBy[s.id]).map((s) => (
            <div key={s.id} className="item" style={{ alignItems: 'center' }}>
              <span className="dot" style={{ background: s.color }} />
              <span className="t">{s.name}</span>
              <span className="small muted">계획 {fmtDur(planBy[s.id] || 0)}</span>
              <b className="small">실제 {fmtDur(bySub[s.id] || 0)}</b>
            </div>
          ))}
          {!sessions.length && !Object.keys(plan).length && <div className="empty">칸을 칠해 오늘 공부 계획을 세워 보세요</div>}
        </div>
      </Card>
    </div>
  )
}
