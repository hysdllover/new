import { useEffect, useState, useSyncExternalStore } from 'react'
import { uiSubscribe, uiState, hideToast, openSheet } from './toast.js'

// 선 아이콘 (24 격자 · 1.4 굵기)
const P = {
  home: 'M4 11 12 4.5 20 11M6.5 9.5V19h11V9.5',
  plan: 'M8 6.5h11M8 12h11M8 17.5h11M4.3 6.5h.4M4.3 12h.4M4.3 17.5h.4',
  clock: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 8v4.3l2.8 1.7',
  flag: 'M6 20V4.5M6 5h11l-2.2 3.5L17 12H6',
  settings: 'M5 7h9M17.5 7H19M5 17h2M10.5 17H19M14 5.2v3.6M8.5 15.2v3.6',
  plus: 'M12 5v14M5 12h14',
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  check: 'M5 12.5l4.2 4L19 7',
  back: 'M14.5 5.5 8 12l6.5 6.5',
  next: 'M9.5 5.5 16 12l-6.5 6.5',
  trash: 'M5 7h14M9.5 7V5h5v2M7 7l.8 12h8.4L17 7',
  edit: 'M5 19h3.5L18.5 9 15 5.5 5 15.5zM13 7.5l3.5 3.5',
  calendar: 'M5 6.5h14v13H5zM5 10.5h14M9 4.5v4M15 4.5v4',
  sync: 'M5 11a7 7 0 0 1 12.3-4.3L19 8.5M19 4.5v4h-4M19 13a7 7 0 0 1-12.3 4.3L5 15.5M5 19.5v-4h4',
  down: 'M12 4.5v11M7 11l5 5 5-5M5 19.5h14',
  up: 'M12 16.5v-11M7 9.5l5-5 5 5M5 19.5h14',
  copy: 'M8.5 8.5h10v10h-10zM5.5 15.5v-10h10',
  chart: 'M5 19.5h14M7.5 16v-4M12 16V8M16.5 16v-6',
  book: 'M5 5.5h6a2 2 0 0 1 1 1.7V19a2 2 0 0 0-1-1.5H5zM19 5.5h-6a2 2 0 0 0-1 1.7V19a2 2 0 0 1 1-1.5h6z',
  widget: 'M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z',
  info: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 11v5M12 8h.01',
}
export function Icon({ name, size = 18 }) {
  return <svg className="ic" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[name] || ''} /></svg>
}

export function Card({ title, action, children, className = '', ...rest }) {
  return (
    <section className={'card ' + className} {...rest}>
      {(title || action) && <div className="card-h"><h2>{title}</h2>{action}</div>}
      {children}
    </section>
  )
}
export function Seg({ value, onChange, options, small }) {
  return (
    <div className={'seg' + (small ? ' sm' : '')} role="tablist">
      {options.map(([v, l]) => <button key={String(v)} role="tab" aria-selected={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  )
}
export function Toggle({ label, checked, onChange, hint }) {
  return (
    <label className="toggle">
      <span className="grow">{label}{hint && <span className="hint">{hint}</span>}</span>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden="true" />
    </label>
  )
}
export const Field = ({ label, children }) => <label className="field"><span className="field-l">{label}</span>{children}</label>

// 체크 칸: 누르면 체크 (연필 테마에선 손으로 그은 네모 · 체크)
export function Check({ on, onClick, label = on ? '되돌리기' : '끝내기' }) {
  const [fresh, setFresh] = useState(false)
  return <button type="button" className={'check' + (on ? ' on' : '') + (fresh ? ' fresh' : '')} aria-label={label} aria-pressed={!!on} onClick={(e) => { e.stopPropagation(); if (!on) { setFresh(true); setTimeout(() => setFresh(false), 600) } onClick?.() }} />
}
// 진행선: 가는 선 하나 (특수 문자 없이)
export const Line = ({ value, color }) => <i className="pline"><b style={{ width: Math.max(0, Math.min(1, value || 0)) * 100 + '%', ...(color ? { background: color } : null) }} /></i>

export const Empty = ({ children }) => <div className="empty">{children}</div>

export function confirmSheet(title, text, onOk, okLabel = '확인', danger = true) {
  openSheet((close) => (
    <div className="form">
      <p className="muted">{text}</p>
      <div className="row end"><button className="btn" onClick={close}>취소</button><button className={'btn ' + (danger ? 'danger' : 'primary')} onClick={() => { close(); onOk() }}>{okLabel}</button></div>
    </div>
  ), { title })
}

// 알림 · 시트 그리는 곳 (App 맨 아래 한 번)
export function UiHost() {
  const ui = useSyncExternalStore(uiSubscribe, uiState)
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape' && ui.sheets.length) ui.sheets[ui.sheets.length - 1].close() }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [ui.sheets])
  return (
    <>
      {ui.sheets.map((s, i) => (
        <div key={s.id} className="sheet-wrap" style={{ zIndex: 50 + i }} onClick={s.close}>
          <div className="sheet" role="dialog" aria-label={s.title} onClick={(e) => e.stopPropagation()}>
            <div className="sheet-h"><b>{s.title}</b><button className="icon-btn" onClick={s.close} aria-label="닫기"><Icon name="close" /></button></div>
            <div className="sheet-b">{s.render(s.close)}</div>
          </div>
        </div>
      ))}
      {ui.toast && (
        <div className="toast" key={ui.toast.k} role="status">
          <span className="grow">{ui.toast.text}</span>
          {ui.toast.action && <button onClick={() => { ui.toast.action.fn(); hideToast() }}>{ui.toast.action.label}</button>}
        </div>
      )}
    </>
  )
}
