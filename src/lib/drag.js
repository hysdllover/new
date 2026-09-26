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
  let zone = null
  const place = (x, y) => { ghost.style.left = x + 12 + 'px'; ghost.style.top = y - 18 + 'px' }
  place(x0, y0)
  const move = (ev) => {
    ev.preventDefault()
    const x = ev.clientX, y = ev.clientY
    place(x, y)
    ghost.style.display = 'none'
    const el = document.elementFromPoint(x, y)?.closest('[data-drop]')
    ghost.style.display = ''
    if (el !== zone) { zone?.classList.remove('drop-on'); el?.classList.add('drop-on'); zone = el }
    onMove?.(zone, { x, y })
    autoScroll(y)
  }
  const end = (ev) => {
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

function autoScroll(y) {
  const c = document.getElementById('content')
  if (!c) return
  const r = c.getBoundingClientRect()
  if (y < r.top + 50) c.scrollTop -= 12
  else if (y > r.bottom - 60) c.scrollTop += 12
}

// 길게 누르면 드래그 시작 (짧은 터치·스크롤은 그대로 통과). 마우스는 5px 이동 시 시작.
export function longPress(getOpts, delay = 320) {
  return {
    onPointerDown: (e) => {
      if (e.button > 0 || e.target.closest('button, input, textarea, select, a, [data-nodrag]')) return
      const target = e.currentTarget
      const x0 = e.clientX, y0 = e.clientY
      let timer = null, done = false
      const clear = () => { clearTimeout(timer); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', clear); window.removeEventListener('pointercancel', clear) }
      const go = (ev) => { if (done) return; done = true; clear(); startDrag(ev, { source: target, ...getOpts() }) }
      const mv = (ev) => {
        const d = Math.hypot(ev.clientX - x0, ev.clientY - y0)
        if (e.pointerType === 'mouse' && d > 5) go(ev)
        else if (e.pointerType !== 'mouse' && d > 8) clear()
      }
      if (e.pointerType !== 'mouse') timer = setTimeout(() => go({ clientX: x0, clientY: y0 }), delay)
      window.addEventListener('pointermove', mv)
      window.addEventListener('pointerup', clear)
      window.addEventListener('pointercancel', clear)
    },
    onContextMenu: (e) => e.preventDefault(),
  }
}

// 드래그 중에는 스크롤 막기 (iOS 는 미리 등록된 non-passive 리스너가 필요)
if (typeof document !== 'undefined') document.addEventListener('touchmove', (e) => { if (active) e.preventDefault() }, { passive: false })
