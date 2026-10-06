import { useEffect, useRef, useState, Fragment } from 'react'
import { useColl, put, patch } from '../store/store.js'
import { toggleTask, addReview, addTask } from '../store/actions.js'
import { Icon, Check, openMenu, openSheet, openDetail, toast } from './ui.jsx'
import { FileThumb, previewFile } from './Attach.jsx'
import { addFile, pickFiles, fmtSize } from '../lib/files.js'
import { newBlock, commitBlock, refLabel, openOrCreateByTitle } from '../lib/notes.js'
import { parseMention, today, monthStart, weekStart, addDays, parseYmd, fmtClock } from '../engine/date.js'
import { openNote, go, setParams } from '../nav.js'
import { useTimerState, useTick, elapsed, startStopwatch, pause, resume, stop } from '../lib/timer.js'
import { applyFilter } from '../views/tasks/filter.js'
import { startDrag } from '../lib/drag.js'

const TYPES = [['text', '텍스트'], ['h1', '제목 1'], ['h2', '제목 2'], ['bullet', '글머리'], ['todo', '체크박스 (할 일)'], ['callout', '강조 상자'], ['quote', '인용'], ['divider', '구분선']]
const TONES = [['key', '핵심'], ['warn', '주의'], ['ex', '예시']]
const SOLID = ['divider', 'embed', 'sync', 'file', 'table', 'page', 'cols'] // 글자를 직접 쓰지 않는 블록
const INLINE_RE = /(\*\*[^*\n]+\*\*|==[^=\n]+==|__[^_\n]+__|\[\[[^\]]+\]\]|@(?:오늘|내일|모레|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2})(?:\s+\d{1,2}:\d{2})?|https?:\/\/[^\s]+)/g

export function Inline({ text }) {
  if (!text) return null
  const parts = text.split(INLINE_RE)
  return parts.map((p, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{p}</Fragment>
    // 글자 꾸미기: **굵게** · ==형광펜== · __밑줄__
    if (p.startsWith('**')) return <b key={i} className="mk-b">{p.slice(2, -2)}</b>
    if (p.startsWith('==')) return <mark key={i} className="mk-hl">{p.slice(2, -2)}</mark>
    if (p.startsWith('__')) return <u key={i} className="mk-u">{p.slice(2, -2)}</u>
    if (p.startsWith('[[')) {
      const t = p.slice(2, -2)
      return <button key={i} className="wikilink" onClick={(e) => { e.stopPropagation(); openNote(openOrCreateByTitle(t).id) }}>{t}</button>
    }
    if (p.startsWith('@')) {
      const m = parseMention(p)
      return <button key={i} className="mention" onClick={(e) => { e.stopPropagation(); if (m) go('notes', 'daily', { date: m.date }) }}>{p}</button>
    }
    return <a key={i} href={p} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{p.replace(/^https?:\/\//, '').slice(0, 40)}</a>
  })
}

export default function BlockEditor({ blocks = [], onChange, note, nested, readOnly }) {
  const tasks = useColl('tasks')
  const [edit, setEdit] = useState(null) // { id, pos }
  const skip = useRef(null) // 구조 변경(Enter/Backspace) 직후 들어오는 blur 무시
  const skipBlur = (id) => { skip.current = id; setTimeout(() => { if (skip.current === id) skip.current = null }, 80) }
  const list = blocks.length ? blocks : [newBlock()]
  const set = (next) => onChange(next)
  const upd = (id, p) => set(list.map((b) => (b.id === id ? { ...b, ...p } : b)))
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
      if (text === '---') return upd(b.id, { type: 'divider', text: '' })
    }
    upd(b.id, { text })
  }

  const onKey = (e, b) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    const el = e.target
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      skipBlur(b.id)
      const pos = el.selectionStart
      const before = b.text.slice(0, pos), after = b.text.slice(pos)
      if (!before && !after && ['bullet', 'todo', 'quote'].includes(b.type)) return upd(b.id, { type: 'text' })
      const keep = ['bullet', 'todo'].includes(b.type) ? b.type : 'text'
      const cur = commitBlock({ ...b, text: before }, note)
      const nb = newBlock(keep, after)
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

  const blockMenu = (e, b) => openMenu(e, [
    ...(b.type === 'callout' ? TONES.filter(([t]) => t !== (b.tone || 'key')).map(([t, l]) => ({ label: `색 → ${l}`, onClick: () => upd(b.id, { tone: t }) })) : []),
    ...TYPES.filter(([t]) => t !== b.type && !SOLID.includes(b.type)).slice(0, 7).map(([t, l]) => ({ label: `→ ${l}`, onClick: () => { upd(b.id, { type: t }); if (t === 'todo') setEdit({ id: b.id, pos: (b.text || '').length }) } })),
    b.text && { label: '복습 등록', icon: 'brain', onClick: () => addReview({ title: b.text.slice(0, 60), subjectId: note?.subjectId, sourceType: 'note', sourceId: note?.id }) },
    b.text && b.type !== 'todo' && { label: '할 일로 만들기', icon: 'tasks', onClick: () => { const t = addTask({ title: b.text, noteId: note?.id, subjectId: note?.subjectId }); upd(b.id, { type: 'todo', taskId: t.id }) } },
    !nested && b.type !== 'sync' && { label: '동기화 블록으로', icon: 'sync', onClick: () => { const s = put('syncBlocks', { blocks: [{ ...b, id: newBlock().id }] }); upd(b.id, { type: 'sync', syncId: s.id, text: '' }) } },
    { label: '복제', icon: 'plus', onClick: () => { const i = list.findIndex((x) => x.id === b.id), a = [...list]; a.splice(i + 1, 0, clone(b)); set(a) } },
    { label: '여러 줄 선택', icon: 'check', onClick: () => setSel(new Set([b.id])) },
    { label: '위로', icon: 'back', onClick: () => move(b.id, -1) },
    { label: '아래로', icon: 'next', onClick: () => move(b.id, 1) },
    { label: '삭제', icon: 'trash', danger: true, onClick: () => removeBlock(b.id) },
  ])

  const addEnd = (nb) => { set([...list.filter((x, i) => !(i === list.length - 1 && x.type === 'text' && !x.text)), nb]); if (nb.text !== undefined && !['embed', 'sync', 'file', 'divider'].includes(nb.type)) setEdit({ id: nb.id, pos: 0 }) }

  return (
    <div className={'blocks' + (nested ? ' nested' : '')}>
      {list.map((b) => {
        const editing = edit?.id === b.id
        const task = b.taskId && tasks.find((t) => t.id === b.taskId)
        return (
          <div key={b.id} className={'blk blk-' + b.type + (b.type === 'callout' ? ' tone-' + (b.tone || 'key') : '') + (sel?.has(b.id) ? ' sel' : '')} data-drop={readOnly ? undefined : 'blk:' + b.id} onClickCapture={sel ? (e) => { e.stopPropagation(); e.preventDefault(); togSel(b.id) } : undefined}>
            {!readOnly && <button className="blk-h" onPointerDown={(e) => gripDown(e, b)} onClick={(e) => { if (dragged.current) { dragged.current = false; return } blockMenu(e, b) }} aria-label="블록 메뉴 · 끌어서 순서 바꾸기"><Icon name="grip" size={14} /></button>}
            {b.type === 'bullet' && <span className="blk-dot">•</span>}
            {b.type === 'todo' && <span className="blk-chk"><Check on={!!task?.done} onClick={() => { if (task) toggleTask(task.id); else { const nb = commitBlock(b, note); upd(b.id, nb); if (nb.taskId) toggleTask(nb.taskId) } }} /></span>}
            <div className="blk-c">
              {b.type === 'divider' ? <hr /> :
                b.type === 'file' ? <FileBlock b={b} /> :
                b.type === 'table' ? <TableBlock b={b} readOnly={readOnly} onChange={(rows) => upd(b.id, { rows })} /> :
                b.type === 'page' ? <SubPage b={b} /> :
                b.type === 'cols' ? <div className="cols2">{[0, 1].map((k) => <div key={k} className="col-pane"><BlockEditor nested readOnly={readOnly} blocks={(b.cols || [[], []])[k] || []} note={note} onChange={(bs) => upd(b.id, { cols: [0, 1].map((j) => (j === k ? bs : (b.cols || [[], []])[j] || [])) })} /></div>)}</div> :
                b.type === 'toggle' ? <ToggleBlock b={b} note={note} readOnly={readOnly} editing={editing} edit={edit} onTitle={(t) => onText(b, t)} onKeyDown={(e) => onKey(e, b)} onBlur={(t) => { commit({ ...b, text: t }); setEdit((x) => (x?.id === b.id ? null : x)) }} onEdit={() => setEdit({ id: b.id, pos: (b.text || '').length })} onChildren={(bs) => upd(b.id, { children: bs })} /> :
                b.type === 'embed' ? <Embed b={b} note={note} onChange={(p) => upd(b.id, p)} /> :
                b.type === 'sync' ? <SyncBlock b={b} note={note} /> :
                editing && !readOnly ? (
                  <><EditArea b={b} pos={edit.pos} onChange={(t) => onText(b, t)} onKeyDown={(e) => onKey(e, b)}
                    onBlur={(t) => { if (skip.current !== b.id) commit({ ...b, text: t }); setEdit((x) => (x?.id === b.id ? null : x)) }} />
                  <MarkBar onApply={(t) => onText(b, t)} /></>
                ) : (
                  <div className={'blk-v' + (task?.done ? ' done' : '')} onClick={() => !readOnly && setEdit({ id: b.id, pos: (b.text || '').length })}>{b.type === 'callout' && <span className="co-tag">{(TONES.find(([t]) => t === (b.tone || 'key')) || TONES[0])[1]}</span>}
                    {b.text ? <Inline text={b.text} /> : <span className="muted">{list.length === 1 && nested ? '입력…' : list.length === 1 ? '입력하세요… (# 제목, - 목록, [] 체크, [[링크]], @내일 15:00)' : ' '}</span>}
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
          <button className="chip" onClick={() => addEnd({ id: newBlock().id, type: 'table', rows: [['', ''], ['', '']] })}>표</button>
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
  const ref = useRef(null)
  const [v, setV] = useState(b.text || '')
  useEffect(() => { setV(b.text || '') }, [b.text])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    const p = Math.min(pos ?? v.length, v.length)
    try { el.setSelectionRange(p, p) } catch {}
  }, []) // eslint-disable-line
  useEffect(() => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }, [v])
  return <textarea ref={ref} rows={1} className="blk-ta" value={v} enterKeyHint="enter"
    onChange={(e) => { setV(e.target.value); onChange(e.target.value) }}
    onKeyDown={onKeyDown} onBlur={() => onBlur(ref.current?.value ?? v)} />
}

function FileBlock({ b }) {
  const f = useColl('files').find((x) => x.id === b.fileId)
  if (!f) return <span className="muted small">삭제된 파일</span>
  return (
    <div className="row file-blk" onClick={() => previewFile(f)}>
      <FileThumb file={f} size={f.type?.startsWith('image') ? 120 : 48} />
      <div className="grow"><div className="ellipsis">{f.name}</div><div className="tiny muted">{fmtSize(f.size)}</div></div>
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


// 표: 첫 줄은 머리줄 · 칸을 눌러 바로 입력 · 줄·칸 더하기/빼기
function TableBlock({ b, onChange, readOnly }) {
  const rows = b.rows?.length ? b.rows : [['', ''], ['', '']], cols = Math.max(...rows.map((r) => r.length))
  const setCell = (i, j, v) => onChange(rows.map((r, k) => (k === i ? Array.from({ length: cols }, (_, c) => (c === j ? v : r[c] ?? '')) : r)))
  return (
    <div className="tblk">
      <div className="tblk-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(70px, 1fr))` }}>
        {rows.map((r, i) => Array.from({ length: cols }, (_, j) => readOnly
          ? <div key={i + '-' + j} className={'tblk-c' + (i === 0 ? ' th' : '')}>{r[j] || ''}</div>
          : <textarea key={i + '-' + j} rows={1} className={'tblk-c' + (i === 0 ? ' th' : '')} value={r[j] || ''} placeholder={i === 0 ? '제목' : ''} onChange={(e) => setCell(i, j, e.target.value)} />))}
      </div>
      {!readOnly && <div className="row no-print" style={{ gap: 4, marginTop: 4 }}>
        <button className="chip sm" onClick={() => onChange([...rows, Array(cols).fill('')])}>+ 줄</button>
        <button className="chip sm" onClick={() => onChange(rows.map((r) => [...r, '']))}>+ 칸</button>
        {rows.length > 1 && <button className="chip sm" onClick={() => onChange(rows.slice(0, -1))}>− 줄</button>}
        {cols > 1 && <button className="chip sm" onClick={() => onChange(rows.map((r) => r.slice(0, cols - 1)))}>− 칸</button>}
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

// 글자 꾸미기: 고른 글자를 **굵게** · ==형광펜== · __밑줄__ 로 감싸기 (편집 중인 칸 아래 작은 막대)
function MarkBar({ onApply }) {
  const wrap = (m) => (e) => {
    e.preventDefault()
    const el = e.currentTarget.closest('.blk-c')?.querySelector('textarea'); if (!el) return
    const a = el.selectionStart, z = el.selectionEnd, v = el.value
    const mid = v.slice(a, z) || '글자'
    const next = v.slice(0, a) + m + mid + m + v.slice(z)
    onApply(next)
    requestAnimationFrame(() => { try { el.focus(); el.setSelectionRange(a + m.length, a + m.length + mid.length) } catch {} })
  }
  return (
    <div className="markbar no-print">
      <button onPointerDown={wrap('**')} aria-label="굵게"><b>B</b></button>
      <button onPointerDown={wrap('==')} aria-label="형광펜"><span className="mk-hl">형광</span></button>
      <button onPointerDown={wrap('__')} aria-label="밑줄"><u>밑줄</u></button>
    </div>
  )
}

// 토글: 제목 줄을 누르면 아래 내용이 펼쳐지고 접힘 (질문 → 답 정리)
function ToggleBlock({ b, note, readOnly, editing, edit, onTitle, onKeyDown, onBlur, onEdit, onChildren }) {
  const [open, setOpen] = useState(!!b.open)
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
