// 글자 꾸미기 기호: **굵게** · __밑줄__ · ==형광펜== (==r:로즈== 처럼 색 지정)
// 편집 칸에서 버튼 하나로 켜고 끄기 · 색 바꾸기 · 지우기
const RX = { b: /\*\*([^*\n]+)\*\*/g, u: /__([^_\n]+)__/g, h: /==(?:([rgby]):)?([^=\n]+)==/g }
const MK = { b: '**', u: '__', h: '==' }

// 꾸민 구간: { t, s, e (기호 포함), is, ie (안쪽 글자), c (형광 색) }
export function markRanges(text) {
  const out = []
  for (const t of ['b', 'u', 'h']) {
    for (const m of String(text || '').matchAll(RX[t])) {
      const s = m.index, e = s + m[0].length, pl = t === 'h' && m[1] ? 2 : 0
      out.push({ t, s, e, is: s + 2 + pl, ie: e - 2, c: t === 'h' ? m[1] || '' : undefined })
    }
  }
  return out
}

// 커서·선택 위치에 켜져 있는 꾸밈
export function activeMarks(text, a, z) {
  const on = {}
  for (const r of markRanges(text)) if (r.s <= a && r.e >= z && !(a === z && (a === r.s || a === r.e))) on[r.t] = r.t === 'h' ? r.c : true
  return on
}

const rebuild = (text, del, a, z) => {
  const before = (p) => [...del].filter((i) => i < p).length
  return { text: text.split('').filter((_, i) => !del.has(i)).join(''), a: a - before(a), z: z - before(z) }
}
const strip = (del, r) => { for (let i = r.s; i < r.is; i++) del.add(i); for (let i = r.ie; i < r.e; i++) del.add(i) }

// kind: 'b' · 'u' · 'h' · 'h:r' (색) · 'c' (지우기) → { text, a, z } (새 선택 = 꾸민 글자) 또는 null
export function applyMark(text, a, z, kind) {
  text = String(text || '')
  const [t, color = ''] = kind.split(':')
  if (a > z) [a, z] = [z, a]
  let rs = markRanges(text)
  if (a === z) {
    // 커서만 있으면: 이미 꾸민 구간 안이면 그 구간, 아니면 그 자리 단어, 단어도 없으면 줄 전체
    const sp = rs.filter((r) => t === 'c' || r.t === t).find((r) => r.s <= a && r.e >= a)
    if (sp) { a = sp.is; z = sp.ie } else {
      let s = a, e = a
      while (s > 0 && !/\s/.test(text[s - 1])) s--
      while (e < text.length && !/\s/.test(text[e])) e++
      if (s === e) { if (!text.trim()) return null; s = 0; e = text.length }
      a = s; z = e
    }
  }
  while (a < z && /\s/.test(text[a])) a++
  while (z > a && /\s/.test(text[z - 1])) z--
  if (a === z) return null
  if (t === 'c') {
    const del = new Set()
    for (const r of rs) if (r.s < z && r.e > a) strip(del, r)
    return del.size ? rebuild(text, del, a, z) : null
  }
  const own = rs.find((r) => r.t === t && r.s <= a && r.e >= z)
  if (own) {
    if (t === 'h' && own.c !== color) {
      const pre = color ? color + ':' : '', is = own.s + 2 + pre.length
      return { text: text.slice(0, own.s) + '==' + pre + text.slice(own.is, own.ie) + '==' + text.slice(own.e), a: is, z: is + (own.ie - own.is) }
    }
    const del = new Set(); strip(del, own)
    return rebuild(text, del, Math.max(a, own.is), Math.min(z, own.ie))
  }
  // 다른 꾸밈의 기호를 반만 걸치면 그 구간 전체로 넓힘 (기호가 엇갈리지 않게)
  for (let changed = true; changed;) {
    changed = false
    for (const r of rs) {
      const cross = r.s < z && r.e > a, inside = r.s >= a && r.e <= z, within = r.is <= a && r.ie >= z
      if (cross && !inside && !within) { a = Math.min(a, r.s); z = Math.max(z, r.e); changed = true }
    }
  }
  const inner = text.slice(a, z).replace(RX[t], (m0, x, y) => (t === 'h' ? y : x))
  const pre = t === 'h' && color ? color + ':' : '', open = MK[t] + pre
  return { text: text.slice(0, a) + open + inner + MK[t] + text.slice(z), a: a + open.length, z: a + open.length + inner.length }
}

// 편집 칸 뒤에 깔 글자별 모양: [{ x, mk, b, u, h }] (기호는 mk, 같은 모양끼리 묶음)
export function markRuns(text) {
  text = String(text || '')
  const f = Array.from({ length: text.length }, () => ({}))
  for (const r of markRanges(text)) {
    for (let i = r.s; i < r.is; i++) f[i].mk = true
    for (let i = r.ie; i < r.e; i++) f[i].mk = true
    for (let i = r.is; i < r.ie; i++) f[i][r.t] = r.t === 'h' ? r.c || 'd' : true
  }
  const out = []
  for (let i = 0; i < text.length; i++) {
    const k = JSON.stringify(f[i]), last = out[out.length - 1]
    if (last && last.k === k) last.x += text[i]
    else out.push({ k, x: text[i], ...f[i] })
  }
  return out
}
