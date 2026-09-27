// 테마 프리셋과 CSS 변수 적용
import { fontFamily, loadFont } from '../lib/fonts.js'

export const PRESETS = {
  default: { name: '기본', accent: '#4a5a78', c2: '#7a8660', c3: '#a99bc4', c4: '#c9a0a8' },
  olive: { name: '올리브', accent: '#6f7a55', c2: '#4a5a78', c3: '#b5a47a', c4: '#c9a0a8' },
  violet: { name: '바이올렛', accent: '#8577a8', c2: '#c9a0a8', c3: '#7a8660', c4: '#8a9bb5' },
  rose: { name: '로즈', accent: '#b0838c', c2: '#a99bc4', c3: '#7a8660', c4: '#4a5a78' },
  mono: { name: '모노', accent: '#55585e', c2: '#8c8c86', c3: '#a5a5a0', c4: '#6e7075' },
}

export const FONTS = {
  system: { name: '시스템', family: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Segoe UI", sans-serif' },
  pretendard: { name: 'Pretendard', family: '"Pretendard", -apple-system, sans-serif', href: 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/pretendard.min.css' },
  notosans: { name: 'Noto Sans KR', family: '"Noto Sans KR", -apple-system, sans-serif', href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600&display=swap' },
  notoserif: { name: 'Noto Serif KR', family: '"Noto Serif KR", serif', href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;500;600&display=swap' },
  gowun: { name: 'Gowun Dodum', family: '"Gowun Dodum", -apple-system, sans-serif', href: 'https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap' },
}

const DENSITY = { compact: 0.75, normal: 1, relaxed: 1.3 }

export function applyTheme(t) {
  const root = document.documentElement
  const p = PRESETS[t.preset] || PRESETS.default
  const accent = t.accent || p.accent
  const mine = t.font?.startsWith('my:') ? t.font.slice(3) : null
  if (mine) loadFont(mine)
  const font = mine ? { family: `"${fontFamily(mine)}", ${FONTS.system.family}` } : FONTS[t.font] || FONTS.system
  if (font.href && !document.querySelector(`link[data-font="${t.font}"]`)) {
    const l = document.createElement('link')
    l.rel = 'stylesheet'; l.href = font.href; l.dataset.font = t.font
    document.head.appendChild(l)
  }
  const vars = {
    '--accent': accent, '--c2': p.c2, '--c3': p.c3, '--c4': p.c4,
    '--font': font.family, '--fs': t.fontSize + 'px', '--fw': t.fontWeight,
    '--fw-b': Math.min(t.fontWeight + 200, 700),
    '--radius': t.radius + 'px', '--gap': (12 * (DENSITY[t.density] || 1)) + 'px',
  }
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  root.dataset.card = t.card
  if (t.mode === 'system') delete root.dataset.theme
  else root.dataset.theme = t.mode
}
