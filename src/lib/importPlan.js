// 가져오기 (파일 읽기·변환만, 앱 저장소와 무관 — 테스트 가능): 노션 내보내기 zip · 옵시디언 보관함(zip/여러 파일) · HTML · Word(.docx) · PDF → 페이지 계획 → 노트로 만들기
// 계획(plan) = { pages: [{ key, title, blocks, parent }], imgs: { token: { blob, name } } }
// 블록 안 자리표: { type: 'file', _img: token } (그림) · { type: 'page', _key: key } (하위 페이지)
import { mdToNote, cleanName } from './md.js'
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

const IMG_RE = /\.(png|jpe?g|gif|webp|heic|svg|bmp)$/i
const nb = (type = 'text', text = '', extra) => ({ id: uid(), type, text, ...extra })
const base = (p) => p.split('/').pop()
const dirOf = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '')
const norm = (p) => { const out = []; for (const s of p.split('/')) { if (s === '..') out.pop(); else if (s && s !== '.') out.push(s) } return out.join('/') }
const dec = (s) => { try { return decodeURIComponent(s) } catch { return s } }
const td = new TextDecoder('utf-8')
const readU8 = (u8) => { const t = td.decode(u8); if (!t.includes('�')) return t; try { return new TextDecoder('euc-kr').decode(u8) } catch { return t } }
const mime = (n) => ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic', svg: 'image/svg+xml', bmp: 'image/bmp' })[n.split('.').pop().toLowerCase()] || 'application/octet-stream'

// 자리표 → 실제 블록 (그림·하위 페이지)
function placeholders(blocks) {
  return blocks.map((b) => {
    if (b.type !== 'text' || !b.text) return b
    let m = /^\u0002IMG(\d+)\u0002$/.exec(b.text.trim()); if (m) return { id: b.id, type: 'file', _img: m[1] }
    m = /^\u0002PAGE([^\u0002]+)\u0002$/.exec(b.text.trim()); if (m) return { id: b.id, type: 'page', _key: m[1] }
    return b
  })
}

/* ── zip (노션 · 옵시디언) ── */
export async function planFromZip(file) {
  const { unzipSync } = await import('fflate')
  const all = unzipSync(new Uint8Array(await file.arrayBuffer()))
  const entries = Object.fromEntries(Object.entries(all).filter(([p, d]) => !p.startsWith('__MACOSX') && !base(p).startsWith('.') && d.length).map(([p, d]) => [p.replace(/\\/g, '/'), d]))
  return planFromEntries(entries, file.name)
}
// 여러 파일을 직접 고른 경우 (아이폰은 폴더를 못 골라서): 이름만으로 연결
export async function planFromFileList(files) {
  const entries = {}
  for (const f of files) entries[f.webkitRelativePath || f.name] = new Uint8Array(await f.arrayBuffer())
  return planFromEntries(entries, '')
}

function planFromEntries(entries, zipName) {
  const imgs = {}, pages = []
  const paths = Object.keys(entries)
  const byBase = {} // 옵시디언 ![[그림.png]] 처럼 이름만 쓴 경우
  for (const p of paths) (byBase[base(p).toLowerCase()] ||= []).push(p)
  const notion = paths.some((p) => /\s[0-9a-f]{32}\.md$/i.test(p))
  const docs = paths.filter((p) => /\.(md|markdown|txt|csv|html?)$/i.test(p)).sort()
  const keyOf = (p) => p.replace(/\.(md|markdown|txt|csv|html?)$/i, '')
  const docKeys = new Set(docs.map(keyOf))
  let n = 0
  const imgToken = (path) => { const t = String(n++); imgs[t] = { blob: new Blob([entries[path]], { type: mime(path) }), name: base(path) }; return t }
  const resolve = (from, href) => {
    href = dec(href.split('#')[0].split('?')[0]).trim()
    if (!href || /^[a-z]+:/i.test(href)) return null
    const p = norm(dirOf(from) + '/' + href)
    if (entries[p]) return p
    const hits = byBase[base(href).toLowerCase()]
    return hits?.[0] || null
  }
  // 부모: 노션은 'A x.md' 옆 폴더 'A x/' 안이 하위 · 옵시디언은 폴더가 부모 페이지
  const folderPages = new Map()
  const ensureDir = (d) => { if (!d) return null; if (!folderPages.has(d)) folderPages.set(d, { key: 'dir:' + d, title: base(d), blocks: [], parent: ensureDir(dirOf(d)) }); return 'dir:' + d }
  const parentOf = (p) => {
    if (!notion) return ensureDir(dirOf(p))
    for (let d = dirOf(p); d; d = dirOf(d)) if (docKeys.has(d)) return d
    return null
  }
  for (const p of docs) {
    let text = readU8(entries[p])
    const isCsv = /\.csv$/i.test(p), isHtml = /\.html?$/i.test(p)
    let title, blocks
    if (isHtml) {
      const r = htmlToBlocks(text)
      title = r.title || cleanName(base(p).replace(/\.html?$/i, '')); blocks = r.blocks
      for (const b of blocks) if (b.type === 'file' && b._src) { const rp = /^data:/.test(b._src) ? null : resolve(p, b._src); if (rp) b._img = imgToken(rp); else if (/^data:/.test(b._src)) { imgs[String(n)] = { blob: dataBlob(b._src), name: '그림.png' }; b._img = String(n++) } delete b._src }
    } else if (isCsv) {
      const r = mdToNote(text, base(p)); title = r.title; blocks = r.blocks
    } else {
      // 그림 줄 · 하위 페이지 링크 줄을 자리표로 바꾼 뒤 일반 마크다운 변환
      text = text.split('\n').map((ln) => {
        let m = /^\s*!\[([^\]]*)\]\(<?([^)>]+?)>?(?:\s+"[^"]*")?\)\s*$/.exec(ln) || /^\s*!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]\s*$/.exec(ln)
        if (m) { const href = m[2] || m[1], rp = resolve(p, href); if (rp && IMG_RE.test(rp)) return '\u0002IMG' + imgToken(rp) + '\u0002' }
        m = /^\s*\[([^\]]+)\]\(<?([^)>]+\.(?:md|csv))>?\)\s*$/.exec(ln)
        if (m) { const rp = resolve(p, m[2]); if (rp && docKeys.has(keyOf(rp)) && dirOf(rp) === keyOf(p)) return '\u0002PAGE' + keyOf(rp) + '\u0002' }
        return ln
      }).join('\n')
      const r = mdToNote(text, base(p)); title = r.title; blocks = r.blocks
    }
    pages.push({ key: keyOf(p), title, blocks: placeholders(blocks), parent: parentOf(p) })
  }
  // 옵시디언 폴더 페이지 (폴더 안 노트들이 하위 페이지)
  pages.unshift(...folderPages.values())
  // 하나뿐인 맨 위 폴더(zip 이름 폴더)는 건너뜀
  const tops = pages.filter((x) => !x.parent)
  if (tops.length === 1 && tops[0].key.startsWith('dir:') && pages.length > 1) { const k = tops[0].key; pages.splice(pages.indexOf(tops[0]), 1); for (const x of pages) if (x.parent === k) x.parent = null }
  return { pages, imgs, source: zipName, kind: notion ? '노션' : '옵시디언·마크다운' }
}
const dataBlob = (u) => { const [h, d] = u.split(','); const bin = atob(d); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: (/data:([^;]+)/.exec(h) || [])[1] || 'image/png' }) }

/* ── HTML (웹 페이지 저장 · 이 앱이 내보낸 HTML) ── */
export function htmlToBlocks(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const out = [], heads = []
  const T = (el) => inlineOf(el).replace(/\n{3,}/g, '\n\n').trim()
  const push = (b) => out.push(b)
  const walk = (el, ind = 0, bgc) => {
    for (const c of el.children) {
      const tag = c.tagName.toLowerCase(), cls = c.className || ''
      const add = (b) => push(bgc ? { ...b, bgc } : b)
      if (/^(script|style|nav|footer|header|noscript|template|button|form)$/.test(tag) && !(tag === 'header' && c.querySelector('h1'))) { if (tag === 'header') walk(c, ind, bgc); continue }
      if (/^h[1-6]$/.test(tag)) { const lv = +tag[1]; heads.push(lv); add({ ...nb('h', T(c)), _lv: lv }); continue }
      if (tag === 'p') { if (/\blk\b/.test(cls) && c.querySelector('a')) { const a = c.querySelector('a'); add({ id: uid(), type: 'link', url: a.getAttribute('href'), title: a.textContent.trim() }) } else if (/\bsub\b/.test(cls) && c.querySelector('a[href^="#p-"]')) add({ id: uid(), type: 'page', _key: c.querySelector('a').getAttribute('href').slice(3) }); else if (T(c)) add(nb('text', T(c))); else if (c.querySelector('img')) walk(c, ind, bgc); continue }
      if (tag === 'ul' || tag === 'ol') { let i = 1; for (const li of c.children) { if (li.tagName.toLowerCase() !== 'li') continue; const box = li.querySelector(':scope > input[type=checkbox], :scope > p > input[type=checkbox]'); const own = li.cloneNode(true); own.querySelectorAll('ul, ol').forEach((x) => x.remove()); own.querySelectorAll('input').forEach((x) => x.remove()); const txt = T(own); add(box ? nb('todo', txt, { ...(ind ? { indent: Math.min(3, ind) } : null), ...(box.checked || box.hasAttribute('checked') ? { done: true } : null) }) : nb('bullet', txt, { ...(ind ? { indent: Math.min(3, ind) } : null), ...(tag === 'ol' ? { num: i++ } : null) })); for (const sub of li.querySelectorAll(':scope > ul, :scope > ol')) walk({ children: [sub] }, ind + 1, bgc) } continue }
      if (tag === 'blockquote') { add(nb('quote', T(c))); continue }
      if (tag === 'pre') { const code = c.querySelector('code'); add(nb('code', (code || c).textContent.replace(/\n$/, ''), { ...(/language-(\w+)/.exec(code?.className || '') ? { lang: /language-(\w+)/.exec(code.className)[1] } : c.dataset.lang ? { lang: c.dataset.lang } : null) })); continue }
      if (tag === 'table') { const rows = [...c.querySelectorAll('tr')].map((tr) => [...tr.children].filter((x) => /^t[hd]$/i.test(x.tagName)).map((x) => T(x))); const cols = Math.max(0, ...rows.map((r) => r.length)); if (cols) add({ id: uid(), type: 'table', rows: rows.filter((r) => r.length).map((r) => Array.from({ length: cols }, (_, k) => r[k] ?? '')) }); continue }
      if (tag === 'hr') { add(nb('divider', '')); continue }
      if (tag === 'img') { const src = c.getAttribute('src'); if (src) add({ id: uid(), type: 'file', _src: src }); continue }
      if (tag === 'figure') { const img = c.querySelector('img'); if (img) add({ id: uid(), type: 'file', _src: img.getAttribute('src') }); continue }
      if (tag === 'details') { const sm = c.querySelector(':scope > summary'); const inner = c.cloneNode(true); inner.querySelector(':scope > summary')?.remove(); add({ ...nb('toggle', sm ? T(sm) : '접는 글'), children: htmlToBlocks(inner.innerHTML).blocks }); continue }
      if (tag === 'aside') { const tone = /co-(key|warn|ex|rose|olive|sand)/.exec(cls)?.[1] || 'key'; const own = c.cloneNode(true); own.querySelector('.co-t')?.remove(); add(nb('callout', T(own), { tone })); continue }
      if (/\bhrt\b/.test(cls)) { add(nb('divider', T(c))); continue }
      if (/\b(li)\b/.test(cls) && c.querySelector('.mk, .ck')) { const done = /\bdone\b/.test(cls), todo = /\btodo\b/.test(cls), mk = c.querySelector('.mk')?.textContent || ''; const body = c.querySelector(':scope > div') || c; const m = /margin-left:\s*(\d+)/.exec(c.getAttribute('style') || ''); const indent = m ? Math.min(3, Math.round(+m[1] / 22)) : 0; add(todo ? nb('todo', T(body), { ...(indent ? { indent } : null), ...(done ? { done: true } : null) }) : nb('bullet', T(body), { ...(indent ? { indent } : null), ...(/^\d+\.$/.test(mk) ? { num: parseInt(mk) } : null) })); continue }
      if (/\bboard\b/.test(cls)) { add({ id: uid(), type: 'board', cols: [...c.querySelectorAll('.bcol')].map((col) => ({ id: uid(), name: (col.querySelector('.bh')?.childNodes[0]?.textContent || '').trim(), cards: [...col.querySelectorAll('.bc')].map((x) => ({ id: uid(), text: T(x) })) })) }); continue }
      if (/\bbgc-(\w+)/.test(cls)) { walk(c, ind, /\bbgc-(\w+)/.exec(cls)[1]); continue }
      if (/\btoc\b/.test(cls)) continue
      if (c.children.length) walk(c, ind, bgc)
      else if (T(c)) add(nb('text', T(c)))
    }
  }
  walk(doc.body)
  // 제목: <title> 또는 첫 h1 (본문에서 빼기)
  let title = doc.querySelector('title')?.textContent.trim() || ''
  const fi = out.findIndex((b) => b._lv)
  if (fi >= 0 && out[fi]._lv === Math.min(...heads) && (!title || out[fi].text === title)) { title = out[fi].text; out.splice(fi, 1); heads.splice(heads.indexOf(Math.min(...heads)), 1) }
  const lvs = [...new Set(out.filter((b) => b._lv).map((b) => b._lv))].sort((a, b) => a - b)
  for (const b of out) if (b._lv) { const r = lvs.indexOf(b._lv); if (r < 2) b.type = r ? 'h2' : 'h1'; else { b.type = 'text'; b.text = `**${b.text}**` } delete b._lv }
  return { title, blocks: out }
}
// 이 앱이 내보낸 HTML: <article class="page"> 여러 개 → 첫 페이지 아래 하위 페이지들
export function planFromHtml(html, fileName = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const arts = [...doc.querySelectorAll('article.page')]
  const imgs = {}; let n = 0
  const fix = (blocks) => blocks.map((b) => { if (b.type === 'file' && b._src) { if (/^data:/.test(b._src)) { imgs[n] = { blob: dataBlob(b._src), name: '그림.png' }; return { id: b.id, type: 'file', _img: String(n++) } } return nb('text', b._src) } if (b.children) return { ...b, children: fix(b.children) }; return b })
  if (arts.length > 1) {
    // 하위 페이지는 제목에 h-sub 표시 → 바로 앞의 맨 위 페이지 아래로 · 묶음(여러 노트)은 각각 맨 위
    let top = null
    const pages = arts.map((a, i) => { const r = htmlToBlocks(a.outerHTML), key = (a.id || 'p-' + i).slice(2), sub = !!a.querySelector('h1.h-sub'); if (!sub) top = key; return { key, title: r.title || '가져온 노트', blocks: fix(r.blocks), parent: sub ? top : null } })
    return { pages, imgs, kind: 'HTML' }
  }
  const r = htmlToBlocks(html)
  return { pages: [{ key: 'h0', title: r.title || cleanName(fileName.replace(/\.html?$/i, '')) || '가져온 노트', blocks: fix(r.blocks), parent: null }], imgs, kind: 'HTML' }
}

/* ── 글자 서식 (HTML · Word 공통 규칙) ── */
function inlineOf(el) {
  let s = ''
  for (const c of el.childNodes) {
    if (c.nodeType === 3) { s += c.textContent.replace(/\s+/g, ' '); continue }
    if (c.nodeType !== 1) continue
    const tag = c.tagName.toLowerCase(), inner = () => inlineOf(c)
    const wrap = (o, z = o) => { const x = inner().trim(); return x ? o + x + z : '' }
    if (tag === 'br') s += '\n'
    else if (tag === 'b' || tag === 'strong') s += wrap('**')
    else if (tag === 'u') s += wrap('__')
    else if (tag === 'mark') s += wrap('==')
    else if (tag === 'sup') { const x = inner().trim(); s += x && !/\s/.test(x) ? '^' + x + '^' : x }
    else if (tag === 'sub') { const x = inner().trim(); s += x && !/\s/.test(x) ? '~' + x + '~' : x }
    else if (tag === 'a') { const h = c.getAttribute('href') || '', x = inner().trim(); s += /^https?:/.test(h) ? (x && x !== h ? x + ' ' + h : h) : x }
    else if (tag === 'span' && /tc-([rgbvm])/.test(c.className || '')) s += wrap('{{' + /tc-([rgbvm])/.exec(c.className)[1] + ':', '}}')
    else if (/^(script|style|input)$/.test(tag)) continue
    else s += inner()
  }
  return s
}

/* ── Word (.docx) ── */
export async function planFromDocx(file) {
  const { unzipSync } = await import('fflate')
  const z = unzipSync(new Uint8Array(await file.arrayBuffer()))
  const xml = (p) => (z[p] ? new DOMParser().parseFromString(td.decode(z[p]), 'application/xml') : null)
  const doc = xml('word/document.xml'); if (!doc) throw new Error('Word 문서를 읽지 못했어요')
  const rels = {}; for (const r of xml('word/_rels/document.xml.rels')?.getElementsByTagName('Relationship') || []) rels[r.getAttribute('Id')] = r.getAttribute('Target')
  // 번호 목록인지 (numbering.xml 의 numFmt)
  const numFmt = {}
  const nx = xml('word/numbering.xml')
  if (nx) {
    const abs = {}; for (const a of nx.getElementsByTagName('w:abstractNum')) { abs[a.getAttribute('w:abstractNumId')] = [...a.getElementsByTagName('w:lvl')].map((l) => l.getElementsByTagName('w:numFmt')[0]?.getAttribute('w:val')) }
    for (const n0 of nx.getElementsByTagName('w:num')) numFmt[n0.getAttribute('w:numId')] = abs[n0.getElementsByTagName('w:abstractNumId')[0]?.getAttribute('w:val')] || []
  }
  const imgs = {}; let n = 0
  const W = (el, tag) => [...el.childNodes].filter((x) => x.nodeName === tag)
  const runs = (p) => {
    let s = ''
    const one = (r) => {
      const pr = r.getElementsByTagName('w:rPr')[0]
      const has = (t) => pr && pr.getElementsByTagName(t)[0] && pr.getElementsByTagName(t)[0].getAttribute('w:val') !== '0' && pr.getElementsByTagName(t)[0].getAttribute('w:val') !== 'false'
      let x = ''
      for (const c of r.childNodes) { if (c.nodeName === 'w:t') x += c.textContent; else if (c.nodeName === 'w:tab') x += '\t'; else if (c.nodeName === 'w:br') x += '\n' }
      const blip = r.getElementsByTagName('a:blip')[0]
      if (blip) { const t = rels[blip.getAttribute('r:embed')]; const path = t && norm('word/' + t); if (path && z[path]) { imgs[n] = { blob: new Blob([z[path]], { type: mime(path) }), name: base(path) }; return '\u0002IMG' + n++ + '\u0002' } }
      if (!x.trim()) return x
      const va = pr?.getElementsByTagName('w:vertAlign')[0]?.getAttribute('w:val')
      if (va === 'superscript' && !/\s/.test(x)) x = '^' + x + '^'; else if (va === 'subscript' && !/\s/.test(x)) x = '~' + x + '~'
      if (has('w:b')) x = '**' + x + '**'
      if (has('w:u') && pr.getElementsByTagName('w:u')[0].getAttribute('w:val') !== 'none') x = '__' + x + '__'
      if (pr?.getElementsByTagName('w:highlight')[0]) x = '==' + x + '=='
      return x
    }
    for (const c of p.childNodes) {
      if (c.nodeName === 'w:r') s += one(c)
      else if (c.nodeName === 'w:hyperlink') { const t = [...c.getElementsByTagName('w:r')].map(one).join(''); const h = rels[c.getAttribute('r:id')]; s += h && /^https?:/.test(h) ? t + ' ' + h : t }
    }
    return s.replace(/\*\*\*\*/g, '').replace(/____/g, '')
  }
  const out = []
  const body = doc.getElementsByTagName('w:body')[0]
  for (const el of body.childNodes) {
    if (el.nodeName === 'w:p') {
      const pr = el.getElementsByTagName('w:pPr')[0]
      const st = (pr?.getElementsByTagName('w:pStyle')[0]?.getAttribute('w:val') || '').toLowerCase()
      const numPr = pr?.getElementsByTagName('w:numPr')[0]
      const text = runs(el)
      const img = /^\u0002IMG(\d+)\u0002$/.exec(text.trim())
      if (img) { out.push({ id: uid(), type: 'file', _img: img[1] }); continue }
      if (!text.trim()) continue
      if (/^(title|heading1|제목1|1)$/.test(st) || st === 'heading 1') out.push(nb('h1', text.replace(/\*\*/g, '')))
      else if (/^(heading2|subtitle|제목2|2)$/.test(st)) out.push(nb('h2', text.replace(/\*\*/g, '')))
      else if (/^heading[3-9]$/.test(st)) out.push(nb('text', '**' + text.replace(/\*\*/g, '') + '**'))
      else if (numPr || /list/.test(st)) {
        const lvl = +(numPr?.getElementsByTagName('w:ilvl')[0]?.getAttribute('w:val') || 0), nid = numPr?.getElementsByTagName('w:numId')[0]?.getAttribute('w:val')
        const fmt = (numFmt[nid] || [])[lvl]
        const prev = out[out.length - 1]
        const num = fmt && fmt !== 'bullet' ? (prev?.type === 'bullet' && prev.num && (prev.indent || 0) === lvl ? prev.num + 1 : 1) : undefined
        out.push(nb('bullet', text, { ...(lvl ? { indent: Math.min(3, lvl) } : null), ...(num ? { num } : null) }))
      } else if (/quote|인용/.test(st)) out.push(nb('quote', text))
      else out.push(nb('text', text))
    } else if (el.nodeName === 'w:tbl') {
      const rows = W(el, 'w:tr').map((tr) => W(tr, 'w:tc').map((tc) => W(tc, 'w:p').map(runs).join('\n').trim()))
      const cols = Math.max(0, ...rows.map((r) => r.length))
      if (cols) out.push({ id: uid(), type: 'table', rows: rows.map((r) => Array.from({ length: cols }, (_, k) => r[k] ?? '')) })
    }
  }
  const core = xml('docProps/core.xml')?.getElementsByTagName('dc:title')[0]?.textContent?.trim()
  let title = core || ''
  if (!title && out[0]?.type === 'h1') title = out.shift().text
  return { pages: [{ key: 'd0', title: title || cleanName(file.name.replace(/\.docx$/i, '')) || '가져온 문서', blocks: out.length ? out : [nb()], parent: null }], imgs, kind: 'Word' }
}

/* ── PDF: 글자는 문단 블록으로, 원하면 쪽을 그림으로 ── */
export async function planFromPdf(file, { pagesAsImages = false, maxPages = 40 } = {}) {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const d = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const out = [], imgs = {}; let n = 0
  const N = Math.min(d.numPages, maxPages)
  for (let i = 1; i <= N; i++) {
    const page = await d.getPage(i)
    if (N > 1) out.push(nb('divider', `${i}쪽`))
    if (pagesAsImages) {
      const vp = page.getViewport({ scale: 1.6 }), c = document.createElement('canvas')
      c.width = Math.round(vp.width); c.height = Math.round(vp.height)
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.8))
      imgs[n] = { blob, name: `${file.name.replace(/\.pdf$/i, '')}-${i}.jpg` }; out.push({ id: uid(), type: 'file', _img: String(n++), size: 'l' })
    }
    // 글자: 줄(y 좌표)로 묶고, 줄 간격이 크면 문단을 나눔
    const tc = await page.getTextContent()
    const lines = []
    for (const it of tc.items) {
      if (!it.str) continue
      const y = Math.round(it.transform[5]), h = Math.abs(it.transform[3]) || 10
      const ln = lines.find((l) => Math.abs(l.y - y) < h * 0.5)
      if (ln) ln.parts.push([it.transform[4], it.str]); else lines.push({ y, h, parts: [[it.transform[4], it.str]] })
    }
    lines.sort((a, b) => b.y - a.y)
    // 글자 크기가 본문보다 확실히 크면 제목 줄
    const hs = lines.map((l) => l.h).sort((a, b) => a - b), body = hs[Math.floor(hs.length / 2)] || 10
    let para = [], lastY = null, lastH = 10
    const flush = () => { const t = para.join(' ').replace(/\s+/g, ' ').trim(); if (t) out.push(nb('text', t)); para = [] }
    for (const l of lines) {
      const t = l.parts.sort((a, b) => a[0] - b[0]).map((p) => p[1]).join('').trim()
      if (t && l.h > body * 1.35 && t.length < 60) { flush(); out.push(nb(l.h > body * 1.8 ? 'h1' : 'h2', t)); lastY = l.y; lastH = l.h; continue }
      if (lastY != null && lastY - l.y > Math.max(lastH, l.h) * 1.9) flush()
      if (t) para.push(t)
      lastY = l.y; lastH = l.h
    }
    flush()
  }
  if (d.numPages > N) out.push(nb('text', `… ${d.numPages - N}쪽 더 있어요 (앞 ${N}쪽만 가져왔어요)`))
  return { pages: [{ key: 'p0', title: cleanName(file.name.replace(/\.pdf$/i, '')) || 'PDF', blocks: out, parent: null }], imgs, kind: 'PDF' }
}
