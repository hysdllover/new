import { Fragment, useState } from 'react'
import { plainText } from '../lib/marks.js'
import { useColl, put, patch, useSettings, setSettings } from '../store/store.js'
import { Card, Icon, Empty, Seg, openDetail, openSheet, toast, useMedia, NoteIcon, Field } from '../components/ui.jsx'
import TemplatePicker from '../components/TemplatePicker.jsx'
import BlockEditor from '../components/BlockEditor.jsx'
import NotePage, { NOTE_LABELS, labelColor, labelName } from './notes/NotePage.jsx'
import Hub from './notes/Hub.jsx'
import Graph from './notes/Graph.jsx'
import Library from './notes/Library.jsx'
import Todos from './notes/Todos.jsx'
import DBView from './tasks/DBView.jsx'
import { setParams, openNote } from '../nav.js'
import { today, addDays, fmtDate, fmtTime, fmtDur, tsToMin, tsToYmd } from '../engine/date.js'
import { eventsOn } from '../engine/scheduler.js'
import { mentionsOf, noteTitle, newBlock, noteText } from '../lib/notes.js'
import { SubjectTag } from '../components/common.jsx'
import { FileThumb } from '../components/Attach.jsx'

export default function Notes({ seg, params }) {
  // 넓은 아이패드: 목록 + 노트를 나란히 (사이드바까지 3단)
  const wide = useMedia('(min-width: 1100px)')
  // 왼쪽 목록 접기 (노트를 연 상태에서만, 기기에 기억)
  const [hide, setHide] = useState(() => { try { return localStorage.getItem('notes_list_hide') === '1' } catch { return false } })
  const toggleList = () => { const v = !hide; setHide(v); try { localStorage.setItem('notes_list_hide', v ? '1' : '0') } catch {} }
  if (wide && seg === 'pages' && params.mode !== 'db') {
    const folded = hide && !!params.noteId
    return (
      <div className={'notes-split' + (folded ? ' folded' : '')}>
        {!folded && <div className="ns-list"><Pages params={params} compact /></div>}
        <div className="ns-page">{params.noteId ? <NotePage key={params.noteId} id={params.noteId} split={{ hidden: folded, toggle: toggleList }} /> : <div className="empty" style={{ marginTop: 80 }}>왼쪽에서 노트를 고르세요</div>}</div>
      </div>
    )
  }
  if (params.noteId && seg === 'pages') return <NotePage id={params.noteId} />
  if (seg === 'daily') return <Daily date={params.date || today()} />
  if (seg === 'hub') return <Hub hubId={params.hubId} />
  if (seg === 'graph') return <Graph />
  if (seg === 'library') return <Library />
  if (seg === 'todos') return <Todos />
  return <Pages params={params} />
}

function Pages({ params, compact }) {
  const notes = useColl('notes')
  const subjects = useColl('subjects')
  const [mode, setMode] = useState(params.mode || 'list')
  const [type, setType] = useState('all')
  const [q, setQ] = useState(''), [lab, setLab] = useState(null), [byLab, setByLab] = useState(() => { try { return localStorage.getItem('notes_bylabel') === '1' } catch { return false } })
  const st = useSettings(), manual = st.notesSort === 'manual', [arrange, setArrange] = useState(false)
  // 상위 페이지 안에 링크된 하위 페이지는 목록에서 숨김 (검색하면 보임)
  const childIds = new Set(notes.flatMap((n) => (n.blocks || []).filter((b) => b.type === 'page').map((b) => b.pageId)))
  const tasksAll = useColl('tasks')
  const prog = (n) => { const td = (n.blocks || []).filter((b) => b.type === 'todo' && (b.text || '').trim()); if (!td.length) return null; const d = td.filter((b) => tasksAll.find((t) => t.id === b.taskId)?.done).length; return [d, td.length] }
  const list = notes.filter((n) => (q || !childIds.has(n.id)) && n.type !== 'daily' && (type === 'template' ? n.isTemplate : type === 'all' || (n.type || 'page') === type))
    .filter((n) => !q || (n.title || '').includes(q) || noteText(n).includes(q))
    .filter((n) => !lab || n.label === lab)
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (manual ? (a.order ?? -a.updatedAt) - (b.order ?? -b.updatedAt) : b.updatedAt - a.updatedAt))
  // 내 순서로 옮기기: 처음 옮길 때 지금 보이는 순서대로 번호를 매기고 바꿈
  const shift = (i, d) => { const j = i + d; if (j < 0 || j >= list.length || !!list[i].pinned !== !!list[j].pinned) return; const a = [...list];[a[i], a[j]] = [a[j], a[i]]; a.forEach((n, k) => { if (n.order !== k * 10) patch('notes', n.id, { order: k * 10 }) }) }
  const create = () => openSheet((c) => <TemplatePicker close={c} />, { title: '새 페이지 · 템플릿' })
  return (
    <div className="col">
      <div className="row wrap">
        <Seg value={mode} onChange={(v) => { setMode(v); setParams('notes', { mode: v }) }} options={[['list', '목록'], ['db', 'DB 뷰']]} />
        <span className="grow" />
        <button className="btn" onClick={() => import('../components/MdImport.jsx').then((m) => openSheet((c) => <m.default close={c} />, { title: '가져오기' }))}><Icon name="upload" size={15} />가져오기</button>
        <button className="btn" onClick={() => openSheet((c) => <NotesExport close={c} />, { title: '내보내기' })}><Icon name="download" size={15} />내보내기</button>
        <button className="btn primary" onClick={create}><Icon name="plus" size={16} />새 페이지</button>
      </div>
      {mode === 'db' ? <DBView source="notes" /> : (
        <>
          <div className="row wrap" style={{ gap: 6 }}>
            <input className="input grow" style={{ minWidth: 140 }} placeholder="노트 검색" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className={'chip' + (manual ? ' on' : '')} onClick={() => { setSettings({ notesSort: manual ? 'recent' : 'manual' }); if (manual) setArrange(false) }}>{manual ? '내 순서' : '최근 수정순'}</button>
            {manual && <button className={'chip' + (arrange ? ' on' : '')} onClick={() => setArrange(!arrange)}>{arrange ? '순서 편집 끝' : '순서 편집'}</button>}
            {[['all', '전체'], ['page', '페이지'], ['memo', '메모'], ['event', '일정 노트'], ['template', '템플릿']].map(([k, l]) => <button key={k} className={'chip' + (type === k ? ' on' : '')} onClick={() => setType(k)}>{l}</button>)}
            {notes.some((n) => n.label) && <button className={'chip' + (byLab ? ' on' : '')} onClick={() => { const v = !byLab; setByLab(v); try { localStorage.setItem('notes_bylabel', v ? '1' : '0') } catch {} }}>라벨별</button>}
            {NOTE_LABELS.filter(([k]) => notes.some((n) => n.label === k)).map(([k, c]) => <button key={k} className={'chip lab-chip' + (lab === k ? ' on' : '')} onClick={() => setLab(lab === k ? null : k)} aria-label={'라벨 ' + labelName(k, st)} title={labelName(k, st)}><span className="dot" style={{ background: c }} />{st.labelNames?.[k] ? <span className="tiny">{st.labelNames[k]}</span> : null}</button>)}
            <button className="chip" onClick={() => setSettings({ notesCard: { s: 'm', m: 'l', l: 's' }[st.notesCard || 'm'] })}>카드 {{ s: '작게', m: '보통', l: '크게' }[st.notesCard || 'm']}</button>
          </div>
          {(byLab && !arrange ? [...NOTE_LABELS.map(([k, c]) => [k, c, labelName(k, st), list.filter((n) => n.label === k)]), ['', null, '라벨 없음', list.filter((n) => !n.label)]].filter((g) => g[3].length) : [['all', null, null, list]]).map(([gk, gc, gl, glist]) => <Fragment key={gk}>
          {gl && <div className="lab-head"><span className="dot" style={{ background: gc || 'var(--line)' }} />{gl}<span className="tiny muted">{glist.length}</span></div>}
          <div className={'note-grid nc-' + (st.notesCard || 'm') + (compact ? ' ng-one' : '')}>
            {glist.map((n) => { const i = list.indexOf(n); return (
              <button key={n.id} className={'card note-card' + (compact && params.noteId === n.id ? ' on' : '') + (n.label ? ' has-label' : '') + (n.bg ? ' nc-bg note-bg-' + n.bg : '')} style={{ position: 'relative', ...(n.label ? { '--nl': labelColor(n.label) } : null) }} onClick={() => !arrange && openNote(n.id)}>
                {arrange && <span className="note-move row no-print" onClick={(e) => e.stopPropagation()}><span className="icon-btn" role="button" aria-label="앞으로" onClick={() => shift(i, -1)}>‹</span><span className="icon-btn" role="button" aria-label="뒤로" onClick={() => shift(i, 1)}>›</span></span>}
                <div className="row"><span className="nc-ic"><NoteIcon icon={n.icon || (n.type === 'memo' ? 'i:notes' : n.type === 'event' ? 'i:calendar' : null)} size={15} /></span><b className="ellipsis grow">{noteTitle(n)}</b>{n.pinned && <Icon name="star" size={12} fill="currentColor" />}</div>
                <div className="note-prev">{plainText(noteText(n)).replace(/\[\[|\]\]/g, '').replace(/https?:\/\/\S*[?&]open=\S+/g, '↗ 링크').slice(0, 120)}</div>
                {(() => { const p = prog(n); return p && <div className="note-prog"><span className="note-prog-t"><i style={{ width: (p[0] / p[1]) * 100 + '%' }} /></span><span className="tiny muted">{p[0]}/{p[1]}</span></div> })()}
                <div className="row small muted" style={{ gap: 6 }}><SubjectTag id={n.subjectId} subjects={subjects} /><span className="tiny">{new Date(n.updatedAt).toLocaleDateString('ko-KR')}</span></div>
              </button>
            ) })}
          </div>
          </Fragment>)}
          {!list.length && <Empty hint={q ? null : '새 페이지를 만들거나 노션·옵시디언의 .md 파일을 가져와요'} action={q ? null : { label: '새 페이지', fn: create }}>{q ? '찾는 노트가 없어요' : '노트가 없어요'}</Empty>}
        </>
      )}
    </div>
  )
}

function Daily({ date }) {
  const notes = useColl('notes')
  const events = useColl('events')
  const tasks = useColl('tasks')
  const sessions = useColl('sessions')
  const subjects = useColl('subjects')
  const files = useColl('files')
  const cond = useColl('conditions').find((c) => c.id === date)
  const n = notes.find((x) => x.type === 'daily' && x.date === date)
  const evs = eventsOn(date, events)
  const doneFix = tasks.filter((t) => t.done && t.doneAt && tsToYmd(t.doneAt) === date)
  const ss = sessions.filter((s) => s.date === date)
  const bySub = subjects.map((s) => ({ s, m: ss.filter((x) => x.subjectId === s.id).reduce((a, x) => a + x.dur, 0) })).filter((x) => x.m)
  const dayFiles = files.filter((f) => f.date === date)
  const mentions = mentionsOf(date, notes).filter((x) => x.id !== n?.id)
  const setDate = (d) => setParams('notes', { date: d })
  return (
    <div className="col">
      <div className="row between">
        <div className="row">
          <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="이전"><Icon name="back" /></button>
          <label className="date-label"><b>{fmtDate(date)}</b><input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
          <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="다음"><Icon name="next" /></button>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn sm" onClick={() => import('../lib/daylog.js').then((m) => { const r = m.writeDayLog(date); toast(r ? '오늘 기록을 노트에 채웠어요' : '채울 기록이 없어요') })}>기록 채우기</button>
          {date !== today() && <button className="btn sm" onClick={() => setDate(today())}>오늘</button>}
        </div>
      </div>
      <div className="today-grid">
        <Card className="daily-note">
          <BlockEditor blocks={n?.blocks || []} note={n || { id: null }}
            onChange={(blocks) => { if (n) patch('notes', n.id, { blocks }); else put('notes', { ...dailyNoteSeed(date), blocks }) }} />
        </Card>
        <div className="col">
          <Card title="이 날 한눈에">
            <div className="daily-agg">
              <div><h4>일정</h4>{evs.length ? evs.map((e) => <button key={e.id} className="row agg-row" onClick={() => openDetail('event', e.id, { occ: date })}><span className="dot" style={{ background: e.color || 'var(--accent)' }} /><span className="tiny muted">{e.start != null ? fmtTime(e.start) : '종일'}</span><span className="ellipsis">{e.title}</span></button>) : <span className="tiny muted">없음</span>}</div>
              <div><h4>완료 {doneFix.length}</h4>{doneFix.length ? doneFix.map((t) => <button key={t.id} className="row agg-row" onClick={() => openDetail('task', t.id)}><span style={{ color: 'var(--ok)' }}>✓</span><span className="ellipsis">{t.title}</span></button>) : <span className="tiny muted">없음</span>}</div>
              <div><h4>공부 {fmtDur(ss.reduce((a, s) => a + s.dur, 0))}</h4>{bySub.map(({ s, m }) => <div key={s.id} className="row agg-row"><span className="dot" style={{ background: s.color }} /><span className="grow">{s.name}</span><span className="tiny muted">{fmtDur(m)}</span></div>)}
                {ss.some((s) => s.start != null) && <div className="tiny muted">{fmtTime(Math.min(...ss.filter((s) => s.start != null).map((s) => tsToMin(s.start))))} 시작</div>}
              </div>
              {cond && <div><h4>컨디션</h4><div className="small">수면 {cond.sleep ?? '-'}시간 · 기분 {'●'.repeat(cond.mood || 0)}{'○'.repeat(5 - (cond.mood || 0))}</div></div>}
              {dayFiles.length > 0 && <div><h4>첨부</h4><div className="row wrap" style={{ gap: 6 }}>{dayFiles.map((f) => <FileThumb key={f.id} file={f} size={48} />)}</div></div>}
              {mentions.length > 0 && <div><h4>이 날짜를 언급한 노트</h4>{mentions.map((m) => <button key={m.id} className="chip" onClick={() => openNote(m.id)}>{noteTitle(m)}</button>)}</div>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

const dailyNoteSeed = (date) => ({ id: 'daily-' + date, title: date, type: 'daily', date })

// 노트 묶음 내보내기: 전체 · 과목 · 라벨 → HTML 한 파일(목차) 또는 zip(마크다운 + 그림)
function NotesExport({ close }) {
  const notes = useColl('notes'), subjects = useColl('subjects'), st = useSettings()
  const [scope, setScope] = useState('all'), [busy, setBusy] = useState(''), [prog, setProg] = useState(null), [ac, setAc] = useState(null)
  const roots = notes.filter((n) => n.type !== 'daily' && !n.isTemplate && !n.parentId)
  const pick = scope === 'all' ? roots : scope.startsWith('s:') ? roots.filter((n) => n.subjectId === scope.slice(2)) : roots.filter((n) => n.label === scope.slice(2))
  const name = scope === 'all' ? '노트 전체' : scope.startsWith('s:') ? subjects.find((s) => s.id === scope.slice(2))?.name || '과목' : labelName(scope.slice(2), st)
  // zip 은 하위 페이지까지 (마크다운은 [[링크]] 로 이어짐)
  const withSubs = (rs) => { const out = new Map(); const add = (n) => { if (!n || out.has(n.id)) return; out.set(n.id, n); for (const b of n.blocks || []) if (b.type === 'page') add(notes.find((x) => x.id === b.pageId)) }; rs.forEach(add); return [...out.values()] }
  // 진행 표시 · 취소: 만드는 동안 선으로 진행을 보여 주고, 취소하면 그 자리에서 멈춤
  const run = async (label, fn) => {
    const c = new AbortController(); setAc(c); setBusy(label); setProg(null)
    try { await fn(c.signal, (i, n) => setProg(n ? i / n : null)) }
    catch (e) { if (e.name === 'AbortError') toast('내보내기를 취소했어요'); else toast('내보내지 못했어요 · ' + e.message) }
    setBusy(''); setProg(null); setAc(null)
  }
  const html = () => run('HTML 만드는 중', async (signal, onProgress) => { const m = await import('../lib/noteHtml.js'); const r = await m.exportNotesHtml(pick, name, { signal, onProgress }); close(); if (r !== 'cancel') toast(`노트 ${pick.length}개를 HTML 한 파일로 내보냈어요`) })
  const zip = () => run('zip 만드는 중', async (signal, onProgress) => { const [{ notesZip }, { shareOrDownload }] = await Promise.all([import('../lib/exportZip.js'), import('../lib/files.js')]); const list0 = withSubs(scope === 'all' ? notes.filter((n) => !n.isTemplate) : pick); const u8 = await notesZip(list0, { signal, onProgress: (i, n) => { setBusy('그림 모으는 중'); onProgress(i, n) } }); const r = await shareOrDownload(new Blob([u8], { type: 'application/zip' }), `${name}.zip`); close(); if (r !== 'cancel') toast(`노트 ${list0.length}개를 zip 으로 내보냈어요`) })
  return (
    <div className="form">
      <Field label="무엇을">
        <select className="input" value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="all">노트 전체 ({roots.length})</option>
          {subjects.map((s) => { const k = roots.filter((n) => n.subjectId === s.id).length; return k ? <option key={s.id} value={'s:' + s.id}>과목 · {s.name} ({k})</option> : null })}
          {NOTE_LABELS.map(([k]) => { const c = roots.filter((n) => n.label === k).length; return c ? <option key={k} value={'l:' + k}>라벨 · {labelName(k, st)} ({c})</option> : null })}
        </select>
      </Field>
      <button className="exp-row" disabled={!pick.length || !!busy} onClick={html}><Icon name="file" size={17} /><span className="grow"><span className="small">HTML 한 파일</span><span className="tiny muted">맨 앞 목차 · 하위 페이지 포함 · A4 인쇄</span></span><Icon name="next" size={13} /></button>
      <button className="exp-row" disabled={!!busy} onClick={zip}><Icon name="download" size={17} /><span className="grow"><span className="small">zip (마크다운 + 그림)</span><span className="tiny muted">과목 폴더별 .md · 노션·옵시디언에서 열기 · 다시 가져오기도 돼요</span></span><Icon name="next" size={13} /></button>
      {busy && <div className="exp-busy">
        <div className="row between"><span className="small muted">{busy}{prog != null ? ` · ${Math.round(prog * 100)}%` : '…'}</span><button className="btn sm" onClick={() => ac?.abort()}>취소</button></div>
        <div className="exp-line"><i style={{ width: prog != null ? `${Math.round(prog * 100)}%` : '30%' }} className={prog == null ? 'run' : ''} /></div>
      </div>}
    </div>
  )
}

