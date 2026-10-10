// 리포트 날짜·큰 숫자·소제목 글꼴: '' = 앱 글꼴(기본) · 앱에 든 글꼴(FONTS 키) · 'my:<id>' 내 폰트
import { FONTS } from '../theme/theme.js'
import { fontFamily, loadFont, listFonts } from './fonts.js'

export const reportFontOptions = () => [['', '앱 글꼴과 같게'], ...Object.entries(FONTS).filter(([k]) => k !== 'system').map(([k, f]) => [k, f.name]), ...listFonts().map((f) => ['my:' + f.id, f.name + ' (내 폰트)'])]
const cssVar = (n) => (typeof document === 'undefined' ? '' : getComputedStyle(document.documentElement).getPropertyValue(n).trim())
const appFont = () => cssVar('--font-head') || cssVar('--font') || 'sans-serif'
export function reportFamily(key) {
  if (!key) return appFont()
  if (key.startsWith('my:')) return `"${fontFamily(key.slice(3))}", ${cssVar('--font') || 'sans-serif'}`
  return FONTS[key]?.family || appFont()
}
// 글꼴마다 보이는 크기가 달라서 맞춤 (펜 글씨는 작게 보임)
export const reportScale = (key) => ({ nanumpen: 1.3, gaegu: 1.08 })[key] || 1
// 글꼴 파일과 (한글은 조각마다라) 쓸 글자 조각까지 받아 둠
export async function loadReportFont(key, sample = '') {
  try { if (key?.startsWith('my:')) await loadFont(key.slice(3)); else await FONTS[key]?.load?.() } catch {}
  const fam = reportFamily(key)
  await Promise.all([300, 400].map((w) => document.fonts.load(`${w} 40px ${fam}`, sample || '0123456789가나다').catch(() => {})))
}
