// 3일 보기: 오늘·내일·모레를 시간축으로 나란히 (아이패드는 한 화면, 아이폰은 옆으로 밀어 보기)
import { addDays, fmtDate, today, parseYmd, WD } from '../../engine/date.js'
import { holiday } from '../../engine/holidays.js'
import Timeline from './Timeline.jsx'

export default function Days3({ date }) {
  const days = [0, 1, 2].map((i) => addDays(date, i))
  return (
    <div className="days3 tl-scroll">
      {days.map((d) => {
        const wd = parseYmd(d).getDay(), hol = holiday(d)
        return (
          <div key={d} className={'d3-col' + (d === today() ? ' is-today' : '')}>
            <div className="d3-h"><b className={wd === 0 || hol ? 'sun' : wd === 6 ? 'sat' : ''}>{WD[wd]} {parseYmd(d).getDate()}</b>{hol && <span className="tiny hol"> {hol}</span>}</div>
            <Timeline date={d} showActual={false} />
          </div>
        )
      })}
    </div>
  )
}
