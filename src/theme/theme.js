// 테마 프리셋과 CSS 변수 적용
import { fontFamily, loadFont } from '../lib/fonts.js'

export const PRESETS = {
  default: { name: '기본', accent: '#4a5a78', c2: '#7a8660', c3: '#a99bc4', c4: '#c9a0a8' },
  olive: { name: '올리브', accent: '#6f7a55', c2: '#4a5a78', c3: '#b5a47a', c4: '#c9a0a8' },
  violet: { name: '바이올렛', accent: '#8577a8', c2: '#c9a0a8', c3: '#7a8660', c4: '#8a9bb5' },
  rose: { name: '로즈', accent: '#b0838c', c2: '#a99bc4', c3: '#7a8660', c4: '#4a5a78' },
  mono: { name: '모노', accent: '#55585e', c2: '#8c8c86', c3: '#a5a5a0', c4: '#6e7075' },
  // 저채도 파스텔
  mist: { name: '안개', accent: '#6b7a8f', c2: '#9fb0a5', c3: '#b8aecb', c4: '#d1b3b3' },
  sage: { name: '세이지', accent: '#7d8a74', c2: '#a9b59c', c3: '#c9bfa6', c4: '#b7a9c4' },
  lavender: { name: '라벤더 미스트', accent: '#8e86a8', c2: '#b4acc9', c3: '#a9b8a4', c4: '#d3b2bb' },
  dustyrose: { name: '더스티 로즈', accent: '#a88890', c2: '#cfb2b7', c3: '#9ea6b8', c4: '#b9b39a' },
  sand: { name: '샌드 베이지', accent: '#9a8a74', c2: '#c2b49c', c3: '#a3a89a', c4: '#b59e9e' },
  slate: { name: '슬레이트 블루', accent: '#5f6f86', c2: '#93a3b8', c3: '#b3a9c2', c4: '#a7b3a0' },
  // 모노톤
  charcoal: { name: '차콜', accent: '#3f4146', c2: '#8a8c90', c3: '#b3b4b6', c4: '#6b6d72' },
  greige: { name: '그레이지', accent: '#6e6a64', c2: '#a8a39b', c3: '#c7c2ba', c4: '#8d8880' },
  bluegray: { name: '블루그레이', accent: '#5d6670', c2: '#9aa3ad', c3: '#c0c6cc', c4: '#7b848e' },
}

export const FONTS = {
  system: { name: '시스템', family: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Segoe UI", sans-serif' },
  pretendard: { name: 'Pretendard', family: '"Pretendard", -apple-system, sans-serif', href: 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/pretendard.min.css' },
  notosans: { name: 'Noto Sans KR', family: '"Noto Sans KR", -apple-system, sans-serif', href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600&display=swap' },
  notoserif: { name: 'Noto Serif KR', family: '"Noto Serif KR", serif', href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;500;600&display=swap' },
  gowun: { name: 'Gowun Dodum', family: '"Gowun Dodum", -apple-system, sans-serif', href: 'https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap' },
}

const DENSITY = { compact: 0.75, normal: 1, relaxed: 1.3 }

// 기기별 글자 크기·간격 (아이폰·아이패드 따로) — 이 기기 localStorage, 없으면 공용 테마 값 (아이패드는 기본 '여유')
const isPad = () => /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) || Math.min(screen.width, screen.height) >= 700
export const deviceTheme = () => { try { return JSON.parse(localStorage.getItem('device_theme') || '{}') } catch { return {} } }
export function setDeviceTheme(p, t) { try { localStorage.setItem('device_theme', JSON.stringify({ ...deviceTheme(), ...p })) } catch {} applyTheme(t) }
export const effTheme = (t) => { const d = deviceTheme(); return { ...t, fontSize: d.fontSize ?? t.fontSize, density: d.density ?? (isPad() && t.density === 'normal' ? 'relaxed' : t.density) } }
const familyOf = (key) => {
  const mine = key?.startsWith('my:') ? key.slice(3) : null
  if (mine) { loadFont(mine); return `"${fontFamily(mine)}", ${FONTS.system.family}` }
  const f = FONTS[key]
  if (f?.href && !document.querySelector(`link[data-font="${key}"]`)) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = f.href; l.dataset.font = key; document.head.appendChild(l) }
  return f ? f.family : null
}

export function applyTheme(t0) {
  const t = effTheme(t0)
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
    '--accent': accent, '--c2': t.c2 || p.c2, '--c3': t.c3 || p.c3, '--c4': t.c4 || p.c4,
    '--font': font.family, '--fs': t.fontSize + 'px', '--fw': t.fontWeight,
    '--fw-b': Math.min(t.fontWeight + 200, 700),
    '--radius': t.radius + 'px', '--gap': (12 * (DENSITY[t.density] || 1)) + 'px',
    // 제목·큰 숫자 글꼴 (비우면 본문과 같음)
    '--font-head': (t.headFont && familyOf(t.headFont)) || font.family,
  }
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  root.dataset.card = t.card
  if (t.mode === 'system') delete root.dataset.theme
  else root.dataset.theme = t.mode
}
