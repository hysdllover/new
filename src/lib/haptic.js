// 가벼운 진동: iOS 18+ Safari 의 기본 스위치(input switch)를 눌렀을 때 나는 진동을 빌려 씀 · 안드로이드는 vibrate
let el = null, off = false
const vib0 = typeof navigator !== 'undefined' && navigator.vibrate ? navigator.vibrate.bind(navigator) : null
// 설정에서 진동 끄기 — 앱 안 모든 진동(vibrate 직접 호출 포함)
export function setHaptics(on) { off = on === false; if (vib0) navigator.vibrate = off ? () => false : vib0 }
export function haptic() {
  if (off) return
  try {
    if (navigator.vibrate) { navigator.vibrate(8); return }
    if (!el) {
      el = document.createElement('label')
      el.setAttribute('aria-hidden', 'true')
      el.style.cssText = 'position:fixed;left:-99px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none'
      const i = document.createElement('input'); i.type = 'checkbox'; i.setAttribute('switch', ''); i.tabIndex = -1
      el.appendChild(i); document.body.appendChild(el)
    }
    el.click()
  } catch {}
}

// 기본 스위치를 지원하는 브라우저(iOS 17.4+ Safari)에서만 스위치 모양을 기본으로
try { if ('switch' in HTMLInputElement.prototype) document.documentElement.classList.add('has-switch') } catch {}
