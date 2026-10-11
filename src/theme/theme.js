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

// 글꼴은 앱 안에 포함 (인터넷 없이도 같은 모양) — 고를 때 한 번만 불러옴
export const FONTS = {
  system: { name: '시스템', family: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Segoe UI", sans-serif' },
  pretendard: { name: 'Pretendard', family: '"Pretendard Variable", "Pretendard", -apple-system, sans-serif', load: () => import('pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css') },
  notosans: { name: 'Noto Sans KR', family: '"Noto Sans KR Variable", "Noto Sans KR", -apple-system, sans-serif', load: () => import('@fontsource-variable/noto-sans-kr') },
  notoserif: { name: 'Noto Serif KR', family: '"Noto Serif KR Variable", "Noto Serif KR", serif', load: () => import('@fontsource-variable/noto-serif-kr') },
  gaegu: { name: '개구 (손글씨)', family: '"Gaegu", -apple-system, sans-serif', load: () => Promise.all([import('@fontsource/gaegu/300.css'), import('@fontsource/gaegu/400.css'), import('@fontsource/gaegu/700.css')]) },
  nanumpen: { name: '나눔손글씨 펜', family: '"Nanum Pen Script", -apple-system, sans-serif', load: () => import('@fontsource/nanum-pen-script/400.css') },
  gowun: { name: 'Gowun Dodum', family: '"Gowun Dodum", -apple-system, sans-serif', load: () => import('@fontsource/gowun-dodum/400.css') },
}
const fontLoaded = new Set()

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
  if (f?.load && !fontLoaded.has(key)) { fontLoaded.add(key); f.load().catch(() => fontLoaded.delete(key)) }
  return f ? f.family : null
}

export function applyTheme(t0) {
  const t = effTheme(t0)
  const root = document.documentElement
  const p = PRESETS[t.preset] || PRESETS.default
  const accent = t.accent || p.accent
  const font = { family: familyOf(t.font) || FONTS.system.family }
  const vars = {
    '--accent': accent, '--c2': t.c2 || p.c2, '--c3': t.c3 || p.c3, '--c4': t.c4 || p.c4,
    '--font': font.family, '--fs': t.fontSize + 'px', '--fw': t.fontWeight,
    '--fw-b': Math.min(t.fontWeight + 200, 700),
    '--radius': t.radius + 'px', '--gap': (12 * (DENSITY[t.density] || 1)) + 'px',
    // 제목·큰 숫자 글꼴 (비우면 본문과 같음)
    '--font-head': (t.headFont && familyOf(t.headFont)) || font.family,
  }
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  // 노트: 종이 질감 + 노트 요소(모눈 · 머리줄 · 손글씨 제목)
  root.dataset.card = t.card === 'note' ? 'paper' : t.card
  root.toggleAttribute('data-note', t.card === 'note')
  // 아이콘 선 굵기·끝 모양
  // 아이콘 선 굵기: '글자 따라'(기본)면 글자 굵기에 맞춤
  root.style.setProperty('--icon-sw', { thin: 1.15, normal: 1.5, bold: 2 }[t.iconWeight] || ({ 300: 1.25, 400: 1.5, 500: 1.75 }[t.fontWeight] || 1.4))
  root.dataset.icons = t.iconShape === 'square' ? 'square' : 'round'
  // 디자인 세부 (설정 › 디자인 세부)
  const paper = t.card === 'paper' || t.card === 'note'
  const D = { check: t.checkShape || (paper ? 'pencil' : 'square'), prog: t.progStyle || (paper ? 'pencil' : 'solid'), hl: t.hlStyle || 'mid', quote: t.quoteStyle || 'line', callout: t.calloutStyle || 'tag', div: t.divStyle || 'solid', done: t.doneStyle || 'strike', cardb: t.cardBorder || 'normal', tabl: t.tabLabels === false ? 'icon' : 'text' }
  for (const [k, v] of Object.entries(D)) root.dataset[k] = v
  root.toggleAttribute('data-icofill', t.iconFill === 'fill')
  root.toggleAttribute('data-fold', t.card === 'note' && t.fold !== false)
  Object.assign(D, { bullet: t.bulletStyle || 'dot', link: t.linkStyle || 'under', hlc: t.hlCorner || 'square', shadow: t.shadowDepth || 'normal', tabsel: t.tabSel || 'color', thc: t.thColor || 'gray' })
  for (const k of ['bullet', 'link', 'hlc', 'shadow', 'tabsel', 'thc']) root.dataset[k] = D[k]
  root.toggleAttribute('data-margin', !!t.noteMargin)
  Object.assign(root.dataset, { tone: t.textTone || 'ink', btn: t.btnStyle || 'line', seg: t.segStyle || 'pill', nalign: t.noteAlign || 'left', nimg: t.noteImg || 'round', calnum: t.calNum || 'body', caltoday: t.calToday || 'circle', bar: t.chartBar || 'normal' })
  root.toggleAttribute('data-titleline', !!t.titleLine)
  root.toggleAttribute('data-pastdim', !!t.calPastDim)
  root.style.setProperty('--font-note', (t.noteFont && familyOf(t.noteFont)) || 'inherit')
  root.dataset.mdens = t.monthDensity || 'normal'
  root.toggleAttribute('data-wkend', t.weekendTint !== false)
  root.toggleAttribute('data-tlhalf', !!t.tlHalf)
  root.style.setProperty('--home-a', String((t.homeAlpha ?? 1) * 100) + '%')
  const HS = { s: [1.25, 1.06], m: [1.45, 1.18], l: [1.7, 1.32] }
  root.style.setProperty('--h1-size', HS[t.h1Size || 'm'][0] + 'em'); root.style.setProperty('--h2-size', HS[t.h2Size || 'm'][1] + 'em')
  root.style.setProperty('--note-lh', { tight: 1.45, normal: 1.6, loose: 1.85 }[t.noteLH || 'normal'])
  root.style.setProperty('--tint-a', ({ light: 5, normal: 8, strong: 14 }[t.tint || 'normal']) + '%')
  const R = t.radius ?? 10
  root.style.setProperty('--r-card', (t.rCard ?? R) + 'px'); root.style.setProperty('--r-btn', (t.rBtn ?? Math.max(0, R - 2)) + 'px'); root.style.setProperty('--r-input', (t.rInput ?? Math.max(0, R - 2)) + 'px')
  root.style.setProperty('--grain', t.grain ?? 1)
  // 날짜 머리(손글씨 + 물결 밑줄) · 손글씨 글꼴 · 노트 기본 폭
  root.dataset.datehead = t.dateHead || 'plain'
  root.style.setProperty('--font-hand', (t.handFont && familyOf(t.handFont)) || 'var(--font-head)')
  root.dataset.nwidth = t.noteWidth || 'normal'
  root.style.setProperty('--grid-size', (t.gridSize || 18) + 'px')
  root.style.setProperty('--grid-a', (t.gridAlpha ?? 5.5) + '%')
  if (t.mode === 'system') delete root.dataset.theme
  else root.dataset.theme = t.mode
}
