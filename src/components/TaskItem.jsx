import { Check, Icon, openDetail } from './ui.jsx'
import { DueBadge, SubjectTag, PRI_COLOR } from './common.jsx'
import { toggleTask, toggleSub } from '../store/actions.js'
import { longPress } from '../lib/drag.js'
import { openTaskMenu } from './TaskQuickMenu.jsx'
import { openNote } from '../nav.js'
import { today, fmtShort, diffDays } from '../engine/date.js'
import { settings } from '../store/store.js'
import { openSubMenu } from './SubMenu.jsx'

export default function TaskItem({ t, subjects, projects, drag, compact, extra, sel, showSubs }) {
  const subs = t.subtasks || []
  const sdone = subs.filter((s) => s.done).length
  const subDue = subs.filter((s) => !s.done && s.due).map((s) => s.due).sort()[0] // 날짜가 정해진 하위 할 일 중 가장 가까운 날
  const proj = projects?.find((p) => p.id === t.projectId)
  // 길게 눌러 떼면 빠른 메뉴, 누른 채 움직이면 (있으면) 드래그
  const hold = longPress(() => ({ ...(drag?.getOpts?.() || null), onHold: () => openTaskMenu(t) }))
  // 선택 모드: 누르면 선택만
  if (sel) return (
    <div className={'item task-item sel-item' + (t.done ? ' done' : '') + (sel.on ? ' on' : '')} onClick={sel.toggle} data-id={t.id} role="checkbox" aria-checked={sel.on}>
      <span className="sel-box" />
      <div className="t"><div className="title"><span className="ttl">{t.title || '제목 없음'}</span></div>{!compact && <div className="meta"><DueBadge task={t} /><SubjectTag id={t.subjectId} subjects={subjects} /></div>}</div>
    </div>
  )
  return (
    <div className={'item task-item draggable' + (t.done ? ' done' : '') + (t.hl ? ' hl' : '') + (t.priority >= 3 ? ' imp' : '') + (t.createdAt && Date.now() - t.createdAt < 4000 ? ' just' : '')} style={t.hl ? { '--hlc': subjects?.find((s) => s.id === t.subjectId)?.color || 'var(--c3)' } : undefined} {...hold} onClick={(e) => { if (Date.now() - (e.currentTarget.__held || 0) < 700) return; openDetail('task', t.id) }} data-id={t.id}>
      <Check on={t.done} onClick={() => toggleTask(t.id)} color={subjects?.find((s) => s.id === t.subjectId)?.color} />
      <div className="t">
        <div className="title">{t.priority >= 2 && <span style={{ color: `color-mix(in srgb, ${PRI_COLOR[t.priority]} 62%, var(--text))`, marginRight: 4 }}>{t.priority === 3 ? '!!' : '!'}</span>}<span className="ttl">{t.title || '제목 없음'}</span></div>
        {!compact && t.note?.trim() && <div className="task-note ellipsis">{t.note.trim().split('\n')[0]}</div>}
        {!compact && (
          <div className="meta">
            <DueBadge task={t} />
            <SubjectTag id={t.subjectId} subjects={subjects} />
            {proj && <span className="row" style={{ gap: 4 }}><span className="dot" style={{ background: proj.color }} />{proj.name}</span>}
            {subs.length > 0 && <span>☑ {sdone}/{subs.length}</span>}
            {subDue && <span className={subDue < today() ? 'sub-late' : ''}>하위 {subDateText(subDue)}</span>}
            {t.repeat && <span>↻</span>}
            {t.estimate && <span>{t.estimate}분</span>}
            {(t.files?.length > 0 || t.links?.length > 0) && <Icon name="link" size={12} />}
            {t.dependsOn?.length > 0 && <span>⛓</span>}
            {t.noteId && <button className="badge" data-nodrag onClick={(e) => { e.stopPropagation(); openNote(t.noteId) }} title="이 할 일이 있는 노트">노트</button>}
            {extra}
          </div>
        )}
        {showSubs && subs.length > 0 && <SubList t={t} subs={subs} />}
      </div>
    </div>
  )
}

// 하위 날짜 표기: 설정에 따라 날짜(11.17) 또는 상대(내일 · 3일 뒤)
export function subDateText(d) {
  if (!d) return ''
  const t0 = today()
  if (d === t0) return '오늘'
  if (settings().subDate !== 'rel') return fmtShort(d)
  const n = diffDays(d, t0)
  return n === 1 ? '내일' : n === 2 ? '모레' : n === -1 ? '어제' : n > 0 ? n + '일 뒤' : -n + '일 전'
}

// 할 일 아래 하위 할 일 (리스트 · 주간 배치): 작은 체크 · 제목 · 날짜 — 체크를 누르면 바로 끝냄
// 중요 표시한 하위는 맨 앞 · 길게 누르면 메뉴(날짜 · 이름 · 꺼내기 · 지우기) · drop 이 있으면 끌어서 다른 날 칸으로
export function SubList({ t, subs, only, drop }) {
  const L0 = only ? subs.filter(only) : subs
  if (!L0.length) return null
  const L = [...L0.filter((s) => s.star), ...L0.filter((s) => !s.star)]
  const grid = settings().subChips === 'grid'
  return (
    <div className={'task-subs' + (grid ? ' grid' : '')} onClick={(e) => e.stopPropagation()}>
      {L.map((s) => <SubChip key={s.id} t={t} s={s} drop={drop} />)}
    </div>
  )
}
export function SubChip({ t, s, drop, parent }) {
  const hold = longPress(() => ({ onHold: () => openSubMenu(t.id, s.id), ...(drop ? { label: s.title, onDrop: drop(t, s) } : null) }))
  return (
    <div className={'task-sub' + (s.done ? ' done' : '') + (s.star ? ' starred' : '')} {...hold} onPointerDown={(e) => { e.stopPropagation(); hold.onPointerDown(e) }} onClick={(e) => { e.stopPropagation(); if (Date.now() - (e.currentTarget.__held || 0) < 700) return }}>
      <button className={'sub-ck' + (s.done ? ' on' : '')} onClick={() => toggleSub(t.id, s.id)} aria-label={s.done ? '되돌리기' : '끝내기'} />
      <span className="sub-tt">{s.title}{parent && <span className="wkb-par"> · {t.title}</span>}</span>
      {s.due && s.due !== t.due && !parent && <span className={'sub-d' + (!s.done && s.due < today() ? ' late' : '')}>{subDateText(s.due)}</span>}
    </div>
  )
}
