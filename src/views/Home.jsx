import { useState } from 'react'
import { useColl, useSettings, setSettings, uid } from '../store/store.js'
import { WIDGETS } from '../widgets/widgets.jsx'
import { Icon, openSheet } from '../components/ui.jsx'
import { longPress } from '../lib/drag.js'
import { applyFilter } from './tasks/filter.js'
import { eventsOn } from '../engine/scheduler.js'
import { today, fmtDur } from '../engine/date.js'
import { holiday } from '../engine/holidays.js'

const SIZES = ['s', 'm', 'l']

export default function Home() {
  const st = useSettings()
  const [editing, setEditing] = useState(false)
  const widgets = (st.widgets || []).filter((w) => WIDGETS[w.type])
  const setW = (ws) => setSettings({ widgets: ws })
  const move = (id, toId) => {
    const a = [...widgets]
    const i = a.findIndex((w) => w.id === id), j = a.findIndex((w) => w.id === toId)
    if (i < 0 || j < 0 || i === j) return
    const [w] = a.splice(i, 1); a.splice(j, 0, w); setW(a)
  }
  const addSheet = () => openSheet((close) => (
    <div className="list">
      {Object.entries(WIDGETS).map(([type, def]) => (
        <button key={type} className="item" style={{ textAlign: 'left', alignItems: 'center' }} onClick={() => { setW([...widgets, { id: uid(), type, size: def.size }]); close() }}>
          <span className="t">{def.label}</span>{widgets.some((w) => w.type === type) && <span className="tiny muted">사용 중</span>}<Icon name="plus" size={16} />
        </button>
      ))}
    </div>
  ), { title: '위젯 추가' })

  return (
    <div className="col">
      <Greeting />
      <div className="widgets">
        {widgets.map((w) => {
          const W = WIDGETS[w.type].C
          return (
            <div key={w.id} className={'w-' + w.size + (editing ? ' w-edit draggable' : '')} data-drop={editing ? 'w:' + w.id : undefined}
              {...(editing ? longPress(() => ({ label: WIDGETS[w.type].label, onDrop: (z) => move(w.id, z.dataset.drop.slice(2)) }), 200) : {})}>
              {editing && (
                <div className="w-tools" data-nodrag>
                  <button className="icon-btn" onClick={() => move(w.id, widgets[Math.max(0, widgets.indexOf(w) - 1)].id)} aria-label="앞으로"><Icon name="back" size={14} /></button>
                  <button className="icon-btn" onClick={() => setW(widgets.map((x) => x.id === w.id ? { ...x, size: SIZES[(SIZES.indexOf(x.size) + 1) % 3] } : x))} aria-label="크기"><span className="tiny">{w.size.toUpperCase()}</span></button>
                  <button className="icon-btn" onClick={() => setW(widgets.filter((x) => x.id !== w.id))} aria-label="삭제"><Icon name="close" size={14} /></button>
                </div>
              )}
              <div style={editing ? { pointerEvents: 'none' } : null}><W /></div>
            </div>
          )
        })}
      </div>
      <div className="row no-print" style={{ justifyContent: 'center', gap: 8 }}>
        {editing && <button className="btn" onClick={addSheet}><Icon name="plus" size={14} />위젯 추가</button>}
        <button className="btn ghost sm" onClick={() => setEditing(!editing)}>{editing ? '편집 완료' : '위젯 편집'}</button>
      </div>
    </div>
  )
}

function Greeting() {
  const tasks = useColl('tasks'), events = useColl('events'), sessions = useColl('sessions')
  const d = today()
  const h = new Date().getHours()
  const hi = h < 5 ? '늦은 밤이에요' : h < 12 ? '좋은 아침이에요' : h < 18 ? '좋은 오후예요' : '오늘도 수고했어요'
  const left = applyFilter(tasks, { smart: 'today' }).length
  const evs = eventsOn(d, events).length
  const m = sessions.filter((s) => s.date === d).reduce((a, s) => a + s.dur, 0)
  const hol = holiday(d)
  return (
    <div className="greet">
      <div className="greet-hi">{hi}{hol ? ` · ${hol}` : ''}</div>
      <div className="small muted">남은 할 일 {left} · 일정 {evs} · 공부 {fmtDur(m)}</div>
    </div>
  )
}
