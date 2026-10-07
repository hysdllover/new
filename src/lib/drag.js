// 터치·마우스 공용 드래그앤드롭. 드롭 대상은 data-drop 속성을 가진 요소.
let active = null

export function startDrag(e, { label, onMove, onDrop, source }) {
  if (active) return
  const x0 = e.clientX, y0 = e.clientY
  const ghost = document.createElement('div')
  ghost.className = 'drag-ghost'
  ghost.textContent = label || ''
  document.body.appendChild(ghost)
  source?.classList.add('dragging')
  let zone = null, raf = 0, px = x0, py = y0
  // 120Hz(ProMotion): 이동은 transform 으로만 · 한 프레임에 한 번만 계산 (pointermove 가 몰려도)
  const place = (x, y) => { ghost.style.transform = `translate3d(${x + 12}px, ${y - 18}px, 0)` }
  place(x0, y0)
  const frame = () => {
    raf = 0
    place(px, py)
    const el = document.elementFromPoint(px, py)?.closest('[data-drop]') // 고스트는 pointer-events: none
    if (el !== zone) { zone?.classList.remove('drop-on'); el?.classList.add('drop-on'); zone = el }
    onMove?.(zone, { x: px, y: py })
    if (autoScroll(py)) raf = requestAnimationFrame(frame) // 가장자리에 있으면 계속 부드럽게 스크롤
  }
  const move = (ev) => {
    ev.preventDefault()
    px = ev.clientX; py = ev.clientY
    if (!raf) raf = requestAnimationFrame(frame)
  }
  const end = (ev) => {
    cancelAnimationFrame(raf)
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', cancel)
    ghost.remove(); source?.classList.remove('dragging'); zone?.classList.remove('drop-on')
    active = null
    if (zone) onDrop?.(zone, { x: ev.clientX, y: ev.clientY })
  }
  const cancel = () => { zone = null; end({}) }
  window.addEventListener('pointermove', move, { passive: false })
  window.addEventListener('pointerup', end)
  window.addEventListener('pointercancel', cancel)
  active = { ghost }
  try { navigator.vibrate?.(10) } catch {}
}

// 가장자리에 가까울수록 빠르게 (한 프레임 최대 14px) · 스크롤했으면 true
function autoScroll(y) {
  const c = document.getElementById('content')
  if (!c) return false
  const r = c.getBoundingClientRect(), top = r.top + 60, bot = r.bottom - 70
  const v = y < top ? -Math.min(14, (top - y) / 4 + 2) : y > bot ? Math.min(14, (y - bot) / 4 + 2) : 0
  if (!v) return false
  const before = c.scrollTop; c.scrollTop += v
  return c.scrollTop !== before
}

// 길게 누르면 드래그 시작 (짧은 터치·스크롤은 그대로 통과). 마우스는 5px 이동 시 시작.
// getOpts() 가 onHold 를 주면: 길게 누른 뒤 그대로 떼면 onHold(메뉴), 누른 채 움직이면 드래그
export function longPress(getOpts, delay = 320) {
  const h = {
    onPointerDown: (e) => {
      if (e.button > 0 || e.target.closest('button, input, textarea, select, a, [data-nodrag]')) return
      const target = e.currentTarget
      const x0 = e.clientX, y0 = e.clientY
      let timer = null, done = false, held = null
      const clear = () => { clearTimeout(timer); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel) }
      const go = (ev) => { if (done) return; done = true; clear(); const o = held || getOpts(); if (o.onDrop || o.onMove) startDrag(ev, { source: target, ...o }) }
      const mv = (ev) => {
        const d = Math.hypot(ev.clientX - x0, ev.clientY - y0)
        if (held) { if (d > 8) { if (held.onDrop || held.onMove) go(ev); else { done = true; clear() } } return }
        if (e.pointerType === 'mouse' && d > 5) go(ev)
        else if (e.pointerType !== 'mouse' && d > 8) clear()
      }
      const up = () => {
        clear()
        if (!held || done) return
        done = true; target.classList.remove('holding'); target.__held = Date.now()
        // 손을 뗀 뒤 따라오는 클릭이 방금 연 메뉴를 닫지 않게 한 번 삼킴
        const eat = (ev) => { ev.stopPropagation(); ev.preventDefault(); window.removeEventListener('click', eat, true) }
        window.addEventListener('click', eat, true); setTimeout(() => window.removeEventListener('click', eat, true), 700)
        held.onHold({ x: x0, y: y0 })
      }
      const cancel = () => { clear(); target.classList.remove('holding') }
      if (e.pointerType !== 'mouse') timer = setTimeout(() => {
        const o = getOpts()
        if (o.onHold) { held = o; target.classList.add('holding'); try { navigator.vibrate?.(10) } catch {} } else go({ clientX: x0, clientY: y0 })
      }, delay)
      window.addEventListener('pointermove', mv)
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', cancel)
    },
    onContextMenu: (e) => { e.preventDefault(); const o = getOpts(); if (o.onHold && e.nativeEvent?.pointerType !== 'touch' && !('ontouchstart' in window)) o.onHold({ x: e.clientX, y: e.clientY }) },
  }
  Object.defineProperty(h, 'getOpts', { value: getOpts, enumerable: false })
  return h
}

// 드래그 중에는 스크롤 막기 (iOS 는 미리 등록된 non-passive 리스너가 필요)
if (typeof document !== 'undefined') document.addEventListener('touchmove', (e) => { if (active) e.preventDefault() }, { passive: false })
export const lockScroll = (on) => { active = on ? { lock: true } : null }
