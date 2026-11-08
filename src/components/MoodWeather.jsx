// 오늘 기분 · 날씨: 가는 선 아이콘으로 고르기 (기분은 컨디션 기록과 같은 값 1~5)
import { useColl, useRec, put } from '../store/store.js'
import { dayRec, setDay } from '../store/actions.js'

const face = (mouth) => `<circle cx="12" cy="12" r="8.5"/><circle cx="9" cy="10" r=".6" fill="currentColor"/><circle cx="15" cy="10" r=".6" fill="currentColor"/><path d="${mouth}"/>`
export const MOOD_SVG = [face('M8.5 16q3.5-3 7 0'), face('M8.5 15.5q3.5-1.6 7 0'), face('M8.5 15h7'), face('M8.5 14q3.5 2 7 0'), face('M8 13.5q4 4 8 0')]
const cloud = 'M7 17h9.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.2A3 3 0 0 0 7 17z'
export const WEATHER = [
  ['sun', '맑음', '<circle cx="12" cy="12" r="3.8"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6"/>'],
  ['cloud', '흐림', `<path d="${cloud}"/>`],
  ['rain', '비', `<path d="M7 14h9.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.2A3 3 0 0 0 7 14z"/><path d="M9 17l-1 2.5M13 17l-1 2.5M17 17l-1 2.5"/>`],
  ['snow', '눈', `<path d="M7 14h9.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.2A3 3 0 0 0 7 14z"/><circle cx="9" cy="18" r=".7" fill="currentColor"/><circle cx="12.5" cy="19.5" r=".7" fill="currentColor"/><circle cx="16" cy="18" r=".7" fill="currentColor"/>`],
  ['wind', '바람', '<path d="M3.5 9H14a2.5 2.5 0 1 0-2.5-2.5M3.5 13h15a2.5 2.5 0 1 1-2.5 2.5M3.5 17H10"/>'],
]
export const svgIcon = (inner, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
const Ic = ({ inner }) => <span className="mw-ic" dangerouslySetInnerHTML={{ __html: svgIcon(inner) }} />

export default function MoodWeather({ date, compact }) {
  const conds = useColl('conditions'); useRec('days', date)
  const c = conds.find((x) => x.id === date) || { id: date }, day = dayRec(date)
  return (
    <div className={'mw row' + (compact ? ' mw-c' : '')} style={{ gap: 2 }}>
      {MOOD_SVG.map((m, i) => <button key={i} className={'mw-b' + (c.mood === i + 1 ? ' on' : '')} aria-label={`기분 ${i + 1}`} onClick={() => put('conditions', { ...c, id: date, mood: c.mood === i + 1 ? null : i + 1 })}><Ic inner={m} /></button>)}
      <span className="mw-sep" />
      {WEATHER.map(([k, l, inner]) => <button key={k} className={'mw-b' + (day.weather === k ? ' on' : '')} aria-label={l} title={l} onClick={() => setDay(date, { weather: day.weather === k ? null : k })}><Ic inner={inner} /></button>)}
    </div>
  )
}
