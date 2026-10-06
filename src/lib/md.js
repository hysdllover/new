// 마크다운 → 노트 블록 (순수 함수) — 붙여넣기 · 끌어다 놓기 · .md 파일 가져오기
// 지원: 속성(---) · 제목(#, === / --- 밑줄형) · 목록(들여쓰기·번호) · 체크 · 인용(여러 줄) · 강조 상자(> [!note]) ·
//       코드(``` / ~~~) · 표(정렬·\| ) · 구분선 · 각주 · 줄 안 꾸밈(굵게·형광·밑줄·링크·이미지·위키 링크)
const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const nb = (type = 'text', text = '', extra) => ({ id: id(), type, text, ...extra })

const ENT = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" }

// 줄 안 꾸밈: 마크다운 → 앱 기호 (**굵게** · ==형광== · __밑줄__ · [[링크]])
export function inlineMd(s) {
  const keep = []
  let x = String(s || '')
    .replace(/\\([\\`*_{}[\]()#+\-.!|>~=])/g, (m, c) => { keep.push(c); return `\u0000${keep.length - 1}\u0000` }) // \* 같은 글자 그대로
  x = x
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, '$1') // ![[그림.png]] → 이름
    .replace(/\[\[([^\]|]+)\|[^\]]*\]\]/g, '[[$1]]') // [[노트|별칭]] → [[노트]]
    .replace(/!\[([^\]]*)\]\(<?([^)\s>]+)>?(?:\s+"[^"]*")?\)/g, (m, alt, u) => (alt ? alt + ' ' : '') + u) // 이미지 → 설명 + 주소
    .replace(/\[([^\]]+)\]\(<?([^)\s>]+)>?(?:\s+"[^"]*")?\)/g, (m, t, u) => {
      if (/^https?:|^mailto:/i.test(u)) return t === u ? u : `${t} ${u}`
      return `[[${t}]]` // 다른 .md 페이지 링크 → 노트 링크
    })
    .replace(/<(https?:\/\/[^>\s]+)>/g, '$1')
    .replace(/<u>([\s\S]+?)<\/u>/gi, '\u0001$1\u0001').replace(/<mark>([\s\S]+?)<\/mark>/gi, '==$1==')
    .replace(/<(b|strong)>([\s\S]+?)<\/\1>/gi, '**$2**')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/(^|[^_\w])__([^_\n]+?)__(?![_\w])/g, '$1**$2**') // 마크다운의 __굵게__ → 굵게 (앱 밑줄은 <u>)
    .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, '$1$2') // *기울임* → 글자만
    .replace(/(^|[^_\w])_(?!\s)([^_\n]+?)_(?![_\w])/g, '$1$2')
    .replace(/~~([^~\n]+?)~~/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\[\^([^\]]+)\]/g, '[$1]') // 각주 표시
    .replace(/&(nbsp|amp|lt|gt|quot|apos|#39);/g, (m) => ENT[m] || m)
    .replace(/\u0001([\s\S]+?)\u0001/g, '__$1__') // <u>밑줄</u> → 앱 밑줄
  return x.replace(/\u0000(\d+)\u0000/g, (m, i) => keep[+i])
}

const TONE = { note: 'key', info: 'key', important: 'key', tip: 'ex', hint: 'ex', example: 'ex', success: 'olive', check: 'olive', done: 'olive', summary: 'olive', abstract: 'olive', tldr: 'olive', question: 'sand', help: 'sand', faq: 'sand', todo: 'sand', quote: 'rose', cite: 'rose', warning: 'warn', caution: 'warn', attention: 'warn', danger: 'warn', error: 'warn', bug: 'warn', failure: 'warn' }
// 표 한 줄 → 칸 (\| 는 글자 그대로)
const splitRow = (r) => {
  let t = r.trim(); if (t.startsWith('|')) t = t.slice(1); if (t.endsWith('|') && !t.endsWith('\\|')) t = t.slice(0, -1)
  const cells = []; let cur = ''
  for (let k = 0; k < t.length; k++) { if (t[k] === '\\' && t[k + 1] === '|') { cur += '|'; k++ } else if (t[k] === '|') { cells.push(cur); cur = '' } else cur += t[k] }
  cells.push(cur)
  return cells.map((c) => inlineMd(c.trim()))
}
const SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/
const HR = /^ {0,3}([-*_])(\s*\1){2,}\s*$/
const LIST = /^(\s*)([-*+•]|\d{1,3}[.)])\s+(.*)$/

// 마크다운 → 블록. 제목 단계는 글에 쓰인 단계 중 가장 높은 것을 제목 1, 그 아래를 제목 2로
export function mdToBlocks(text) {
  const out = []
  const lines = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n')
  let i = 0
  if (/^---\s*$/.test(lines[0] || '')) { const e = lines.findIndex((l, k) => k > 0 && /^(---|\.\.\.)\s*$/.test(l)); if (e > 0) i = e + 1 }
  const stack = [] // 목록 들여쓰기 단계
  const levelOf = (ind) => { while (stack.length && stack[stack.length - 1] > ind) stack.pop(); if (!stack.length || stack[stack.length - 1] < ind) stack.push(ind); return Math.min(3, stack.length - 1) }
  const para = []
  const flush = () => { if (para.length) { out.push(nb('text', inlineMd(para.join('\n')))); para.length = 0 } }
  for (; i < lines.length; i++) {
    const raw = lines[i], ln = raw.trim(), next = lines[i + 1] ?? ''
    if (!ln) { flush(); continue }
    if (/^<!--/.test(ln)) { flush(); while (i < lines.length && !/-->/.test(lines[i])) i++; continue }
    // 코드
    let m = /^(```+|~~~+)\s*([\w+-]*)/.exec(ln)
    if (m) {
      flush(); const fence = m[1], body = []
      for (i++; i < lines.length && !lines[i].trim().startsWith(fence); i++) body.push(lines[i])
      out.push(nb('code', body.join('\n').replace(/\s+$/, ''), m[2] ? { lang: m[2] } : null))
      continue
    }
    // 표 (머리줄 + 구분줄)
    if (ln.includes('|') && SEP.test(next) && next.includes('|')) {
      flush(); const rows = [splitRow(ln)], al = splitRow(next).map((c) => (/^:-+:$/.test(c) ? 'c' : /-+:$/.test(c) ? 'r' : 'l'))
      for (i += 2; i < lines.length && lines[i].trim().includes('|') && lines[i].trim(); i++) rows.push(splitRow(lines[i]))
      i--
      const cols = Math.max(...rows.map((r) => r.length))
      out.push({ id: id(), type: 'table', rows: rows.map((r) => Array.from({ length: cols }, (_, k) => r[k] ?? '')), ...(al.some((a) => a !== 'l') ? { align: Array.from({ length: cols }, (_, k) => al[k] || 'l') } : null) })
      continue
    }
    // 인용 · 강조 상자 (이어지는 > 줄을 한 블록으로)
    if (/^>/.test(ln)) {
      flush(); const body = []
      for (; i < lines.length && /^\s*>/.test(lines[i]); i++) body.push(lines[i].trim().replace(/^>\s?/, ''))
      i--
      const c = /^\[!(\w+)\][-+]?\s*(.*)$/.exec(body[0] || '')
      if (c) { const rest = body.slice(1).map((x) => x.replace(/^>\s?/, '')); out.push(nb('callout', inlineMd([c[2], ...rest].filter((x, k) => x || k).join('\n').trim()), { tone: TONE[c[1].toLowerCase()] || 'key' })) }
      else out.push(nb('quote', inlineMd(body.map((x) => x.replace(/^>\s?/, '')).join('\n').trim())))
      continue
    }
    // 밑줄형 제목 (글 + ===/---)
    if (!LIST.test(raw) && !HR.test(raw) && /^(=+|-{2,})\s*$/.test(next.trim())) { const t = [...para, ln].join(' '); para.length = 0; out.push({ ...nb('h', inlineMd(t)), _lv: next.trim()[0] === '=' ? 1 : 2 }); i++; continue }
    if ((m = /^-{3,}\s+(.+?)\s+-{3,}$/.exec(ln))) { flush(); out.push(nb('divider', inlineMd(m[1]))); continue } // 제목 있는 구분선
    if (HR.test(raw)) { flush(); out.push(nb('divider', '')); continue }
    if ((m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(ln))) { flush(); out.push({ ...nb('h', inlineMd(m[2])), _lv: m[1].length }); stack.length = 0; continue }
    // 목록 · 체크
    if ((m = LIST.exec(raw))) {
      flush(); const lv = levelOf(m[1].length), mark = m[2], rest = m[3]
      const t = /^\[( |x|X|-|\/)\]\s*(.*)$/.exec(rest)
      const ext = lv ? { indent: lv } : {}
      if (t) out.push(nb('todo', inlineMd(t[2]), { ...ext, ...(/[xX]/.test(t[1]) ? { done: true } : null) }))
      else out.push(nb('bullet', inlineMd(rest), { ...ext, ...(/^\d/.test(mark) ? { num: parseInt(mark) } : null) }))
      continue
    }
    // 목록 항목 아래 이어지는 줄 → 그 항목에 붙임
    if (/^\s{2,}\S/.test(raw) && !para.length && out.length && ['bullet', 'todo'].includes(out[out.length - 1].type)) { out[out.length - 1].text += '\n' + inlineMd(ln); continue }
    // 각주 정의
    if ((m = /^\[\^([^\]]+)\]:\s*(.*)$/.exec(ln))) { flush(); out.push(nb('text', `[${m[1]}] ${inlineMd(m[2])}`)); continue }
    stack.length = 0
    para.push(ln.replace(/\s{2,}$|\\$/, ''))
  }
  flush()
  // 제목 단계 맞추기: 가장 높은 단계 → 제목 1, 나머지 → 제목 2
  const lvs = [...new Set(out.filter((b) => b._lv).map((b) => b._lv))].sort((a, b) => a - b)
  for (const b of out) if (b._lv) { b.type = b._lv === lvs[0] ? 'h1' : 'h2'; delete b._lv }
  return out
}

export const looksMd = (t) => String(t || '').split('\n').length > 1 && /^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s?|\[[ xX]?\]|\|.*\||-{3,}\s*$|```|~~~)/m.test(t)

// 파일 이름 정리: 노션 내보내기의 뒤쪽 32자리 id·확장자 빼기
export const cleanName = (n = '') => n.replace(/\.(md|markdown|txt)$/i, '').replace(/\s+[0-9a-f]{32}$/i, '').trim()

// .md 파일 한 개 → { title, blocks }: 제목은 속성 title → 맨 앞 # 제목 → 파일 이름
export function mdToNote(text, fileName = '') {
  const src = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const fm = /^---\n([\s\S]*?)\n(---|\.\.\.)/.exec(src), fmTitle = fm && /^title:\s*["']?(.+?)["']?\s*$/m.exec(fm[1])?.[1]
  let body = src, title = fmTitle || ''
  // 맨 앞 # 제목 한 줄은 페이지 제목으로 (본문 제목 단계 계산에서 뺌)
  {
    const start = fm ? fm[0].length : 0, m = /^\s*#\s+(.+?)\s*#*\s*\n/.exec(src.slice(start) + '\n')
    const h = m && inlineMd(m[1]).replace(/\*\*|==|__/g, '').trim()
    // 맨 앞 # 제목: 속성 제목이 없거나 같으면 페이지 제목으로 쓰고 본문에서 뺌
    if (h && (!title || h === title.trim())) { title = h; body = (fm ? fm[0] + '\n' : '') + src.slice(start).replace(/^\s*#\s+.+\n?/, '') }
  }
  const blocks = mdToBlocks(body)
  if (!title) title = cleanName(fileName)
  return { title: title.trim() || '가져온 노트', blocks: blocks.length ? blocks : [nb()] }
}

// 블록 요약 (가져오기 미리보기용)
export function mdSummary(blocks) {
  const c = (t) => blocks.filter((b) => b.type === t).length
  return [['제목', c('h1') + c('h2')], ['목록', c('bullet')], ['할 일', c('todo')], ['표', c('table')], ['인용', c('quote') + c('callout')], ['코드', c('code')]].filter(([, n]) => n).map(([l, n]) => `${l} ${n}`).join(' · ')
}
