// 노트 → 혼자 열리는 HTML 한 파일 (A4 인쇄 · 아이폰·아이패드 브라우저)
// 그림 첨부는 파일 안에 넣고, 하위 페이지는 뒤에 이어 붙임 (목차 링크)
import { list, find } from '../store/store.js'
import { getBlob, blobToDataUrl } from './files.js'
import { norm } from './table.js'

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const TONE = { key: '핵심', warn: '주의', ex: '예시', rose: '메모', olive: '정리', sand: '참고' }
const W = { s: 0.6, n: 1, w: 2 }

// 줄 안 꾸밈: **굵게** · ==형광== · __밑줄__ · [[링크]] · 주소 · @날짜
export function inlineHtml(text, pageIds = {}) {
  const keep = []
  const hold = (h) => { keep.push(h); return `\u0000${keep.length - 1}\u0000` }
  let x = String(text || '').replace(/https?:\/\/[^\s<>"]+/g, (u) => {
    let label = u.replace(/^https?:\/\//, '')
    try { const q = new URL(u); const id = q.searchParams.get('open'); if (id && q.pathname.includes('/new')) { const n = find('notes', id); label = '↗ ' + (n?.title || '노트') } } catch {}
    return hold(`<a href="${esc(u)}">${esc(label.length > 48 ? label.slice(0, 46) + '…' : label)}</a>`)
  })
  x = esc(x)
    .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
    .replace(/==(?:([rgby]):)?([^=\n]+)==/g, (m, c, t) => `<mark class="hl${c ? ' hl-' + c : ''}">${t}</mark>`)
    .replace(/__([^_\n]+)__/g, '<u>$1</u>')
    .replace(/\{\{D:([^{}\n]+)\}\}/g, (m, q) => ddayText(q))
    .replace(/\{\{([rgbvm]):([^{}\n]+)\}\}/g, '<span class="tc-$1">$2</span>')
    .replace(/\^([^\s^]{1,24})\^/g, '<sup>$1</sup>').replace(/(?<!~)~([^\s~]{1,24})~(?!~)/g, '<sub>$1</sub>')
    .replace(/\[\[([^\]]+)\]\]/g, (m, t) => { const id = pageIds[t]; return id ? `<a class="wl" href="#p-${id}">${t}</a>` : `<span class="wl">${t}</span>` })
    .replace(/(^|\s)(@(?:오늘|내일|모레|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2})(?:\s+\d{1,2}:\d{2})?)/g, '$1<span class="mt">$2</span>')
    .replace(/\n/g, '<br>')
  return x.replace(/\u0000(\d+)\u0000/g, (m, i) => keep[+i])
}

function ddayText(q) {
  const dd = /^\d{4}-\d{2}-\d{2}$/.test(q) ? { title: '', date: q } : list('ddays').find((x) => (x.title || '').trim() === q.trim())
  if (!dd) return q
  const d0 = new Date(); d0.setHours(0, 0, 0, 0)
  const n = Math.round((new Date(dd.date + 'T00:00') - d0) / 864e5)
  return `<span class="dd">${dd.title ? dd.title + ' ' : ''}<b>${n === 0 ? 'D-DAY' : n > 0 ? 'D-' + n : 'D+' + -n}</b></span>`
}

async function fileHtml(fileId, size, align) {
  const f = find('files', fileId)
  if (!f) return '<p class="muted">삭제된 파일</p>'
  if (f.type?.startsWith('image')) {
    try { const b = await getBlob(fileId); if (b) return `<figure${align === 'c' ? ' class="c"' : ''}><img src="${await blobToDataUrl(b)}" alt="${esc(f.name)}" style="width:${size === 'l' ? '100%' : size === 'm' ? '50%' : 'auto;max-width:240px'}"><figcaption>${esc(f.name)}</figcaption></figure>` } catch {}
  }
  return `<p class="file">📎 ${esc(f.name)}</p>`
}

function tableHtml(b, ctx) {
  const t = norm(b), head = b.head !== false, sum = t.colW.reduce((a, w) => a + (W[w] || 1), 0)
  const col = t.colW.map((w) => `<col style="width:${(((W[w] || 1) / sum) * 100).toFixed(1)}%">`).join('')
  const AL = { l: 'left', c: 'center', r: 'right' }
  const rows = t.rows.map((r, i) => {
    const cells = r.map((v, j) => { const th = (head && i === 0) || (b.headCol && j === 0); return `<${th ? 'th' : 'td'} style="text-align:${AL[t.align[j]]}">${inlineHtml(v, ctx.ids)}</${th ? 'th' : 'td'}>` }).join('')
    return `<tr${b.stripe && i % 2 === (head ? 0 : 1) && !(head && i === 0) ? ' class="zb"' : ''}>${cells}</tr>`
  })
  return `<div class="tbl"><table><colgroup>${col}</colgroup>${head ? `<thead>${rows[0]}</thead><tbody>${rows.slice(1).join('')}` : `<tbody>${rows.join('')}`}</tbody></table></div>`
}

async function blocksHtml(blocks, ctx) {
  const out = []
  for (const b of blocks || []) {
    const n0 = out.length
    const t = inlineHtml(b.text, ctx.ids), pad = b.indent ? ` style="margin-left:${b.indent * 22}px"` : ''
    switch (b.type) {
      case 'h1': out.push(`<h2>${t}</h2>`); break
      case 'h2': out.push(`<h3>${t}</h3>`); break
      case 'bullet': out.push(`<div class="li"${pad}><span class="mk">${b.num ? b.num + '.' : '•'}</span><div>${t}</div></div>`); break
      case 'todo': { const done = ctx.tasks.find((x) => x.id === b.taskId)?.done; out.push(`<div class="li todo${done ? ' done' : ''}"${pad}><span class="ck">${done ? '✓' : ''}</span><div>${t}</div></div>`); break }
      case 'callout': out.push(`<aside class="co co-${b.tone || 'key'}"><span class="co-t">${TONE[b.tone || 'key'] || '핵심'}</span><div>${t}</div></aside>`); break
      case 'quote': out.push(`<blockquote>${t}</blockquote>`); break
      case 'code': out.push(`<pre${b.lang ? ` data-lang="${esc(b.lang)}"` : ''}><code>${esc(b.text)}</code></pre>`); break
      case 'divider': out.push(b.text ? `<div class="hrt ds-${b.ds || 'thin'}"><span>${t}</span></div>` : `<hr class="ds-${b.ds || 'thin'}">`); break
      case 'table': out.push(tableHtml(b, ctx)); break
      case 'toggle': out.push(`<details open><summary>${t || '접는 글'}</summary>${await blocksHtml(b.children, ctx)}</details>`); break
      case 'cols': { const [a, z] = (b.ratio || '1:1').split(':'); out.push(`<div class="cols" style="--a:${a}fr;--b:${z}fr">${(await Promise.all((b.cols || []).map((c) => blocksHtml(c, ctx)))).map((h) => `<div>${h}</div>`).join('')}</div>`); break }
      case 'sync': out.push(await blocksHtml(find('syncBlocks', b.syncId)?.blocks, ctx)); break
      case 'page': { const c = find('notes', b.pageId); if (c && !c.deleted) { ctx.subs.push(c); out.push(`<p class="sub"><a href="#p-${c.id}">↳ ${esc(c.title || '제목 없는 페이지')}</a></p>`) } break }
      case 'file': out.push(await fileHtml(b.fileId, b.size, b.align)); break
      case 'link': { let host = b.url; try { host = new URL(b.url).hostname.replace(/^www\./, '') } catch {} out.push(`<p class="lk"><a href="${esc(b.url)}">${esc(b.title || host)}</a> <span class="muted">${esc(host)}</span></p>`); break }
      case 'embed': out.push(`<p class="muted">(${{ tasks: '할 일 목록', calendar: '미니 캘린더', timer: '타이머' }[b.embed?.kind] || '임베드'} · 앱에서 보기)</p>`); break
      default: if ((b.text || '').trim()) out.push(`<p>${t}</p>`); else out.push('<p class="gap"></p>')
    }
    if (b.bgc && out.length > n0) out[out.length - 1] = `<div class="bgc bgc-${b.bgc}">${out[out.length - 1]}</div>`
  }
  return out.join('\n')
}

const CSS = `
:root{--ink:#2f3646;--soft:#6b7385;--line:#dfe2e8;--navy:#55658a;--olive:#7a8660;--rose:#c9a0a8;--violet:#a99bc4;--sand:#b5a47a;--paper:#fff;--tint:#f6f7f9}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:300 14px/1.7 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard","Noto Sans KR",sans-serif;letter-spacing:-.005em}
main{max-width:760px;margin:0 auto;padding:40px 16px 64px}
header{border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:22px}
h1{font-size:1.7em;font-weight:500;margin:0;letter-spacing:-.02em}
.meta{color:var(--soft);font-size:.8em;margin-top:6px;display:flex;gap:10px;flex-wrap:wrap}
.lab{display:inline-block;width:8px;height:8px;border-radius:50%;vertical-align:middle;margin-right:4px}
h2{font-size:1.3em;font-weight:500;margin:1.4em 0 .4em}
h3{font-size:1.1em;font-weight:500;margin:1.2em 0 .3em;color:var(--navy)}
p{margin:.35em 0}
p.gap{height:.4em}
b{font-weight:600}
u{text-decoration-color:var(--navy);text-underline-offset:3px}
mark.hl{background:linear-gradient(transparent 55%,#d8c69c99 55%);color:inherit;padding:0 1px}
mark.hl-r{background:linear-gradient(transparent 55%,#d6a9b199 55%)}
mark.hl-g{background:linear-gradient(transparent 55%,#a7b38a99 55%)}
mark.hl-b{background:linear-gradient(transparent 55%,#9db0cc99 55%)}
mark.hl-y{background:linear-gradient(transparent 55%,#d8c69c99 55%)}
a{color:var(--navy);text-decoration:none;border-bottom:1px solid #55658a55}
.wl{color:var(--navy);border-bottom:1px solid #55658a55}
.mt{color:var(--olive);background:#7a866014;border-radius:4px;padding:0 4px}
.li{display:flex;gap:8px;margin:.2em 0}
.li .mk{color:var(--soft);min-width:1em;text-align:right;flex:none}
.todo .ck{flex:none;width:15px;height:15px;margin-top:.3em;border:1px solid #9aa3ad;border-radius:4px;font-size:11px;line-height:13px;text-align:center;color:#fff}
.todo.done .ck{background:var(--olive);border-color:var(--olive)}
.todo.done>div{color:var(--soft);text-decoration:line-through;text-decoration-color:#9aa3ad}
.co{margin:.7em 0;padding:10px 14px;border-radius:8px;border-left:2px solid var(--navy);background:#55658a0d}
.co-t{display:block;font-size:.72em;color:var(--soft);letter-spacing:.06em;margin-bottom:2px}
.co-warn{border-color:var(--rose);background:#c9a0a814}.co-ex{border-color:var(--violet);background:#a99bc414}
.co-rose{border-color:var(--rose);background:#c9a0a80f}.co-olive{border-color:var(--olive);background:#7a866012}.co-sand{border-color:var(--sand);background:#b5a47a14}
blockquote{margin:.7em 0;padding:2px 14px;border-left:2px solid var(--line);color:var(--soft)}
pre{background:var(--tint);border:1px solid var(--line);border-radius:8px;padding:10px 12px;overflow-x:auto;font:400 12.5px/1.55 ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-word}
pre[data-lang]::before{content:attr(data-lang);display:block;font-size:10px;color:var(--soft);margin-bottom:4px}
hr{border:0;border-top:1px solid var(--line);margin:18px 0}
hr.ds-bold{border-top:2px solid #2f364688}hr.ds-dash{border-top-style:dashed}hr.ds-double{border-top:3px double var(--line)}
hr.ds-short{width:30%;margin-left:auto;margin-right:auto}hr.ds-space{border-color:transparent}
hr.ds-dots{border:0;text-align:center}hr.ds-dots::after{content:"·  ·  ·";color:var(--soft);letter-spacing:.3em}
.hrt{display:flex;align-items:center;gap:10px;margin:16px 0;color:var(--soft);font-size:.8em;letter-spacing:.06em}
.hrt::before,.hrt::after{content:"";flex:1;border-top:1px solid var(--line)}
.hrt.ds-dash::before,.hrt.ds-dash::after{border-top-style:dashed}
.tbl{overflow-x:auto;margin:.7em 0}
table{border-collapse:collapse;width:100%;font-size:.95em}
th,td{border:1px solid var(--line);padding:6px 9px;vertical-align:top;overflow-wrap:anywhere}
th{background:var(--tint);font-weight:500}
tr.zb td{background:#2f364608}
details{margin:.5em 0}
summary{cursor:pointer;font-weight:500}
details>:not(summary){margin-left:18px}
.cols{display:grid;grid-template-columns:var(--a) var(--b);gap:20px}
figure{margin:.8em 0}
img{max-width:100%;height:auto;border-radius:6px}
figcaption{font-size:.75em;color:var(--soft);margin-top:2px}
.file,.muted{color:var(--soft);font-size:.9em}
.sub a{border:0}
h1.h-sub{font-size:1.4em}
.page+.page{margin-top:48px;border-top:1px solid var(--line);padding-top:28px}
.toc{font-size:.85em;color:var(--soft);margin:-8px 0 20px}
.toc::before{content:"하위 페이지  ";}
.toc a{margin-right:10px}
.tc-r{color:#a9707b}.tc-g{color:#6b7650}.tc-b{color:#4e6085}.tc-v{color:#7e6fab}.tc-m{color:#868d97}
sup,sub{font-size:.72em;line-height:0}
.dd{padding:0 6px;border-radius:5px;background:#55658a14;white-space:nowrap}.dd b{color:var(--navy);font-weight:500}
.bgc{border-radius:6px;padding:2px 10px;margin:2px 0}.bgc-rose{background:#c9a0a829}.bgc-olive{background:#7a866024}.bgc-navy{background:#55658a1f}.bgc-violet{background:#a99bc429}.bgc-sand{background:#b5a47a26}.bgc-gray{background:#9aa3ad24}
figure.c{text-align:center}.lk{margin:.5em 0;padding:8px 12px;border:1px solid var(--line);border-radius:8px}.lk a{border:0}
footer{margin-top:40px;color:#9aa3ad;font-size:.72em;text-align:right}
@media (max-width:600px){body{font-size:15px}main{padding:28px 16px 48px}.cols{grid-template-columns:1fr;gap:4px}}
@page{size:A4;margin:16mm 15mm}
@media print{body{font-size:10.5pt}main{max-width:none;padding:0}.page+.page{break-before:page;border:0;margin-top:0;padding-top:0}
 h2,h3{break-after:avoid}table,pre,figure,.co,blockquote,.li{break-inside:avoid}a{border:0}
 *{-webkit-print-color-adjust:exact;print-color-adjust:exact}footer{display:none}}
`

const LABEL = { navy: '#55658a', olive: '#7a8660', rose: '#c9a0a8', violet: '#a99bc4', sand: '#b5a47a', gray: '#9aa3ad' }

// withSubs: 하위 페이지까지 이어 붙임 (한 번씩만) · [[링크]]는 이 파일 안 페이지면 그 자리로 이동
export async function noteToHtml(note, { withSubs = true } = {}) {
  const tasks = list('tasks'), subjects = list('subjects')
  const inside = new Set()
  const collect = (n) => { inside.add(n.id); if (withSubs) for (const b of n.blocks || []) if (b.type === 'page') { const c = find('notes', b.pageId); if (c && !c.deleted && !inside.has(c.id)) collect(c) } }
  collect(note)
  const ids = {}
  for (const id of inside) { const n = find('notes', id); if (n?.title) ids[n.title.trim()] = id }
  const pages = [], seen = new Set()
  const render = async (n) => {
    seen.add(n.id)
    const ctx = { tasks, ids, subs: [] }
    const body = await blocksHtml(n.blocks, ctx)
    const sub = subjects.find((s) => s.id === n.subjectId), lc = n.label && (LABEL[n.label] || LABEL.gray)
    const meta = [lc && `<span><i class="lab" style="background:${lc}"></i></span>`, sub && `<span>${esc(sub.name)}</span>`, `<span>${new Date(n.updatedAt || Date.now()).toLocaleDateString('ko-KR')}</span>`].filter(Boolean).join('')
    pages.push({ n, head: `<header><h1${pages.length ? ' class="h-sub"' : ''}>${esc(n.icon && !n.icon.startsWith('i:') ? n.icon + ' ' : '')}${esc(n.title || '제목 없음')}</h1><div class="meta">${meta}</div></header>`, body })
    if (withSubs) for (const c of ctx.subs) if (!seen.has(c.id)) await render(c)
  }
  await render(note)
  const toc = pages.length > 1 ? `<nav class="toc">${pages.slice(1).map((p) => `<a href="#p-${p.n.id}">${esc(p.n.title || '제목 없음')}</a>`).join('')}</nav>` : ''
  const art = pages.map((p, i) => `<article class="page" id="p-${p.n.id}">${p.head}${i ? '' : toc}${p.body}</article>`).join('\n')
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(note.title || '노트')}</title><style>${CSS}</style></head>
<body><main>
${art}
<footer>${new Date().toLocaleDateString('ko-KR')} 내보냄</footer>
</main></body></html>`
}

// 저장: 아이폰·아이패드는 공유 시트(파일에 저장), 그 밖은 내려받기
export async function exportNoteHtml(note, opts) {
  const html = await noteToHtml(note, opts)
  const name = `${(note.title || '노트').replace(/[\\/:*?"<>|]/g, ' ').trim() || '노트'}.html`
  const file = new File([html], name, { type: 'text/html' })
  const touch = navigator.maxTouchPoints > 0 && /iP(hone|ad)|Macintosh/.test(navigator.userAgent)
  if (touch && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return 'shared' } catch (e) { if (e.name === 'AbortError') return 'cancel' }
  }
  const url = URL.createObjectURL(file), a = document.createElement('a')
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return 'saved'
}
