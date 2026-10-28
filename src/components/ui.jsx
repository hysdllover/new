import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { haptic } from '../lib/haptic.js'
import ErrorBoundary from './ErrorBoundary.jsx'

/* ── 아이콘 (가는 선 · 둥근 모서리 · 24 격자 안쪽 여백 3.5) ── */
const P = {
  home: 'M4 10.4 12 4l8 6.4M5.6 9.2v9.3c0 .8.7 1.5 1.5 1.5h9.8c.8 0 1.5-.7 1.5-1.5V9.2M10 20v-4.2a2 2 0 0 1 4 0V20',
  planner: 'M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2zM4 9.6h16M8.5 3.2v3.4M15.5 3.2v3.4',
  calendar: 'M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2zM4 9.6h16M8.5 3.2v3.4M15.5 3.2v3.4M8.5 13.4h.01M12 13.4h.01M15.5 13.4h.01M8.5 16.6h.01M12 16.6h.01',
  tasks: 'M10.5 7h9M10.5 12h9M10.5 17h6M4.6 7.1l1.2 1.2 2.2-2.4M4.6 12.1l1.2 1.2 2.2-2.4M4.8 17a1 1 0 1 0 2 0a1 1 0 1 0 -2 0z',
  study: 'M4.7 13.5a7.3 7.3 0 1 0 14.6 0a7.3 7.3 0 1 0 -14.6 0zM12 10.2v3.5l2.2 1.4M10 3.4h4M12 3.4v2.8M17.6 7.6l1.2-1.2',
  notes: 'M7.2 3.6h6.6l4.6 4.6v10.7c0 .9-.7 1.6-1.6 1.6H7.2c-.9 0-1.6-.7-1.6-1.6V5.2c0-.9.7-1.6 1.6-1.6zM13.6 3.8v3.6c0 .5.4.9.9.9h3.7M8.8 12.6h6.4M8.8 16h4',
  plus: 'M12 5.5v13M5.5 12h13',
  share: 'M12 3.6V14M8.6 7 12 3.6 15.4 7M8 10.4H7c-.9 0-1.6.7-1.6 1.6v6.4c0 .9.7 1.6 1.6 1.6h10c.9 0 1.6-.7 1.6-1.6V12c0-.9-.7-1.6-1.6-1.6h-1',
  search: 'M4.5 10.8a6.3 6.3 0 1 0 12.6 0a6.3 6.3 0 1 0 -12.6 0zM15.5 15.5l4 4',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  close: 'M7 7l10 10M17 7 7 17',
  back: 'M14.5 6 8.5 12l6 6',
  next: 'M9.5 6l6 6-6 6',
  up: 'M6 14.5l6-6 6 6',
  down: 'M6 9.5l6 6 6-6',
  flask: 'M9.6 3.6h4.8M10.6 3.6v5.2l-4.9 8.4a2 2 0 0 0 1.7 3h9.2a2 2 0 0 0 1.7-3l-4.9-8.4V3.6M7.6 14.6h8.8',
  globe: 'M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0zM3.5 12h17M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5s-1.1 6.2-3.3 8.5c-2.2-2.3-3.3-5.1-3.3-8.5s1.1-6.2 3.3-8.5z',
  bulb: 'M9.6 17.6h4.8M10.6 20.4h2.8M12 3.6a5.4 5.4 0 0 0-3.2 9.8c.5.4.8 1 .8 1.6v.4h4.8V15c0-.6.3-1.2.8-1.6A5.4 5.4 0 0 0 12 3.6z',
  music: 'M9 17.4V6.2l10-2v11.2M9 9.6l10-2M4.2 17.4a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0zM14.2 15.4a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0z',
  calc: 'M7.8 3.6h8.4a1.8 1.8 0 0 1 1.8 1.8v13.2a1.8 1.8 0 0 1 -1.8 1.8h-8.4a1.8 1.8 0 0 1 -1.8 -1.8v-13.2a1.8 1.8 0 0 1 1.8 -1.8zM9 7.6h6M9.2 12h.01M12 12h.01M14.8 12h.01M9.2 15.8h.01M12 15.8h.01M14.8 15.8h.01',
  leaf: 'M5.6 18.4C5.6 10.6 11 5.2 18.8 5.2c0 7.8-5.4 13.2-13.2 13.2zM5.6 18.4l6.8-6.8',
  cap: 'M2.8 9.2 12 4.8l9.2 4.4L12 13.6zM6.6 11.2v4.4c0 1.3 2.4 2.4 5.4 2.4s5.4-1.1 5.4-2.4v-4.4M21.2 9.2v4.2',
  pen: 'M15 4.6a1.8 1.8 0 0 1 2.5 0l1.9 1.9a1.8 1.8 0 0 1 0 2.5L9 19.4l-4.4 1 1-4.4zM13.4 6.2l4.4 4.4',
  edit: 'M4.6 19.4h3.8L18.6 9.2a1.8 1.8 0 0 0 0-2.5l-1.3-1.3a1.8 1.8 0 0 0-2.5 0L4.6 15.6zM13.6 6.6l3.8 3.8M13.4 19.4h6',
  quote: 'M5.4 16.6c-1-.9-1.6-2.2-1.6-3.6 0-2.9 1.9-5 4.8-5.9M13.4 16.6c-1-.9-1.6-2.2-1.6-3.6 0-2.9 1.9-5 4.8-5.9M4.8 15.2a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0zM12.8 15.2a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0z',
  pin: 'M12 20.4v-5M8.6 3.6h6.8l-1 5.2 2.7 2.7c.5.5.2 1.3-.5 1.3H7.4c-.7 0-1-.8-.5-1.3l2.7-2.7z',
  grid: 'M5.6 4h3.3a1.6 1.6 0 0 1 1.6 1.6v3.3a1.6 1.6 0 0 1 -1.6 1.6h-3.3a1.6 1.6 0 0 1 -1.6 -1.6v-3.3a1.6 1.6 0 0 1 1.6 -1.6zM15.1 4h3.3a1.6 1.6 0 0 1 1.6 1.6v3.3a1.6 1.6 0 0 1 -1.6 1.6h-3.3a1.6 1.6 0 0 1 -1.6 -1.6v-3.3a1.6 1.6 0 0 1 1.6 -1.6zM5.6 13.5h3.3a1.6 1.6 0 0 1 1.6 1.6v3.3a1.6 1.6 0 0 1 -1.6 1.6h-3.3a1.6 1.6 0 0 1 -1.6 -1.6v-3.3a1.6 1.6 0 0 1 1.6 -1.6zM15.1 13.5h3.3a1.6 1.6 0 0 1 1.6 1.6v3.3a1.6 1.6 0 0 1 -1.6 1.6h-3.3a1.6 1.6 0 0 1 -1.6 -1.6v-3.3a1.6 1.6 0 0 1 1.6 -1.6z',
  sidebar: 'M5.6 5h12.8a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-12.8a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2zM9.4 5v14',
  expand: 'M4.6 9V4.6H9M19.4 9V4.6H15M4.6 15v4.4H9M19.4 15v4.4H15',
  shrink: 'M9 4.6V9H4.6M15 4.6V9h4.4M9 19.4V15H4.6M15 19.4V15h4.4',
  trash: 'M4.6 7h14.8M9.6 7V5.3c0-.4.3-.7.7-.7h3.4c.4 0 .7.3.7.7V7M6.6 7l.8 11.9c.1.8.7 1.5 1.6 1.5h6c.9 0 1.5-.7 1.6-1.5L17.4 7M10.4 11v5.4M13.6 11v5.4',
  grip: 'M9.5 6h.01M9.5 12h.01M9.5 18h.01M14.5 6h.01M14.5 12h.01M14.5 18h.01',
  play: 'M8.2 5.8v12.4c0 .7.7 1.1 1.3.7l9.4-6.2c.5-.4.5-1.1 0-1.4L9.5 5.1c-.6-.4-1.3 0-1.3.7z',
  pause: 'M8.6 5.6v12.8M15.4 5.6v12.8',
  stop: 'M8.2 6.2h7.6a2 2 0 0 1 2 2v7.6a2 2 0 0 1 -2 2h-7.6a2 2 0 0 1 -2 -2v-7.6a2 2 0 0 1 2 -2z',
  settings: 'M4 7.6h8.4M17.6 7.6H20M12.6 7.6a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0zM4 16.4h2.4M11.6 16.4H20M6.6 16.4a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0z',
  heart: 'M12 19.4c-.4 0-7.2-4.2-7.2-9.4A4 4 0 0 1 12 7.6 4 4 0 0 1 19.2 10c0 5.2-6.8 9.4-7.2 9.4z',
  clock: 'M3.6 12a8.4 8.4 0 1 0 16.8 0a8.4 8.4 0 1 0 -16.8 0zM12 7.6V12l2.9 1.8',
  tag: 'M3.8 11.1V5.3c0-.8.7-1.5 1.5-1.5h5.8c.4 0 .8.2 1.1.4l8 8c.6.6.6 1.6 0 2.1l-5.8 5.8c-.6.6-1.6.6-2.1 0l-8-8c-.3-.3-.5-.7-.5-1zM8.1 8.1h.01',
  link: 'M10.2 13.8a3.8 3.8 0 0 0 5.4.2l2.8-2.8a3.8 3.8 0 0 0-5.4-5.4l-1.1 1.1M13.8 10.2a3.8 3.8 0 0 0-5.4-.2l-2.8 2.8a3.8 3.8 0 0 0 5.4 5.4l1.1-1.1',
  file: 'M7.2 3.6h6.6l4.6 4.6v10.7c0 .9-.7 1.6-1.6 1.6H7.2c-.9 0-1.6-.7-1.6-1.6V5.2c0-.9.7-1.6 1.6-1.6zM13.6 3.8v3.6c0 .5.4.9.9.9h3.7',
  image: 'M5.6 5h12.8a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-12.8a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2zM4 16.2l4.4-4.2 3.6 3.4 2.6-2.4 5.4 5M15.4 9.4h.01',
  flag: 'M5.6 20.4V4.6M5.6 4.6h10.9c.4 0 .7.5.4.8L15 8.6l1.9 3.2c.3.3 0 .8-.4.8H5.6',
  star: 'M12 4.4l2.2 4.6 5 .7-3.6 3.5.8 5L12 15.8l-4.4 2.4.8-5-3.6-3.5 5-.7z',
  repeat: 'M16.6 3.6l2.8 2.8-2.8 2.8M4.6 11v-1c0-1.9 1.6-3.6 3.6-3.6h11.2M7.4 20.4l-2.8-2.8 2.8-2.8M19.4 13v1c0 1.9-1.6 3.6-3.6 3.6H4.6',
  sync: 'M19.4 10.4A7.6 7.6 0 0 0 5.6 7.4M4.6 4.6v3.2h3.2M4.6 13.6a7.6 7.6 0 0 0 13.8 3M19.4 19.4v-3.2h-3.2',
  check: 'M5.6 12.4l4 4L18.4 7.6',
  chart: 'M4.6 19.6h14.8M7.6 16V12M12 16V7.6M16.4 16v-5.6',
  folder: 'M3.6 7.6V6.2c0-.9.7-1.6 1.6-1.6h3.6c.4 0 .8.2 1.1.5l1.5 1.7h7.4c.9 0 1.6.7 1.6 1.6v9.6c0 .9-.7 1.6-1.6 1.6H5.2c-.9 0-1.6-.7-1.6-1.6z',
  graph: 'M4.2 6a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0zM16.2 8a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0zM10.2 18a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0zM7.8 6.3l8.4 1.4M6.9 7.6l4.2 8.8M17.1 9.6l-4.2 6.8',
  archive: 'M4.8 4.6h14.4a1.2 1.2 0 0 1 1.2 1.2v2a1.2 1.2 0 0 1 -1.2 1.2h-14.4a1.2 1.2 0 0 1 -1.2 -1.2v-2a1.2 1.2 0 0 1 1.2 -1.2zM5.2 9v9.4c0 .9.7 1.6 1.6 1.6h10.4c.9 0 1.6-.7 1.6-1.6V9M10 13h4',
  bell: 'M6.6 16.6V11a5.4 5.4 0 0 1 10.8 0v5.6l1.4 1.4H5.2zM10.2 20.4a1.9 1.9 0 0 0 3.6 0',
  sun: 'M8.2 12a3.8 3.8 0 1 0 7.6 0a3.8 3.8 0 1 0 -7.6 0zM12 3.4v1.6M12 19v1.6M3.4 12H5M19 12h1.6M5.9 5.9 7 7M17 17l1.1 1.1M5.9 18.1 7 17M17 7l1.1-1.1',
  split: 'M12 3.6v16.8M3.6 12H9M15 12h5.4',
  layers: 'M12 3.8 3.4 8.2 12 12.6l8.6-4.4zM3.4 12.2 12 16.6l8.6-4.4M3.4 16 12 20.4l8.6-4.4',
  download: 'M12 4.6v10.2M7.8 10.6 12 14.8l4.2-4.2M5.2 19.4h13.6',
  info: 'M3.6 12a8.4 8.4 0 1 0 16.8 0 8.4 8.4 0 1 0-16.8 0zM12 11v5.2M12 7.8h.01',
  upload: 'M12 19.4V9.2M7.8 13.4 12 9.2l4.2 4.2M5.2 4.6h13.6',
  print: 'M7.6 8.4V4.6c0-.6.4-1 1-1h6.8c.6 0 1 .4 1 1v3.8M7.4 16.6H6c-.9 0-1.6-.7-1.6-1.6v-5c0-.9.7-1.6 1.6-1.6h12c.9 0 1.6.7 1.6 1.6v5c0 .9-.7 1.6-1.6 1.6h-1.4M7.6 13.6h8.8v5.8c0 .6-.4 1-1 1H8.6c-.6 0-1-.4-1-1zM16.8 11.2h.01',
  pill: 'M10.6 19.8a4.8 4.8 0 0 1-6.4-6.4l5.2-5.2a4.8 4.8 0 0 1 6.8 6.8zM8.4 9.2l6.4 6.4',
  target: 'M3.6 12a8.4 8.4 0 1 0 16.8 0a8.4 8.4 0 1 0 -16.8 0zM7.4 12a4.6 4.6 0 1 0 9.2 0a4.6 4.6 0 1 0 -9.2 0zM12 11.4h.01',
  book: 'M4.4 5.2c0-.5.4-.8.8-.8h4.4A2.4 2.4 0 0 1 12 6.8v12.8a2 2 0 0 0-2-1.8H5.2c-.4 0-.8-.4-.8-.8zM19.6 5.2c0-.5-.4-.8-.8-.8h-4.4A2.4 2.4 0 0 0 12 6.8v12.8a2 2 0 0 1 2-1.8h4.8c.4 0 .8-.4.8-.8z',
  brain: 'M12 5.6a2.8 2.8 0 0 0-5.2 1.2 2.8 2.8 0 0 0-1.6 4.6 2.8 2.8 0 0 0 1.4 4.4A2.8 2.8 0 0 0 12 17.4zM12 5.6a2.8 2.8 0 0 1 5.2 1.2 2.8 2.8 0 0 1 1.6 4.6 2.8 2.8 0 0 1-1.4 4.4A2.8 2.8 0 0 1 12 17.4zM12 17.4v2.2',
  eye: 'M2.8 12S6.2 6 12 6s9.2 6 9.2 6-3.4 6-9.2 6-9.2-6-9.2-6zM9.4 12a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0z',
  sparkle: 'M12 4.2c.5 3.9 2.1 5.5 5.8 6-3.7.5-5.3 2.1-5.8 6-.5-3.9-2.1-5.5-5.8-6 3.7-.5 5.3-2.1 5.8-6zM18.4 15.8c.2 1.4.8 2 2 2.2-1.2.2-1.8.8-2 2.2-.2-1.4-.8-2-2-2.2 1.2-.2 1.8-.8 2-2.2z',
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
          <div className={'sheet' + (s.full ? ' full' : '') + (s.top ? ' top' : '')} role="dialog">
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
