// 마크다운 글을 노트 블록으로 (순수 함수) — 붙여넣기 · 끌어다 놓기 · .md 파일 가져오기
const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const nb = (type = 'text', text = '') => ({ id: id(), type, text })

// 줄 안 꾸밈: 마크다운 → 앱 기호 (**굵게** · ==형광== · __밑줄__ 은 앱 기호와 같음)
export function inlineMd(s) {
  return String(s || '')
    .replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (m, alt, u) => (alt ? alt + ' ' : '') + u) // 이미지 → 설명 + 주소
    .replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, (m, t, u) => (t === u ? u : t + ' ' + u)) // 링크 → 글 + 주소
    .replace(/<u>(.+?)<\/u>/g, '__$1__').replace(/<mark>(.+?)<\/mark>/g, '==$1==')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1$2') // *기울임* → 글자만
    .replace(/(^|[^\w_])_([^_\s][^_]*?)_(?![\w_])/g, '$1$2')
    .replace(/~~(.+?)~~/g, '$1').replace(/`([^`]+)`/g, '$1')
    .replace(/<br\s*\/?>/gi, ' ').replace(/<\/?[a-z][^>]*>/gi, '')
}

const TONE = { note: 'key', info: 'key', tip: 'ex', example: 'ex', important: 'key', warning: 'warn', caution: 'warn', danger: 'warn', quote: 'rose', summary: 'olive', abstract: 'olive', todo: 'sand' }

// 마크다운 → 블록: 제목 · 목록 · 체크 · 인용 · 강조 상자(> [!note]) · 구분선 · 표 · 코드
export function mdToBlocks(text) {
  const out = [], lines = String(text || '').replace(/\r/g, '').split('\n')
  let i = 0
  // 맨 위 --- 속성(front matter) 은 건너뜀
  if (/^---\s*$/.test(lines[0] || '')) { const e = lines.findIndex((l, k) => k > 0 && /^---\s*$/.test(l)); if (e > 0) i = e + 1 }
  for (; i < lines.length; i++) {
    const raw = lines[i], ln = raw.trim()
    if (!ln) continue
    if (/^```/.test(ln)) { // 코드 → 줄마다 인용 블록 (글자 그대로)
      for (i++; i < lines.length && !/^```/.test(lines[i].trim()); i++) if (lines[i].trim()) out.push(nb('quote', lines[i].replace(/\t/g, '  ')))
      continue
    }
    if (/^\|.*\|$/.test(ln)) {
      const rows = []
      for (; i < lines.length && /^\|.*\|$/.test(lines[i].trim()); i++) { const r = lines[i].trim(); if (/^\|[\s:|-]+\|$/.test(r)) continue; rows.push(r.slice(1, -1).split('|').map((c) => inlineMd(c.trim()))) }
      i--
      if (rows.length) out.push({ id: nb().id, type: 'table', rows })
      continue
    }
    let m
    if ((m = /^>\s*\[!(\w+)\][-+]?\s*(.*)$/.exec(ln))) { // 강조 상자: > [!note] 제목 + 이어지는 > 줄
      const body = [m[2]]
      for (; i + 1 < lines.length && /^>/.test(lines[i + 1].trim()); i++) body.push(lines[i + 1].trim().replace(/^>\s?/, ''))
      out.push({ ...nb('callout', inlineMd(body.filter(Boolean).join(' '))), tone: TONE[m[1].toLowerCase()] || 'key' })
    }
    else if (/^(-{3,}|\*{3,}|_{3,})$/.test(ln)) out.push({ ...nb('divider'), text: '' })
    else if ((m = /^(#{1,6})\s+(.*)$/.exec(ln))) out.push(nb(m[1].length === 1 ? 'h1' : 'h2', inlineMd(m[2].replace(/\s+#+\s*$/, ''))))
    else if ((m = /^(?:[-*+]\s+)?\[( |x|X)?\]\s*(.*)$/.exec(ln))) out.push({ ...nb('todo', inlineMd(m[2])), ...(m[1] && m[1] !== ' ' ? { done: true } : null) })
    else if ((m = /^(?:[-*+•]|\d+[.)])\s+(.*)$/.exec(ln))) out.push(nb('bullet', inlineMd(m[1])))
    else if ((m = /^>\s?(.*)$/.exec(ln))) out.push(nb('quote', inlineMd(m[1])))
    else out.push(nb('text', inlineMd(ln)))
  }
  return out
}
export const looksMd = (t) => String(t || '').split('\n').length > 1 && /^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s?|\[[ xX]?\]|\|.*\||-{3,}\s*$|```)/m.test(t)

// .md 파일 한 개 → { title, blocks }: 제목은 속성 title → 첫 # 제목 → 파일 이름
export function mdToNote(text, fileName = '') {
  const src = String(text || '').replace(/\r/g, '')
  const fm = /^---\n([\s\S]*?)\n---/.exec(src), fmTitle = fm && /^title:\s*["']?(.+?)["']?\s*$/m.exec(fm[1])?.[1]
  let blocks = mdToBlocks(src), title = fmTitle || ''
  if (!title && blocks[0]?.type === 'h1') { title = blocks[0].text; blocks = blocks.slice(1) }
  if (!title) title = fileName.replace(/\.(md|markdown|txt)$/i, '')
  return { title: title.trim() || '가져온 노트', blocks: blocks.length ? blocks : [nb()] }
}
