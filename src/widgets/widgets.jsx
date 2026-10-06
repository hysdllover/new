import { Roll } from '../components/Roll.jsx'
import { useColl, useSettings, setSettings, put, patch, remove } from '../store/store.js'
import { dayRec, setDay, toggleTask, completeReview } from '../store/actions.js'
import { eventsOn, classesOn } from '../engine/scheduler.js'
import { today, nowMin, fmtTime, fmtDur, dday, fmtShort, fmtClock, addDays, weekStart, parseYmd, fmtDate, tsToYmd } from '../engine/date.js'
import { WeekBars, MonthHeat } from '../components/charts.jsx'
import { openRecord } from '../views/study/Log.jsx'
import { Card, Check, Ring, Empty, Icon, AddInput, openDetail, useNow, openSheet } from '../components/ui.jsx'
import TaskItem from '../components/TaskItem.jsx'
import { WeekGoals } from '../components/WeekGoals.jsx'
import { seriesSummary } from '../lib/series.js'
import { PALETTE } from '../store/schema.js'
import { lectureStats } from '../engine/lecture.js'
import { plusOne, listen, lectureLine } from '../views/study/Lectures.jsx'
import { LinkPreview } from '../components/Attach.jsx'
import { CalEmbed } from '../components/BlockEditor.jsx'
import { Gaps } from '../views/planner/Today.jsx'
import { MoodPicker } from '../views/Health.jsx'
import { applyFilter, openCount } from '../views/tasks/filter.js'
import { go, openNote, setParams } from '../nav.js'
import { useTimerState, useTick, elapsed, startStopwatch, pause, resume, stop } from '../lib/timer.js'
import { noteTitle, noteText } from '../lib/notes.js'

const goto = (tab, seg) => () => go(tab, seg)

function Now() {
  const events = useColl('events'), blocks = useColl('blocks'), tasks = useColl('tasks')
  useNow(30000); useSettings(); useColl('subjects')
  const d = today(), m = nowMin()
  const items = [
    ...classesOn(d).map((c) => ({ id: c.id, t: 'class', s: c.start, e: c.end, title: `${c.period}교시 ${c.title}`, c: c.color, loc: c.room })),
    ...eventsOn(d, events).filter((e) => e.start != null).map((e) => ({ id: e.id, t: 'event', s: e.start, e: e.end ?? e.start + 60, title: e.title, c: e.color, loc: e.location })),
    ...blocks.filter((b) => b.date === d && !(b.carriedTo && b.carriedTo !== 'done')).map((b) => ({ id: b.id, t: 'block', s: b.start, e: b.start + b.dur, title: tasks.find((x) => x.id === b.taskId)?.title || b.title })),
  ].sort((a, b) => a.s - b.s)
  const cur = items.find((x) => x.s <= m && x.e > m)
  const next = items.find((x) => x.s > m)
  return (
    <Card title="지금" action={<button className="tiny muted" onClick={goto('planner', 'today')}>캘린더 →</button>}>
      {cur ? (
        <button className="now-cur" onClick={() => cur.t === 'class' ? go('planner', 'timetable') : openDetail(cur.t, cur.id, { occ: d })} style={{ '--c': cur.c || 'var(--accent)' }}>
          <div className="ellipsis"><b>{cur.title}</b></div>
          <div className="tiny muted">{fmtTime(cur.s)}–{fmtTime(cur.e)} · {fmtDur(cur.e - m)} 남음{cur.loc ? ' · ' + cur.loc : ''}</div>
          <div className="prog" style={{ marginTop: 6 }}><i style={{ width: ((m - cur.s) / (cur.e - cur.s)) * 100 + '%', background: 'var(--c)' }} /></div>
        </button>
      ) : <div className="small muted">진행 중인 일정이 없어요</div>}
      {next && <div className="small" style={{ marginTop: 8 }}>다음 <b>{next.title}</b> · {fmtTime(next.s)} <span className="muted">({fmtDur(next.s - m)} 후)</span></div>}
    </Card>
  )
}

// 시리즈 진행: 이름 · 끝낸 수/전체 · 가는 진행선 · 다음 회차 (누르면 완료)
function SeriesW() {
  const tasks = useColl('tasks'), subjects = useColl('subjects')
  const st = useSettings(), list = seriesSummary(tasks, subjects, st.seriesColors || {}).slice(0, 5)
  const pickColor = (x) => openSheet((c) => <div className="row wrap" style={{ gap: 8 }}>{PALETTE.map((col) => <button key={col} className="stk-color" style={{ background: col, width: 26, height: 26 }} onClick={() => { setSettings({ seriesColors: { ...(st.seriesColors || {}), [x.id]: col } }); c() }} aria-label="색" />)}<button className="chip" onClick={() => { const m = { ...(st.seriesColors || {}) }; delete m[x.id]; setSettings({ seriesColors: m }); c() }}>과목 색</button></div>, { title: x.t + ' 색' })
  return (
    <Card title="시리즈 진행" action={<button className="tiny muted" onClick={() => go('tasks', 'board')}>배치 →</button>}>
      {list.length ? <div className="col" style={{ gap: 10 }}>{list.map((x) => (
        <div key={x.id} className="col" style={{ gap: 4 }}>
          <div className="row between small"><span className="row ellipsis" style={{ gap: 6 }}><button className="dot" style={{ background: x.color || 'var(--accent)', width: 9, height: 9 }} onClick={() => pickColor(x)} aria-label="시리즈 색" /><span className="ellipsis">{x.t}</span></span><span className="muted tiny" style={{ fontVariantNumeric: 'tabular-nums' }}>{x.d}/{x.n}</span></div>
          <div className="rp-track"><i style={{ width: (x.d / (x.n || 1)) * 100 + '%', background: x.color || 'var(--accent)' }} /></div>
          {x.next && <div className="row tiny muted" style={{ gap: 6 }}><Check on={false} onClick={() => toggleTask(x.next.id)} color={x.color} /><span className="ellipsis grow">다음 {x.next.title}</span>{x.next.due && <span>{fmtShort(x.next.due)}</span>}</div>}
        </div>
      ))}</div> : <Empty>할 일 › 시리즈로 회차 묶음을 만들어 보세요</Empty>}
    </Card>
  )
}

function TodayClasses() {
  useSettings(); useColl('subjects'); useNow(60000)
  const d = today(), m = nowMin(), cls = classesOn(d)
  return (
    <Card title="오늘 시간표" action={<button className="tiny muted" onClick={() => go('planner', 'timetable')}>전체 →</button>}>
      {cls.length ? (
        <div className="col" style={{ gap: 3 }}>
          {cls.map((c) => (
            <div key={c.id} className={'row tt-row' + (c.end <= m ? ' past' : c.start <= m ? ' now' : '')} style={{ '--c': c.color || 'var(--muted)' }}>
              <span className="tiny muted nowrap" style={{ width: 16 }}>{c.period}</span>
              <span className="grow ellipsis small">{c.title}{c.room ? <span className="tiny muted"> · {c.room}</span> : null}</span>
              <span className="tiny muted nowrap">{fmtTime(c.start)}</span>
            </div>
          ))}
        </div>
      ) : <div className="small muted">오늘은 수업이 없어요</div>}
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
        {!top.length && <Empty>핵심 3가지가 없어요</Empty>}
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
  const live = t && !t.paused ? (Date.now() - t.segStart) / 60000 : 0
  const m = sessions.filter((s) => s.date === today()).reduce((a, s) => a + s.dur, 0) + live
  return (
    <Card className="center" onClick={goto('study', 'records')} style={{ cursor: 'pointer' }}>
      <div className="col" style={{ alignItems: 'center', gap: 4 }}>
        <Ring value={m / st.goalDaily} size={78}><b className="small"><Roll value={Math.round((m / st.goalDaily) * 100) + '%'} /></b></Ring>
        <span className="small"><Roll value={fmtDur(m)} /></span><span className="tiny muted">목표 {fmtDur(st.goalDaily)}</span>
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
    <Card title={`오늘 · 일정 ${evs.length} · 할 일 ${openCount(due)}`} action={<button className="tiny muted" onClick={goto('tasks', 'list')}>전체 →</button>}>
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
          {due.slice(0, 10).map((t) => <TaskItem key={t.id} t={t} subjects={subjects} projects={projects} />)}
          {!openCount(due) && <Empty>모두 끝냈어요</Empty>}
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
        {!reviews.length && <Empty>오늘 복습 끝</Empty>}
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
          <span className="big-clock">{fmtClock((t.mode === 'countdown' ? Math.max(0, t.target - elapsed(t)) : elapsed(t)) / 1000)}</span>
          {t.mode === 'countdown' && <span className="tiny muted">남은 시간 · {Math.round(t.target / 60000)}분 타이머</span>}
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

/* ── v2 위젯 ── */
function QuickRec() {
  const subjects = useColl('subjects')
  return (
    <Card title="빠른 공부 기록" action={<button className="tiny muted" onClick={goto('study', 'log')}>기록 →</button>}>
      <div className="qr-grid">
        {subjects.map((s) => (
          <button key={s.id} className="qr-btn" style={{ '--c': s.color }} onClick={() => openRecord(null, { subjectId: s.id })}>
            <span className="dot" style={{ background: s.color }} />{s.name}
          </button>
        ))}
      </div>
    </Card>
  )
}

function useTodayBySub() {
  const sessions = useColl('sessions')
  const subjects = useColl('subjects')
  const d = today()
  const list = sessions.filter((x) => x.date === d)
  const total = list.reduce((a, x) => a + x.dur, 0)
  return { total, parts: subjects.map((s) => ({ s, m: list.filter((x) => x.subjectId === s.id).reduce((a, x) => a + x.dur, 0) })).filter((x) => x.m) }
}

function Donut() {
  const { total, parts } = useTodayBySub()
  const R = 42, C = 2 * Math.PI * R
  let off = 0
  return (
    <Card title="오늘 공부">
      <div className="row" style={{ gap: 14 }}>
        <svg width="104" height="104" viewBox="0 0 104 104" style={{ flexShrink: 0 }}>
          <circle cx="52" cy="52" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="12" />
          {parts.map(({ s, m }) => { const len = (m / total) * C; const el = <circle key={s.id} cx="52" cy="52" r={R} fill="none" stroke={s.color} strokeWidth="12" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} transform="rotate(-90 52 52)" />; off += len; return el })}
          <text x="52" y="56" textAnchor="middle" fontSize="13" fill="var(--text)">{fmtDur(total)}</text>
        </svg>
        <div className="col" style={{ gap: 3 }}>
          {parts.map(({ s, m }) => <span key={s.id} className="small"><span className="dot" style={{ background: s.color }} /> {s.name} <span className="muted">{fmtDur(m)}</span></span>)}
          {!parts.length && <span className="small muted">아직 기록이 없어요</span>}
        </div>
      </div>
    </Card>
  )
}

function WeekStudy() {
  const st = useSettings()
  const sessions = useColl('sessions')
  const byDay = {}
  for (const x of sessions) byDay[x.date] = (byDay[x.date] || 0) + x.dur
  const week = Array.from({ length: 7 }, (_, i) => byDay[addDays(today(), i - 6)] || 0).reduce((a, b) => a + b, 0)
  return <Card title="최근 7일" action={<span className="tiny muted">{fmtDur(week)}</span>}><WeekBars values={byDay} goal={st.goalDaily} /></Card>
}

function MonthHeatW({ w }) {
  const st = useSettings()
  const sessions = useColl('sessions')
  const byDay = {}
  for (const x of sessions) byDay[x.date] = (byDay[x.date] || 0) + x.dur
  return (
    <Card title="공부 달력">
      <MonthHeat values={byDay} goal={st.goalDaily} weekStartDow={st.weekStart} compact={(w.cols || { s: 2, m: 4, l: 4, t: 2 }[w.size || 's']) < 4} onPick={() => go('study', 'records')} />
    </Card>
  )
}

// 어제 · 이번 주 공부 시간
function Streak() {
  const sessions = useColl('sessions'), st = useSettings()
  const d = today(), ws = weekStart(d, st.weekStart ?? 1), y = addDays(d, -1)
  let yd = 0, wk = 0
  for (const x of sessions) { if (x.date === y) yd += x.dur || 0; if (x.date >= ws && x.date <= d) wk += x.dur || 0 }
  return (
    <Card>
      <div className="row between"><span className="tiny muted">어제</span><b style={{ fontWeight: 300 }}>{fmtDur(yd) || '0분'}</b></div>
      <div className="row between" style={{ marginTop: 8 }}><span className="tiny muted">이번 주</span><b style={{ fontWeight: 300 }}>{fmtDur(wk) || '0분'}</b></div>
    </Card>
  )
}

function Clock() {
  useNow(15000)
  const d = new Date()
  return (
    <Card className="center">
      <div className="big-num">{String(d.getHours()).padStart(2, '0')}:{String(d.getMinutes()).padStart(2, '0')}</div>
      <div className="small muted">{fmtDate(today())}</div>
    </Card>
  )
}

function WeekStrip() {
  const events = useColl('events'), tasks = useColl('tasks')
  const ws = weekStart(today())
  return (
    <Card title="이번 주">
      <div className="wstrip">
        {Array.from({ length: 7 }, (_, i) => {
          const d = addDays(ws, i)
          const n = eventsOn(d, events).length + tasks.filter((t) => t.due === d && !t.done).length
          return (
            <button key={d} className={'ws-d' + (d === today() ? ' on' : '')} onClick={() => { setParams('planner', { date: d }); go('planner', 'today') }}>
              <span className="tiny">{'일월화수목금토'[parseYmd(d).getDay()]}</span><b>{parseYmd(d).getDate()}</b>
              <span className="ws-dots">{Array.from({ length: Math.min(3, n) }, (_, k) => <i key={k} />)}</span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function TaskRing() {
  const tasks = useColl('tasks')
  const d = today()
  const list = tasks.filter((t) => !t.archived && (t.due === d || (t.done && t.doneAt && tsToYmd(t.doneAt) === d)))
  const done = list.filter((t) => t.done).length
  return (
    <Card className="center" onClick={goto('tasks', 'list')} style={{ cursor: 'pointer' }}>
      <div className="col" style={{ alignItems: 'center', gap: 4 }}>
        <Ring value={list.length ? done / list.length : 0} size={78} color="var(--c3)"><b className="small">{done}/{list.length}</b></Ring>
        <span className="small">오늘 할 일</span>
      </div>
    </Card>
  )
}

function BigDday() {
  const dd = useColl('ddays').filter((d) => d.date >= today()).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || a.date.localeCompare(b.date))[0]
  return (
    <Card className="center" onClick={goto('study', 'records')} style={{ cursor: 'pointer' }}>
      {dd ? <><div className="small muted ellipsis">{dd.title}</div><div className="big-num" style={{ color: dd.color || 'var(--accent)' }}><Roll value={dday(dd.date)} /></div><div className="tiny muted">{fmtShort(dd.date)}</div></> : <div className="small muted">통계에서 D-day 추가</div>}
    </Card>
  )
}

function RecentRec() {
  const sessions = useColl('sessions').slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 5)
  const subjects = useColl('subjects')
  return (
    <Card title="최근 공부 기록" action={<button className="tiny muted" onClick={goto('study', 'log')}>→</button>}>
      <div className="list">
        {sessions.map((r) => { const s = subjects.find((x) => x.id === r.subjectId); return (
          <button key={r.id} className="row" style={{ minHeight: 32, width: '100%', textAlign: 'left' }} onClick={() => openRecord(r)}>
            <span className="dot" style={{ background: s?.color }} /><span className="grow ellipsis small">{s?.name}{r.note ? ' · ' + r.note : ''}</span>
            <span className="tiny muted">{fmtShort(r.date)}</span><b className="small">{fmtDur(r.dur)}</b>
          </button>
        ) })}
        {!sessions.length && <span className="small muted">기록 없음</span>}
      </div>
    </Card>
  )
}

function Sticky({ w, update }) {
  return (
    <Card className="sticky">
      <textarea className="sticky-ta" value={w.text || ''} placeholder="메모를 붙여두세요" onChange={(e) => update({ text: e.target.value })} />
    </Card>
  )
}


// ── 추가 위젯 ──
const sortDd = (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || a.date.localeCompare(b.date)
const sumBy = (list) => list.reduce((a, x) => a + (x.dur || 0), 0)

function WeekGoal() {
  const st = useSettings()
  const sessions = useColl('sessions')
  const ws = weekStart(today(), st.weekStart)
  const m = sumBy(sessions.filter((x) => x.date >= ws))
  return (
    <Card className="center" onClick={goto('study', 'records')} style={{ cursor: 'pointer' }}>
      <div className="col" style={{ alignItems: 'center', gap: 4 }}>
        <Ring value={m / (st.goalWeekly || 1)} size={78} color="var(--c2)"><b className="small"><Roll value={Math.round((m / (st.goalWeekly || 1)) * 100) + '%'} /></b></Ring>
        <span className="small">이번 주 {fmtDur(m)}</span><span className="tiny muted">목표 {fmtDur(st.goalWeekly)}</span>
      </div>
    </Card>
  )
}

function Agenda() {
  const events = useColl('events'), tasks = useColl('tasks')
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), i)).map((d) => ({ d, evs: eventsOn(d, events), ts: tasks.filter((t) => t.due === d && !t.done && !t.archived) })).filter((x) => x.evs.length || x.ts.length)
  return (
    <Card title="다가오는 일정" action={<button className="tiny muted" onClick={goto('planner', 'week')}>주간 →</button>}>
      <div className="col" style={{ gap: 8 }}>
        {days.slice(0, 5).map(({ d, evs, ts }) => (
          <div key={d} className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
            <span className="tiny muted" style={{ width: 52, flexShrink: 0, paddingTop: 2 }}>{d === today() ? '오늘' : fmtDate(d, { wd: true }).replace(/^\d+월 /, '')}</span>
            <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
              {evs.map((e) => <span key={e.id + d} className="small ellipsis"><span className="dot" style={{ background: e.color || 'var(--accent)' }} /> {e.start != null ? fmtTime(e.start) + ' ' : ''}{e.title}</span>)}
              {ts.map((t) => <span key={t.id} className="small ellipsis muted">☐ {t.title}</span>)}
            </div>
          </div>
        ))}
        {!days.length && <Empty>일주일 동안 일정이 없어요</Empty>}
      </div>
    </Card>
  )
}

function ExamRangeW() {
  const dd = useColl('ddays').filter((d) => d.date >= today() && d.units?.length).sort(sortDd)
  return (
    <Card title="시험 범위" action={<button className="tiny muted" onClick={goto('study', 'progress')}>진도 →</button>}>
      <div className="col" style={{ gap: 10 }}>
        {dd.slice(0, 3).map((d) => {
          const left = d.units.filter((u) => !u.done).length, days = Math.max(1, Math.round((parseYmd(d.date) - parseYmd(today())) / 86400000))
          return (
            <div key={d.id}>
              <div className="row between small"><span className="ellipsis">{d.title} <span className="muted tiny">{dday(d.date)}</span></span><span className="tiny muted">{d.units.length - left}/{d.units.length}</span></div>
              <div className="bar-t" style={{ marginTop: 4 }}><i style={{ width: ((d.units.length - left) / d.units.length) * 100 + '%', background: d.color || 'var(--accent)' }} /></div>
              {left > 0 && <div className="tiny muted" style={{ marginTop: 3 }}>오늘 {Math.ceil(left / days)}단원 · {d.units.find((u) => !u.done)?.name}</div>}
            </div>
          )
        })}
        {!dd.length && <Empty>D-day가 없어요</Empty>}
      </div>
    </Card>
  )
}

function Textbooks() {
  const tbs = useColl('textbooks')
  return (
    <Card title="교재 진도" action={<button className="tiny muted" onClick={goto('study', 'progress')}>전체 →</button>}>
      <div className="col" style={{ gap: 8 }}>
        {tbs.slice(0, 4).map((tb) => { const r = (tb.current || 0) / (tb.total || 1); return (
          <div key={tb.id}>
            <div className="row between small"><span className="ellipsis">{tb.title}</span><span className="tiny muted">{Math.round(r * 100)}%</span></div>
            <div className="bar-t" style={{ marginTop: 4 }}><i style={{ width: r * 100 + '%' }} /></div>
          </div>
        ) })}
        {!tbs.length && <Empty>교재가 없어요</Empty>}
      </div>
    </Card>
  )
}

function LecturesW() {
  const lecs = useColl('lectures'), t = today()
  const rows = lecs.map((l) => ({ l, s: lectureStats(l, t) })).filter((x) => x.s.left)
    .sort((a, b) => (b.s.todayLeft || 0) - (a.s.todayLeft || 0) || (a.s.limit || '9').localeCompare(b.s.limit || '9'))
  return (
    <Card title="오늘 들을 인강" action={<button className="tiny muted" onClick={goto('study', 'progress')}>전체 →</button>}>
      <div className="col" style={{ gap: 8 }}>
        {rows.slice(0, 4).map(({ l, s }) => (
          <div key={l.id}>
            <div className="row" style={{ gap: 6 }}>
              <span className="grow ellipsis small">{l.title} <span className="tiny muted">{s.next}강</span></span>
              <button className="btn sm" onClick={() => plusOne(l.id)}>＋1</button>
              <button className="icon-btn" aria-label="듣기" onClick={() => listen(l)}><Icon name="play" size={14} /></button>
            </div>
            <div className="bar-t" style={{ marginTop: 4 }}><i style={{ width: (s.doneN / (s.total || 1)) * 100 + '%' }} /></div>
            <div className={'tiny' + (s.late ? ' lec-late' : ' muted')} style={{ marginTop: 3 }}>{lectureLine(s)} · 남은 {fmtDur(s.leftMin)}</div>
          </div>
        ))}
        {!rows.length && <Empty>{lecs.length ? '모든 강좌를 완강했어요' : '인강이 없어요'}</Empty>}
      </div>
    </Card>
  )
}

function GradesW() {
  const grades = useColl('grades'), subjects = useColl('subjects')
  const rows = subjects.map((s) => { const g = grades.filter((x) => x.subjectId === s.id).sort((a, b) => a.date.localeCompare(b.date)); return { s, last: g[g.length - 1], prev: g[g.length - 2] } }).filter((x) => x.last)
  return (
    <Card title="최근 성적" action={<button className="tiny muted" onClick={goto('study', 'records')}>추이 →</button>}>
      <div className="col" style={{ gap: 6 }}>
        {rows.map(({ s, last, prev }) => { const p = (g) => Math.round((g.score / (g.max || 100)) * 100), diff = prev ? p(last) - p(prev) : 0; return (
          <div key={s.id} className="row small"><span className="dot" style={{ background: s.color }} /><span className="grow">{s.name}</span><b>{last.score}</b><span className="tiny muted">/{last.max || 100}</span>
            {prev && <span className="tiny" style={{ color: diff >= 0 ? 'var(--c2)' : 'var(--c4)', width: 34, textAlign: 'right' }}>{diff >= 0 ? '▲' : '▼'}{Math.abs(diff)}</span>}</div>
        ) })}
        {!rows.length && <Empty>성적 기록이 없어요</Empty>}
      </div>
    </Card>
  )
}

// 공부 시간대 분포 (최근 30일, 시작 시각 기준)
function Hours() {
  const sessions = useColl('sessions')
  const from = addDays(today(), -30)
  const h = Array(24).fill(0)
  for (const x of sessions) if (x.date >= from && x.start) { const d = new Date(x.start); h[d.getHours()] += x.dur || 0 }
  const max = Math.max(1, ...h), best = h.indexOf(Math.max(...h))
  return (
    <Card title="공부 시간대" action={<span className="tiny muted">최근 30일</span>}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 64 }}>
        {h.map((v, i) => <i key={i} style={{ flex: 1, height: Math.max(2, (v / max) * 64), background: i === best && v ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 35%, transparent)', borderRadius: 2 }} />)}
      </div>
      <div className="row between tiny muted" style={{ marginTop: 4 }}><span>0시</span><span>6</span><span>12</span><span>18</span><span>24</span></div>
      <div className="small" style={{ marginTop: 6 }}>{h[best] ? <>가장 많이 공부하는 때 <b>{best}시</b></> : <span className="muted">타이머 기록이 쌓이면 보여요</span>}</div>
    </Card>
  )
}

function MonthStats() {
  const sessions = useColl('sessions'), subjects = useColl('subjects'), st = useSettings()
  const m0 = today().slice(0, 8)
  const list = sessions.filter((x) => x.date.startsWith(m0))
  const total = sumBy(list), days = new Set(list.map((x) => x.date)).size
  const bySub = subjects.map((s) => ({ s, m: sumBy(list.filter((x) => x.subjectId === s.id)) })).sort((a, b) => b.m - a.m)[0]
  const hit = [...new Set(list.map((x) => x.date))].filter((d) => sumBy(list.filter((x) => x.date === d)) >= st.goalDaily).length
  const tile = (k, v) => <div className="stat-tile"><span className="tiny muted">{k}</span><b>{v}</b></div>
  const hm = (x) => `${Math.floor(x / 60)}:${String(Math.round(x % 60)).padStart(2, '0')}`
  return (
    <Card title={`${+m0.slice(5, 7)}월 공부`}>
      <div className="stat-tiles">{tile('합계', hm(total))}{tile('공부일', days + '일')}{tile('하루 평균', hm(days ? Math.round(total / days) : 0))}{tile('목표 달성', hit + '일')}</div>
      {bySub?.m > 0 && <div className="tiny muted" style={{ marginTop: 6 }}>가장 많이: {bySub.s.name} {fmtDur(bySub.m)}</div>}
    </Card>
  )
}

function DdayList() {
  const dd = useColl('ddays').filter((d) => d.date >= today()).sort((a, b) => a.date.localeCompare(b.date))
  return (
    <Card title="D-day">
      <div className="col" style={{ gap: 6 }}>
        {dd.slice(0, 5).map((d) => <div key={d.id} className="row small"><span className="grow ellipsis">{d.title}</span><span className="tiny muted">{fmtShort(d.date)}</span><b style={{ color: d.color || 'var(--accent)', width: 52, textAlign: 'right' }}>{dday(d.date)}</b></div>)}
        {!dd.length && <Empty>D-day가 없어요</Empty>}
      </div>
    </Card>
  )
}

function SubjectWeek() {
  const st = useSettings(), sessions = useColl('sessions'), subjects = useColl('subjects')
  const ws = weekStart(today(), st.weekStart)
  const rows = subjects.map((s) => ({ s, m: sumBy(sessions.filter((x) => x.date >= ws && x.subjectId === s.id)) })).filter((x) => x.m).sort((a, b) => b.m - a.m)
  const max = Math.max(1, ...rows.map((x) => x.m))
  return (
    <Card title="이번 주 과목별">
      <div className="bars">
        {rows.map(({ s, m }) => <div key={s.id} className="bar-row"><span className="bar-l ellipsis">{s.name}</span><div className="bar-t"><i style={{ width: (m / max) * 100 + '%', background: s.color }} /></div><span className="bar-v">{fmtDur(m)}</span></div>)}
        {!rows.length && <Empty>이번 주 기록이 없어요</Empty>}
      </div>
    </Card>
  )
}

// 올해·이번 달·이번 주·오늘이 얼마나 지났는지
function YearProgress() {
  useNow(60000)
  const n = new Date(), y = n.getFullYear()
  const frac = (a, b) => Math.min(1, Math.max(0, (n - a) / (b - a)))
  const ws = parseYmd(weekStart(today(), 1))
  const rows = [['올해', frac(new Date(y, 0, 1), new Date(y + 1, 0, 1))], ['이번 달', frac(new Date(y, n.getMonth(), 1), new Date(y, n.getMonth() + 1, 1))], ['이번 주', frac(ws, new Date(+ws + 7 * 86400000))], ['오늘', frac(new Date(y, n.getMonth(), n.getDate()), new Date(y, n.getMonth(), n.getDate() + 1))]]
  return (
    <Card title="시간은 흐른다">
      <div className="col" style={{ gap: 6 }}>
        {rows.map(([k, v]) => <div key={k}><div className="row between tiny"><span className="muted">{k}</span><span>{Math.floor(v * 100)}%</span></div><div className="bar-t" style={{ marginTop: 3 }}><i style={{ width: v * 100 + '%' }} /></div></div>)}
      </div>
    </Card>
  )
}

function WeekGoalsW() {
  return <Card title="이번 주 목표" action={<button className="tiny muted" onClick={goto('tasks', 'list')}>편집 →</button>}><WeekGoals compact /></Card>
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
  links: { label: '즐겨찾기 링크', C: Links, size: 's' },
  timer: { label: '타이머', C: Stopwatch, size: 's' },
  calendar: { label: '미니 캘린더', C: Calendar, size: 's' },
  recent: { label: '최근 노트', C: Recent, size: 's' },
  quickrec: { label: '빠른 공부 기록', C: QuickRec, size: 'm' },
  donut: { label: '오늘 공부 (과목 비율)', C: Donut, size: 'm' },
  weekstudy: { label: '최근 7일 공부', C: WeekStudy, size: 'm' },
  streak: { label: '어제 · 이번 주 공부', C: Streak, size: 's' },
  monthheat: { label: '공부 달력 (월별)', C: MonthHeatW, size: 'm' },
  clock: { label: '시계', C: Clock, size: 's' },
  weekstrip: { label: '이번 주 달력', C: WeekStrip, size: 'm' },
  taskring: { label: '오늘 할 일 진행률', C: TaskRing, size: 's' },
  bigdday: { label: '큰 D-day', C: BigDday, size: 's' },
  recentrec: { label: '최근 공부 기록', C: RecentRec, size: 'm' },
  sticky: { label: '포스트잇 메모', C: Sticky, size: 's' },
  weekgoal: { label: '이번 주 목표', C: WeekGoal, size: 's' },
  agenda: { label: '다가오는 일정 (7일)', C: Agenda, size: 'm' },
  examrange: { label: '시험 범위 진도', C: ExamRangeW, size: 'm' },
  textbooks: { label: '교재 진도', C: Textbooks, size: 'm' },
  grades: { label: '최근 성적', C: GradesW, size: 'm' },
  hours: { label: '공부 시간대', C: Hours, size: 'm' },
  monthstats: { label: '이번 달 통계', C: MonthStats, size: 'm' },
  ddaylist: { label: 'D-day 목록', C: DdayList, size: 'm' },
  subjectweek: { label: '이번 주 과목별', C: SubjectWeek, size: 'm' },
  yearprog: { label: '올해·이번 달 진행률', C: YearProgress, size: 's' },
  weekgoals: { label: '이번 주 목표 3개', C: WeekGoalsW, size: 'm' },
  classes: { label: '오늘 시간표', C: TodayClasses, size: 'm' },
  lectures: { label: '오늘 들을 인강', C: LecturesW, size: 'm' },
  series: { label: '시리즈 진행', C: SeriesW, size: 'm' },
}
