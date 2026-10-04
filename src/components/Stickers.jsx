// 다이어리 꾸미기: 가는 선 스티커·도장·마스킹테이프 (단색, 차분한 색)
import { useRef, useState } from 'react'
import { uid, useRec } from '../store/store.js'
import { dayRec, setDay } from '../store/actions.js'

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' }
export const STICKERS = {
  star: <path {...P} d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />,
  heart: <path {...P} d="M12 19.5s-7-4.3-7-9.3A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.2c0 5-7 9.3-7 9.3z" />,
  flower: <g {...P}><circle cx="12" cy="12" r="2.2" /><path d="M12 9.8c-1.6-3.6 1.6-5.6 0-6.3-1.6.7 1.6 2.7 0 6.3zM12 14.2c1.6 3.6-1.6 5.6 0 6.3 1.6-.7-1.6-2.7 0-6.3zM9.8 12c-3.6 1.6-5.6-1.6-6.3 0 .7 1.6 2.7-1.6 6.3 0zM14.2 12c3.6-1.6 5.6 1.6 6.3 0-.7-1.6-2.7 1.6-6.3 0z" /></g>,
  sun: <g {...P}><circle cx="12" cy="12" r="3.6" /><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" /></g>,
  moon: <path {...P} d="M18.5 14.5A7 7 0 0 1 9.5 5.5a7 7 0 1 0 9 9z" />,
  cloud: <path {...P} d="M7.5 18h9.5a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6-1.3A4.2 4.2 0 0 0 7.5 18z" />,
  leaf: <g {...P}><path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14z" /><path d="M5 19c3-4 6-7 10-10" /></g>,
  pencil: <g {...P}><path d="M4 20l1.2-4.4L15.8 5a1.7 1.7 0 0 1 2.4 0l.8.8a1.7 1.7 0 0 1 0 2.4L8.4 18.8z" /><path d="M14 6.8l3.2 3.2" /></g>,
  book: <g {...P}><path d="M4 5.5c2.8-1 5.4-.8 8 1 2.6-1.8 5.2-2 8-1V18c-2.8-1-5.4-.8-8 1-2.6-1.8-5.2-2-8-1z" /><path d="M12 6.5V19" /></g>,
  coffee: <g {...P}><path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" /><path d="M16 10.5h1.5a2.3 2.3 0 0 1 0 4.6H16M8.5 3.5c-.8 1 .8 1.6 0 2.6M12 3.5c-.8 1 .8 1.6 0 2.6" /></g>,
  check: <g {...P}><circle cx="12" cy="12" r="8.5" /><path d="M8 12.3l2.7 2.7L16.2 9.5" /></g>,
  good: <g {...P}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="7" strokeDasharray="1.4 1.6" /><text x="12" y="13.6" textAnchor="middle" fontSize="4.6" fill="currentColor" stroke="none" style={{ fontFamily: 'var(--font-head, inherit)' }}>GOOD</text></g>,
  done: <g {...P}><rect x="3.5" y="7" width="17" height="10" rx="2" /><text x="12" y="13.7" textAnchor="middle" fontSize="5" fill="currentColor" stroke="none" style={{ fontFamily: 'var(--font-head, inherit)' }}>DONE</text></g>,
}
// 마스킹테이프 (가로로 긴 반투명 띠)
export const TAPES = { tape1: 'stripe', tape2: 'dot', tape3: 'plain', tape4: 'grid' }
export const STICKER_COLORS = ['#55658a', '#7a8660', '#a99bc4', '#c9a0a8', '#9a8a74', '#6e7075']

export function Sticker({ k, color = '#55658a', size = 40 }) {
  if (TAPES[k]) {
    const kind = TAPES[k], bg = kind === 'stripe' ? `repeating-linear-gradient(45deg, ${color}33 0 5px, ${color}1a 5px 10px)` : kind === 'dot' ? `radial-gradient(${color}55 1.2px, transparent 1.6px) 0 0 / 8px 8px, ${color}22` : kind === 'grid' ? `linear-gradient(${color}33 1px, transparent 1px) 0 0 / 7px 7px, linear-gradient(90deg, ${color}33 1px, transparent 1px) 0 0 / 7px 7px, ${color}1c` : `${color}33`
    return <span className="tape" style={{ width: size * 2.2, height: size * 0.5, background: bg }} />
  }
  return <svg viewBox="0 0 24 24" width={size} height={size} style={{ color, display: 'block' }}>{STICKERS[k]}</svg>
}

// 스티커 고르기 줄
export function StickerTray({ onPick }) {
  const [color, setColor] = useState(STICKER_COLORS[0])
  return (
    <div className="col sticker-tray no-print" style={{ gap: 6 }}>
      <div className="row wrap" style={{ gap: 4 }}>
        {[...Object.keys(STICKERS), ...Object.keys(TAPES)].map((k) => <button key={k} className="stk-btn" onClick={() => onPick(k, color)} aria-label={k}><Sticker k={k} color={color} size={TAPES[k] ? 14 : 26} /></button>)}
      </div>
      <div className="row" style={{ gap: 6 }}>{STICKER_COLORS.map((c) => <button key={c} className={'stk-color' + (c === color ? ' on' : '')} style={{ background: c }} onClick={() => setColor(c)} aria-label="색" />)}</div>
    </div>
  )
}

// 날짜별 스티커 판: 부모(position: relative) 위에 % 좌표로 붙임 · 끌어서 옮기고, 눌러 고른 뒤 × 로 떼기
export function StickerLayer({ date, editable }) {
  useRec('days', date)
  const box = useRef(null), [sel, setSel] = useState(null)
  const list = dayRec(date).deco || []
  const save = (next) => setDay(date, { deco: next })
  const down = (e, s) => {
    if (!editable) return
    e.preventDefault(); e.stopPropagation(); setSel(s.id)
    const r = box.current.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, x0 = s.x, y0 = s.y
    let moved = false, cur = list
    const mv = (ev) => { const dx = ((ev.clientX - sx) / r.width) * 100, dy = ((ev.clientY - sy) / r.height) * 100; if (Math.abs(dx) + Math.abs(dy) > 0.5) moved = true; cur = list.map((x) => (x.id === s.id ? { ...x, x: Math.max(0, Math.min(96, x0 + dx)), y: Math.max(0, Math.min(97, y0 + dy)) } : x)); e.target.closest('.stk').style.left = cur.find((x) => x.id === s.id).x + '%'; e.target.closest('.stk').style.top = cur.find((x) => x.id === s.id).y + '%' }
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); if (moved) save(cur) }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up)
  }
  return (
    <div ref={box} className="stk-layer" onPointerDown={() => setSel(null)} style={{ pointerEvents: editable ? 'auto' : 'none' }}>
      {list.map((s) => (
        <span key={s.id} className={'stk' + (sel === s.id ? ' sel' : '')} style={{ left: s.x + '%', top: s.y + '%', transform: `rotate(${s.r || 0}deg)` }} onPointerDown={(e) => down(e, s)}>
          <Sticker k={s.k} color={s.c} size={s.s || 40} />
          {editable && sel === s.id && <button className="stk-x no-print" onPointerDown={(e) => { e.stopPropagation(); save(list.filter((x) => x.id !== s.id)); setSel(null) }} aria-label="떼기">×</button>}
        </span>
      ))}
    </div>
  )
}
export const addSticker = (date, k, c) => {
  const list = dayRec(date).deco || []
  const tape = !!TAPES[k]
  setDay(date, { deco: [...list, { id: uid(), k, c, x: tape ? 38 + Math.random() * 10 : 70 + Math.random() * 20, y: tape ? -1 : 8 + Math.random() * 30, r: Math.round((Math.random() - 0.5) * (tape ? 8 : 24)), s: 40 }] })
}
