// 테마 적용: 기본 · 연필 아날로그 / 필기 느낌 (늘 밝게)
export function applyTheme(st) {
  const r = document.documentElement
  r.dataset.theme = 'light'
  r.style.setProperty('--accent', st.accent || '#4a5a78')
  if (st.theme === 'pencil') r.dataset.pencil = ''; else delete r.dataset.pencil
  if (st.handFx !== false) r.dataset.hand = ''; else delete r.dataset.hand
}
