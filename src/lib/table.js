// 표 블록 편집 (순수 함수): 줄·칸 옮기기 · 넣기 · 지우기 · 정렬 · 붙여넣기 · 복사
// 표 = { rows: [[글]], align: ['l'|'c'|'r'], colW: ['s'|'n'|'w'], head: 머리줄(기본 켬), headCol, stripe }

export function norm(b) {
  const rows0 = b?.rows?.length ? b.rows : [['', ''], ['', '']]
  const cols = Math.max(1, ...rows0.map((r) => r.length))
  const rows = rows0.map((r) => Array.from({ length: cols }, (_, k) => r[k] ?? ''))
  const align = Array.from({ length: cols }, (_, k) => (b?.align || [])[k] || 'l')
  const colW = Array.from({ length: cols }, (_, k) => (b?.colW || [])[k] || 'n')
  return { rows, align, colW, cols }
}

const move = (a, from, to) => { const x = [...a]; const [v] = x.splice(from, 1); x.splice(to, 0, v); return x }
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export function moveRow(b, from, to) {
  const t = norm(b); to = clamp(to, 0, t.rows.length - 1)
  return { rows: move(t.rows, from, to) }
}
export function moveCol(b, from, to) {
  const t = norm(b); to = clamp(to, 0, t.cols - 1)
  return { rows: t.rows.map((r) => move(r, from, to)), align: move(t.align, from, to), colW: move(t.colW, from, to) }
}
export function insRow(b, at) {
  const t = norm(b), rows = [...t.rows]
  rows.splice(clamp(at, 0, rows.length), 0, Array(t.cols).fill(''))
  return { rows }
}
export function insCol(b, at) {
  const t = norm(b), k = clamp(at, 0, t.cols)
  const ins = (a, v) => { const x = [...a]; x.splice(k, 0, v); return x }
  return { rows: t.rows.map((r) => ins(r, '')), align: ins(t.align, 'l'), colW: ins(t.colW, 'n') }
}
export function delRow(b, i) {
  const t = norm(b)
  if (t.rows.length <= 1) return { rows: [Array(t.cols).fill('')] }
  return { rows: t.rows.filter((_, k) => k !== i) }
}
export function delCol(b, j) {
  const t = norm(b)
  if (t.cols <= 1) return { rows: t.rows.map(() => ['']), align: ['l'], colW: ['n'] }
  const rm = (a) => a.filter((_, k) => k !== j)
  return { rows: t.rows.map(rm), align: rm(t.align), colW: rm(t.colW) }
}
export function dupRow(b, i) {
  const t = norm(b), rows = [...t.rows]
  rows.splice(i + 1, 0, [...rows[i]])
  return { rows }
}

// 칸 j 기준 정렬 (머리줄은 그대로, 빈 칸은 맨 뒤, 숫자는 크기대로)
const plain = (s) => String(s || '').replace(/\*\*|==(?:[rgby]:)?|__/g, '').trim()
export function sortBy(b, j, dir = 1) {
  const t = norm(b), head = b?.head !== false ? 1 : 0
  const body = t.rows.slice(head).map((r, k) => ({ r, k }))
  body.sort((x, y) => {
    const a = plain(x.r[j]), c = plain(y.r[j])
    if (!a !== !c) return a ? -1 : 1
    const n = a.localeCompare(c, 'ko', { numeric: true, sensitivity: 'base' })
    return n ? n * dir : x.k - y.k
  })
  return { rows: [...t.rows.slice(0, head), ...body.map((x) => x.r)] }
}

// 표 모양 글 (엑셀·넘버스·구글 시트 → 탭, 또는 쉼표) → 2차원 배열. 따옴표 안 줄바꿈·구분자 지원
export function parseGrid(text, sep) {
  const s = String(text || '').replace(/\r\n?/g, '\n').replace(/\n+$/, '')
  if (!s) return []
  sep = sep || (s.includes('\t') ? '\t' : ',')
  const out = []; let row = [], cur = '', q = false
  for (let k = 0; k < s.length; k++) {
    const ch = s[k]
    if (q) {
      if (ch === '"' && s[k + 1] === '"') { cur += '"'; k++ } else if (ch === '"') q = false; else cur += ch
    } else if (ch === '"' && !cur) q = true
    else if (ch === sep) { row.push(cur); cur = '' }
    else if (ch === '\n') { row.push(cur); out.push(row); row = []; cur = '' }
    else cur += ch
  }
  row.push(cur); out.push(row)
  const cols = Math.max(...out.map((r) => r.length))
  return out.map((r) => Array.from({ length: cols }, (_, k) => (r[k] ?? '').trim()))
}
// 붙여 넣을 글이 표 모양인지 (탭이 있거나, 여러 줄이 같은 수의 쉼표)
export const looksGrid = (text) => {
  const s = String(text || '').trim()
  if (s.includes('\t')) return true
  return false
}

// (r, c) 칸부터 grid 를 채움 · 모자라면 줄·칸을 늘림
export function pasteGrid(b, r, c, grid) {
  const t = norm(b)
  const rowsN = Math.max(t.rows.length, r + grid.length), colsN = Math.max(t.cols, c + Math.max(...grid.map((g) => g.length)))
  const rows = Array.from({ length: rowsN }, (_, i) => Array.from({ length: colsN }, (_, j) => {
    const g = grid[i - r]?.[j - c]
    return g !== undefined ? g : t.rows[i]?.[j] ?? ''
  }))
  const pad = (a, v) => Array.from({ length: colsN }, (_, k) => a[k] || v)
  return { rows, align: pad(t.align, 'l'), colW: pad(t.colW, 'n') }
}

// 다른 앱(시트)에 붙여 넣을 탭 구분 글
export function toTSV(b) {
  const q = (s) => (/[\t\n"]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s)
  return norm(b).rows.map((r) => r.map((x) => q(plain(x))).join('\t')).join('\n')
}

// 마크다운 표 (| 와 줄바꿈은 \| · <br>)
export function tableMd(b) {
  const t = norm(b), esc = (s) => String(s || '').replace(/\|/g, '\\|').replace(/\n/g, '<br>')
  const line = (r) => '| ' + r.map(esc).join(' | ') + ' |'
  const sep = '|' + t.align.map((a) => ({ l: ' --- |', c: ' :---: |', r: ' ---: |' }[a])).join('')
  const head = b?.head !== false ? t.rows[0] : Array(t.cols).fill('')
  const body = b?.head !== false ? t.rows.slice(1) : t.rows
  return [line(head), sep, ...body.map(line)]
}
