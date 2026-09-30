import { useEffect, useRef, useState } from 'react'
import { useColl, useSettings, setSettings, uid, put, patch, remove } from '../store/store.js'
import { WIDGETS } from '../widgets/widgets.jsx'
import { Icon, openSheet, Seg, Field, confirmSheet, AddInput, useNow, Check } from '../components/ui.jsx'
import { pickQuote } from '../lib/quote.js'
import { ColorPick } from '../components/common.jsx'
import { PALETTE } from '../store/schema.js'
import { longPress } from '../lib/drag.js'
import { dayRec, setDay, toggleTask } from '../store/actions.js'
import { today } from '../engine/date.js'

// 위젯 배치: 모든 기기에서 같은 4칸 격자 (아이폰·아이패드 배치가 같게)
const COLS = [[1, '1/4'], [2, '2/4'], [3, '3/4'], [4, '한 줄']]
const ROWS = [[1, '기본'], [2, '2배'], [3, '3배']]
const STYLES = [['card', '카드'], ['tint', '색채움'], ['plain', '미니멀'], ['bold', '진하게'], ['glass', '유리'], ['outline', '테두리'], ['gradient', '그라데이션']]
export const wCols = (w) => w.cols || { s: 2, m: 4, l: 4, t: 2 }[w.size || 's'] || 2
export const wRows = (w) => w.rows || (w.size === 't' ? 2 : 1)
const sizeOf = (cols, rows) => (rows >= 2 && cols <= 2 ? 't' : cols >= 4 ? 'l' : cols === 3 ? 'm' : 's')

export const DEFAULT_PAGES = [
  { id: 'pg-study', name: '공부', widgets: [
    { id: 'a1', type: 'quickrec', size: 'm' }, { id: 'a2', type: 'goal', size: 's' }, { id: 'a3', type: 'bigdday', size: 's', style: 'tint' },
    { id: 'a4', type: 'donut', size: 'm' }, { id: 'a5', type: 'today', size: 'l' }, { id: 'a6', type: 'weekstudy', size: 'm' },
    { id: 'a7', type: 'streak', size: 's', style: 'tint', color: '#b5a47a' }, { id: 'a8', type: 'taskring', size: 's' }, { id: 'a9', type: 'review', size: 'm' },
  ] },
  { id: 'pg-life', name: '생활', widgets: [
    { id: 'b1', type: 'clock', size: 's', style: 'bold' }, { id: 'b2', type: 'now', size: 'm' }, { id: 'b3', type: 'weekstrip', size: 'l' },
    { id: 'b4', type: 'habits', size: 'm' }, { id: 'b5', type: 'meds', size: 's' }, { id: 'b6', type: 'sticky', size: 's', style: 'tint', color: '#b5a47a' },
    { id: 'b7', type: 'quicknote', size: 'm' }, { id: 'b9', type: 'links', size: 's' },
  ] },
]

export function usePages() {
  const st = useSettings()
  return st.widgetPages?.length ? st.widgetPages : DEFAULT_PAGES
}
const savePages = (pages) => setSettings({ widgetPages: pages })

export default function Home() {
  const pages = usePages()
  const [editing, setEditing] = useState(false)
  const [cur, setCur] = useState(() => { try { return +localStorage.getItem('homePage') || 0 } catch { return 0 } })
  const scroller = useRef(null)
  const idx = Math.min(cur, pages.length - 1)

  useEffect(() => { try { localStorage.setItem('homePage', String(idx)) } catch {} }, [idx])
  useEffect(() => { const el = scroller.current; if (el) el.scrollTo({ left: idx * el.clientWidth }) }, []) // eslint-disable-line
  const goPage = (i) => { setCur(i); const el = scroller.current; el?.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' }) }
  const onScroll = (e) => { const el = e.currentTarget; const i = Math.round(el.scrollLeft / el.clientWidth); if (i !== cur) setCur(i) }

  const setPage = (pi, fn) => savePages(pages.map((p, i) => (i === pi ? fn(p) : p)))
  const setW = (pi, ws) => setPage(pi, (p) => ({ ...p, widgets: ws }))

  const addWidget = (pi) => openSheet((close) => (
    <div className="list">
      {Object.entries(WIDGETS).map(([type, def]) => (
        <button key={type} className="item" style={{ textAlign: 'left', alignItems: 'center' }} onClick={() => { setW(pi, [...pages[pi].widgets, { id: uid(), type, size: def.size }]); close() }}>
          <span className="t">{def.label}</span>{pages[pi].widgets.some((w) => w.type === type) && <span className="tiny muted">사용 중</span>}<Icon name="plus" size={16} />
        </button>
      ))}
    </div>
  ), { title: '위젯 추가' })

  const widgetSettings = (pi, w) => openSheet((close) => <WidgetSettings w={w} pages={pages} pi={pi} close={close} onSave={(nw, toPage) => {
    if (toPage != null && toPage !== pi) {
      savePages(pages.map((p, i) => i === pi ? { ...p, widgets: p.widgets.filter((x) => x.id !== w.id) } : i === toPage ? { ...p, widgets: [...p.widgets, nw] } : p))
    } else setW(pi, pages[pi].widgets.map((x) => (x.id === w.id ? nw : x)))
  }} onDelete={() => setW(pi, pages[pi].widgets.filter((x) => x.id !== w.id))} />, { title: WIDGETS[w.type]?.label || '위젯' })

  return (
    <div className="col">
      <Greeting />
      <TodayOne />
      <div className="row no-print" style={{ gap: 6 }}>
        <div className="scroll-x grow"><div className="row" style={{ gap: 6 }}>
          {pages.map((p, i) => <button key={p.id} className={'chip' + (i === idx ? ' on' : '')} onClick={() => goPage(i)}>{p.name}</button>)}
          {editing && <button className="chip" onClick={() => { const name = prompt('새 페이지 이름', '새 페이지'); if (name) { savePages([...pages, { id: uid(), name, widgets: [] }]); setTimeout(() => goPage(pages.length), 50) } }}>+ 페이지</button>}
        </div></div>
        <button className="btn ghost sm" onClick={() => setEditing(!editing)}>{editing ? '완료' : '편집'}</button>
      </div>
      <div className="wpages" ref={scroller} onScroll={onScroll}>
        {pages.map((p, pi) => (
          <div key={p.id} className="wpage">
            {editing && (
              <div className="row" style={{ gap: 6, marginBottom: 8 }}>
                <input className="input" value={p.name} onChange={(e) => setPage(pi, (x) => ({ ...x, name: e.target.value }))} style={{ maxWidth: 200 }} />
                <button className="btn sm" onClick={() => addWidget(pi)}><Icon name="plus" size={14} />위젯</button>
                {pages.length > 1 && <button className="btn sm danger" onClick={() => confirmSheet('페이지 삭제', `'${p.name}' 페이지를 삭제할까요?`, () => { savePages(pages.filter((_, i) => i !== pi)); setCur(0) }, '삭제')}>페이지 삭제</button>}
              </div>
            )}
            <div className="widgets">
              {p.widgets.filter((w) => WIDGETS[w.type]).map((w) => {
                const W = WIDGETS[w.type].C
                const move = (id, toId) => { const a = [...p.widgets]; const i = a.findIndex((x) => x.id === id), j = a.findIndex((x) => x.id === toId); if (i < 0 || j < 0 || i === j) return; const [m] = a.splice(i, 1); a.splice(j, 0, m); setW(pi, a) }
                return (
                  <div key={w.id} className={`w-${w.size || 's'} wf wf-${w.style || 'card'}` + (editing ? ' w-edit draggable' : '')} style={{ gridColumn: `span ${wCols(w)}`, minHeight: wRows(w) > 1 ? wRows(w) * 120 + (wRows(w) - 1) * 12 : null, ...(w.color ? { '--wc': w.color } : null) }}
                    data-drop={editing ? 'w:' + w.id : undefined}
                    onClick={editing ? () => widgetSettings(pi, w) : undefined}
                    {...(editing ? longPress(() => ({ label: WIDGETS[w.type].label, onDrop: (z) => move(w.id, z.dataset.drop.slice(2)) }), 250) : {})}>
                    {editing && <div className="w-badge">{wCols(w)}/4{wRows(w) > 1 ? ` · ${wRows(w)}배` : ''} · 탭해서 설정</div>}
                    <div className="wf-body" style={editing ? { pointerEvents: 'none' } : null}>
                      <W w={w} update={(patchW) => setW(pi, p.widgets.map((x) => (x.id === w.id ? { ...x, ...patchW } : x)))} />
                    </div>
                  </div>
                )
              })}
              {!p.widgets.length && <div className="empty w-l">‘편집’ → ‘위젯’으로 추가하세요</div>}
            </div>
          </div>
        ))}
      </div>
      {pages.length > 1 && <div className="page-dots no-print">{pages.map((p, i) => <i key={p.id} className={i === idx ? 'on' : ''} />)}</div>}
    </div>
  )
}

function WidgetSettings({ w, pages, pi, close, onSave, onDelete }) {
  const [f, setF] = useState({ ...w, cols: wCols(w), rows: wRows(w), style: w.style || 'card' })
  const [to, setTo] = useState(pi)
  return (
    <div className="form">
      <Field label="너비"><Seg value={f.cols} onChange={(v) => setF({ ...f, cols: v, size: sizeOf(v, f.rows) })} options={COLS} /></Field>
      <Field label="높이"><Seg value={f.rows} onChange={(v) => setF({ ...f, rows: v, size: sizeOf(f.cols, v) })} options={ROWS} /></Field>
      <Field label="형태"><Seg value={f.style} onChange={(v) => setF({ ...f, style: v })} options={STYLES} /></Field>
      <Field label="포인트 색">
        <div className="row"><ColorPick value={f.color} onChange={(c) => setF({ ...f, color: c })} colors={PALETTE} />{f.color && <button className="chip" onClick={() => setF({ ...f, color: null })}>기본</button>}</div>
      </Field>
      {pages.length > 1 && (
        <Field label="페이지">
          <select className="input" value={to} onChange={(e) => setTo(+e.target.value)}>{pages.map((p, i) => <option key={p.id} value={i}>{p.name}</option>)}</select>
        </Field>
      )}
      <div className="row">
        <button className="btn danger" onClick={() => { onDelete(); close() }}><Icon name="trash" size={16} />삭제</button>
        <button className="btn primary grow" onClick={() => { onSave(f, to); close() }}>적용</button>
      </div>
    </div>
  )
}

function Greeting() {
  const quotes = [...useColl('quotes')].sort((a, b) => a.id.localeCompare(b.id))
  const now = useNow(60000)
  const q = pickQuote(quotes, now)
  return (
    <button className="greet" onClick={() => openSheet(() => <QuoteEditor />, { title: '다짐 · 명언' })}>
      <div className="greet-hi">{q ? q.text : '다짐이나 명언을 적어 보세요'}</div>
    </button>
  )
}

// 오늘의 하나: 오늘 가장 중요한 한 가지를 홈 맨 위에 고정 (할 일 연결 또는 직접 입력)
function TodayOne() {
  useColl('days'); const tasks = useColl('tasks')
  const d = today()
  const one = dayRec(d).one
  const task = one?.taskId ? tasks.find((t) => t.id === one.taskId) : null
  const title = task ? task.title : one?.text
  const done = task ? task.done : one?.done
  const pick = () => openSheet((close) => <OnePicker close={close} />, { title: '오늘의 하나' })
  if (!title) return <button className="one-empty no-print" onClick={pick}><Icon name="star" size={14} />오늘 가장 중요한 한 가지 정하기</button>
  return (
    <div className={'one' + (done ? ' done' : '')}>
      <Check on={!!done} onClick={() => (task ? toggleTask(task.id) : setDay(d, { one: { ...one, done: !one.done } }))} />
      <button className="one-t" onClick={pick}><span className="tiny muted">오늘의 하나</span><span className="one-title">{title}</span></button>
      <button className="icon-btn no-print" aria-label="지우기" onClick={() => setDay(d, { one: null })}><Icon name="close" size={14} /></button>
    </div>
  )
}
function OnePicker({ close }) {
  const d = today()
  const tasks = useColl('tasks').filter((t) => !t.done && !t.archived && (!t.due || t.due <= d))
  return (
    <div className="form">
      <AddInput placeholder="직접 적기 (예: 수학 3단원 끝내기)" onAdd={(text) => { setDay(d, { one: { text, done: false } }); close() }} />
      <div className="tiny muted">또는 할 일에서 고르기</div>
      <div className="list">
        {tasks.map((t) => <button key={t.id} className="item" style={{ textAlign: 'left' }} onClick={() => { setDay(d, { one: { taskId: t.id } }); close() }}><span className="t ellipsis">{t.title}</span></button>)}
        {!tasks.length && <div className="small muted">오늘 할 일이 없어요</div>}
      </div>
    </div>
  )
}

function QuoteEditor() {
  const quotes = useColl('quotes')
  return (
    <div className="form">
      <div className="small muted">홈 맨 위와 위젯에 3시간마다 무작위로 바뀌어 보여요</div>
      <div className="list">
        {quotes.map((x) => (
          <div key={x.id} className="row" style={{ padding: '4px 0' }}>
            <input className="input" value={x.text} onChange={(e) => patch('quotes', x.id, { text: e.target.value })} />
            <button className="icon-btn" onClick={() => remove('quotes', x.id)} aria-label="삭제"><Icon name="close" size={14} /></button>
          </div>
        ))}
      </div>
      <AddInput placeholder="새 다짐 · 명언" onAdd={(text) => put('quotes', { text })} />
    </div>
  )
}
