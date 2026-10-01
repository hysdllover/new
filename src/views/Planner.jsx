import { setParams } from '../nav.js'
import { today, addDays, fmtDate } from '../engine/date.js'
import { holiday } from '../engine/holidays.js'
import { Icon } from '../components/ui.jsx'
import Today from './planner/Today.jsx'
import Week from './planner/Week.jsx'
import Month from './planner/Month.jsx'
import Circle from './planner/Circle.jsx'
import Grid from './planner/Grid.jsx'
import Timetable from './planner/Timetable.jsx'
import Days3 from './planner/Days3.jsx'

export default function Planner({ seg, params }) {
  const date = params.date || today()
  const setDate = (d) => setParams('planner', { date: d })
  const step = seg === 'week' ? 7 : seg === 'month' ? 30 : 1
  const V = { today: Today, week: Week, month: Month, circle: Circle, grid: Grid, timetable: Timetable, days3: Days3 }[seg] || Today
  const hol = holiday(date)
  return (
    <div className="col">
      {seg !== 'month' && seg !== 'timetable' && (
        <div className="row between no-print">
          <div className="row">
            <button className="icon-btn" onClick={() => setDate(addDays(date, -step))} aria-label="이전"><Icon name="back" /></button>
            <label className="date-label">
              <b>{fmtDate(date)}</b>{hol && <span className="hol"> {hol}</span>}
              <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </label>
            <button className="icon-btn" onClick={() => setDate(addDays(date, step))} aria-label="다음"><Icon name="next" /></button>
          </div>
          {date !== today() && <button className="btn sm" onClick={() => setDate(today())}>오늘</button>}
        </div>
      )}
      <V date={date} setDate={setDate} params={params} />
    </div>
  )
}
