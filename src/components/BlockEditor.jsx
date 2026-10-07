import { useEffect, useRef, useState, Fragment } from 'react'
import { useColl, put, patch, remove, restore, find } from '../store/store.js'
import { toggleTask, addReview, addTask } from '../store/actions.js'
import { Icon, Check, openMenu, openSheet, openDetail, toast } from './ui.jsx'
import { FileThumb, previewFile, FileSync, LinkPreview } from './Attach.jsx'
import { addFile, pickFiles, fmtSize } from '../lib/files.js'
import { newBlock, commitBlock, refLabel, openOrCreateByTitle, linkTodos } from '../lib/notes.js'
import { mdToBlocks, mdToNote, looksMd } from '../lib/md.js'
import * as TB from '../lib/table.js'
const { parseGrid } = TB
import { parseMention, today, monthStart, weekStart, addDays, parseYmd, fmtClock } from '../engine/date.js'
import { openNote, go, setParams } from '../nav.js'
import { useTimerState, useTick, elapsed, startStopwatch, pause, resume, stop } from '../lib/timer.js'
import { applyFilter } from '../views/tasks/filter.js'
import { startDrag } from '../lib/drag.js'
import { applyMark, activeMarks, markRuns, plainText } from '../lib/marks.js'

const TYPES = [['text', '텍스트'], ['h1', '제목 1'], ['h2', '제목 2'], ['bullet', '글머리'], ['todo', '체크박스 (할 일)'], ['callout', '강조 상자'], ['quote', '인용'], ['code', '코드'], ['divider', '구분선']]
const TONES = [['key', '핵심'], ['warn', '주의'], ['ex', '예시'], ['rose', '메모'], ['olive', '정리'], ['sand', '참고']]
// 블록 바탕색 (옅게)
const BGC = [['', '없음'], ['rose', '로즈'], ['olive', '올리브'], ['navy', '네이비'], ['violet', '바이올렛'], ['sand', '모래'], ['gray', '회색']]
// 구분선 모양 ('' = 설정 › 디자인의 기본 모양)
const DIVS = [['', '기본'], ['thin', '얇은 실선'], ['bold', '굵은 선'], ['dash', '점선'], ['double', '두 줄'], ['short', '가운데 짧게'], ['dots', '점 세 개'], ['space', '여백만']]
const SOLID = ['divider', 'embed', 'sync', 'file', 'table', 'page', 'cols', 'link'] // 글자를 직접 쓰지 않는 블록
const INLINE_RE = /(\*\*[^*\n]+\*\*|==[^=\n]+==|__[^_\n]+__|\{\{[rgbvmD]:[^{}\n]+\}\}|\^[^\s^]{1,24}\^|(?<!~)~[^\s~]{1,24}~(?!~)|\[\[[^\]]+\]\]|@(?:오늘|내일|모레|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2})(?:\s+\d{1,2}:\d{2})?|https?:\/\/[^\s]+)/g

// 이 앱의 노트·줄 링크 (?open=노트id&b=줄id)
const ownLink = (u) => { try { const x = new URL(u); if (x.origin !== location.origin || !x.pathname.startsWith(import.meta.env.BASE_URL)) return null; const id = x.searchParams.get('open'); return id ? { id, b: x.searchParams.get('b') } : null } catch { return null } }
export const blockLink = (noteId, bid) => `${location.origin}${import.meta.env.BASE_URL}?open=${noteId}${bid ? '&b=' + bid : ''}`
export async function copyBlockLink(noteId, bid) { const u = blockLink(noteId, bid); try { await navigator.clipboard.writeText(u); toast('링크를 복사했어요 · 다른 노트에 붙여 넣으면 바로 이동해요') } catch { prompt('링크', u) } }
// 노트를 열고 그 줄로 스크롤 · 잠깐 표시
export function goBlock(noteId, bid) {
  openNote(noteId)
  if (!bid) return
  let n = 0
  const tick = () => { const el = document.querySelector(`[data-bid="${CSS.escape(bid)}"]`); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('blk-flash'); setTimeout(() => el.classList.remove('blk-flash'), 1800) } else if (n++ < 20) setTimeout(tick, 120) }
  setTimeout(tick, 150)
}

export function Inline({ text }) {
  if (!text) return null
  const parts = text.split(INLINE_RE)
  return parts.map((p, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{p}</Fragment>
    // 글자 꾸미기: **굵게** · ==형광펜== · __밑줄__
    if (p.startsWith('**')) return <b key={i} className="mk-b"><Inline text={p.slice(2, -2)} /></b>
    if (p.startsWith('==')) { const m = /^([rgby]):/.exec(p.slice(2)); return <mark key={i} className={'mk-hl' + (m ? ' hl-' + m[1] : '')}><Inline text={p.slice(m ? 4 : 2, -2)} /></mark> }
    if (p.startsWith('__')) return <u key={i} className="mk-u"><Inline text={p.slice(2, -2)} /></u>
    if (p.startsWith('{{D:')) return <DdayChip key={i} q={p.slice(4, -2)} />
    if (p.startsWith('{{')) return <span key={i} className={'tc tc-' + p[2]}><Inline text={p.slice(4, -2)} /></span>
    if (p.startsWith('^')) return <sup key={i}>{p.slice(1, -1)}</sup>
    if (p.startsWith('~')) return <sub key={i}>{p.slice(1, -1)}</sub>
    if (p.startsWith('[[')) {
      const t = p.slice(2, -2)
      return <button key={i} className="wikilink" onClick={(e) => { e.stopPropagation(); openNote(openOrCreateByTitle(t).id) }}>{t}</button>
    }
    if (p.startsWith('@')) {
      const m = parseMention(p)
      return <button key={i} className="mention" onClick={(e) => { e.stopPropagation(); if (m) go('notes', 'daily', { date: m.date }) }}>{p}</button>
    }
    const own = ownLink(p)
    if (own) { const n = find('notes', own.id); return <button key={i} className="wikilink blk-link" onClick={(e) => { e.stopPropagation(); goBlock(own.id, own.b) }}>↗ {n ? (n.title || '제목 없음') : '삭제된 노트'}{own.b ? ' · 줄' : ''}</button> }
    return <a key={i} href={p} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{p.replace(/^https?:\/\//, '').slice(0, 40)}</a>
  })
}

// D-day 칩: {{D:중간고사}} (D-day 이름) 또는 {{D:2026-11-19}} (날짜) → 남은 날이 자동으로 바뀜
function DdayChip({ q }) {
  const ddays = useColl('ddays')
  const dd = /^\d{4}-\d{2}-\d{2}$/.test(q) ? { title: '', date: q } : ddays.find((x) => (x.title || '').trim() === q.trim())
  if (!dd) return <span className="dd-chip muted">{q}</span>
  const n = Math.round((new Date(dd.date + 'T00:00') - new Date(today() + 'T00:00')) / 864e5)
  return <span className="dd-chip" title={dd.date}>{dd.title && <span>{dd.title}</span>}<b>{n === 0 ? 'D-DAY' : n > 0 ? 'D-' + n : 'D+' + -n}</b><span className="dd-d">{+dd.date.slice(5, 7)}/{+dd.date.slice(8)}</span></span>
}

export default function BlockEditor({ blocks = [], onChange, note, nested, readOnly }) {
  const tasks = useColl('tasks')
  const [edit, setEdit] = useState(null) // { id, pos }
  const skip = useRef(null) // 구조 변경(Enter/Backspace) 직후 들어오는 blur 무시
  const skipBlur = (id) => { skip.current = id; setTimeout(() => { if (skip.current === id) skip.current = null }, 80) }
  const list = blocks.length ? blocks : [newBlock()]
  // 체크 줄을 텍스트 등으로 바꾸거나 지우면 연결된 할 일도 지움 (되돌리기 가능)
  const todoIds = (bs, out = new Set()) => { for (const b of bs || []) { if (b.type === 'todo' && b.taskId) out.add(b.taskId); if (b.type === 'cols') for (const c of b.cols || []) todoIds(c, out); if (b.type === 'toggle') todoIds(b.children, out) } return out }
  const set = (next) => {
    const before = todoIds(blocks), after = todoIds(next), gone = [...before].filter((id) => !after.has(id) && find('tasks', id))
    if (gone.length) {
      next = next.map((b) => (b.type !== 'todo' && gone.includes(b.taskId) ? { ...b, taskId: undefined } : b))
      gone.forEach((id) => remove('tasks', id))
      toast(gone.length === 1 ? '연결된 할 일도 지웠어요' : `연결된 할 일 ${gone.length}개도 지웠어요`, { label: '되돌리기', fn: () => gone.forEach((id) => restore('tasks', id)) })
    }
    onChange(next)
  }
  const upd = (id, p) => set(list.map((b) => (b.id === id ? { ...b, ...p } : b)))
  // 다른 앱에서 끌어다 놓기 · 사진 붙여넣기 → 파일 블록 / 글 줄
  const [dropOn, setDropOn] = useState(false)
  const dropIn = async (files, text, afterId, replaceId) => {
    const nbs = []
    for (const f of files) {
      // .md 파일은 첨부 대신 블록으로 펼침
      if (/\.(md|markdown)$/i.test(f.name) || f.type === 'text/markdown') { try { text = (text ? text + '\n' : '') + await f.text() } catch {} continue }
      if (/\.(csv|tsv)$/i.test(f.name)) { try { nbs.push(...mdToNote(await f.text(), f.name).blocks) } catch {} continue }
      try { const r = await addFile(f, { subjectId: note?.subjectId, noteId: note?.id }); nbs.push({ id: newBlock().id, type: 'file', fileId: r.id }) } catch (e) { toast(e.message) }
    }
    // 시트에서 복사한 칸(탭 구분) → 표 · 그 밖은 마크다운
    if (text && /\t/.test(text) && text.trim().includes('\n')) nbs.push({ id: newBlock().id, type: 'table', rows: parseGrid(text) })
    else if (text) nbs.push(...linkTodos(mdToBlocks(text.split(/\r?\n/).filter((x) => !/^#[^#\s]/.test(x.trim())).join('\n')).slice(0, 300), note))
    if (!nbs.length) return
    const cur = (note && find('notes', note.id)?.blocks) || list
    const base = cur.filter((x, i) => x.id !== replaceId && !(i === cur.length - 1 && x.type === 'text' && !x.text && afterId == null))
    const i = afterId === '__top' ? -1 : afterId ? base.findIndex((b) => b.id === afterId) : base.length - 1
    const a = [...base]; a.splice(i + 1, 0, ...nbs)
    onChange(a); setEdit(null); toast(files.length ? `파일 ${files.length}개를 넣었어요` : `${nbs.length}줄을 넣었어요`)
  }
  const isField = (t) => t?.tagName === 'TEXTAREA' || t?.tagName === 'INPUT'
  const dnd = !nested && !readOnly ? {
    onDragOver: (e) => { const ty = [...(e.dataTransfer?.types || [])], f = ty.includes('Files'); if (!f && (isField(e.target) || !ty.some((x) => x === 'text/plain' || x === 'text/uri-list'))) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; if (!dropOn) setDropOn(true) },
    onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropOn(false) },
    onDrop: (e) => { const fs = [...(e.dataTransfer?.files || [])]; if (!fs.length && isField(e.target)) return; e.preventDefault(); setDropOn(false); dropIn(fs, fs.length ? '' : e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')) },
    onPaste: (e) => {
      const fs = [...(e.clipboardData?.files || [])]
      if (fs.length) { e.preventDefault(); return dropIn(fs, '', edit?.id) }
      // 마크다운 여러 줄 → 블록으로 (지금 칸이 비어 있으면 그 자리에)
      const tx = e.clipboardData?.getData('text/plain') || ''
      const cur0 = edit && list.find((x) => x.id === edit.id)
      if (/^https?:\/\/\S+$/.test(tx.trim()) && cur0 && !(cur0.text || '').trim() && !ownLink(tx.trim())) { e.preventDefault(); upd(cur0.id, { type: 'link', url: tx.trim(), title: '', text: undefined }); setEdit(null); return }
      if (!looksMd(tx) && !(/\t/.test(tx) && tx.trim().includes('\n'))) return
      e.preventDefault()
      const cur = edit && list.find((x) => x.id === edit.id)
      dropIn([], tx, cur && !(cur.text || '').trim() ? list[list.indexOf(cur) - 1]?.id || '__top' : edit?.id, cur && !(cur.text || '').trim() ? cur.id : null)
    },
  } : {}
  const commit = (b) => { const nb = commitBlock(b, note); if (JSON.stringify(nb) !== JSON.stringify(b)) upd(b.id, nb) }
  const insertAfter = (id, nb) => { const i = list.findIndex((b) => b.id === id); const a = [...list]; a.splice(i + 1, 0, nb); set(a); setEdit({ id: nb.id, pos: 0 }) }
  const removeBlock = (id) => { const i = list.findIndex((b) => b.id === id); const a = list.filter((b) => b.id !== id); set(a.length ? a : [newBlock()]); const prev = list[i - 1]; if (prev) setEdit({ id: prev.id, pos: (prev.text || '').length }) }
  // 손잡이(⋮⋮)를 끌어 순서 바꾸기 — 살짝 끌면 바로 드래그, 그냥 누르면 메뉴
  const dragged = useRef(false)
  const gripDown = (e, b) => {
    const x0 = e.clientX, y0 = e.clientY, el = e.currentTarget.closest('.blk')
    const off = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', off); window.removeEventListener('pointercancel', off) }
    const mv = (ev) => {
      if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return
      off(); dragged.current = true
      startDrag(ev, { label: (b.text || '블록').slice(0, 30), source: el, onDrop: (zone, pt) => {
        const id = zone.dataset.drop?.startsWith('blk:') ? zone.dataset.drop.slice(4) : null
        if (!id || id === b.id) return
        const a = list.filter((x) => x.id !== b.id), j = a.findIndex((x) => x.id === id)
        if (j < 0) return
        const r = zone.getBoundingClientRect(), before = pt.y < r.top + r.height / 2
        a.splice(before ? j : j + 1, 0, b); set(a)
      } })
    }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', off); window.addEventListener('pointercancel', off)
  }
  // 여러 줄 선택: 손잡이 메뉴 › 여러 줄 선택 → 블록을 눌러 고르고 한 번에 옮기기·복제·삭제
  const [sel, setSel] = useState(null) // Set | null
  const togSel = (id) => setSel((x) => { const n = new Set(x); n.has(id) ? n.delete(id) : n.add(id); return n })
  const clone = (b) => JSON.parse(JSON.stringify({ ...b, id: newBlock().id, taskId: undefined }))
  const selMove = (d) => { const a = [...list], idx = a.map((b, i) => (sel.has(b.id) ? i : -1)).filter((i) => i >= 0); if (!idx.length) return; if (d < 0 && idx[0] === 0) return; if (d > 0 && idx[idx.length - 1] === a.length - 1) return; const order = d < 0 ? idx : [...idx].reverse(); for (const i of order) { [a[i], a[i + d]] = [a[i + d], a[i]] } set(a) }
  const selDup = () => { const a = []; for (const b of list) { a.push(b); if (sel.has(b.id)) a.push(clone(b)) } set(a) }
  const selDel = () => { const a = list.filter((b) => !sel.has(b.id)); set(a.length ? a : [newBlock()]); setSel(null) }
  const move = (id, d) => { const i = list.findIndex((b) => b.id === id), j = i + d; if (j < 0 || j >= list.length) return; const a = [...list];[a[i], a[j]] = [a[j], a[i]]; set(a) }

  const onText = (b, text) => {
    if (b.type === 'text') {
      const rules = [[/^# /, 'h1'], [/^## /, 'h2'], [/^[-*] /, 'bullet'], [/^\[ ?\] /, 'todo'], [/^> /, 'quote']]
      for (const [re, type] of rules) if (re.test(text)) return upd(b.id, { type, text: text.replace(re, '') })
      if (/^(---|\*\*\*|___|———?)$/.test(text)) { const i = list.findIndex((x) => x.id === b.id), nb = newBlock(), a = [...list]; a[i] = { ...b, type: 'divider', text: '' }; a.splice(i + 1, 0, nb); skipBlur(b.id); set(a); return setEdit({ id: nb.id, pos: 0 }) } // --- 입력 → 구분선 + 다음 줄
    }
    upd(b.id, { text })
  }

  const onKey = (e, b) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    const el = e.target
    if (e.key === 'Tab' && ['text', 'bullet', 'todo', 'quote'].includes(b.type)) { e.preventDefault(); const lv = Math.max(0, Math.min(3, (b.indent || 0) + (e.shiftKey ? -1 : 1))); return upd(b.id, { indent: lv || undefined }) }
    if (e.key === 'Enter' && !e.shiftKey && b.type === 'code') return // 코드: 줄바꿈 그대로
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      skipBlur(b.id)
      const pos = el.selectionStart
      const before = b.text.slice(0, pos), after = b.text.slice(pos)
      if (!before && !after && b.indent && ['bullet', 'todo'].includes(b.type)) return upd(b.id, { indent: b.indent - 1 || undefined }) // 빈 줄 Enter: 한 단계 내어쓰기
      if (!before && !after && ['bullet', 'todo', 'quote'].includes(b.type)) return upd(b.id, { type: 'text', num: undefined })
      const keep = ['bullet', 'todo'].includes(b.type) ? b.type : 'text'
      const cur = commitBlock({ ...b, text: before }, note)
      const nb = { ...newBlock(keep, after), ...(b.indent && keep !== 'text' ? { indent: b.indent } : null), ...(b.num && keep === 'bullet' ? { num: b.num + 1 } : null) }
      const i = list.findIndex((x) => x.id === b.id)
      const a = [...list]; a[i] = cur; a.splice(i + 1, 0, nb)
      set(a); setEdit({ id: nb.id, pos: 0 })
    } else if (e.key === 'Backspace' && el.selectionStart === 0 && el.selectionEnd === 0) {
      if (b.type !== 'text') { e.preventDefault(); return upd(b.id, { type: 'text' }) }
      const i = list.findIndex((x) => x.id === b.id)
      const prev = list[i - 1]
      if (!prev) return
      e.preventDefault()
      skipBlur(b.id)
      if (SOLID.includes(prev.type)) { if (!b.text) removeBlock(b.id); else set(list.filter((x) => x.id !== prev.id)); return }
      const pos = (prev.text || '').length
      set(list.filter((x) => x.id !== b.id).map((x) => (x.id === prev.id ? { ...x, text: (x.text || '') + b.text } : x)))
      setEdit({ id: prev.id, pos })
    } else if (e.key === 'Escape') { el.blur() }
  }

  const blockMenu = (e, b) => { const r = e.currentTarget.getBoundingClientRect(), at = { currentTarget: { getBoundingClientRect: () => r } }; return openMenu(e, [
    ...(b.type === 'callout' ? TONES.filter(([t]) => t !== (b.tone || 'key')).map(([t, l]) => ({ label: `색 → ${l}`, onClick: () => upd(b.id, { tone: t }) })) : []),
    ...TYPES.filter(([t]) => t !== b.type && !SOLID.includes(b.type)).slice(0, 7).map(([t, l]) => ({ label: `→ ${l}`, onClick: () => { upd(b.id, { type: t }); if (t === 'todo') setEdit({ id: b.id, pos: (b.text || '').length }) } })),
    b.text && { label: '복습 등록', icon: 'brain', onClick: () => addReview({ title: b.text.slice(0, 60), subjectId: note?.subjectId, sourceType: 'note', sourceId: note?.id }) },
    b.text && b.type !== 'todo' && { label: '할 일로 만들기', icon: 'tasks', onClick: () => { const t = addTask({ title: plainText(b.text), noteId: note?.id, subjectId: note?.subjectId }); upd(b.id, { type: 'todo', taskId: t.id }) } },
    !nested && b.type !== 'sync' && { label: '동기화 블록으로', icon: 'sync', onClick: () => { const s = put('syncBlocks', { blocks: [{ ...b, id: newBlock().id }] }); upd(b.id, { type: 'sync', syncId: s.id, text: '' }) } },
    b.type === 'divider' && { label: `모양 · ${DIVS.find(([k]) => k === (b.ds || ''))[1]}`, icon: 'layers', onClick: () => openMenu(at, DIVS.map(([k, l]) => ({ label: (k === (b.ds || '') ? '✓ ' : '') + l, onClick: () => upd(b.id, { ds: k || undefined }) }))) },
    b.type === 'divider' && { label: b.text ? '구분선 제목 바꾸기' : '구분선에 제목 넣기', icon: 'tag', onClick: () => { const v = prompt('구분선 제목 (비우면 선만)', b.text || ''); if (v != null) upd(b.id, { text: v.trim() }) } },
    !['divider', 'embed', 'sync', 'cols'].includes(b.type) && { label: `바탕색 · ${BGC.find(([k]) => k === (b.bgc || ''))[1]}`, icon: 'layers', onClick: () => openMenu(at, BGC.map(([k, l]) => ({ label: (k === (b.bgc || '') ? '✓ ' : '') + l, onClick: () => upd(b.id, { bgc: k || undefined }) }))) },
    b.type === 'file' && isImg(b.fileId) && { label: `그림 크기 · ${{ s: '작게', m: '중간', l: '전체 폭' }[b.size || 's']}`, icon: 'image', onClick: () => openMenu(at, [['s', '작게'], ['m', '중간'], ['l', '전체 폭']].map(([k, l]) => ({ label: (k === (b.size || 's') ? '✓ ' : '') + l, onClick: () => upd(b.id, { size: k === 's' ? undefined : k }) }))) },
    b.type === 'file' && isImg(b.fileId) && { label: b.align === 'c' ? '왼쪽 맞춤' : '가운데 맞춤', icon: 'layers', onClick: () => upd(b.id, { align: b.align === 'c' ? undefined : 'c' }) },
    b.type === 'link' && { label: '링크 제목 바꾸기', icon: 'edit', onClick: () => { const v = prompt('링크 제목', b.title || ''); if (v != null) upd(b.id, { title: v.trim() }) } },
    b.type === 'cols' && { label: `두 단 비율 (${b.ratio || '1:1'} → ${{ '1:1': '2:1', '2:1': '1:2', '1:2': '1:1' }[b.ratio || '1:1']})`, icon: 'layers', onClick: () => upd(b.id, { ratio: { '1:1': '2:1', '2:1': '1:2', '1:2': '1:1' }[b.ratio || '1:1'] }) },
    ['text', 'bullet', 'todo', 'quote'].includes(b.type) && (b.indent || 0) < 3 && { label: '들여쓰기', icon: 'next', onClick: () => upd(b.id, { indent: (b.indent || 0) + 1 }) },
    b.indent > 0 && { label: '내어쓰기', icon: 'back', onClick: () => upd(b.id, { indent: b.indent - 1 || undefined }) },
    b.type === 'bullet' && { label: b.num ? '번호 없애기' : '번호 매기기', icon: 'tasks', onClick: () => { if (b.num) return upd(b.id, { num: undefined }); const i = list.findIndex((x) => x.id === b.id); let n = 1; for (let k = i - 1; k >= 0 && list[k].type === 'bullet' && list[k].num; k--) n++; upd(b.id, { num: n }) } },
    b.type !== 'divider' && { label: '아래에 구분선', icon: 'more', onClick: () => { const i = list.findIndex((x) => x.id === b.id), a = [...list]; a.splice(i + 1, 0, newBlock('divider')); set(a) } },
    { label: '복제', icon: 'plus', onClick: () => { const i = list.findIndex((x) => x.id === b.id), a = [...list]; a.splice(i + 1, 0, clone(b)); set(a) } },
    note && { label: '이 줄 링크 복사', icon: 'link', onClick: () => copyBlockLink(note.id, b.id) },
    { label: '여러 줄 선택', icon: 'check', onClick: () => setSel(new Set([b.id])) },
    { label: '위로', icon: 'back', onClick: () => move(b.id, -1) },
    { label: '아래로', icon: 'next', onClick: () => move(b.id, 1) },
    { label: '삭제', icon: 'trash', danger: true, onClick: () => removeBlock(b.id) },
  ]) }

  const addEnd = (nb) => { set([...list.filter((x, i) => !(i === list.length - 1 && x.type === 'text' && !x.text)), nb]); if (nb.text !== undefined && !['embed', 'sync', 'file', 'divider'].includes(nb.type)) setEdit({ id: nb.id, pos: 0 }) }

  return (
    <div className={'blocks' + (nested ? ' nested' : '') + (dropOn ? ' drop-in' : '')} {...dnd}>
      {list.map((b) => {
        const editing = edit?.id === b.id
        const task = b.taskId && tasks.find((t) => t.id === b.taskId)
        return (
          <div key={b.id} data-bid={b.id} style={b.indent ? { paddingLeft: b.indent * 22 } : undefined} className={'blk blk-' + b.type + (b.type === 'callout' ? ' tone-' + (b.tone || 'key') : '') + (b.bgc ? ' bgc bgc-' + b.bgc : '') + (sel?.has(b.id) ? ' sel' : '')} data-drop={readOnly ? undefined : 'blk:' + b.id} onClickCapture={sel ? (e) => { e.stopPropagation(); e.preventDefault(); togSel(b.id) } : undefined}>
            {!readOnly && <button className="blk-h" onPointerDown={(e) => gripDown(e, b)} onClick={(e) => { if (dragged.current) { dragged.current = false; return } blockMenu(e, b) }} aria-label="블록 메뉴 · 끌어서 순서 바꾸기"><Icon name="grip" size={14} /></button>}
            {b.type === 'bullet' && (b.num ? <span className="blk-num">{b.num}.</span> : <span className="blk-dot">•</span>)}
            {b.type === 'todo' && <span className="blk-chk"><Check on={!!task?.done} onClick={() => { if (task) toggleTask(task.id); else { const nb = commitBlock(b, note); upd(b.id, nb); if (nb.taskId) toggleTask(nb.taskId) } }} /></span>}
            <div className="blk-c">
              {b.type === 'divider' ? (b.text ? <div className={'hr-t' + (b.ds ? ' hr-' + b.ds : '')}><span>{b.text}</span></div> : <hr className={b.ds ? 'hr-' + b.ds : undefined} />) :
                b.type === 'file' ? <FileBlock b={b} /> :
                b.type === 'link' ? <LinkPreview url={b.url} title={b.title} /> :
                b.type === 'table' ? <TableBlock b={b} readOnly={readOnly} onMeta={(p) => upd(b.id, p)} /> :
                b.type === 'page' ? <SubPage b={b} /> :
                b.type === 'cols' ? <div className="cols2" style={{ '--cols': { '2:1': '2fr 1fr', '1:2': '1fr 2fr' }[b.ratio] || '1fr 1fr' }}>{[0, 1].map((k) => <div key={k} className="col-pane"><BlockEditor nested readOnly={readOnly} blocks={(b.cols || [[], []])[k] || []} note={note} onChange={(bs) => upd(b.id, { cols: [0, 1].map((j) => (j === k ? bs : (b.cols || [[], []])[j] || [])) })} /></div>)}</div> :
                b.type === 'toggle' ? <ToggleBlock b={b} note={note} readOnly={readOnly} editing={editing} edit={edit} onTitle={(t) => onText(b, t)} onKeyDown={(e) => onKey(e, b)} onBlur={(t) => { commit({ ...b, text: t }); setEdit((x) => (x?.id === b.id ? null : x)) }} onEdit={() => setEdit({ id: b.id, pos: (b.text || '').length })} onChildren={(bs) => upd(b.id, { children: bs })} /> :
                b.type === 'embed' ? <Embed b={b} note={note} onChange={(p) => upd(b.id, p)} /> :
                b.type === 'sync' ? <SyncBlock b={b} note={note} /> :
                editing && !readOnly ? (
                  <><EditArea b={b} pos={edit.pos} onChange={(t) => onText(b, t)} onKeyDown={(e) => onKey(e, b)}
                    onBlur={(t) => { if (skip.current !== b.id) commit({ ...b, text: t }); setEdit((x) => (x?.id === b.id ? null : x)) }} /></>
                ) : (
                  <div className={'blk-v' + (task?.done ? ' done' : '')} onClick={() => !readOnly && setEdit({ id: b.id, pos: (b.text || '').length })}>{b.type === 'callout' && <span className="co-tag">{(TONES.find(([t]) => t === (b.tone || 'key')) || TONES[0])[1]}</span>}
                    {b.type === 'code' ? (b.text ? <code className="blk-code-t">{b.text}</code> : <span className="muted">코드</span>) : b.text ? <Inline text={b.text} /> : <span className="muted">{list.length === 1 && nested ? '입력…' : list.length === 1 ? '입력하세요… (# 제목, - 목록, [] 체크, [[링크]], @내일 15:00)' : ' '}</span>}
                    {b.ref && <button className="ref-chip" onClick={(e) => { e.stopPropagation(); openDetail(b.ref.type, b.ref.id, { occ: b.ref.date }) }}>→ {refLabel(b.ref)}</button>}
                    {task && task.due && !b.ref && <span className="ref-chip">{task.due.slice(5).replace('-', '/')}</span>}
                  </div>
                )}
            </div>
          </div>
        )
      })}
      {sel && (
        <div className="sel-bar no-print">
          <div className="row between"><span className="small">{sel.size}줄 선택 · 블록을 눌러 고르기</span><button className="chip" onClick={() => setSel(null)}>끝</button></div>
          <div className="row wrap" style={{ gap: 6, opacity: sel.size ? 1 : 0.45, pointerEvents: sel.size ? 'auto' : 'none' }}>
            <button className="chip" onClick={() => selMove(-1)}>위로</button><button className="chip" onClick={() => selMove(1)}>아래로</button>
            <button className="chip" onClick={selDup}>복제</button><button className="chip" style={{ color: 'var(--danger)' }} onClick={selDel}>삭제</button>
          </div>
        </div>
      )}
      {!nested && !readOnly && !sel && (
        <div className="blk-add no-print">
          <button className="chip" onClick={() => addEnd(newBlock())}>+ 텍스트</button>
          <button className="chip" onClick={() => addEnd(newBlock('h2'))}>제목</button>
          <button className="chip" onClick={() => addEnd(newBlock('todo'))}>☐ 체크</button>
          <button className="chip" onClick={() => addEnd({ ...newBlock('callout'), tone: 'key' })}>강조</button>
          <button className="chip" onClick={() => { const d = newBlock('divider'), t = newBlock(); set([...list.filter((x, i) => !(i === list.length - 1 && x.type === 'text' && !x.text)), d, t]); setEdit({ id: t.id, pos: 0 }) }}>― 구분선</button>
          <button className="chip" onClick={() => addEnd({ id: newBlock().id, type: 'table', rows: [['', ''], ['', '']] })}>표</button>
          <button className="chip" onClick={() => { let u = (prompt('링크 주소') || '').trim(); if (!u) return; if (!/^https?:\/\//.test(u)) u = 'https://' + u; addEnd({ id: newBlock().id, type: 'link', url: u, title: '' }) }}><Icon name="link" size={14} />링크</button>
          <button className="chip" onClick={() => addEnd({ id: newBlock().id, type: 'cols', cols: [[newBlock()], [newBlock()]] })}>두 단</button>
          <button className="chip" onClick={() => addEnd({ ...newBlock('toggle'), children: [newBlock()], open: true })}>▸ 토글</button>
          <button className="chip" onClick={() => { const c = put('notes', { title: '', type: 'page', parentId: note?.id || null, subjectId: note?.subjectId || null, blocks: [newBlock()] }); addEnd({ id: newBlock().id, type: 'page', pageId: c.id }); setTimeout(() => openNote(c.id), 50) }}>+ 하위 페이지</button>
          <button className="chip" onClick={async () => { const fs = await pickFiles(); const nbs = []; for (const f of fs) { try { const r = await addFile(f, { subjectId: note?.subjectId, noteId: note?.id }); nbs.push({ id: newBlock().id, type: 'file', fileId: r.id }) } catch (e) { toast(e.message) } } if (nbs.length) set([...list, ...nbs]) }}><Icon name="image" size={14} />파일</button>
          <button className="chip" onClick={(e) => openMenu(e, [
            { label: '할 일 목록 (오늘)', icon: 'tasks', onClick: () => addEnd({ id: newBlock().id, type: 'embed', embed: { kind: 'tasks', filter: note?.projectId ? 'project' : 'today' } }) },
            { label: '미니 캘린더', icon: 'calendar', onClick: () => addEnd({ id: newBlock().id, type: 'embed', embed: { kind: 'calendar' } }) },
            { label: '타이머', icon: 'clock', onClick: () => addEnd({ id: newBlock().id, type: 'embed', embed: { kind: 'timer' } }) },
          ])}><Icon name="layers" size={14} />임베드</button>
          <button className="chip" onClick={() => openSheet((c) => <SyncPicker onPick={(id) => { addEnd({ id: newBlock().id, type: 'sync', syncId: id }); c() }} />, { title: '동기화 블록 삽입' })}><Icon name="sync" size={14} />동기화</button>
        </div>
      )}
    </div>
  )
}

function EditArea({ b, pos, onChange, onKeyDown, onBlur }) {
  const ref = useRef(null), hold = useRef(false)
  const [v, setV] = useState(b.text || '')
  const [sel, setSel] = useState([0, 0])
  useEffect(() => { setV(b.text || '') }, [b.text])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    const p = Math.min(pos ?? v.length, v.length)
    try { el.setSelectionRange(p, p) } catch {}
  }, []) // eslint-disable-line
  useEffect(() => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }, [v])
  const syncSel = () => { const el = ref.current; if (el) setSel([el.selectionStart, el.selectionEnd]) }
  // 꾸미기 버튼: 누르는 동안 칸이 닫히지 않게 잡아 두고, 적용 뒤 다시 커서를 돌려놓음
  const press = () => { hold.current = true; setTimeout(() => { hold.current = false }, 700) }
  const insert = (txt) => {
    const el = ref.current; if (!el) return
    const a = el.selectionStart, z = el.selectionEnd, nv = el.value.slice(0, a) + txt + el.value.slice(z)
    setV(nv); onChange(nv)
    requestAnimationFrame(() => { try { el.focus({ preventScroll: true }); el.setSelectionRange(a + txt.length, a + txt.length) } catch {} hold.current = false; syncSel() })
  }
  const apply = (kind) => {
    const el = ref.current; if (!el) return
    const r = applyMark(el.value, el.selectionStart, el.selectionEnd, kind)
    if (r) { setV(r.text); onChange(r.text) }
    requestAnimationFrame(() => { try { el.focus({ preventScroll: true }); if (r) el.setSelectionRange(r.a, r.z) } catch {} hold.current = false; syncSel() })
  }
  return (
    <>
      <div className="blk-edit">
        <div className="blk-mirror" aria-hidden="true">{markRuns(v).map((r, i) => <span key={i} className={r.mk ? 'mm-k' : [r.b && 'mm-b', r.u && 'mm-u', r.h && 'mk-hl' + (r.h !== 'd' ? ' hl-' + r.h : ''), r.f && 'tc tc-' + r.f, (r.p || r.s) && 'mm-sub'].filter(Boolean).join(' ') || undefined}>{r.x}</span>)}{'\u200b'}</div>
        <textarea ref={ref} rows={1} className="blk-ta" value={v} enterKeyHint="enter"
          onChange={(e) => { setV(e.target.value); onChange(e.target.value); syncSel() }} onSelect={syncSel} onKeyUp={syncSel}
          onKeyDown={onKeyDown} onBlur={() => { if (!hold.current) onBlur(ref.current?.value ?? v) }} />
      </div>
      <MarkBar on={activeMarks(v, sel[0], sel[1])} hasSel={sel[0] !== sel[1]} onPress={press} onApply={apply} onInsert={insert} />
    </>
  )
}

const isImg = (id) => !!find('files', id)?.type?.startsWith('image')
function FileBlock({ b }) {
  const f = useColl('files').find((x) => x.id === b.fileId)
  if (!f) return <span className="muted small">삭제된 파일</span>
  // 그림: 크기(작게·중간·전체 폭) · 가운데 맞춤
  if (f.type?.startsWith('image') && b.size) return (
    <div className={'file-img' + (b.align === 'c' ? ' center' : '')} onClick={() => previewFile(f)}>
      <div style={{ width: b.size === 'l' ? '100%' : '50%' }}><FileThumb file={f} size="100%" onClick={() => previewFile(f)} /></div>
    </div>
  )
  return (
    <div className={'row file-blk' + (b.align === 'c' ? ' center' : '')} onClick={() => previewFile(f)}>
      <FileThumb file={f} size={f.type?.startsWith('image') ? 120 : 48} />
      <div className="grow"><div className="ellipsis">{f.name}</div><div className="tiny muted row" style={{ gap: 6 }}>{fmtSize(f.size)}<FileSync file={f} /></div></div>
    </div>
  )
}

function SyncBlock({ b, note }) {
  const s = useColl('syncBlocks').find((x) => x.id === b.syncId)
  const notes = useColl('notes')
  if (!s) return <span className="muted small">삭제된 동기화 블록</span>
  const uses = notes.filter((n) => (n.blocks || []).some((x) => x.syncId === s.id)).length
  return (
    <div className="sync-blk">
      <div className="sync-label tiny">⟲ 동기화 블록 · {uses}곳에서 사용</div>
      <BlockEditor nested blocks={s.blocks} note={note} onChange={(blocks) => patch('syncBlocks', s.id, { blocks })} />
    </div>
  )
}

function SyncPicker({ onPick }) {
  const syncs = useColl('syncBlocks')
  return (
    <div className="list">
      {syncs.map((s) => (
        <button key={s.id} className="item" style={{ textAlign: 'left' }} onClick={() => onPick(s.id)}>
          <div className="t ellipsis">{(s.blocks || []).map((x) => x.text).filter(Boolean).join(' / ') || '(비어 있음)'}</div>
        </button>
      ))}
      {!syncs.length && <div className="empty">블록 메뉴(⋮)에서 ‘동기화 블록으로’를 먼저 만들어 주세요</div>}
    </div>
  )
}

/* ── 라이브 임베드 ── */
function Embed({ b, note, onChange }) {
  const k = b.embed?.kind
  return (
    <div className="embed">
      <div className="embed-h tiny muted">
        {k === 'tasks' ? '할 일 목록' : k === 'calendar' ? '캘린더' : '타이머'}
        {k === 'tasks' && (
          <select className="cell-sel tiny" value={b.embed.filter || 'today'} onChange={(e) => onChange({ embed: { ...b.embed, filter: e.target.value } })}>
            <option value="today">오늘</option><option value="week">이번 주</option><option value="overdue">지연</option><option value="note">이 노트</option>
            {note?.projectId && <option value="project">이 프로젝트</option>}
            {note?.subjectId && <option value="subject">이 과목</option>}
          </select>
        )}
      </div>
      {k === 'tasks' && <TaskEmbed filter={b.embed.filter} note={note} />}
      {k === 'calendar' && <CalEmbed />}
      {k === 'timer' && <TimerEmbed subjectId={note?.subjectId} />}
    </div>
  )
}

function TaskEmbed({ filter, note }) {
  const tasks = useColl('tasks')
  let items
  if (filter === 'note') items = tasks.filter((t) => t.noteId === note?.id && !t.archived)
  else if (filter === 'project') items = tasks.filter((t) => t.projectId === note?.projectId && !t.archived)
  else if (filter === 'subject') items = tasks.filter((t) => t.subjectId === note?.subjectId && !t.done)
  else items = applyFilter(tasks, { smart: filter || 'today', sort: 'due' })
  return (
    <div className="list">
      {items.slice(0, 12).map((t) => (
        <div key={t.id} className={'row' + (t.done ? ' muted' : '')} style={{ minHeight: 32 }}>
          <Check on={t.done} onClick={() => toggleTask(t.id)} />
          <button className="grow ellipsis" style={{ textAlign: 'left', textDecoration: t.done ? 'line-through' : null }} onClick={() => openDetail('task', t.id)}>{t.title}</button>
        </div>
      ))}
      {!items.length && <div className="tiny muted">없음</div>}
    </div>
  )
}

export function CalEmbed({ onPick }) {
  const events = useColl('events')
  const tasks = useColl('tasks')
  const [m, setM] = useState(monthStart(today()))
  const start = weekStart(m, 1)
  const mo = parseYmd(m).getMonth()
  return (
    <div>
      <div className="row between small"><button className="icon-btn" onClick={() => setM(monthStart(addDays(m, -1)))} aria-label="이전"><Icon name="back" size={14} /></button><b>{mo + 1}월</b><button className="icon-btn" onClick={() => setM(monthStart(addDays(m, 32)))} aria-label="다음"><Icon name="next" size={14} /></button></div>
      <div className="mini-cal">
        {['월', '화', '수', '목', '금', '토', '일'].map((w) => <span key={w} className="tiny muted">{w}</span>)}
        {Array.from({ length: 42 }, (_, i) => {
          const d = addDays(start, i)
          const has = events.some((e) => e.date === d)
          return (
            <button key={d} className={'mc-d' + (parseYmd(d).getMonth() !== mo ? ' out' : '') + (d === today() ? ' is-today' : '')}
              onClick={() => onPick ? onPick(d) : (setParams('planner', { date: d }), go('planner', 'today'))}>
              {parseYmd(d).getDate()}{has && <i />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TimerEmbed({ subjectId }) {
  const t = useTimerState()
  useTick(!!t)
  const subjects = useColl('subjects')
  const sid = subjectId || subjects[0]?.id
  return (
    <div className="row">
      <span className="big-clock" style={{ fontSize: '1.6em' }}>{fmtClock(elapsed(t) / 1000)}</span>
      <span className="grow tiny muted">{t ? subjects.find((s) => s.id === t.subjectId)?.name : subjects.find((s) => s.id === sid)?.name}</span>
      {!t && <button className="btn sm primary" onClick={() => startStopwatch(sid)}><Icon name="play" size={14} />시작</button>}
      {t && (t.paused ? <button className="btn sm" onClick={resume}>계속</button> : <button className="btn sm" onClick={pause}>정지</button>)}
      {t && <button className="btn sm" onClick={stop}>기록</button>}
    </div>
  )
}


// 표 칸: 내용만큼 높이가 늘어나는 입력칸
function TCell({ value, onChange, ...rest }) {
  const ref = useRef(null)
  useEffect(() => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }, [value])
  return <textarea ref={ref} rows={1} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
}

// 표: 칸을 누르면 그 줄·칸 도구 · 왼쪽(줄)·위쪽(칸) 손잡이를 끌어 순서 바꾸기, 누르면 줄·칸 전체 선택
// Tab 다음 칸 (마지막 칸이면 줄 추가) · ⌥↑↓ 줄 옮기기 · 시트에서 복사한 칸 붙여넣기
const COLW = { s: 'minmax(56px, .6fr)', n: 'minmax(70px, 1fr)', w: 'minmax(130px, 2fr)' }
const AL = { l: 'left', c: 'center', r: 'right' }
function TableBlock({ b, onMeta, readOnly }) {
  const { rows, cols, align, colW } = TB.norm(b)
  const head = b.head !== false, headCol = !!b.headCol
  const [sel, setSel] = useState(null) // { r, c, m: 'cell' | 'row' | 'col' }
  const [drag, setDrag] = useState(null) // { k: 'row' | 'col', from, to }
  const wrap = useRef(null)
  useEffect(() => {
    if (!sel) return
    const f = (e) => { if (!wrap.current?.contains(e.target)) setSel(null) }
    document.addEventListener('pointerdown', f)
    return () => document.removeEventListener('pointerdown', f)
  }, [!!sel])
  const focusCell = (r, c) => setTimeout(() => wrap.current?.querySelector(`[data-rc="${r}-${c}"]`)?.focus(), 0)
  const apply = (p, ns) => { onMeta(p); if (ns) { setSel(ns); if (ns.m === 'cell') focusCell(ns.r, ns.c) } }
  const setCell = (i, j, v) => onMeta({ rows: rows.map((r, k) => (k === i ? r.map((x, c) => (c === j ? v : x)) : r)) })
  const colsTpl = colW.map((w) => COLW[w] || COLW.n).join(' ')
  const tpl = readOnly ? colsTpl : '18px ' + colsTpl

  // 손잡이: 끌면 옮기기, 그냥 누르면 줄·칸 선택
  const grip = (k, idx) => (e) => {
    e.preventDefault()
    const el = e.currentTarget, x0 = e.clientX, y0 = e.clientY
    let moved = false, to = idx
    try { el.setPointerCapture(e.pointerId) } catch {}
    const mv = (ev) => {
      if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return
      moved = true; to = idx
      const p = k === 'row' ? ev.clientY : ev.clientX
      wrap.current.querySelectorAll(k === 'row' ? '[data-rh]' : '[data-ch]').forEach((h, n) => {
        const r = h.getBoundingClientRect(), mid = k === 'row' ? r.top + r.height / 2 : r.left + r.width / 2
        if (n < idx && p < mid) to = Math.min(to, n)
        if (n > idx && p > mid) to = Math.max(to, n)
      })
      setDrag({ k, from: idx, to })
    }
    const up = () => {
      el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up)
      setDrag(null)
      if (moved) { if (to !== idx) apply(k === 'row' ? TB.moveRow(b, idx, to) : TB.moveCol(b, idx, to), { r: k === 'row' ? to : 0, c: k === 'col' ? to : 0, m: k }) }
      else setSel((s) => (s?.m === k && (k === 'row' ? s.r === idx : s.c === idx) ? null : { r: k === 'row' ? idx : 0, c: k === 'col' ? idx : 0, m: k }))
    }
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up)
  }

  const onKey = (e, i, j) => {
    const ta = e.target
    if (e.key === 'Tab') {
      e.preventDefault()
      const n = i * cols + j + (e.shiftKey ? -1 : 1)
      if (n < 0) return
      if (n >= rows.length * cols) return apply(TB.insRow(b, rows.length), { r: rows.length, c: 0, m: 'cell' })
      return focusCell(Math.floor(n / cols), n % cols)
    }
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault(); const to = i + (e.key === 'ArrowUp' ? -1 : 1)
      if (to >= 0 && to < rows.length) apply(TB.moveRow(b, i, to), { r: to, c: j, m: 'cell' })
      return
    }
    if (e.key === 'ArrowUp' && i > 0 && ta.selectionStart === 0 && ta.selectionEnd === 0) { e.preventDefault(); focusCell(i - 1, j) }
    if (e.key === 'ArrowDown' && i < rows.length - 1 && ta.selectionStart === ta.value.length) { e.preventDefault(); focusCell(i + 1, j) }
  }
  const onPaste = (e, i, j) => {
    e.stopPropagation() // 칸 안 붙여넣기는 블록으로 바꾸지 않음
    const tx = e.clipboardData?.getData('text/plain') || ''
    if (!tx.includes('\t')) return
    e.preventDefault()
    const g = TB.parseGrid(tx)
    apply(TB.pasteGrid(b, i, j, g), { r: i, c: j, m: 'cell' })
    toast(`${g.length}줄 × ${g[0]?.length || 0}칸을 붙였어요`)
  }

  const cls = (i, j) => {
    let c = 'tblk-c' + (i === 0 ? ' r0' : '') + (j === 0 ? ' c0' : '')
    if ((head && i === 0) || (headCol && j === 0)) c += ' th'
    else if (b.stripe && (i - (head ? 1 : 0)) % 2 === 1) c += ' zb'
    if (sel && ((sel.m === 'row' && sel.r === i) || (sel.m === 'col' && sel.c === j))) c += ' sel'
    if (drag && drag.to !== drag.from) {
      const x = drag.k === 'row' ? i : j
      if (x === drag.from) c += ' dg'
      if (x === drag.to) c += drag.k === 'row' ? (drag.to > drag.from ? ' db' : ' dt') : (drag.to > drag.from ? ' dr' : ' dl')
    }
    return c
  }

  const B = ({ on, children, dis, label, act }) => <button className={'tblk-b' + (act ? ' on' : '')} disabled={dis} aria-label={label} onClick={on}>{children}</button>
  const r = sel?.r ?? 0, c = sel?.c ?? 0
  const bar = sel && !readOnly && (
    <div className="tblk-bar no-print" onPointerDown={(e) => { if (e.target.closest('button')) e.preventDefault() }}>
      {sel.m !== 'col' && <div className="tblk-g">
        <span className="tblk-l">{r + 1}번째 줄</span>
        <B label="위로" dis={r === 0} on={() => apply(TB.moveRow(b, r, r - 1), { ...sel, r: r - 1 })}><Icon name="up" size={13} /></B>
        <B label="아래로" dis={r === rows.length - 1} on={() => apply(TB.moveRow(b, r, r + 1), { ...sel, r: r + 1 })}><Icon name="down" size={13} /></B>
        <B on={() => apply(TB.insRow(b, r), { r, c, m: 'cell' })}>위에 추가</B>
        <B on={() => apply(TB.insRow(b, r + 1), { r: r + 1, c, m: 'cell' })}>아래에 추가</B>
        <B on={() => apply(TB.dupRow(b, r), { ...sel, r: r + 1 })}>복제</B>
        <B on={() => { apply(TB.delRow(b, r)); setSel(null) }}>지우기</B>
      </div>}
      {sel.m !== 'row' && <div className="tblk-g">
        <span className="tblk-l">{c + 1}번째 칸</span>
        <B label="왼쪽으로" dis={c === 0} on={() => apply(TB.moveCol(b, c, c - 1), { ...sel, c: c - 1 })}><Icon name="back" size={13} /></B>
        <B label="오른쪽으로" dis={c === cols - 1} on={() => apply(TB.moveCol(b, c, c + 1), { ...sel, c: c + 1 })}><Icon name="next" size={13} /></B>
        <B on={() => apply(TB.insCol(b, c), { r, c, m: 'cell' })}>왼쪽에 추가</B>
        <B on={() => apply(TB.insCol(b, c + 1), { r, c: c + 1, m: 'cell' })}>오른쪽에 추가</B>
        <B on={() => { apply(TB.delCol(b, c)); setSel(null) }}>지우기</B>
      </div>}
      {sel.m !== 'row' && <div className="tblk-g">
        <span className="tblk-l">맞춤</span>
        {['l', 'c', 'r'].map((a) => <B key={a} act={align[c] === a} on={() => onMeta({ align: align.map((x, k) => (k === c ? a : x)) })}>{{ l: '왼쪽', c: '가운데', r: '오른쪽' }[a]}</B>)}
      </div>}
      {sel.m !== 'row' && <div className="tblk-g">
        <span className="tblk-l">너비</span>
        {['s', 'n', 'w'].map((w) => <B key={w} act={colW[c] === w} on={() => onMeta({ colW: colW.map((x, k) => (k === c ? w : x)) })}>{{ s: '좁게', n: '보통', w: '넓게' }[w]}</B>)}
      </div>}
      {sel.m !== 'row' && <div className="tblk-g">
        <span className="tblk-l">정렬</span>
        <B on={() => apply(TB.sortBy(b, c, 1))}>오름차순</B>
        <B on={() => apply(TB.sortBy(b, c, -1))}>내림차순</B>
      </div>}
      <div className="tblk-g">
        <span className="tblk-l">표</span>
        <B act={head} on={() => onMeta({ head: !head })}>머리줄</B>
        <B act={headCol} on={() => onMeta({ headCol: !headCol })}>머리칸</B>
        <B act={!!b.stripe} on={() => onMeta({ stripe: !b.stripe })}>줄무늬</B>
        <B on={async () => { try { await navigator.clipboard.writeText(TB.toTSV(b)); toast('표를 복사했어요 · 시트에 붙여 넣을 수 있어요') } catch { toast('복사하지 못했어요') } }}>복사</B>
      </div>
    </div>
  )

  return (
    <div className="tblk" ref={wrap}>
      <div className="tblk-scroll">
        <div className="tblk-grid" style={{ gridTemplateColumns: tpl, '--tplp': colsTpl }}>
          {!readOnly && <div className="tblk-corner no-print" />}
          {!readOnly && Array.from({ length: cols }, (_, j) => <div key={'h' + j} data-ch={j} className={'tblk-ch no-print' + (sel?.m === 'col' && sel.c === j ? ' on' : '')} onPointerDown={grip('col', j)} aria-label={`${j + 1}번째 칸 선택·옮기기`}><span /></div>)}
          {rows.map((row, i) => (
            <Fragment key={i}>
              {!readOnly && <div data-rh={i} className={'tblk-rh no-print' + (sel?.m === 'row' && sel.r === i ? ' on' : '')} onPointerDown={grip('row', i)} aria-label={`${i + 1}번째 줄 선택·옮기기`}><span /></div>}
              {row.map((v, j) => readOnly
                ? <div key={j} className={cls(i, j)} style={{ textAlign: AL[align[j]] }}><Inline text={v} /></div>
                : <TCell key={j} data-rc={`${i}-${j}`} className={cls(i, j)} style={{ textAlign: AL[align[j]] }} value={v} placeholder={head && i === 0 ? '제목' : ''}
                    onChange={(x) => setCell(i, j, x)} onFocus={() => setSel({ r: i, c: j, m: 'cell' })} onKeyDown={(e) => onKey(e, i, j)} onPaste={(e) => onPaste(e, i, j)} />)}
            </Fragment>
          ))}
        </div>
      </div>
      {bar}
      {!readOnly && !sel && <div className="row no-print" style={{ gap: 4, marginTop: 4 }}>
        <button className="chip sm" onClick={() => apply(TB.insRow(b, rows.length), { r: rows.length, c: 0, m: 'cell' })}>+ 줄</button>
        <button className="chip sm" onClick={() => apply(TB.insCol(b, cols), { r: 0, c: cols, m: 'cell' })}>+ 칸</button>
        <span className="tiny muted grow" style={{ alignSelf: 'center' }}>칸을 누르면 줄·칸 도구 · 손잡이를 끌어 순서 바꾸기</span>
      </div>}
    </div>
  )
}

// 하위 페이지 링크 (누르면 그 페이지로)
function SubPage({ b }) {
  const notes = useColl('notes'), c = notes.find((x) => x.id === b.pageId)
  if (!c) return <div className="blk-v muted">삭제된 페이지</div>
  const todos = (c.blocks || []).filter((x) => x.type === 'todo' && (x.text || '').trim()).length
  return <button className="subpage" onClick={() => openNote(c.id)}><Icon name="file" size={15} /><span className="ellipsis grow">{c.title || '제목 없는 페이지'}</span>{todos > 0 && <span className="tiny muted">체크 {todos}</span>}<Icon name="next" size={13} /></button>
}

// 글자 꾸미기 막대: 고른 글자(없으면 그 자리 단어)에 굵게 · 밑줄 · 형광펜 켜고 끄기 · 색 바꾸기 · 지우기
const HL = [['', '보라'], ['r', '로즈'], ['g', '올리브'], ['b', '블루'], ['y', '모래']]
const TC = [['r', '로즈'], ['g', '올리브'], ['b', '네이비'], ['v', '바이올렛'], ['m', '회색']]
const SYMS = ['→', '←', '↔', '⇒', '∴', '∵', '※', '★', '☆', '✓', '✗', '①', '②', '③', '④', '⑤', '±', '×', '÷', '≠', '≤', '≥', '≈', '∞', '√', 'π', '°', '…', '「', '」', '『', '』']
function MarkBar({ on, hasSel, onPress, onApply, onInsert }) {
  const bp = (kind) => ({ onPointerDown: onPress, onMouseDown: (e) => e.preventDefault(), onClick: (e) => { e.preventDefault(); onApply(kind) } })
  const ip = (txt) => ({ onPointerDown: onPress, onMouseDown: (e) => e.preventDefault(), onClick: (e) => { e.preventDefault(); onInsert(txt) } })
  const [more, setMore] = useState(null) // 'sym' · 'dd'
  const ddays = useColl('ddays').filter((x) => x.date >= today()).sort((a, b) => a.date.localeCompare(b.date))
  return (
    <>
    <div className="markbar no-print">
      <button className={'mb' + (on.b ? ' on' : '')} {...bp('b')} aria-label="굵게"><b>B</b></button>
      <button className={'mb' + (on.u ? ' on' : '')} {...bp('u')} aria-label="밑줄"><u>U</u></button>
      <span className="mb-sep" />
      {HL.map(([k, l]) => <button key={k || 'd'} className={'mb mb-hl' + (on.h === k ? ' on' : '')} {...bp(k ? 'h:' + k : 'h')} aria-label={'형광펜 ' + l}><i className={'hl-dot' + (k ? ' hl-' + k : '')} /></button>)}
      <span className="mb-sep" />
      {TC.map(([k, l]) => <button key={k} className={'mb mb-tc' + (on.f === k ? ' on' : '')} {...bp('f:' + k)} aria-label={'글자 색 ' + l}><i className={'tc-dot tc-' + k} /></button>)}
      <span className="mb-sep" />
      <button className={'mb' + (on.p ? ' on' : '')} {...bp('p')} aria-label="위첨자">x<sup>2</sup></button>
      <button className={'mb' + (on.s ? ' on' : '')} {...bp('s')} aria-label="아래첨자">x<sub>2</sub></button>
      <button className={'mb' + (more === 'sym' ? ' on' : '')} onPointerDown={onPress} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); setMore(more === 'sym' ? null : 'sym') }} aria-label="기호">※</button>
      <button className={'mb' + (more === 'dd' ? ' on' : '')} onPointerDown={onPress} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); setMore(more === 'dd' ? null : 'dd') }} aria-label="D-day 넣기">D-</button>
      <span className="mb-sep" />
      <button className="mb mb-x" {...bp('c')} aria-label="꾸밈 지우기">지우기</button>
      {!hasSel && !more && <span className="mb-tip">글자를 고르거나, 단어에 커서를 두고 누르세요</span>}
    </div>
    {more === 'sym' && <div className="markbar mb-more no-print">{SYMS.map((x) => <button key={x} className="mb" {...ip(x)}>{x}</button>)}</div>}
    {more === 'dd' && <div className="markbar mb-more no-print">
      {ddays.map((x) => <button key={x.id} className="mb mb-wide" {...ip(`{{D:${x.title}}}`)}>{x.title}</button>)}
      <button className="mb mb-wide" {...ip(`{{D:${today()}}}`)}>날짜로 (오늘 → 고쳐 쓰기)</button>
      {!ddays.length && <span className="mb-tip">D-day를 만들면 이름으로 넣을 수 있어요</span>}
    </div>}
    </>
  )
}

// 토글: 제목 줄을 누르면 아래 내용이 펼쳐지고 접힘 (질문 → 답 정리)
function ToggleBlock({ b, note, readOnly, editing, edit, onTitle, onKeyDown, onBlur, onEdit, onChildren }) {
  // 접힘·펼침은 이 기기에 기억
  const [open, setOpen0] = useState(() => { try { const v = localStorage.getItem('tgl:' + b.id); return v == null ? !!b.open : v === '1' } catch { return !!b.open } })
  const setOpen = (v) => { setOpen0(v); try { localStorage.setItem('tgl:' + b.id, v ? '1' : '0') } catch {} }
  return (
    <div className="tgl">
      <div className="row" style={{ gap: 4, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
        <button className={'tgl-arrow' + (open ? ' open' : '')} onClick={() => setOpen(!open)} aria-label={open ? '접기' : '펼치기'}>▸</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing && !readOnly ? <EditArea b={b} pos={edit.pos} onChange={onTitle} onKeyDown={onKeyDown} onBlur={onBlur} />
            : <div className="blk-v tgl-t" onClick={() => (readOnly ? setOpen(!open) : onEdit())}>{b.text ? <Inline text={b.text} /> : <span className="muted">토글 제목 (예: 질문)</span>}</div>}
        </div>
      </div>
      {open && <div className="tgl-body"><BlockEditor nested readOnly={readOnly} blocks={b.children || []} note={note} onChange={onChildren} /></div>}
    </div>
  )
}
