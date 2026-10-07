// 노트 안 보드 블록: 칸(할 일 / 하는 중 / 끝) · 카드 끌어 옮기기 · 카드를 할 일로 연결하면 마지막 칸 = 완료
import { useState } from 'react'
import { useColl, uid, find } from '../store/store.js'
import { addTask, toggleTask } from '../store/actions.js'
import { plainText } from '../lib/marks.js'
import { longPress } from '../lib/drag.js'
import { Icon, Check, openMenu, toast } from './ui.jsx'
import { Inline } from './BlockEditor.jsx'

export const newBoard = () => ({ id: uid(), type: 'board', cols: [{ id: uid(), name: '할 일', cards: [] }, { id: uid(), name: '하는 중', cards: [] }, { id: uid(), name: '끝', cards: [] }] })

// 카드 옮기기 (순수 함수): fromCol 의 cardId 를 toCol 의 beforeId 앞(없으면 끝)으로
export function moveCard(cols, cardId, toColId, beforeId) {
  let card = null
  const rest = cols.map((c) => ({ ...c, cards: c.cards.filter((x) => (x.id === cardId ? ((card = x), false) : true)) }))
  if (!card) return cols
  return rest.map((c) => {
    if (c.id !== toColId) return c
    const a = [...c.cards], i = beforeId ? a.findIndex((x) => x.id === beforeId) : -1
    a.splice(i < 0 ? a.length : i, 0, card)
    return { ...c, cards: a }
  })
}

export default function BoardBlock({ b, note, readOnly, onMeta }) {
  const tasks = useColl('tasks')
  const cols = b.cols?.length ? b.cols : newBoard().cols
  const last = cols[cols.length - 1]?.id
  const [edit, setEdit] = useState(null) // 카드 id 또는 'add:' + 칸 id
  const set = (next) => onMeta({ cols: next })
  // 연결된 할 일: 마지막 칸으로 가면 완료, 다른 칸으로 가면 다시 열기
  const syncDone = (next, cardId) => {
    const col = next.find((c) => c.cards.some((x) => x.id === cardId)), card = col?.cards.find((x) => x.id === cardId)
    const t = card?.taskId && find('tasks', card.taskId)
    if (t && !!t.done !== (col.id === last)) toggleTask(t.id)
  }
  const move = (cardId, toCol, beforeId) => { const next = moveCard(cols, cardId, toCol, beforeId); set(next); syncDone(next, cardId) }
  const setCard = (colId, cardId, p) => set(cols.map((c) => (c.id === colId ? { ...c, cards: c.cards.map((x) => (x.id === cardId ? { ...x, ...p } : x)) } : c)))
  const delCard = (colId, cardId) => set(cols.map((c) => (c.id === colId ? { ...c, cards: c.cards.filter((x) => x.id !== cardId) } : c)))
  const addCard = (colId, text) => { if (!text.trim()) return; set(cols.map((c) => (c.id === colId ? { ...c, cards: [...c.cards, { id: uid(), text: text.trim() }] } : c))) }
  const colMenu = (e, c, i) => openMenu(e, [
    { label: '이름 바꾸기', icon: 'edit', onClick: () => { const v = prompt('칸 이름', c.name); if (v?.trim()) set(cols.map((x) => (x.id === c.id ? { ...x, name: v.trim() } : x))) } },
    i > 0 && { label: '왼쪽으로', icon: 'back', onClick: () => { const a = [...cols]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; set(a) } },
    i < cols.length - 1 && { label: '오른쪽으로', icon: 'next', onClick: () => { const a = [...cols]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; set(a) } },
    cols.length < 6 && { label: '오른쪽에 칸 추가', icon: 'plus', onClick: () => { const a = [...cols]; a.splice(i + 1, 0, { id: uid(), name: '새 칸', cards: [] }); set(a) } },
    cols.length > 1 && { label: c.cards.length ? `지우기 (카드 ${c.cards.length}장도)` : '지우기', icon: 'trash', danger: true, onClick: () => set(cols.filter((x) => x.id !== c.id)) },
  ])
  const cardMenu = (e, c, x) => openMenu(e, [
    { label: '고치기', icon: 'edit', onClick: () => setEdit(x.id) },
    !x.taskId && { label: '할 일로 연결', icon: 'tasks', onClick: () => { const t = addTask({ title: plainText(x.text), noteId: note?.id, subjectId: note?.subjectId }); if (c.id === last) toggleTask(t.id); setCard(c.id, x.id, { taskId: t.id }); toast('할 일로 연결했어요 · 마지막 칸으로 옮기면 완료') } },
    ...cols.filter((y) => y.id !== c.id).map((y) => ({ label: `→ ${y.name}`, onClick: () => move(x.id, y.id) })),
    { label: '지우기', icon: 'trash', danger: true, onClick: () => delCard(c.id, x.id) },
  ])
  return (
    <div className="board-blk">
      {cols.map((c, i) => (
        <div key={c.id} className="bb-col" data-drop={readOnly ? undefined : 'bcol:' + c.id}>
          <div className="bb-h">
            <span className="ellipsis">{c.name}</span><span className="tiny muted">{c.cards.length}</span>
            {!readOnly && <button className="icon-btn bb-more" onClick={(e) => colMenu(e, c, i)} aria-label="칸 메뉴"><Icon name="more" size={15} /></button>}
          </div>
          {c.cards.map((x) => {
            const t = x.taskId && tasks.find((y) => y.id === x.taskId)
            return edit === x.id && !readOnly
              ? <textarea key={x.id} className="bb-card bb-edit" autoFocus defaultValue={x.text} rows={2} onBlur={(e) => { const v = e.target.value.trim(); if (v) setCard(c.id, x.id, { text: v }); else delCard(c.id, x.id); setEdit(null) }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.target.blur() } }} />
              : <div key={x.id} className={'bb-card' + (t?.done ? ' done' : '')} data-drop={readOnly ? undefined : 'bcard:' + c.id + ':' + x.id}
                  {...(readOnly ? {} : longPress(() => ({ label: plainText(x.text).slice(0, 24), onDrop: (zone, pt) => {
                    const [k, colId, cardId] = zone.dataset.drop.split(':')
                    if (k === 'bcard') { if (cardId === x.id) return; const r = zone.getBoundingClientRect(), after = pt.y > r.top + r.height / 2, tc = cols.find((y) => y.id === colId), j = tc.cards.findIndex((y) => y.id === cardId); move(x.id, colId, after ? tc.cards[j + 1]?.id : cardId) }
                    else if (k === 'bcol') move(x.id, colId)
                  } })))}
                  onClick={() => !readOnly && setEdit(x.id)}>
                  {t && <Check on={!!t.done} onClick={(e) => { e?.stopPropagation?.(); move(x.id, t.done ? cols[0].id : last) }} />}
                  <span className="grow"><Inline text={x.text} /></span>
                  {!readOnly && <button className="icon-btn bb-more" onClick={(e) => { e.stopPropagation(); cardMenu(e, c, x) }} aria-label="카드 메뉴"><Icon name="more" size={14} /></button>}
                </div>
          })}
          {!readOnly && (edit === 'add:' + c.id
            ? <textarea className="bb-card bb-edit" autoFocus rows={2} placeholder="카드 내용 · Enter 로 추가" onBlur={(e) => { addCard(c.id, e.target.value); setEdit(null) }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addCard(c.id, e.target.value); e.target.value = '' } }} />
            : <button className="bb-add tiny muted" onClick={() => setEdit('add:' + c.id)}>+ 카드</button>)}
        </div>
      ))}
    </div>
  )
}
