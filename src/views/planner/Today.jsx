import { useColl, useRec, useSettings } from '../../store/store.js'
import TaskQuickInput from '../../components/TaskQuickInput.jsx'
import { dayRec, setDay, scheduleTask, applyTemplate, toggleTask } from '../../store/actions.js'
import { freeSlots } from '../../engine/scheduler.js'
import { fmtTime, today, nowMin, fmtDur } from '../../engine/date.js'
import { Card, Check, Empty, Icon, openDetail, toast, useNow } from '../../components/ui.jsx'
import TaskItem from '../../components/TaskItem.jsx'
import Timeline from './Timeline.jsx'
import { applyCascadeChange } from './timeline.js'
import { longPress } from '../../lib/drag.js'
import { find } from '../../store/store.js'
import { useTidy, setTidy } from '../../lib/tidy.js'

export const STICKERS = ['⭐', '🔥', '📚', '✏️', '☕', '🌱', '💪', '🎯', '😴', '🌧', '🎉', '❤️', '🍀', '🧠', '🏃', '🎧']
export const HIGHLIGHTS = ['#e8d98a', '#b9d4a8', '#c9bde6', '#f0c2c8', '#b8cbe6']

export default function Today({ date }) {
  const tasks = useColl('tasks')
  const blocks = useColl('blocks')
  const subjects = useColl('subjects')
  const projects = useColl('projects')
  useNow(60000)
  const tidy = useTidy()
  const scheduledIds = new Set(blocks.filter((b) => b.date === date && b.taskId).map((b) => b.taskId))
  const planning = useSettings().modules.planning !== false
  const dayTasks = tasks.filter((t) => !t.archived && (t.due === date || (date === today() && !t.done && t.due && t.due < date)))
  const unscheduled = tasks.filter((t) => !t.done && !t.archived && !scheduledIds.has(t.id) && (!t.due || t.due <= date)).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || (a.dueTime ?? 9999) - (b.dueTime ?? 9999) || (a.order ?? 0) - (b.order ?? 0))

  const dragTask = (t) => longPress(() => ({
    label: t.title,
    onDrop: (zone, pt) => {
      if (!zone.dataset.drop.startsWith('timeline:')) return
      const r = zone.getBoundingClientRect()
      const m = Math.max(0, Math.round((+zone.dataset.start + (pt.y - r.top) - 15) / 10) * 10)
      const b = scheduleTask(t.id, date, m, t.estimate || 30)
      if (b) applyCascadeChange(b)
    },
  }))

  return (
    <div className="today-grid">
      <div className="col">
        <DayCard date={date} tasks={tasks} />
        <Card className="tl-card">
          {date === today() && <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 4 }}><button className={'btn sm' + (tidy ? ' on-acc' : '')} onClick={() => setTidy(!tidy)}>{tidy ? '모두 보기' : '끝난 것 접기'}</button></div>}
          <div className="tl-scroll"><Timeline date={date} hidePast={tidy} /></div>
        </Card>
      </div>
      <div className="col">
        {planning ? (
          <>
            {date === today() && <Gaps tasks={unscheduled} />}
            <Card title={`배정할 할 일 ${unscheduled.length}`} action={<span className="tiny muted">길게 눌러 타임라인으로</span>}>
              <div className="list">
                {unscheduled.slice(0, 30).map((t) => (
                  <TaskItem key={t.id} t={t} subjects={subjects} projects={projects} drag={dragTask(t)}
                    extra={<button className="chip" onClick={(e) => { e.stopPropagation(); if (scheduleTask(t.id, date)) toast('빈 시간에 배정') }}>배정</button>} />
                ))}
                {!unscheduled.length && <Empty>모두 배정했어요</Empty>}
              </div>
            </Card>
          </>
        ) : (
          <Card title="이 날 할 일">
            <TaskQuickInput key={date} defaults={{ due: date }} />
            <div className="list">
              {dayTasks.map((t) => <TaskItem key={t.id} t={t} subjects={subjects} projects={projects} />)}
              {!dayTasks.length && <Empty>할 일이 없어요</Empty>}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function DayCard({ date, tasks }) {
  useRec('days', date)
  const day = dayRec(date)
  const templates = useColl('templates')
  const top = (day.top3 || []).map((id) => tasks.find((t) => t.id === id)).filter(Boolean)
  const candidates = tasks.filter((t) => !t.done && !t.archived && !day.top3?.includes(t.id))
  return (
    <div className="card daycard" style={day.highlight ? { background: `linear-gradient(180deg, ${day.highlight}33, var(--surface) 70%)` } : null}>
      <div className="card-h">
        <h3>오늘의 Top 3</h3>
        <div className="row" style={{ gap: 2 }}>{(day.stickers || []).map((s, i) => <button key={i} className="sticker" onClick={() => setDay(date, { stickers: day.stickers.filter((_, j) => j !== i) })}>{s}</button>)}</div>
      </div>
      <div className="list">
        {[0, 1, 2].map((i) => {
          const t = top[i]
          return t ? (
            <div key={i} className={'item' + (t.done ? ' done' : '')} style={{ minHeight: 40, padding: '6px 0' }}>
              <span className="top-n">{i + 1}</span>
              <Check on={t.done} onClick={() => toggleTask(t.id)} />
              <button className="t title ellipsis" style={{ textAlign: 'left' }} onClick={() => openDetail('task', t.id)}>{t.title}</button>
              <button className="icon-btn" onClick={() => setDay(date, { top3: day.top3.filter((x) => x !== t.id) })} aria-label="빼기"><Icon name="close" size={14} /></button>
            </div>
          ) : (
            <div key={i} className="item" style={{ minHeight: 40, padding: '4px 0' }}>
              <span className="top-n muted">{i + 1}</span>
              <select className="input bare grow" value="" onChange={(e) => e.target.value && setDay(date, { top3: [...(day.top3 || []).filter((x) => find('tasks', x)), e.target.value].slice(0, 3) })}>
                <option value="">+ 핵심 할 일 선택</option>
                {candidates.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          )
        })}
      </div>
      <input className="input bare" placeholder="오늘의 한 줄 코멘트" value={day.comment || ''} onChange={(e) => setDay(date, { comment: e.target.value })} style={day.comment ? { background: day.highlight ? day.highlight + '55' : 'transparent' } : null} />
      <details className="decor">
        <summary className="tiny muted">꾸미기 · 템플릿</summary>
        <div className="row wrap" style={{ gap: 2, marginTop: 6 }}>
          {STICKERS.map((s) => <button key={s} className="sticker" onClick={() => setDay(date, { stickers: [...(day.stickers || []), s].slice(-8) })}>{s}</button>)}
        </div>
        <div className="row" style={{ gap: 6, marginTop: 6 }}>
          <span className="tiny muted">형광펜</span>
          {HIGHLIGHTS.map((c) => <button key={c} onClick={() => setDay(date, { highlight: day.highlight === c ? null : c })} style={{ width: 22, height: 22, borderRadius: 6, background: c, outline: day.highlight === c ? '2px solid var(--text)' : 'none' }} aria-label="형광펜" />)}
        </div>
        {templates.length > 0 && (
          <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
            <span className="tiny muted">템플릿 적용</span>
            {templates.map((t) => <button key={t.id} className="chip" onClick={() => { applyTemplate(t.id, date); toast(`'${t.name}' 적용`) }}>{t.name}</button>)}
          </div>
        )}
      </details>
    </div>
  )
}

// 자투리 시간 + 길이에 맞는 짧은 할 일 추천
export function Gaps({ tasks, compact }) {
  useColl('blocks'); useColl('events')
  const m = nowMin()
  const gaps = freeSlots(today(), Math.max(m, 0)).filter((g) => g.e - g.s >= 10).slice(0, compact ? 2 : 4)
  const pick = (len) => tasks.filter((t) => (t.estimate || 30) <= len).slice(0, 2)
  return (
    <Card title="자투리 시간" action={<span className="tiny muted">지금 이후 빈 시간</span>}>
      <div className="list">
        {gaps.map((g) => {
          const len = g.e - g.s
          const recs = pick(Math.min(len, 90))
          return (
            <div key={g.s} className="item" style={{ alignItems: 'center' }}>
              <div className="gap-time"><b>{fmtTime(g.s)}</b><span className="tiny muted">{fmtDur(len)}</span></div>
              <div className="t row wrap" style={{ gap: 4 }}>
                {recs.map((t) => <button key={t.id} className="chip" onClick={() => { scheduleTask(t.id, today(), g.s, Math.min(len, t.estimate || 30)); toast(`${fmtTime(g.s)}에 배정`) }}>+ {t.title}</button>)}
                {!recs.length && <span className="tiny muted">짧은 할 일이 없어요</span>}
              </div>
            </div>
          )
        })}
        {!gaps.length && <Empty>남은 빈 시간이 없어요</Empty>}
      </div>
    </Card>
  )
}
