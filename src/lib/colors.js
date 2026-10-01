// 과목 색 자동 조화: 저채도 팔레트에서 이미 쓰는 색과 색상(hue)이 가장 멀리 떨어진 색을 고름
import { SOFT_PALETTE, PALETTE } from '../store/schema.js'

export function hue(hex) {
  const n = parseInt(String(hex || '').replace('#', ''), 16)
  if (isNaN(n)) return null
  const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  if (d < 0.04) return null // 회색 계열
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}
const dist = (a, b) => { const x = Math.abs(a - b) % 360; return Math.min(x, 360 - x) }

export function pickColor(used = [], palette = SOFT_PALETTE) {
  const taken = new Set(used.map((c) => (c || '').toLowerCase()))
  const hues = used.map(hue).filter((h) => h != null)
  const cands = palette.filter((c) => !taken.has(c.toLowerCase()) && hue(c) != null)
  if (!cands.length) return palette[used.length % palette.length]
  if (!hues.length) return cands[0]
  return cands.map((c) => ({ c, d: Math.min(...hues.map((h) => dist(h, hue(c)))) })).sort((a, b) => b.d - a.d)[0].c
}

// 모든 과목 색을 서로 어울리게 다시 배정 (기본 팔레트 순서 = 저채도 색상환 순)
export function harmonize(n) {
  const base = PALETTE.filter((c) => hue(c) != null)
  const out = []
  for (let i = 0; i < n; i++) out.push(pickColor(out, base.length > i ? base : SOFT_PALETTE))
  return out
}
