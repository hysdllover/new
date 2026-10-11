import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { haptic } from '../lib/haptic.js'
import ErrorBoundary from './ErrorBoundary.jsx'

/* ── 아이콘 (얇은 선) ── */
const P = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  planner: 'M4 5h16v15H4zM4 9h16M8 3v4M16 3v4',
  tasks: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  study: 'M12 7a8 8 0 1 0 0 14 8 8 0 0 0 0-14zM12 11v3l2 1M10 3h4M12 3v4',
  notes: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7',
  plus: 'M12 5v14M5 12h14',
  share: 'M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  close: 'M6 6l12 12M18 6 6 18',
  back: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  up: 'M5 15l7-7 7 7',
  flask: 'M9 3h6M10 3v6l-5 9a1.5 1.5 0 0 0 1.3 2.2h11.4A1.5 1.5 0 0 0 19 18l-5-9V3M7.5 14h9',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  calc: 'M6 3h12v18H6zM9 7h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01',
  leaf: 'M5 19c0-8 6-14 15-14 0 9-6 15-14 15M5 19l7-7',
  cap: 'M2 9l10-5 10 5-10 5zM6 11v5c2 2 10 2 12 0v-5M22 9v5',
  pen: 'M15 4l5 5L9 20H4v-5zM13 6l5 5',
  quote: 'M6 17c-1.5-1-2-2.5-2-4.5C4 9 6 7 9 6M14 17c-1.5-1-2-2.5-2-4.5 0-3.5 2-5.5 5-6.5',
  pin: 'M12 21v-6M8 4h8l-1 5 3 3H6l3-3z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  sidebar: 'M4 5h16v14H4zM9 5v14',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  shrink: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
  down: 'M5 9l7 7 7-7',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  grip: 'M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01',
  play: 'M7 5v14l11-7z',
  pause: 'M8 5v14M16 5v14',
  stop: 'M6 6h12v12H6z',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  calendar: 'M4 5h16v15H4zM4 9h16M8 3v4M16 3v4M8 13h2M12 13h2M16 13h.01M8 17h2M12 17h2',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  tag: 'M3 12V4h8l10 10-8 8zM7.5 7.5h.01',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  file: 'M6 3h9l4 4v14H6zM14 3v5h5',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01',
  flag: 'M5 21V4h11l-2 4 2 4H5',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  repeat: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
  sync: 'M20 11a8 8 0 0 0-14.8-4M4 5v3h3M4 13a8 8 0 0 0 14.8 4M20 19v-3h-3',
  check: 'M5 12l5 5 9-10',
  chart: 'M4 20h16M7 16v-5M12 16V8M17 16v-8',
  folder: 'M3 6h6l2 2h10v11H3z',
  graph: 'M6 6a2 2 0 1 0 0 .1M18 8a2 2 0 1 0 0 .1M12 18a2 2 0 1 0 0 .1M7.5 7l9 1M7 8l4 8.5M17 10l-4 6.5',
  archive: 'M4 5h16v4H4zM5 9v11h14V9M10 13h4',
  bell: 'M6 9a6 6 0 1 1 12 0c0 6 2 8 2 8H4s2-2 2-8M10 21h4',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
  split: 'M12 3v18M3 12h6M15 12h6',
  layers: 'M12 3 2 8l10 5 10-5zM2 13l10 5 10-5M2 17.5l10 5 10-5',
  download: 'M12 4v11M7 10l5 5 5-5M4 20h16',
  upload: 'M12 20V9M7 14l5-5 5 5M4 4h16',
  print: 'M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z',
  pill: 'M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7zM8.5 8.5l7 7',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  book: 'M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3',
  brain: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
}
export function Icon({ name, size = 18, stroke = 1.5, fill = 'none', style }) {
  return (
    <svg className={'ic' + (stroke !== 1.5 ? ' ic-fixed' : '')} width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      <path d={P[name] || P.more} />
    </svg>
  )
}

/* ── UI 상태 (비영속) ── */
let ui = { detail: null, sheets: [], toasts: [], menu: null }
const uiL = new Set()
const setUi = (p) => { ui = { ...ui, ...p }; uiL.forEach((l) => l()) }
export const useUi = () => useSyncExternalStore((f) => { uiL.add(f); return () => uiL.delete(f) }, () => ui)
export const getUi = () => ui

// 상세 편집: iPad 가로(≥1024)면 우측 패널, 아니면 바텀시트
export const openDetail = (type, id, extra) => setUi({ detail: { type, id, ...extra } })
export const closeDetail = () => setUi({ detail: null })
export const openSheet = (render, opt = {}) => { const key = Math.random(); setUi({ sheets: [...ui.sheets, { key, render, ...opt }] }); return key }
export const closeSheet = (key) => setUi({ sheets: key == null ? ui.sheets.slice(0, -1) : ui.sheets.filter((s) => s.key !== key) })
export function toast(text, action) {
  const id = Math.random()
  setUi({ toasts: [...ui.toasts, { id, text, action }] })
  setTimeout(() => setUi({ toasts: ui.toasts.filter((t) => t.id !== id) }), action ? 5000 : 2400)
}
// 메뉴는 누른 자리(버튼) 기준으로 열고, 그려진 뒤 실제 크기를 재서 화면 안에 맞춤 (아래가 모자라면 위로)
export const openMenu = (e, items) => {
  const t = e?.currentTarget?.getBoundingClientRect ? e.currentTarget.getBoundingClientRect() : { left: e?.clientX ?? 0, right: e?.clientX ?? 0, top: e?.clientY ?? 0, bottom: e?.clientY ?? 0 }
  setUi({ menu: { a: { l: t.left, r: t.right, t: t.top, b: t.bottom }, items } })
}
function Menu({ m }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ left: m.a.l, top: m.a.b + 4, visibility: 'hidden' })
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return
    const cs = getComputedStyle(document.documentElement), inset = (k) => parseFloat(cs.getPropertyValue(k)) || 0
    const W = innerWidth, H = innerHeight, w = el.offsetWidth, h = el.offsetHeight, g = 8
    const minX = g + inset('--sal'), maxX = W - g - inset('--sar') - w, minY = g + inset('--sat'), maxY = H - g - inset('--sab') - h
    let left = m.a.l + w > W - g ? m.a.r - w : m.a.l // 오른쪽이 모자라면 버튼 오른쪽 끝에 맞춤
    let top = m.a.b + 4
    if (top > maxY && m.a.t - 4 - h >= minY) top = m.a.t - 4 - h // 아래가 모자라면 위로
    setPos({ left: Math.max(minX, Math.min(left, maxX)), top: Math.max(minY, Math.min(top, maxY)), maxHeight: H - minY - g - inset('--sab') })
  }, [m])
  return (
    <div ref={ref} className="menu" style={pos}>
      {m.items.filter(Boolean).map((it, i) => (
        <button key={i} className={it.danger ? 'btn-danger' : ''} style={it.danger ? { color: 'var(--danger)' } : null} onClick={() => { closeMenu(); it.onClick() }}>
          {it.icon && <Icon name={it.icon} size={16} />}{it.label}
        </button>
      ))}
    </div>
  )
}
export const closeMenu = () => setUi({ menu: null })

export function UiLayer() {
  const u = useUi()
  return (
    <>
      {u.sheets.map((s) => (
        <div key={s.key}>
          <div className="sheet-bg" onClick={() => closeSheet(s.key)} />
          <div className={'sheet' + (s.full ? ' full' : '')} role="dialog">
            <div className="sheet-grab" />
            {s.title != null && (
              <div className="sheet-h"><h2>{s.title}</h2><button className="icon-btn" onClick={() => closeSheet(s.key)} aria-label="닫기"><Icon name="close" /></button></div>
            )}
            <div className="sheet-b"><ErrorBoundary where="sheet">{s.render(() => closeSheet(s.key))}</ErrorBoundary></div>
          </div>
        </div>
      ))}
      {u.menu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 79 }} onClick={closeMenu} />
          <Menu m={u.menu} />
        </>
      )}
      <div className="toasts">
        {u.toasts.map((t) => (
          <div className="toast" key={t.id}>{t.text}{t.action && <button onClick={() => { t.action.fn(); setUi({ toasts: ui.toasts.filter((x) => x.id !== t.id) }) }}>{t.action.label}</button>}</div>
        ))}
      </div>
    </>
  )
}

/* ── 작은 컴포넌트 ── */
export function Seg({ value, options, onChange, small }) {
  return (
    <div className="seg" style={small ? { fontSize: '.9em' } : null}>
      {options.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o]
        return <button key={v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>
      })}
    </div>
  )
}

export function Check({ on, onClick, round, color }) {
  const [burst, setBurst] = useState(0)
  return (
    <button
      className={'check' + (on ? ' on' : '') + (round ? ' round' : '')}
      style={color ? { borderColor: color, '--ck': color, ...(on ? { background: color } : null) } : null}
      onClick={(e) => { e.stopPropagation(); if (!on) { setBurst((b) => b + 1); haptic() } onClick?.() }}
      aria-label={on ? '완료 취소' : '완료'}
    >
      {on && burst > 0 && <span key={burst} className="burst" style={color ? { borderColor: color } : null} />}
    </button>
  )
}

export const Prog = ({ value, color, h }) => (
  <div className="prog" style={h ? { height: h } : null}><i style={{ width: Math.round(Math.min(1, Math.max(0, value || 0)) * 100) + '%', background: color }} /></div>
)

export function Ring({ value, size = 64, stroke = 6, color = 'var(--accent)', children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value || 0))} style={{ transition: 'stroke-dashoffset .4s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', lineHeight: 1.15 }}>{children}</div>
    </div>
  )
}

export function Field({ label, children }) {
  return <div className="field">{label && <label>{label}</label>}{children}</div>
}

// 노트 아이콘: 'i:이름' 은 얇은 선 아이콘, 그 밖은 예전 이모지 (없으면 선 아이콘 문서)
export const NOTE_ICONS = ['file', 'notes', 'book', 'pen', 'bulb', 'flask', 'calc', 'globe', 'music', 'leaf', 'cap', 'quote', 'pin', 'star', 'flag', 'target', 'brain', 'calendar', 'clock', 'chart', 'tag', 'heart', 'layers', 'folder']
export function NoteIcon({ icon, size = 16 }) {
  if (icon && !icon.startsWith('i:')) return <span className="note-emoji">{icon}</span>
  return <Icon name={icon ? icon.slice(2) : 'file'} size={size} />
}

// 빈 화면 낙서: 가는 선 공책 한 권과 별 하나 (리포트 낙서와 같은 결)
const Doodle = () => (
  <svg className="doodle" viewBox="0 0 46 40" aria-hidden="true">
    <path d="M9 6.5C17 5.6 29 5.8 35.5 6.6c.6 9 .5 18.6-.2 27.2-8.4.8-18.7.7-26.4-.1-.5-9-.6-18.3.1-27.2z" />
    <path d="M13.5 6.4c-.4 9.2-.3 18.4.2 27.4" />
    <path d="M18 14c4.6-.5 9.4-.3 13.4.1M18 19.6c3.8-.4 8-.3 11.6 0M18 25c2.4-.3 4.8-.2 7 .1" />
    <path d="M40 4.6l.9 2 2.2.2-1.7 1.5.5 2.2-1.9-1.2-1.9 1.2.5-2.2-1.7-1.5 2.2-.2z" />
  </svg>
)
export function Empty({ children, hint, action }) {
  return (
    <div className={'empty' + (hint || action ? ' empty-guide' : '')}>
      {(hint || action) && <Doodle />}
      <div>{children}</div>
      {hint && <div className="tiny muted empty-hint">{hint}</div>}
      {action && <button className="btn sm" onClick={action.fn}>{action.label}</button>}
    </div>
  )
}

export function Card({ title, action, children, className = '', style, onClick }) {
  return (
    <div className={'card ' + className} style={style} onClick={onClick}>
      {(title || action) && <div className="card-h"><h3>{title}</h3>{action}</div>}
      <ErrorBoundary where={'card:' + (typeof title === 'string' ? title : '')}>{children}</ErrorBoundary>
    </div>
  )
}

export function SectionTitle({ children, action }) {
  return <div className="section-title"><h4>{children}</h4>{action}</div>
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="row between" style={{ minHeight: 40 }}>
      <span>{label}</span>
      <input type="checkbox" className="sw" switch="" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

// 텍스트 입력 후 엔터로 추가
export function AddInput({ placeholder, onAdd, autoFocus }) {
  const [v, setV] = useState('')
  return (
    <form className="row" onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onAdd(v.trim()); setV('') } }}>
      <input className="input" value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} />
      <button className="btn" type="submit" aria-label="추가"><Icon name="plus" size={16} /></button>
    </form>
  )
}

// 자동 높이 textarea
export function AutoText({ value, onChange, className = '', style, ...rest }) {
  const ref = useRef(null)
  useEffect(() => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }, [value])
  return <textarea ref={ref} rows={1} value={value} onChange={(e) => onChange(e.target.value)} className={className} style={{ resize: 'none', overflow: 'hidden', ...style }} {...rest} />
}

export function useNow(interval = 30000) {
  const [n, setN] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setN(Date.now()), interval); return () => clearInterval(t) }, [interval])
  return n
}

export function useMedia(q) {
  const [m, setM] = useState(() => window.matchMedia(q).matches)
  useEffect(() => { const mq = window.matchMedia(q); const f = () => setM(mq.matches); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f) }, [q])
  return m
}

export function confirmSheet(title, message, onOk, okLabel = '확인') {
  openSheet((close) => (
    <div className="col">
      <div>{message}</div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={close}>취소</button>
        <button className="btn primary" onClick={() => { close(); onOk() }}>{okLabel}</button>
      </div>
    </div>
  ), { title })
}
