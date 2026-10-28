// 홈 화면 앱 아이콘: 고른 그림을 apple-touch-icon 으로 (홈 화면에 다시 추가할 때 반영)
// 틴트용: iOS 홈 화면 '틴트' 아이콘 모드는 밝기만 남겨 색을 입히므로, 어두운 바탕 + 밝기 단계가 다른 흰 선으로 만듦
export const APP_ICONS = [['', '기본'], ['light', '페일'], ['dark', '다크'], ['mono', '딥'], ['olive', '미드'], ['tint', '틴트용'],
  ['mountain', '산'], ['mountain-d', '산 다크'], ['wave', '물결'], ['wave-d', '물결 다크'], ['sunrise', '해돋이'], ['sunrise-d', '해돋이 다크'], ['sprout', '새싹'], ['sprout-d', '새싹 다크'], ['stars', '별자리'], ['stars-d', '별자리 다크'], ['orbit', '궤도'], ['orbit-d', '궤도 다크'], ['clock', '시계'], ['clock-d', '시계 다크'], ['dots', '점'], ['dots-d', '점 다크'], ['moon', '달'], ['moon-d', '달 다크']] // 모두 블루그레이 한 계열 (키는 예전 선택 유지용)
const base = import.meta.env.BASE_URL
export const iconSrc = (k) => (k ? `${base}icons/${k}.png` : `${base}apple-touch-icon.png`)
// 지금 목록에 없는 예전 그림(학용품 등)은 기본으로
export function getAppIcon() { try { const k = localStorage.getItem('app_icon') || ''; return APP_ICONS.some(([v]) => v === k) ? k : '' } catch { return '' } }
export function applyAppIcon(k = getAppIcon()) {
  try {
    document.querySelector('link[rel="apple-touch-icon"]')?.setAttribute('href', iconSrc(k))
    document.querySelector('link[rel="icon"]')?.setAttribute('href', k ? `${base}icons/${k}.svg` : `${base}icon.svg`)
  } catch {}
}
export function setAppIcon(k) { try { localStorage.setItem('app_icon', k) } catch {} applyAppIcon(k) }
