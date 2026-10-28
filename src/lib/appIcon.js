// 홈 화면 앱 아이콘: 고른 그림을 apple-touch-icon 으로 (홈 화면에 다시 추가할 때 반영)
// 틴트용: iOS 홈 화면 '틴트' 아이콘 모드는 밝기만 남겨 색을 입히므로, 어두운 바탕 + 밝기 단계가 다른 흰 선으로 만듦
export const APP_ICONS = [['', '기본'], ['light', '화이트'], ['dark', '차콜'], ['mono', '블랙'], ['olive', '그레이'], ['tint', '틴트용'],
  ['book', '책'], ['book-d', '책 다크'], ['pencil', '연필'], ['pencil-d', '연필 다크'], ['page', '공책'], ['page-d', '공책 다크'], ['clock', '시계'], ['clock-d', '시계 다크'], ['dots', '점'], ['dots-d', '점 다크'], ['moon', '달'], ['moon-d', '달 다크']] // 모두 모노톤 (키는 예전 선택 유지용)
const base = import.meta.env.BASE_URL
export const iconSrc = (k) => (k ? `${base}icons/${k}.png` : `${base}apple-touch-icon.png`)
export function getAppIcon() { try { return localStorage.getItem('app_icon') || '' } catch { return '' } }
export function applyAppIcon(k = getAppIcon()) {
  try {
    document.querySelector('link[rel="apple-touch-icon"]')?.setAttribute('href', iconSrc(k))
    document.querySelector('link[rel="icon"]')?.setAttribute('href', k ? `${base}icons/${k}.svg` : `${base}icon.svg`)
  } catch {}
}
export function setAppIcon(k) { try { localStorage.setItem('app_icon', k) } catch {} applyAppIcon(k) }
