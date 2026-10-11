// 홈 화면 앱 아이콘: 고른 그림을 apple-touch-icon 으로 (홈 화면에 다시 추가할 때 반영)
// 틴트용: iOS 홈 화면 '틴트' 아이콘 모드는 밝기만 남겨 색을 입히므로, 어두운 바탕 + 밝기 단계가 다른 흰 선으로 만듦
export const APP_ICONS = [['', '기본'], ['light', '라이트'], ['dark', '다크'], ['mono', '모노'], ['olive', '올리브'], ['tint', '틴트용']]
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
