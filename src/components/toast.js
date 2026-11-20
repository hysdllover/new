// 아래쪽 짧은 알림 · 시트(아래에서 올라오는 창) 상태 — React 밖에서도 부를 수 있게
const L = new Set()
let ui = { toast: null, sheets: [] }
const set = (p) => { ui = { ...ui, ...p }; L.forEach((f) => f()) }
export const uiSubscribe = (f) => { L.add(f); return () => L.delete(f) }
export const uiState = () => ui

let tt = null
export function toast(text, action = null) {
  clearTimeout(tt)
  set({ toast: { text, action, k: Date.now() } })
  tt = setTimeout(() => set({ toast: null }), action ? 4000 : 2200)
}
export const hideToast = () => { clearTimeout(tt); set({ toast: null }) }

let sk = 0
export function openSheet(render, opt = {}) {
  const id = ++sk
  const close = () => set({ sheets: ui.sheets.filter((s) => s.id !== id) })
  set({ sheets: [...ui.sheets, { id, render, title: opt.title || '', close }] })
  return close
}
export const closeTopSheet = () => { const s = ui.sheets[ui.sheets.length - 1]; if (s) s.close() }
