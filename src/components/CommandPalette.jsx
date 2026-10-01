import { useMemo, useState } from 'react'
import { useColl } from '../store/store.js'
import { Icon, openDetail } from './ui.jsx'
import { go, openNote } from '../nav.js'
import { fmtShort } from '../engine/date.js'
import { previewFile } from './Attach.jsx'

const noteText = (n) => (n.blocks || []).map((b) => b.text || '').join(' ')

const ACTIONS = [
  ['홈', () => go('home')], ['오늘 플래너', () => go('planner', 'today')], ['월간 캘린더', () => go('planner', 'month')],
  ['원형 계획표', () => go('planner', 'circle')], ['10분 플래너', () => go('planner', 'grid')],
  ['할 일 리스트', () => go('tasks', 'list')], ['아이젠하워 매트릭스', () => go('tasks', 'matrix')], ['칸반', () => go('tasks', 'kanban')],
  ['간트', () => go('tasks', 'gantt')], ['표 · DB 뷰', () => go('tasks', 'table')], ['보관함 · 휴지통', () => go('tasks', 'archive')],
  ['타이머', () => go('study', 'timer')], ['학습 계획', () => go('study', 'plan')], ['복습', () => go('study', 'review')],
  ['교재 진도', () => go('study', 'progress')], ['공부 기록 · 통계', () => go('study', 'records')],
  ['데일리 노트', () => go('notes', 'daily')], ['노트 페이지', () => go('notes', 'pages')], ['프로젝트 허브', () => go('notes', 'hub')],
  ['개념 그래프', () => go('notes', 'graph')], ['자료 라이브러리', () => go('notes', 'library')],
  ['건강', () => go('health')], ['설정', () => go('settings')],
  ['기록에 물어보기', () => import('./AskSheet.jsx').then((m) => import('./ui.jsx').then((u) => u.openSheet(() => <m.default />, { title: '내 기록에 물어보기' })))],
]

export default function CommandPalette({ close }) {
  const [q, setQ] = useState('')
  const tasks = useColl('tasks'), notes = useColl('notes'), events = useColl('events'), files = useColl('files')
  const res = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    const has = (x) => (x || '').toLowerCase().includes(s)
    return [
      ...ACTIONS.filter(([l]) => has(l)).map(([l, fn]) => ({ k: 'a' + l, icon: 'next', label: l, sub: '이동', fn })),
      ...tasks.filter((t) => has(t.title) || has(t.note)).slice(0, 20).map((t) => ({ k: t.id, icon: 'tasks', label: t.title, sub: (t.done ? '완료 · ' : '') + (t.due ? fmtShort(t.due) : '할 일'), fn: () => openDetail('task', t.id) })),
      ...events.filter((e) => has(e.title) || has(e.location)).slice(0, 15).map((e) => ({ k: e.id, icon: 'calendar', label: e.title, sub: fmtShort(e.date), fn: () => openDetail('event', e.id) })),
      ...notes.filter((n) => has(n.title) || has(noteText(n))).slice(0, 20).map((n) => ({ k: n.id, icon: 'notes', label: n.title || '제목 없음', sub: '노트', fn: () => openNote(n.id) })),
      ...files.filter((f) => has(f.name) || f.tags?.some(has)).slice(0, 10).map((f) => ({ k: f.id, icon: 'file', label: f.name, sub: '파일', fn: () => previewFile(f) })),
    ]
  }, [q, tasks, notes, events, files])
  const [sel, setSel] = useState(0)
  const run = (r) => { close(); setTimeout(r.fn, 50) }

  return (
    <div className="col">
      <div className="row">
        <Icon name="search" />
        <input className="input grow" autoFocus placeholder="할 일 · 노트 · 일정 · 파일 · 메뉴 검색" value={q}
          onChange={(e) => { setQ(e.target.value); setSel(0) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((x) => Math.min(res.length - 1, x + 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel((x) => Math.max(0, x - 1)) }
            if (e.key === 'Enter' && res[sel]) run(res[sel])
          }} />
        <button className="btn ghost" onClick={close}>닫기</button>
      </div>
      <div className="list">
        {res.map((r, i) => (
          <button key={r.k} className="item" style={{ textAlign: 'left', background: i === sel ? 'var(--surface-2)' : null, borderRadius: 8, padding: '10px 8px' }} onClick={() => run(r)}>
            <Icon name={r.icon} size={16} />
            <div className="t ellipsis">{r.label}</div>
            <span className="tiny muted nowrap">{r.sub}</span>
          </button>
        ))}
        {q && !res.length && <div className="empty">결과가 없어요</div>}
        {!q && <div className="empty">⌘K 로 어디서든 열 수 있어요</div>}
      </div>
    </div>
  )
}
