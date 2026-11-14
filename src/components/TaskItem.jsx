import { Check, Icon, openDetail } from './ui.jsx'
import { DueBadge, SubjectTag, PRI_COLOR } from './common.jsx'
import { toggleTask, toggleSub } from '../store/actions.js'
import { longPress } from '../lib/drag.js'
import { openTaskMenu } from './TaskQuickMenu.jsx'
import { openNote } from '../nav.js'
import { today, fmtShort } from '../engine/date.js'

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
            {subDue && <span className={subDue < today() ? 'sub-late' : ''}>하위 {subDue === today() ? '오늘' : fmtShort(subDue)}</span>}
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

// 할 일 아래 하위 할 일 (리스트 · 주간 배치): 작은 체크 · 제목 · 날짜 — 체크를 누르면 바로 끝냄
export function SubList({ t, subs, only }) {
  const L = only ? subs.filter(only) : subs
  if (!L.length) return null
  return (
    <div className="task-subs" data-nodrag onClick={(e) => e.stopPropagation()}>
      {L.map((s) => (
        <div key={s.id} className={'task-sub' + (s.done ? ' done' : '')}>
          <button className={'sub-ck' + (s.done ? ' on' : '')} onClick={() => toggleSub(t.id, s.id)} aria-label={s.done ? '되돌리기' : '끝내기'} />
          <span className="sub-tt ellipsis">{s.title}</span>
          {s.due && s.due !== t.due && <span className={'sub-d' + (!s.done && s.due < today() ? ' late' : '')}>{s.due === today() ? '오늘' : fmtShort(s.due)}</span>}
        </div>
      ))}
    </div>
  )
}
