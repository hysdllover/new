// 마크다운 글을 노트 블록으로 (순수 함수)
const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const nb = (type = 'text', text = '') => ({ id: id(), type, text })

// 마크다운 → 블록 (붙여넣기·끌어다 놓기): 제목 · 목록 · 체크 · 인용 · 구분선 · 표
export function mdToBlocks(text) {
  const out = [], lines = String(text || '').replace(/\r/g, '').split('\n')
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i], ln = raw.trim()
    if (!ln) continue
    if (/^\|.*\|$/.test(ln)) {
      const rows = []
      for (; i < lines.length && /^\|.*\|$/.test(lines[i].trim()); i++) { const r = lines[i].trim(); if (/^\|[\s:|-]+\|$/.test(r)) continue; rows.push(r.slice(1, -1).split('|').map((c) => c.trim())) }
      i--
      if (rows.length) out.push({ id: nb().id, type: 'table', rows })
      continue
    }
    let m
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(ln)) out.push({ ...nb('divider'), text: '' })
    else if ((m = /^(#{1,6})\s+(.*)$/.exec(ln))) out.push(nb(m[1].length === 1 ? 'h1' : 'h2', m[2]))
    else if ((m = /^(?:[-*+]\s+)?\[( |x|X)?\]\s*(.*)$/.exec(ln))) out.push({ ...nb('todo', m[2]), ...(m[1] && m[1] !== ' ' ? { done: true } : null) })
    else if ((m = /^(?:[-*+•]|\d+[.)])\s+(.*)$/.exec(ln))) out.push(nb('bullet', m[1]))
    else if ((m = /^>\s?(.*)$/.exec(ln))) out.push(nb('quote', m[1]))
    else out.push(nb('text', ln))
  }
  return out
}
export const looksMd = (t) => String(t || '').split('\n').length > 1 && /^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s?|\[[ xX]?\]|\|.*\||-{3,}\s*$)/m.test(t)
