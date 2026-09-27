import { useColl, useSettings, put, patch, remove } from '../store/store.js'
import { dayRec, setDay, toggleTask, completeReview } from '../store/actions.js'
import { eventsOn } from '../engine/scheduler.js'
import { today, nowMin, fmtTime, fmtDur, dday, fmtShort, fmtClock } from '../engine/date.js'
import { Card, Check, Ring, Empty, Icon, AddInput, openDetail, useNow } from '../components/ui.jsx'
import TaskItem from '../components/TaskItem.jsx'
import { LinkPreview } from '../components/Attach.jsx'
import { CalEmbed } from '../components/BlockEditor.jsx'
import { Gaps } from '../views/planner/Today.jsx'
import { MoodPicker } from '../views/Health.jsx'
import { applyFilter } from '../views/tasks/filter.js'
import { go, openNote } from '../nav.js'
import { useTimerState, useTick, elapsed, startStopwatch, pause, resume, stop } from '../lib/timer.js'
import { noteTitle, noteText } from '../lib/notes.js'

const goto = (tab, seg) => () => go(tab, seg)

function Now() {
  const events = useColl('events'), blocks = useColl('blocks'), tasks = useColl('tasks')
  useNow(30000)
  const d = today(), m = nowMin()
  const items = [
    ...eventsOn(d, events).filter((e) => e.start != null).map((e) => ({ id: e.id, t: 'event', s: e.start, e: e.end ?? e.start + 60, title: e.title, c: e.color, loc: e.location })),
    ...blocks.filter((b) => b.date === d && !(b.carriedTo && b.carriedTo !== 'done')).map((b) => ({ id: b.id, t: 'block', s: b.start, e: b.start + b.dur, title: tasks.find((x) => x.id === b.taskId)?.title || b.title })),
  ].sort((a, b) => a.s - b.s)
  const cur = items.find((x) => x.s <= m && x.e > m)
  const next = items.find((x) => x.s > m)
  return (
    <Card title="지금" action={<button className="tiny muted" onClick={goto('planner', 'today')}>플래너 →</button>}>
      {cur ? (
        <button className="now-cur" onClick={() => openDetail(cur.t, cur.id, { occ: d })} style={{ '--c': cur.c || 'var(--accent)' }}>
          <div className="ellipsis"><b>{cur.title}</b></div>
          <div className="tiny muted">{fmtTime(cur.s)}–{fmtTime(cur.e)} · {fmtDur(cur.e - m)} 남음{cur.loc ? ' · ' + cur.loc : ''}</div>
          <div className="prog" style={{ marginTop: 6 }}><i style={{ width: ((m - cur.s) / (cur.e - cur.s)) * 100 + '%', background: 'var(--c)' }} /></div>
        </button>
      ) : <div className="small muted">진행 중인 일정이 없어요</div>}
      {next && <div className="small" style={{ marginTop: 8 }}>다음 <b>{next.title}</b> · {fmtTime(next.s)} <span className="muted">({fmtDur(next.s - m)} 후)</span></div>}
    </Card>
  )
}

function Top3() {
  const tasks = useColl('tasks')
  useColl('days')
  const day = dayRec(today())
  const top = (day.top3 || []).map((id) => tasks.find((t) => t.id === id)).filter(Boolean)
  return (
    <Card title="오늘의 Top 3" action={<button className="tiny muted" onClick={goto('planner', 'today')}>편집 →</button>}>
      <div className="list">
        {top.map((t, i) => (
          <div key={t.id} className={'item' + (t.done ? ' done' : '')} style={{ padding: '6px 0', minHeight: 36 }}>
            <span className="top-n">{i + 1}</span><Check on={t.done} onClick={() => toggleTask(t.id)} />
            <button className="t title ellipsis" style={{ textAlign: 'left' }} onClick={() => openDetail('task', t.id)}>{t.title}</button>
          </div>
        ))}
        {!top.length && <Empty>플래너에서 오늘 핵심 3가지를 골라요</Empty>}
      </div>
      {day.comment && <div className="small muted" style={{ marginTop: 6 }}>“{day.comment}” {(day.stickers || []).join('')}</div>}
    </Card>
  )
}

function Goal() {
  const st = useSettings()
  const sessions = useColl('sessions')
  const t = useTimerState()
  useTick(!!t)
  const live = t && !t.paused && t.phase !== 'break' ? (Date.now() - t.segStart) / 60000 : 0
  const m = sessions.filter((s) => s.date === today()).reduce((a, s) => a + s.dur, 0) + live
  return (
    <Card className="center" onClick={goto('study', 'records')} style={{ cursor: 'pointer' }}>
      <div className="col" style={{ alignItems: 'center', gap: 4 }}>
        <Ring value={m / st.goalDaily} size={78}><b className="small">{Math.round((m / st.goalDaily) * 100)}%</b></Ring>
        <span className="small">{fmtDur(m)}</span><span className="tiny muted">목표 {fmtDur(st.goalDaily)}</span>
      </div>
    </Card>
  )
}

function Dday() {
  const ddays = useColl('ddays').filter((d) => d.date >= today()).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || a.date.localeCompare(b.date))
  const main = ddays[0]
  return (
    <Card onClick={goto('study', 'plan')} style={{ cursor: 'pointer' }}>
      {main ? (
        <div className="col" style={{ gap: 2 }}>
          <span className="tiny muted ellipsis">{main.title}</span>
          <span className="dday-big" style={{ color: main.color || 'var(--accent)' }}>{dday(main.date)}</span>
          {ddays.slice(1, 3).map((d) => <span key={d.id} className="tiny ellipsis">{dday(d.date)} {d.title}</span>)}
        </div>
      ) : <div className="small muted">D-day 추가 →</div>}
    </Card>
  )
}

function TodayList() {
  const events = useColl('events'), tasks = useColl('tasks'), subjects = useColl('subjects'), projects = useColl('projects')
  const d = today()
  const evs = eventsOn(d, events)
  const due = applyFilter(tasks, { smart: 'today', sort: 'due' })
  return (
    <Card title={`오늘 · 일정 ${evs.length} · 할 일 ${due.length}`} action={<button className="tiny muted" onClick={goto('tasks', 'list')}>전체 →</button>}>
      <div className="today-w">
        <div className="list">
          {evs.map((e) => (
            <button key={e.id} className="item" style={{ textAlign: 'left', alignItems: 'center' }} onClick={() => openDetail('event', e.id, { occ: d })}>
              <span className="dot" style={{ background: e.color || 'var(--accent)' }} />
              <span className="small muted nowrap" style={{ width: 44 }}>{e.start != null ? fmtTime(e.start) : '종일'}</span>
              <span className="t ellipsis">{e.title}</span>
            </button>
          ))}
          {!evs.length && <div className="small muted" style={{ padding: '8px 0' }}>일정 없음</div>}
        </div>
        <div className="list">
          {due.slice(0, 8).map((t) => <TaskItem key={t.id} t={t} subjects={subjects} projects={projects} />)}
          {!due.length && <Empty>오늘 할 일을 모두 끝냈어요 🎉</Empty>}
        </div>
      </div>
    </Card>
  )
}

function ReviewW() {
  const reviews = useColl('reviews').filter((r) => !r.done && r.next && r.next <= today())
  return (
    <Card title={`복습 ${reviews.length}`} action={<button className="tiny muted" onClick={goto('study', 'review')}>전체 →</button>}>
      <div className="list">
        {reviews.slice(0, 4).map((r) => (
          <div key={r.id} className="item" style={{ alignItems: 'center', padding: '6px 0' }}>
            <span className="t ellipsis">{r.title}</span>
            <button className="btn sm" onClick={() => completeReview(r.id, false)}>헷갈림</button>
            <button className="btn sm primary" onClick={() => completeReview(r.id, true)}>기억남</button>
          </div>
        ))}
        {!reviews.length && <Empty>오늘 복습 끝!</Empty>}
      </div>
    </Card>
  )
}

function GapsW() {
  const tasks = useColl('tasks').filter((t) => !t.done && !t.archived)
  return <Gaps tasks={tasks} compact />
}

function QuickNote() {
  const memos = useColl('notes').filter((n) => n.type === 'memo').sort((a, b) => b.updatedAt - a.updatedAt)
  return (
    <Card title="빠른 메모" action={<button className="tiny muted" onClick={() => go('notes', 'pages')}>전체 →</button>}>
      <AddInput placeholder="떠오른 생각 적기" onAdd={(text) => put('notes', { title: text.slice(0, 30), type: 'memo', blocks: [{ id: 'b0', type: 'text', text }] })} />
      <div className="memo-list">
        {memos.slice(0, 4).map((n) => (
          <div key={n.id} className="memo">
            <button className="grow ellipsis" style={{ textAlign: 'left' }} onClick={() => openNote(n.id)}>{noteText(n) || noteTitle(n)}</button>
            <button className="icon-btn" onClick={() => remove('notes', n.id)} aria-label="삭제"><Icon name="close" size={12} /></button>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Habits() {
  const habits = useColl('habits')
  const d = today()
  return (
    <Card title="습관" action={<button className="tiny muted" onClick={goto('study', 'records')}>기록 →</button>}>
      <div className="row wrap" style={{ gap: 6 }}>
        {habits.map((h) => {
          const on = h.days?.[d]
          return <button key={h.id} className={'chip' + (on ? ' on' : '')} style={on ? { borderColor: h.color, color: h.color } : null} onClick={() => patch('habits', h.id, { days: { ...h.days, [d]: !on } })}>{on ? '✓' : '○'} {h.title}</button>
        })}
        {!habits.length && <span className="small muted">공부 › 기록에서 습관을 추가하세요</span>}
      </div>
    </Card>
  )
}

function Meds() {
  const meds = useColl('meds').filter((m) => m.active)
  const logs = useColl('medLogs')
  const d = today()
  const slots = meds.flatMap((m) => (m.times?.length ? m.times : ['--']).map((t) => ({ m, t })))
  return (
    <Card title="약" action={<button className="tiny muted" onClick={goto('health')}>→</button>}>
      <div className="list">
        {slots.map(({ m, t }) => {
          const id = `${m.id}_${d}_${t}`
          const on = logs.find((l) => l.id === id)?.taken
          return (
            <div key={id} className="row" style={{ minHeight: 30 }}>
              <button className={'check round' + (on ? ' on' : '')} onClick={() => put('medLogs', { id, medId: m.id, date: d, time: t, taken: !on })} aria-label="복용" />
              <span className="grow small ellipsis">{m.name}</span><span className="tiny muted">{t}</span>
            </div>
          )
        })}
        {!slots.length && <span className="small muted">등록된 약 없음</span>}
      </div>
    </Card>
  )
}

function Condition() {
  const c = useColl('conditions').find((x) => x.id === today()) || { id: today() }
  return (
    <Card title="오늘 기분">
      <MoodPicker value={c.mood} onChange={(v) => put('conditions', { ...c, mood: v, id: today() })} />
      <div className="row small" style={{ marginTop: 6 }}>
        <span className="muted">수면</span>
        <input className="input" type="number" step="0.5" min="0" max="14" style={{ width: 80 }} value={c.sleep ?? ''} onChange={(e) => put('conditions', { ...c, sleep: e.target.value === '' ? null : +e.target.value, id: today() })} />
        <span className="muted">시간</span>
      </div>
    </Card>
  )
}

function Quote() {
  const quotes = useColl('quotes')
  const q = quotes.length ? quotes[new Date().getDate() % quotes.length] : null
  return (
    <Card className="quote-w">
      <div className="quote">{q ? `“${q.text}”` : '다짐을 추가하세요'}</div>
      <details className="tiny muted"><summary>편집</summary>
        {quotes.map((x) => <div key={x.id} className="row"><span className="grow">{x.text}</span><button className="icon-btn" onClick={() => remove('quotes', x.id)} aria-label="삭제"><Icon name="close" size={12} /></button></div>)}
        <AddInput placeholder="명언·다짐" onAdd={(text) => put('quotes', { text })} />
      </details>
    </Card>
  )
}

function Links() {
  const links = useColl('links')
  return (
    <Card title="즐겨찾기">
      <div className="col" style={{ gap: 6 }}>
        {links.map((l) => <LinkPreview key={l.id} url={l.url} title={l.title} onRemove={() => remove('links', l.id)} />)}
      </div>
      <form className="row" style={{ marginTop: 6 }} onSubmit={(e) => { e.preventDefault(); let u = e.target.u.value.trim(); if (!u) return; if (!/^https?:/.test(u)) u = 'https://' + u; put('links', { url: u, title: e.target.t.value.trim() }); e.target.reset() }}>
        <input name="t" className="input" placeholder="이름" style={{ flex: 1 }} />
        <input name="u" className="input" placeholder="주소" style={{ flex: 2 }} />
        <button className="btn" type="submit"><Icon name="plus" size={14} /></button>
      </form>
    </Card>
  )
}

function Stopwatch() {
  const t = useTimerState()
  useTick(!!t)
  const subjects = useColl('subjects')
  const sub = subjects.find((s) => s.id === t?.subjectId)
  return (
    <Card title="타이머" action={<button className="tiny muted" onClick={goto('study', 'timer')}>→</button>}>
      {t ? (
        <div className="col" style={{ gap: 6 }}>
          <div className="row"><span className="dot" style={{ background: sub?.color }} /><span className="small">{sub?.name}</span></div>
          <span className="big-clock">{fmtClock(elapsed(t) / 1000)}</span>
          <div className="row">{t.paused ? <button className="btn sm primary" onClick={resume}>계속</button> : <button className="btn sm" onClick={pause}>정지</button>}<button className="btn sm" onClick={stop}>기록</button></div>
        </div>
      ) : (
        <div className="row wrap" style={{ gap: 6 }}>
          {subjects.map((s) => <button key={s.id} className="chip" onClick={() => startStopwatch(s.id)}><span className="dot" style={{ background: s.color }} />{s.name}</button>)}
        </div>
      )}
    </Card>
  )
}

function Calendar() { return <Card title="캘린더"><CalEmbed /></Card> }

function Recent() {
  const notes = useColl('notes').filter((n) => n.type !== 'memo').sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)
  return (
    <Card title="최근 노트" action={<button className="tiny muted" onClick={goto('notes', 'pages')}>→</button>}>
      <div className="list">{notes.map((n) => <button key={n.id} className="item" style={{ textAlign: 'left', padding: '7px 0', minHeight: 34 }} onClick={() => openNote(n.id)}><span>{n.icon || '📄'}</span><span className="t ellipsis">{noteTitle(n)}</span><span className="tiny muted">{fmtShort(new Date(n.updatedAt).toISOString().slice(0, 10))}</span></button>)}</div>
    </Card>
  )
}

export const WIDGETS = {
  now: { label: '지금 (현재·다음 일정)', C: Now, size: 'm' },
  top3: { label: '오늘의 Top 3', C: Top3, size: 'm' },
  goal: { label: '목표 공부시간', C: Goal, size: 's' },
  dday: { label: 'D-day', C: Dday, size: 's' },
  today: { label: '오늘 일정·할 일', C: TodayList, size: 'l' },
  review: { label: '복습', C: ReviewW, size: 'm' },
  gaps: { label: '자투리 시간', C: GapsW, size: 'm' },
  quicknote: { label: '빠른 메모', C: QuickNote, size: 'm' },
  habits: { label: '습관', C: Habits, size: 'm' },
  meds: { label: '약', C: Meds, size: 's' },
  condition: { label: '기분·수면', C: Condition, size: 's' },
  quote: { label: '명언·다짐', C: Quote, size: 's' },
  links: { label: '즐겨찾기 링크', C: Links, size: 's' },
  timer: { label: '타이머', C: Stopwatch, size: 's' },
  calendar: { label: '미니 캘린더', C: Calendar, size: 's' },
  recent: { label: '최근 노트', C: Recent, size: 's' },
}
