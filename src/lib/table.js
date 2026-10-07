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

// 표 → CSV (엑셀·넘버스 한글 깨짐 방지 BOM)
export function toCSV(b) {
  const q = (s) => (/[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s)
  return '﻿' + norm(b).rows.map((r) => r.map((x) => q(plain(x))).join(',')).join('\r\n')
}

// 표 → 엑셀(.xlsx) 한 장: 머리줄 굵게 · 열 너비 · 숫자는 숫자 칸으로 (외부 라이브러리 없이 zip 만)
export async function toXLSX(b, sheetName = '표') {
  const { zipSync, strToU8 } = await import('fflate')
  const t = norm(b), head = b?.head !== false
  const x = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const col = (i) => { let s = ''; for (i++; i; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s }
  const W = { s: 10, n: 16, w: 30 }
  const rows = t.rows.map((r, i) => `<row r="${i + 1}">${r.map((v, j) => {
    const p = plain(v), ref = col(j) + (i + 1), st = head && i === 0 ? ' s="1"' : ''
    return /^-?\d+(\.\d+)?$/.test(p) && !(head && i === 0) ? `<c r="${ref}"${st}><v>${p}</v></c>` : `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${x(p)}</t></is></c>`
  }).join('')}</row>`).join('')
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${x(String(sheetName).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || '표')}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Apple SD Gothic Neo"/></font><font><b/><sz val="11"/><name val="Apple SD Gothic Neo"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0"/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>`,
    'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${t.colW.map((w, j) => `<col min="${j + 1}" max="${j + 1}" width="${W[w] || 16}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData></worksheet>`,
  }
  return zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])))
}
