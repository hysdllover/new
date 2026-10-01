import { Check, Icon, openDetail } from './ui.jsx'
import { DueBadge, SubjectTag, PRI_COLOR } from './common.jsx'
import { toggleTask } from '../store/actions.js'
import { longPress } from '../lib/drag.js'
import { openTaskMenu } from './TaskQuickMenu.jsx'

export default function TaskItem({ t, subjects, projects, drag, compact, extra }) {
  const subs = t.subtasks || []
  const sdone = subs.filter((s) => s.done).length
  const proj = projects?.find((p) => p.id === t.projectId)
  // 길게 눌러 떼면 빠른 메뉴, 누른 채 움직이면 (있으면) 드래그
  const hold = longPress(() => ({ ...(drag?.getOpts?.() || null), onHold: () => openTaskMenu(t) }))
  return (
    <div className={'item task-item draggable' + (t.done ? ' done' : '')} {...hold} onClick={(e) => { if (Date.now() - (e.currentTarget.__held || 0) < 700) return; openDetail('task', t.id) }} data-id={t.id}>
      <Check on={t.done} onClick={() => toggleTask(t.id)} color={subjects?.find((s) => s.id === t.subjectId)?.color} />
      <div className="t">
        <div className="title">{t.priority >= 2 && <span style={{ color: PRI_COLOR[t.priority], marginRight: 4 }}>{t.priority === 3 ? '!!' : '!'}</span>}<span className="ttl">{t.title || '제목 없음'}</span></div>
        {!compact && (
          <div className="meta">
            <DueBadge task={t} />
            <SubjectTag id={t.subjectId} subjects={subjects} />
            {proj && <span className="row" style={{ gap: 4 }}><span className="dot" style={{ background: proj.color }} />{proj.name}</span>}
            {subs.length > 0 && <span>☑ {sdone}/{subs.length}</span>}
            {t.repeat && <span>↻</span>}
            {t.estimate && <span>{t.estimate}분</span>}
            {t.carry > 0 && <span className="carry" title="이월 횟수">↪{t.carry}</span>}
            {(t.files?.length > 0 || t.links?.length > 0) && <Icon name="link" size={12} />}
            {t.dependsOn?.length > 0 && <span>⛓</span>}
            {extra}
          </div>
        )}
      </div>
    </div>
  )
}
