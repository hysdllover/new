// 설정 › 위젯: 위젯 글꼴·대시보드 칸·내 위젯 구성·홈/잠금 화면 미리보기 (Settings.jsx 에서 나눔)
import { useTimerState, useTick, elapsed, remaining } from '../../lib/timer.js'
import { Fragment, useEffect, useRef, useState } from 'react'
import { useSettings, setSettings, useColl, put, remove, patch, exportJSON, importJSON, uid, getState, deviceId as myDevice } from '../../store/store.js'
import { seriesSummary } from '../../lib/series.js'
import { diagText, recentErrors, clearErrors, persistStorage, updateBadge } from '../../lib/diag.js'
import { notesForWidget, tablesForWidget, boardsForWidget, photoPicks } from '../../lib/notePreview.js'
import { PRESETS, FONTS, effTheme, setDeviceTheme } from '../../theme/theme.js'
import { PALETTE, SOFT_PALETTE } from '../../store/schema.js'
import { Card, Seg, Toggle, Field, Icon, toast, confirmSheet, openSheet, useMedia } from '../../components/ui.jsx'
import { ColorPick, TimeInput, SubjectSelect } from '../../components/common.jsx'
import { deviceName, useSyncStatus, connect, disconnect, syncNow, gistInfo, tokenExpiry, listBackups, backupNow, restoreBackup, calendarUrl, readGistFile, syncLog, connectLink } from '../../sync/sync.js'
import { enablePush, disablePush, pushState, testLocal, isStandalone, pushSupported } from '../../lib/push.js'
import { buildLoader, WIDGET_KINDS } from '../../lib/scriptable.js'
import { TAB_OPTIONS, DEFAULT_TABBAR, tabOpt } from '../../nav.js'
import { pickQuote } from '../../lib/quote.js'
import { pickColor, harmonize } from '../../lib/colors.js'
import { eventsOn, classesOn } from '../../engine/scheduler.js'
import { sortTasks } from '../tasks/filter.js'
import { download, blobUrl } from '../../lib/files.js'
import { useMyFonts, addFont, removeFont, fontFamily, loadAllFonts, SYNC_FONT_MAX } from '../../lib/fonts.js'
import { requestPermission } from '../../lib/notify.js'
import { fmtTime, fmtClock, today, WD, weekStart } from '../../engine/date.js'
import { weekGoals, goalProgress } from '../../store/actions.js'
import { DIGEST_TIMES } from '../../engine/reminders.js'
import { APP_ICONS, iconSrc, getAppIcon, setAppIcon } from '../../lib/appIcon.js'

// 위젯 폰트 — 기본(산돌고딕 얇게) 또는 기기에 설치한 폰트의 PostScript 이름
export function WidgetFontField() {
  const st = useSettings()
  const custom = st.widgetFont != null
  return (
    <div className="col" style={{ gap: 6, marginTop: 10 }}>
      <Field label="위젯 폰트"><Seg value={custom ? 'c' : 'd'} onChange={(v) => setSettings({ widgetFont: v === 'c' ? '' : null })} options={[['d', '기본 · 산돌고딕 얇게'], ['c', '설치한 폰트']]} /></Field>
      {custom && <>
        <input className="input" placeholder="PostScript 이름 (예: NanumMyeongjo)" defaultValue={st.widgetFont} onBlur={(e) => setSettings({ widgetFont: e.target.value.trim() })} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        <div className="tiny muted" style={{ lineHeight: 1.6 }}>타자기체·손글씨체 등 한글 폰트를 폰트 앱(예: iFont)으로 설치한 뒤, 그 폰트의 PostScript 이름을 적어 주세요. 이름이 틀리거나 설치되지 않은 기기에서는 시스템 폰트로 보여요. 스크립트를 다시 복사할 필요 없어요.</div>
      </>}
      <Field label="위젯 글자 크기"><Seg value={String(st.widgetScale || 1)} onChange={(v) => setSettings({ widgetScale: +v })} options={[['0.9', '작게'], ['1', '기본'], ['1.1', '크게'], ['1.2', '더 크게']]} /></Field>
      <Field label="위젯 글자 굵기"><Seg value={String(st.widgetWeight || 0)} onChange={(v) => setSettings({ widgetWeight: +v })} options={[['-1', '더 얇게'], ['0', '기본'], ['1', '보통'], ['2', '진하게']]} /></Field>
      <Field label="위젯 여백"><Seg value={st.widgetPad || 'normal'} onChange={(v) => setSettings({ widgetPad: v })} options={[['tight', '좁게'], ['normal', '기본'], ['roomy', '넓게']]} /></Field>
      <Field label="위젯 배경 무늬"><Seg value={st.widgetPattern || 'plain'} onChange={(v) => setSettings({ widgetPattern: v })} options={[['plain', '무지'], ['grid', '모눈'], ['line', '줄']]} /></Field>
      <Toggle label="위젯 낙서 (물결 밑줄 · 별 · 체크)" checked={st.widgetDoodle !== false} onChange={(v) => setSettings({ widgetDoodle: v })} />
      <Toggle label="별표 D-day 색을 위젯 포인트로 (진행선 · D-day 숫자)" checked={st.widgetDdColor !== false} onChange={(v) => setSettings({ widgetDdColor: v })} />
      <Field label="위젯 구분선"><Seg value={st.widgetRule || 'normal'} onChange={(v) => setSettings({ widgetRule: v })} options={[['none', '없음'], ['thin', '가늘게'], ['normal', '기본'], ['bold', '굵게']]} /></Field>
      <Field label="위젯 테마"><Seg value={st.widgetTheme || 'auto'} onChange={(v) => setSettings({ widgetTheme: v })} options={[['auto', '자동'], ['white', '흰 글씨'], ['black', '검은 글씨'], ['paper', '종이'], ['night', '다크'], ['mono', '단색']]} /></Field>
      <div className="tiny muted" style={{ marginTop: -4 }}>흰·검은 글씨는 투명 배경(Scriptable 메뉴)과 함께, 종이·다크는 배경색까지 바꿔요. 자동은 Scriptable 메뉴의 글자색을 따라요.</div>
      <DashTilesField />
      <CustomWidgetsField />
      <Toggle checked={st.widgetClear !== false} onChange={(v) => setSettings({ widgetClear: v })} label="투명·클리어 위젯용 (글씨 또렷하게: 한 단계 굵게·조금 크게)" />
      <div className="tiny muted">미리보기에 바로 보여요. 위젯에는 다음 동기화 뒤 반영돼요 (설치한 폰트는 굵기 대신 그 폰트 그대로). 잠금 화면은 ‘크게’까지만 커져요.</div>
    </div>
  )
}

// 대시보드 위젯 칸 4개 고르기
const DASH_KEYS = [['dday', 'D-day'], ['next', '일정'], ['todo', '할 일'], ['study', '공부 시간'], ['prog', '진도'], ['goals', '이번 주 목표'], ['week', '이번 주 공부'], ['bars', '7일 막대'], ['subjbar', '과목 비율'], ['ring', '목표 링'], ['heat', '이번 달 달력'], ['hours', '오늘 시간대'], ['compare', '지난주 비교'], ['date', '오늘 날짜'], ['quote', '다짐'], ['class', '지금·다음 교시'], ['agenda', '다가오는 일정'], ['ddl', 'D-day 목록'], ['note', '노트'], ['notes', '노트 목록'], ['month', '이번 달 공부'], ['left', '남은 목표 시간'], ['tmrw', '내일'], ['due', '마감 임박'], ['start', '바로 시작'], ['habits', '오늘 습관'], ['review', '오늘 복습'], ['one', '오늘의 하나']]
export const dashKeys = (st) => { const k = (st.dashTiles || []).filter((x, i, a) => DASH_KEYS.some(([y]) => y === x) && a.indexOf(x) === i).slice(0, 4); for (const [x] of DASH_KEYS) if (k.length < 4 && !k.includes(x)) k.push(x); return k }
export function DashTilesField() {
  const st = useSettings(), keys = dashKeys(st)
  const set = (i, v) => { const k = [...keys]; const j = k.indexOf(v); if (j >= 0) k[j] = k[i]; k[i] = v; setSettings({ dashTiles: k }) }
  return (
    <Field label="대시보드 칸 (순서대로 · 중형은 할 일이 오른쪽 목록)">
      <div className="row wrap" style={{ gap: 6 }}>
        {keys.map((k, i) => <select key={i} className="input" style={{ width: 'auto', flex: '1 1 30%' }} value={k} onChange={(e) => set(i, e.target.value)}>{DASH_KEYS.map(([v, l]) => <option key={v} value={v}>{i + 1}. {l}</option>)}</select>)}
      </div>
    </Field>
  )
}

// 내 위젯 1~3: 이름 · 배치(칸/줄) · 블록(누른 순서, 최대 6) — Parameter 구성1 · 구성2 · 구성3
export function CustomWidgetsField() {
  const st = useSettings(), cws = st.customWidgets || []
  const [i, setI] = useState(0), cw = cws[i] || {}, blocks = cw.blocks || []
  const save = (p) => { const a = [0, 1, 2].map((j) => cws[j] || {}); a[i] = { ...a[i], ...p }; setSettings({ customWidgets: a }) }
  const tog = (k) => save({ blocks: blocks.includes(k) ? blocks.filter((x) => x !== k) : [...blocks, k].slice(0, 6) })
  return (
    <Field label="내 위젯 구성 (Parameter: 구성1 · 구성2 · 구성3)">
      <div className="col" style={{ gap: 6 }}>
        <Seg value={String(i)} onChange={(v) => setI(+v)} options={[['0', '구성1'], ['1', '구성2'], ['2', '구성3']]} />
        <div className="row" style={{ gap: 6 }}>
          <input className="input grow" placeholder={'이름 (예: 시험 준비) · 비우면 내 위젯 ' + (i + 1)} value={cw.name || ''} onChange={(e) => save({ name: e.target.value })} />
          <Seg value={cw.layout === 'rows' ? 'rows' : 'grid'} onChange={(v) => save({ layout: v })} options={[['grid', '칸'], ['rows', '줄']]} />
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          {DASH_KEYS.map(([k, l]) => <button key={k} className={'chip' + (blocks.includes(k) ? ' on' : '')} onClick={() => tog(k)}>{blocks.includes(k) && <span className="tiny">{blocks.indexOf(k) + 1}</span>}{l}</button>)}
        </div>
        {blocks.length > 0 && cw.layout !== 'rows' && <div className="row wrap" style={{ gap: 6 }}><span className="tiny muted">칸 크기 (누를 때마다 보통 → 넓게 → 크게)</span>{blocks.map((k) => { const sz = (cw.big || []).includes(k) ? 2 : (cw.wide || []).includes(k) ? 1 : 0, wo = (cw.wide || []).filter((x) => x !== k), bo = (cw.big || []).filter((x) => x !== k)
          return <button key={k} className={'chip' + (sz ? ' on' : '')} onClick={() => save(sz === 0 ? { wide: [...wo, k], big: bo } : sz === 1 ? { wide: wo, big: [...bo, k] } : { wide: wo, big: bo })}>{DASH_KEYS.find(([x]) => x === k)?.[1]}<span className="tiny">{['보통', '넓게', '크게'][sz]}</span></button> })}</div>}
        <div className="tiny muted">누른 순서대로 놓여요 (최대 6 · 소형 4 · 중형 4). 칸: 2열 격자 · 줄: 위에서 아래로(중형은 두 단). 위 미리보기에서 ‘내 위젯 {i + 1}’을 눌러 확인하세요.</div>
      </div>
    </Field>
  )
}

// 홈 화면 위젯 미리보기 (실제 데이터) — Scriptable 위젯과 같은 디자인
export function WidgetPreview() {
  const st = useSettings()
  useEffect(() => { loadAllFonts() }, [])
  const WTH = { white: { background: 'linear-gradient(135deg, #5b6170, #8b8f86)', color: '#fff' }, black: { background: 'linear-gradient(135deg, #e9edf1, #cdd4dc)', color: '#1e232b' }, paper: { background: `#f2f2f1 url(${import.meta.env.BASE_URL}paper.jpg) 0 0 / 360px 360px`, color: '#2a2f38' }, night: { background: '#1b1d22', color: '#eceff3' }, mono: { background: '#1c1d21', color: '#fff', filter: 'grayscale(1)' } }[st.widgetTheme] || null
  const ff = { ...(st.widgetFont ? { fontFamily: `"${st.widgetFont}", "Apple SD Gothic Neo", sans-serif` } : null), '--dw-scale': st.widgetScale || 1, '--dw-pad': { tight: 0.72, roomy: 1.25 }[st.widgetPad] || 1, '--dw-rw': ({ none: 0, thin: 0.4, bold: 1 }[st.widgetRule] ?? 0.6) + 'px', fontWeight: [200, 300, 400, 500, 600][(+st.widgetWeight || 0) + 1 + (st.widgetClear !== false ? 1 : 0)] }
  const tasks = useColl('tasks'), sessions = useColl('sessions'), ddays = useColl('ddays'), quotes = useColl('quotes'), subjects = useColl('subjects')
  const d = today()
  const today0 = sessions.filter((x) => x.date === d)
  const mins = today0.reduce((a, x) => a + x.dur, 0)
  const goal = st.goalDaily || 240
  const pct = Math.round(Math.min(1, mins / goal) * 100)
  const todo = sortTasks(tasks.filter((t) => !t.archived && !t.done && t.due && t.due <= d), 'due')
  const doneT = tasks.filter((t) => !t.archived && t.done && t.doneAt && new Date(t.doneAt).toDateString() === new Date().toDateString())
  const done = doneT.length
  const items = sortTasks(tasks.filter((t) => !t.archived && t.due && t.due <= d && (!t.done || t.due === d || doneT.includes(t))), 'due')
  const ddSorted = ddays.filter((x) => x.date >= d).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || a.date.localeCompare(b.date))
  const dd = ddSorted[0], ddNext = ddSorted[1]
  // 시험까지 남은 주말 (위젯 스크립트와 같은 계산)
  const wkP = (x) => { let n = 0; const a = new Date(today() + 'T00:00'), end = new Date(x.date + 'T00:00'); if (a.getDay() === 0) a.setDate(a.getDate() - 1); for (; a < end; a.setDate(a.getDate() + 1)) if (a.getDay() === 6) n++; return n }
  const ddN = dd ? Math.round((new Date(dd.date) - new Date(d)) / 86400000) : null
  const ddTxt = dd ? (ddN === 0 ? 'D-DAY' : 'D-' + ddN) : null
  const qs = [...quotes].sort((a, b) => a.id.localeCompare(b.id))
  const quote = pickQuote(qs)?.text ?? null
  const now = new Date()
  const nm = now.getHours() * 60 + now.getMinutes()
  const dateStr = `${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()]} · ${now.getDate()} ${['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][now.getMonth()]}`
  const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
  const big = (size) => (
    <>
      <div className="dw-big"><span style={{ fontSize: size }}>{hm(mins)}</span><span className="dw-soft">of {hm(goal)}</span><span className="grow" /><span className="dw-gold">{pct}%</span></div>
      <div className="dw-line"><i style={{ width: pct + '%' }} /></div>
    </>
  )
  const ddRow = dd && <div className="dw-ddrow"><span className="dw-gold">{ddTxt}</span><span className="dw-soft">{dd.title}</span></div>
  const list = (n0) => { const n = items.length === n0 + 1 ? n0 + 1 : n0; return <>{items.slice(0, n).map((t) => t.done
    ? <div key={t.id} className="dw-todo dw-soft"><span>✓</span><span className="ellipsis" style={{ textDecoration: 'line-through' }}>{t.title}</span></div>
    : <div key={t.id} className="dw-todo"><span className={t.priority >= 3 ? 'dw-gold' : 'dw-soft'}>{t.priority >= 3 ? '•' : '–'}</span><span className="ellipsis" style={t.priority >= 3 ? { fontWeight: 500 } : null}>{t.title}</span></div>)}
    {!items.length && <div className="dw-soft">All clear.</div>}{items.length > n && <div className="dw-soft" style={{ fontSize: 11 }}>+ {items.length - n} more</div>}</> }
  const [kind, setKind] = useState('')
  // 노트 사진 위젯 미리보기: 최근 노트의 첫 그림
  const phW = photoPicks(getState())[0]
  const [phUrl, setPhUrl] = useState(null)
  useEffect(() => { let u = null, on = true; if (phW && kind === '사진') blobUrl(phW.fileId).then((x) => { u = x; if (on) setPhUrl(x) }).catch(() => {}); return () => { on = false; if (u) URL.revokeObjectURL(u) } }, [phW?.fileId, kind])
  const ddList = ddays.filter((x) => x.date >= d).sort((a, b) => a.date.localeCompare(b.date))
  const subMins = subjects.map((s) => ({ s, m: today0.filter((x) => x.subjectId === s.id).reduce((a, x) => a + x.dur, 0) })).filter((x) => x.m).sort((a, b) => b.m - a.m)
  const subBars = (n) => <>{subMins.slice(0, n).map((x) => <div key={x.s.id} className="dw-sub"><div className="row between"><span>{x.s.name}</span><span className="dw-soft">{hm(x.m)}</span></div><div className="dw-line"><i style={{ width: (x.m / subMins[0].m) * 100 + '%' }} /></div></div>)}{!subMins.length && <div className="dw-soft">No study yet.</div>}</>
  const month = (cell, nums) => {
    const byDay = {}
    for (const x of sessions) byDay[x.date] = (byDay[x.date] || 0) + x.dur
    const y = now.getFullYear(), mo = now.getMonth(), n = new Date(y, mo + 1, 0).getDate(), ws = st.weekStart ?? 1
    const lead = (new Date(y, mo, 1).getDay() - ws + 7) % 7
    const key = (i) => `${y}-${String(mo + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    return (
      <div className="dw-cal" style={{ gridTemplateColumns: `repeat(7, ${cell}px)` }}>
        {Array.from({ length: 7 }, (_, i) => <span key={'w' + i} className="dw-cap" style={{ textAlign: 'center' }}>{'SMTWTFS'[(i + ws) % 7]}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={'e' + i} />)}
        {Array.from({ length: n }, (_, i) => { const v = byDay[key(i + 1)] || 0, r = Math.min(1, v / goal); return <span key={i} className={'dw-day' + (key(i + 1) === d ? ' on' : '')} style={{ height: nums ? cell * 0.8 : cell * 0.72, background: v ? `color-mix(in srgb, var(--gold) ${Math.round(18 + 72 * r)}%, transparent)` : 'var(--rule)', color: r >= .6 ? 'var(--bg)' : v ? 'var(--ink)' : 'var(--soft)', ...(nums ? { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', padding: '3px 4px 2px' } : null) }}>{nums ? <><span>{i + 1}</span>{v > 0 && <span style={{ fontSize: 8, fontWeight: 500 }}>{hm(v)}</span>}</> : ''}</span> })}
      </div>
    )
  }
  // 공부 유형: 이번 주·어제·최근 7일
  const sw = (() => {
    const byDay = {}
    for (const x of sessions) byDay[x.date] = (byDay[x.date] || 0) + x.dur
    const off = (k) => { const x = new Date(); x.setDate(x.getDate() - k); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
    const last7 = [6, 5, 4, 3, 2, 1, 0].map((k) => ({ m: byDay[off(k)] || 0, wd: (now.getDay() - k + 7) % 7 }))
    const back = (now.getDay() - (st.weekStart ?? 1) + 7) % 7
    let week = 0; for (let k = 0; k <= back; k++) week += byDay[off(k)] || 0
    return { last7, week, yday: byDay[off(1)] || 0, avg: Math.round(last7.reduce((a, x) => a + x.m, 0) / 7) }
  })()
  const stat = (k, v, gold) => <div className="col" style={{ gap: 2 }}><span className="dw-cap">{k}</span><span className={gold ? 'dw-gold' : ''} style={{ fontSize: 13 }}>{v}</span></div>
  const bars7 = (h) => {
    const max = Math.max(goal, ...sw.last7.map((x) => x.m))
    return <div><div className="dw-bars" style={{ height: h }}>{sw.last7.map((x, i) => <i key={i} style={{ height: Math.max(2, x.m / max * h), opacity: i === 6 ? 1 : .35 + .4 * Math.min(1, x.m / goal) }} />)}<b style={{ bottom: goal / max * h }} /></div>
      <div className="dw-bars-l">{sw.last7.map((x, i) => <span key={i} className={i === 6 ? 'dw-gold' : ''}>{'SMTWTFS'[x.wd]}</span>)}</div></div>
  }
  // 새 유형 미리보기 데이터 (위젯 스크립트와 같은 계산)
  const lecturesP = useColl('lectures'), textbooksP = useColl('textbooks'); useColl('days')
  const wsP = weekStart(d, st.weekStart ?? 1)
  const weekSub = subjects.map((s) => ({ s, m: sessions.filter((x) => x.subjectId === s.id && x.date >= wsP && x.date <= d).reduce((a, x) => a + x.dur, 0) })).filter((x) => x.m).sort((a, b) => b.m - a.m)
  const progP = [...lecturesP.map((x) => ({ t: x.title, n: Object.keys(x.done || {}).filter((k) => +k <= x.total).length, of: x.total || 0, u: '강' })), ...textbooksP.map((x) => ({ t: x.title, n: x.current || 0, of: x.total || 0, u: x.unit || 'p' }))].filter((x) => x.of && x.n < x.of)
  const goalsP = weekGoals().map((g) => { const p = goalProgress(g, tasks); return { t: g.title, done: !!g.done || (p.linked > 0 && p.ratio >= 1), r: p.ratio, n: p.done, of: p.linked } })
  const gDone = goalsP.filter((g) => g.done).length
  const nmP = now.getHours() * 60 + now.getMinutes()
  const nowL = [...eventsOn(d).filter((e) => e.start != null).map((e) => ({ t: e.title, s: e.start, e: e.end ?? e.start + 60, c: e.color, l: e.location })), ...classesOn(d).map((c) => ({ t: c.period + '교시 ' + c.title, s: c.start, e: c.end, l: c.room }))].sort((a, b) => a.s - b.s)
  const nCur = nowL.find((x) => x.s <= nmP && x.e > nmP), nNext = nowL.find((x) => x.s > nmP), nC = nCur || nNext
  const leftN = items.filter((t) => !t.done).length
  const pRow = (k, v, r, c) => <div key={k} style={{ marginBottom: 7 }}><div className="row between" style={{ fontSize: 13 }}><span className="ellipsis">{k}</span><span className="dw-soft">{v}</span></div><div className="dw-line" style={{ marginTop: 3 }}><i style={{ width: Math.min(100, r * 100) + '%', background: c || null }} /></div></div>
  const hdr = (k, right) => <div className="row between" style={{ marginBottom: 8, flexWrap: 'nowrap', gap: 6 }}><span className="dw-cap sp nowrap">{k}</span><span className="dw-cap nowrap">{right}</span></div>
  const M = (x) => <div className="col" style={{ gap: 0, flex: 1, minWidth: 0, height: '100%' }}>{x}</div>
  const nowBody = (big) => nC ? <>{hdr(nCur ? 'NOW' : 'NEXT', big ? dateStr : '')}<div style={{ fontSize: big ? 24 : 20, fontWeight: 100, lineHeight: 1.2 }}>{nC.t}</div><div className="dw-soft" style={{ marginTop: 4 }}>{fmtTime(nC.s)}–{fmtTime(nC.e)}{nC.l ? ' · ' + nC.l : ''}</div><div className="dw-gold" style={{ marginTop: 6, fontSize: 11 }}>{nCur ? '끝까지 ' : '시작까지 '}{Math.max(0, (nCur ? nC.e : nC.s) - nmP)}분</div></> : <>{hdr('NEXT', '')}<div className="dw-soft">오늘 남은 일정이 없어요</div></>
  // 캘린더 유형: 이번 달 + 다가오는 일정
  const MONS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const ymdOf = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  const hasPlan = (k) => eventsOn(k).length > 0 // 캘린더 위젯: 일정만
  const calGrid = (cell, cellH, gap, wd) => {
    const y = now.getFullYear(), mo = now.getMonth(), n = new Date(y, mo + 1, 0).getDate(), ws = st.weekStart ?? 1
    const lead = (new Date(y, mo, 1).getDay() - ws + 7) % 7
    return (
      <div className="dw-cal" style={{ gridTemplateColumns: `repeat(7, ${cell}px)`, gap }}>
        {wd && Array.from({ length: 7 }, (_, i) => <span key={'w' + i} className="dw-cap" style={{ textAlign: 'center', fontSize: 7 }}>{'SMTWTFS'[(i + ws) % 7]}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={'e' + i} />)}
        {Array.from({ length: n }, (_, i) => { const k = ymdOf(new Date(y, mo, i + 1)), has = hasPlan(k), on = k === d
          return <span key={i} className="dw-cday" style={{ height: cellH, border: on ? '1px solid var(--ink)' : null, fontWeight: on ? 600 : null, color: on || has ? 'var(--ink)' : 'var(--soft)' }}>{i + 1}<i style={{ color: 'var(--gold)' }}>{has ? '•' : ''}</i></span> })}
      </div>
    )
  }
  const agenda = (count) => {
    const out = []
    for (let i = 0; i < 30 && out.length < count; i++) {
      const x = new Date(); x.setDate(x.getDate() + i); const k = ymdOf(x)
      for (const e of eventsOn(k)) { if (i === 0 && e.start != null && (e.end ?? e.start + 60) <= nm) continue; out.push({ k, x, time: e.start == null ? '종일' : fmtTime(e.start), title: e.title, c: e.color }) }
    }
    let last = ''
    return <>{out.slice(0, count).map((a, i) => <div key={i}>{a.k !== last && (last = a.k) && <div className={'dw-cap' + (a.k === d ? ' dw-gold' : '')} style={{ margin: '2px 0 3px' }}>{a.k === d ? 'TODAY' : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][a.x.getDay()] + ' ' + (a.x.getMonth() + 1) + '/' + a.x.getDate()}</div>}
      <div className="dw-todo"><span className="dw-soft" style={{ width: 30, flexShrink: 0 }}>{a.time}</span><i style={{ width: 2, height: 12, borderRadius: 1, flexShrink: 0, background: a.c || 'var(--rule)' }} /><span className="ellipsis">{a.title}</span></div></div>)}
      {!out.length && <div className="dw-soft">다가오는 일정 없음</div>}</>
  }
  // 대시보드 · 내일 · 마감 · 7일 일정 · D-day 목록 · 바로 시작
  const addD = (k) => { const x = new Date(); x.setDate(x.getDate() + k); return x }
  const tmrK = ymdOf(addD(1)), tmrD = addD(1)
  const tmrEv = eventsOn(tmrK), tmrCl = classesOn(tmrK), tmrTk = sortTasks(tasks.filter((t) => !t.archived && !t.done && t.due === tmrK), 'due')
  const dueIn = (t) => Math.round((new Date(t.due + 'T00:00') - new Date(d + 'T00:00')) / 86400000)
  const dueTxt = (t) => { const n = dueIn(t); return n < 0 ? -n + '일 지남' : n === 0 ? '오늘' : n === 1 ? '내일' : 'D-' + n }
  const dueL = sortTasks(tasks.filter((t) => !t.archived && !t.done && t.due && t.due <= ymdOf(addD(14))), 'due')
  const overN = dueL.filter((t) => dueIn(t) < 0).length
  const days7 = Array.from({ length: 7 }, (_, i) => { const x = addD(i), k = ymdOf(x); return { i, x, k, ev: eventsOn(k).filter((e) => !(i === 0 && e.start != null && (e.end ?? e.start + 60) <= nm)) } })
  const ev7 = days7.reduce((a, x) => a + x.ev.length, 0)
  const dayName = (x) => (x.i === 0 ? 'TODAY' : x.i === 1 ? 'TMRW' : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][x.x.getDay()])
  const ddT = (x) => { const n = Math.round((new Date(x.date) - new Date(d)) / 86400000); return n === 0 ? 'D-DAY' : 'D-' + n }
  const qsub = (() => { const out = []; for (const x of [...sessions].sort((a, b) => String(b.date).localeCompare(String(a.date)))) { const s = subjects.find((y) => y.id === x.subjectId); if (s && !out.includes(s)) out.push(s) } for (const s of subjects) if (!out.includes(s)) out.push(s); return out.slice(0, 8) })()
  const evRow = (e, k) => <div key={k} className="dw-todo"><span className="dw-soft" style={{ width: 30, flexShrink: 0 }}>{e.start == null ? '종일' : fmtTime(e.start)}</span><i style={{ width: 2, height: 12, borderRadius: 1, flexShrink: 0, background: e.color || 'var(--rule)' }} /><span className="ellipsis">{e.title}</span></div>
  const tkRow = (t) => <div key={t.id} className="dw-todo"><span className={t.priority >= 3 ? 'dw-gold' : 'dw-soft'}>{t.priority >= 3 ? '•' : '–'}</span><span className="ellipsis grow" style={t.priority >= 3 ? { fontWeight: 500 } : null}>{t.title}</span>{t.dueTime != null && <span className="dw-soft">{fmtTime(t.dueTime)}</span>}</div>
  const tmP = useTimerState(); useTick(!!tmP && !tmP.paused) // 타이머가 돌면 공부 칸에 타이머
  const g0P = goalsP.find((g) => !g.done), pP = progP[0]
  useColl('notes'); useColl('habits'); useColl('reviews'); const NT = notesForWidget(getState()), n0 = NT[0], nOth = NT.slice(1)
  // 습관 위젯 미리보기 데이터 (위젯과 같은 모양: 오늘 체크 + 최근 7일)
  const habW = () => { const st0 = getState(), dk = today(), ds = Array.from({ length: 7 }, (_, i) => { const x = new Date(); x.setDate(x.getDate() + i - 6); return ymdOf(x) }); return Object.values(st0.habits || {}).filter((h) => !h.deleted && !h.archived).slice(0, 10).map((h) => ({ id: h.id, t: h.title, c: h.color || null, on: !!h.days?.[dk], w: ds.map((k) => !!h.days?.[k]) })) }
  // 노트 줄: 할 일은 작은 네모(완료면 채움) · 글머리는 작은 점 · 두 줄까지
  const nBox = (l) => l.k === 'todo' ? <i style={{ width: 6, height: 6, border: '0.8px solid var(--soft)', borderRadius: 1.5, background: l.d ? 'var(--soft)' : 'transparent', flexShrink: 0, marginTop: 5 }} /> : l.k === 'b' ? <i style={{ width: 3, height: 3, borderRadius: 1.5, background: 'var(--soft)', flexShrink: 0, marginTop: 6 }} /> : null
  const nRow = (l, i, fs) => <div key={i} className="row" style={{ gap: 5, flexWrap: 'nowrap', alignItems: 'flex-start', marginBottom: 3, fontSize: fs, lineHeight: 1.3, color: l.d ? 'var(--soft)' : undefined, fontWeight: l.k === 'h' ? 400 : undefined }}>{nBox(l)}<span style={{ display: '-webkit-box', WebkitLineClamp: l.k === 'h' ? 1 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minWidth: 0 }}>{l.x}</span></div>
  const TLp = { dday: ['D-DAY', dd ? ddTxt : '—', dd ? dd.title : '없음', null, 1], next: [nCur ? 'NOW' : 'NEXT', nC ? fmtTime(nC.s) : '—', nC ? nC.t : '남은 일정 없음'], todo: ['TO DO', items.filter((t) => !t.done), ''], study: tmP ? ['● ' + (subjects.find((x) => x.id === tmP.subjectId)?.name || '공부'), fmtClock((tmP.mode === 'countdown' ? remaining(tmP) : elapsed(tmP)) / 1000), (tmP.paused ? '일시정지 · ' : '오늘 ') + hm(mins), mins / goal, 1] : ['STUDY', hm(mins), pct + '%', mins / goal, 1],
    prog: ['PROGRESS', pP ? Math.round((pP.n / pP.of) * 100) + '%' : '—', pP ? pP.t : '진행 중인 교재 없음', pP ? pP.n / pP.of : null], goals: ['GOALS', goalsP.length ? `${gDone}/${goalsP.length}` : '—', g0P ? g0P.t : goalsP.length ? '모두 완료' : '목표 없음', goalsP.length ? gDone / goalsP.length : null], week: ['THIS WEEK', hm(sw.week), '하루 ' + hm(sw.avg), sw.week / Math.max(1, goal * 7), 1] }
  // 그래프 칸 미리보기
  const mxW = Math.max(goal, ...sw.last7.map((x) => x.m)), ws0 = weekStart(d, st.weekStart ?? 1)
  const wSub = subjects.map((s2) => ({ s: s2, m: sessions.filter((x) => x.subjectId === s2.id && x.date >= ws0 && x.date <= d).reduce((a, x) => a + x.dur, 0) })).filter((x) => x.m).sort((a, b) => b.m - a.m), wTot = wSub.reduce((a, x) => a + x.m, 0)
  const lastW = (() => { const back = (now.getDay() - (st.weekStart ?? 1) + 7) % 7; let t = 0; for (let k = 0; k <= back; k++) { const x = new Date(); x.setDate(x.getDate() - k - 7); const kk = ymdOf(x); t += sessions.filter((s2) => s2.date === kk).reduce((a, s2) => a + s2.dur, 0) } return t })()
  const hrs = Array(18).fill(0); for (const x of today0) if (x.start != null) { const s0 = new Date(x.start), a = s0.getHours() * 60 + s0.getMinutes(), e = a + x.dur; for (let h = 6; h < 24; h++) hrs[h - 6] += Math.max(0, Math.min(e, (h + 1) * 60) - Math.max(a, h * 60)) }
  const G = (n) => ({ node: n })
  Object.assign(TLp, {
    bars: [`THIS WEEK ${hm(sw.week)}`, G(<div><div className="row" style={{ gap: 3, alignItems: 'flex-end', height: 26 }}>{sw.last7.map((x, i) => <i key={i} style={{ flex: 1, height: Math.max(2, (x.m / mxW) * 26), borderRadius: 2, background: x.m ? 'var(--gold)' : 'var(--rule)', opacity: x.m ? (i === 6 ? 1 : 0.55) : 1 }} />)}</div><div className="row" style={{ gap: 3, fontSize: 7 }}>{sw.last7.map((x, i) => <span key={i} className={i === 6 ? 'dw-gold' : 'dw-soft'} style={{ flex: 1, textAlign: 'center' }}>{'SMTWTFS'[x.wd]}</span>)}</div></div>), ''],
    subjbar: ['SUBJECTS', G(<div><div className="row" style={{ gap: 1, height: 7, borderRadius: 4, overflow: 'hidden', background: 'var(--rule)', marginTop: 4 }}>{wSub.map((x) => <i key={x.s.id} style={{ display: 'block', height: 7, width: (x.m / (wTot || 1)) * 100 + '%', background: x.s.color }} />)}</div>{wSub.slice(0, 2).map((x) => <div key={x.s.id} className="row" style={{ fontSize: 9, gap: 4, flexWrap: 'nowrap' }}><i style={{ width: 5, height: 5, borderRadius: 3, background: x.s.color }} /><span className="grow">{x.s.name}</span><span className="dw-soft">{Math.round((x.m / (wTot || 1)) * 100)}%</span></div>)}</div>), ''],
    ring: ['GOAL', G(<div className="row" style={{ gap: 8, flexWrap: 'nowrap', alignItems: 'center' }}><svg width="38" height="38" viewBox="0 0 38 38"><circle cx="19" cy="19" r="16" fill="none" stroke="var(--rule)" strokeWidth="4" /><circle cx="19" cy="19" r="16" fill="none" stroke="var(--gold)" strokeWidth="4" strokeDasharray={`${Math.min(1, mins / goal) * 100.5} 100.5`} transform="rotate(-90 19 19)" /></svg><div className="col" style={{ gap: 0 }}><span style={{ fontSize: 18, fontWeight: 100 }}>{hm(mins)}</span><span className="dw-gold" style={{ fontSize: 9 }}>{pct}% · {hm(goal)}</span></div></div>), ''],
    heat: [`${MONS[now.getMonth()]}`, G(<div style={{ marginTop: 4 }}>{month(10)}</div>), ''],
    hours: ['HOURS', G(<div><div className="row" style={{ gap: 1, alignItems: 'flex-end', height: 24 }}>{hrs.map((v, i) => <i key={i} style={{ flex: 1, height: Math.max(1.5, (v / Math.max(30, ...hrs)) * 24), borderRadius: 1, background: v ? 'var(--gold)' : 'var(--rule)' }} />)}</div><div className="row between dw-soft" style={{ fontSize: 6 }}><span>6</span><span>12</span><span>18</span><span>24</span></div></div>), ''],
    compare: ['VS LAST WEEK', G(<div>{[['이번 주', sw.week, 'var(--gold)'], ['지난주', lastW, 'var(--soft)']].map(([l, v, c]) => <div key={l} style={{ marginTop: 3 }}><div className="row between" style={{ fontSize: 9 }}><span>{l}</span><span style={{ color: c }}>{hm(v)}</span></div><div style={{ height: 3, borderRadius: 2, background: 'var(--rule)' }}><i style={{ display: 'block', height: 3, borderRadius: 2, width: (v / Math.max(1, sw.week, lastW)) * 100 + '%', background: c }} /></div></div>)}</div>), (sw.week >= lastW ? '+' : '−') + hm(Math.abs(sw.week - lastW)), null, 1],
  })
  const clsP = classesOn(d), cCur = clsP.find((c) => c.start <= nmP && c.end > nmP), cNx = cCur || clsP.find((c) => c.start > nmP)
  const agP = []; for (let i = 0; i < 7 && agP.length < 3; i++) { const x = new Date(); x.setDate(x.getDate() + i); for (const e of eventsOn(ymdOf(x))) if (agP.length < 3 && !(i === 0 && e.start != null && (e.end ?? e.start + 60) <= nmP)) agP.push({ i, x, e }) }
  Object.assign(TLp, {
    date: [['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()], G(<div className="row" style={{ gap: 6, alignItems: 'baseline' }}><span style={{ fontSize: 26, fontWeight: 100 }}>{now.getDate()}</span><span className="dw-soft" style={{ fontSize: 10 }}>{MONS[now.getMonth()]}</span></div>), ''],
    quote: ['다짐', G(<div style={{ fontSize: 11, lineHeight: 1.4 }}>{quote || '앱에서 다짐을 적어 보세요'}</div>), ''],
    class: [cCur ? 'NOW CLASS' : 'NEXT CLASS', G(<div><div className="ellipsis" style={{ fontSize: 13 }}>{cNx ? `${cNx.period}교시 ${cNx.title}` : clsP.length ? '오늘 수업 끝' : '수업 없음'}</div>{cNx && <div className="dw-soft" style={{ fontSize: 9 }}>{fmtTime(cNx.start)}–{fmtTime(cNx.end)}</div>}</div>), ''],
    agenda: ['AGENDA', G(<div>{agP.map(({ i, x, e }, k) => <div key={k} className="row" style={{ gap: 5, flexWrap: 'nowrap', fontSize: 10 }}><span className="dw-gold" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{i === 0 ? '' : i === 1 ? '내일 ' : ['일', '월', '화', '수', '목', '금', '토'][x.getDay()] + ' '}{e.start == null ? '종일' : fmtTime(e.start)}</span><span className="ellipsis">{e.title}</span></div>)}{!agP.length && <span className="dw-soft">일정 없음</span>}</div>), ''],
    ddl: ['D-DAYS', G(<div>{ddSorted.slice(0, 3).map((x) => <div key={x.id} className="row between" style={{ fontSize: 10, flexWrap: 'nowrap', gap: 4 }}><span className="ellipsis">{x.title}</span><span className="dw-gold">{ddT(x)}</span></div>)}</div>), ''],
  })
  const dKeys = dashKeys(st), tiles = dKeys.map((k) => TLp[k])
  const dLine = (k) => k === 'todo' ? <div key={k}><div className="dw-cap">TO DO</div>{items.filter((t) => !t.done).slice(0, 3).map((t) => <div key={t.id} className="dw-todo"><span className={t.priority >= 3 ? 'dw-gold' : 'dw-soft'}>{t.priority >= 3 ? '•' : '–'}</span><span className="ellipsis">{t.title}</span></div>)}</div>
    : k === 'dday' ? <div key={k} className="row" style={{ gap: 6, alignItems: 'baseline', flexWrap: 'nowrap' }}><span style={{ fontSize: 26, fontWeight: 100, lineHeight: 1 }}>{dd ? ddTxt : '—'}</span><span className="dw-gold ellipsis" style={{ fontSize: 11 }}>{dd ? dd.title : 'No D-day'}</span></div>
    : k === 'next' ? <div key={k} className="dw-todo"><span className="dw-gold" style={{ fontSize: 11 }}>{nC ? (nCur ? '지금 ' : '') + fmtTime(nC.s) : '—'}</span><span className="ellipsis">{nC ? nC.t : '남은 일정 없음'}</span></div>
    : k === 'study' ? (tmP ? <div key={k}><div className="row" style={{ gap: 6, alignItems: 'baseline', flexWrap: 'nowrap' }}><span className="dw-gold" style={{ fontSize: 10 }}>● {TLp.study[0].slice(2)}</span><span style={{ fontSize: 20, fontWeight: 100 }}>{TLp.study[1]}</span><span className="grow" /><span className="dw-gold" style={{ fontSize: 10 }}>{pct}%</span></div><div className="dw-line"><i style={{ width: pct + '%' }} /></div></div> : <div key={k}>{big(22)}</div>)
    : k === 'week' ? <div key={k} className="row" style={{ gap: 6, alignItems: 'baseline', flexWrap: 'nowrap' }}><span style={{ fontSize: 22, fontWeight: 100 }}>{hm(sw.week)}</span><span className="dw-soft" style={{ fontSize: 10 }}>이번 주</span><span className="grow" /><span className="dw-gold" style={{ fontSize: 10 }}>하루 {hm(sw.avg)}</span></div>
    : TLp[k][1]?.node ? <div key={k}><div className="row between"><span className="dw-cap">{TLp[k][0]}</span>{TLp[k][2] && <span className="dw-gold" style={{ fontSize: 10 }}>{TLp[k][2]}</span>}</div>{TLp[k][1].node}</div>
    : <div key={k}><div className="row" style={{ flexWrap: 'nowrap', gap: 6 }}><span className="ellipsis grow">{TLp[k][2]}</span><span className="dw-gold" style={{ fontSize: 11 }}>{TLp[k][1]}</span></div>{TLp[k][3] != null && <div className="dw-line" style={{ marginTop: 4 }}><i style={{ width: Math.min(100, TLp[k][3] * 100) + '%' }} /></div>}</div>
  const dGraph = (k) => !!TLp[k][1]?.node
  const dCol = (ks) => ks.map((k, i) => <Fragment key={k}>{i > 0 && <div className="grow" />}{dLine(k)}</Fragment>)
  const dOthers = dKeys.filter((k) => k !== 'todo'), dHasTodo = dKeys.includes('todo')
  const tileGrid = (cols, size, fill, tiles = dKeys.map((k) => TLp[k])) => <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '12px 12px', ...(fill ? { height: '100%', alignContent: 'space-between' } : null) }}>{tiles.map((x) => <div key={x[0]} className="col" style={{ gap: 1, minWidth: 0, ...(x.wide ? { gridColumn: '1 / -1' } : null), ...(x.big ? { gridRow: 'span 2' } : null) }}><span className="dw-cap">{x[0]}</span>{x[1]?.node ? <div style={size < 25 ? { zoom: 0.72 } : null}>{x[1].node}</div> : Array.isArray(x[1]) ? <div className="col" style={{ gap: 2, marginTop: 3, minWidth: 0 }}>{x[1].slice(0, cols === 4 ? 6 : size >= 30 ? 4 : 3).map((t) => <span key={t.id} className="ellipsis" style={{ fontSize: size >= 30 ? 15 : 11, fontWeight: t.priority >= 3 ? 500 : null }}>{t.priority >= 3 ? '• ' : '– '}{t.title}</span>)}{!x[1].length && <span className="dw-soft">All clear.</span>}</div> : <span className="ellipsis" style={{ fontSize: size, fontWeight: 100, lineHeight: 1.1 }}>{x[1]}</span>}{x[2] && <span className={'ellipsis ' + (x[4] ? 'dw-gold' : 'dw-soft')} style={{ fontSize: 10 }}>{x[2]}</span>}{x[3] != null && <div className="dw-line" style={{ marginTop: 3 }}><i style={{ width: Math.min(100, x[3] * 100) + '%' }} /></div>}</div>)}</div>
  const btn = (s, key, color) => <span key={key} className="row" style={{ flex: 1, minWidth: 0, height: 32, borderRadius: 10, background: 'var(--rule)', justifyContent: 'center', gap: 5, fontSize: 12 }}>{color && <i style={{ width: 6, height: 6, borderRadius: 3, background: color, flexShrink: 0 }} />}<span className="ellipsis">{s}</span></span>
  const quickBody = (n, lg) => <>{hdr('START', '오늘 ' + hm(mins))}{[0, 4].filter((i) => i < Math.min(n, qsub.length)).map((i) => <div key={i} className="row" style={{ gap: 8, marginBottom: 8, flexWrap: 'nowrap' }}>{qsub.slice(i, i + 4).map((s) => btn(s.name, s.id, s.color))}{Array.from({ length: 4 - qsub.slice(i, i + 4).length }, (_, k) => <span key={'p' + k} style={{ flex: 1 }} />)}</div>)}<div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>{btn('+ 할 일', 'a')}{btn('+ 일정', 'b')}{btn('+ 기록', 'c')}</div>{lg && <><div className="dw-hr" />{list(4)}</>}</>
  // 추가 칸 미리보기 (위젯 스크립트와 같은 내용)
  const stS = getState(), dK = today(), habP = Object.values(stS.habits || {}).filter((h) => !h.deleted && !h.archived), habOnP = habP.filter((h) => h.days?.[dK]).length
  const revP = Object.values(stS.reviews || {}).filter((r) => !r.deleted && r.next && r.next <= dK && !r.done).length
  const oneR = stS.days?.[dK]?.one, oneTk = oneR?.taskId ? stS.tasks?.[oneR.taskId] : null, oneTxt = oneR ? (oneTk ? oneTk.title : oneR.text) : ''
  const mPreP = dK.slice(0, 7), mSess = sessions.filter((x) => String(x.date).startsWith(mPreP)), mTotP = mSess.reduce((a, x) => a + (x.dur || 0), 0), mDaysP = new Set(mSess.map((x) => x.date)).size
  const rowsP = (rows) => G(<div style={{ marginTop: 2 }}>{rows.map(([a, b2], k) => <div key={k} className="row" style={{ gap: 5, flexWrap: 'nowrap', fontSize: 10 }}><span className="dw-gold" style={{ whiteSpace: 'nowrap', flexShrink: 0, fontSize: 8 }}>{a}</span><span className="ellipsis">{b2}</span></div>)}{!rows.length && <span className="dw-soft" style={{ fontSize: 10 }}>없음</span>}</div>)
  Object.assign(TLp, {
    note: ['NOTE', G(<div><div className="ellipsis" style={{ fontSize: 11, marginBottom: 2 }}>{n0 ? n0.t : '노트가 없어요'}</div>{(n0?.l || []).slice(0, 3).map((l, k) => nRow(l, k, 9.5))}</div>), ''],
    notes: ['NOTES', G(<div>{NT.slice(0, 3).map((x) => <div key={x.id} className="row between" style={{ fontSize: 10, flexWrap: 'nowrap', gap: 4 }}><span className="ellipsis">{x.t}</span></div>)}{!NT.length && <span className="dw-soft" style={{ fontSize: 10 }}>노트 없음</span>}</div>), ''],
    month: ['THIS MONTH', hm(mTotP), `${mDaysP}일 공부`, null, 1],
    left: [mins >= goal ? 'GOAL DONE' : 'LEFT', hm(Math.max(0, goal - mins)), mins >= goal ? '오늘 목표 달성' : '목표까지 남음', mins / goal, 1],
    tmrw: ['TOMORROW', rowsP([...tmrEv.map((e) => [e.start == null ? '종일' : fmtTime(e.start), e.title]), ...tmrTk.map((t) => ['–', t.title])].slice(0, 3)), tmrCl.length ? '수업 ' + tmrCl.length : ''],
    due: ['DUE', rowsP(dueL.slice(0, 3).map((t) => [t.due === dK ? '오늘' : t.due < dK ? '지남' : t.due.slice(5).replace('-', '/'), t.title])), ''],
    start: ['START', G(<div className="row" style={{ gap: 6, flexWrap: 'nowrap', marginTop: 3 }}>{(qsub.length ? qsub : [{ name: '공부', id: 'x' }]).slice(0, 2).map((x) => <span key={x.id} className="row" style={{ flex: 1, minWidth: 0, height: 24, borderRadius: 8, background: 'var(--rule)', justifyContent: 'center', gap: 4, fontSize: 10 }}>{x.color && <i style={{ width: 5, height: 5, borderRadius: 3, background: x.color }} />}<span className="ellipsis">{x.name}</span></span>)}</div>), ''],
    habits: ['HABITS', habP.length ? `${habOnP}/${habP.length}` : '—', habP.length ? (habP.find((h) => !h.days?.[dK])?.title || '오늘 모두 완료') : '습관 없음', habP.length ? habOnP / habP.length : null],
    review: ['REVIEW', revP + '개', revP ? '오늘 볼 복습' : '오늘 복습 없음', null, 1],
    one: ['TODAY ONE', G(<div style={{ fontSize: 11, lineHeight: 1.4 }} className={oneTxt ? '' : 'dw-soft'}>{oneTxt || '오늘의 하나를 정해 보세요'}</div>), ''],
  })
  const V = {
    대시보드: [
      M(<><div className="grow" />{tileGrid(2, 19)}<div className="grow" /></>),
      <><div className="col" style={{ gap: 0, width: '45%', flexShrink: 0, minWidth: 0 }}>{dCol(dHasTodo ? dOthers.slice(0, dOthers.slice(0, 3).some(dGraph) ? 2 : 3) : dOthers.slice(0, 2))}</div>
        <div className="dw-vr" /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>{dHasTodo ? <>{hdr('TO DO', dateStr)}{items.filter((t) => !t.done).slice(0, 5).map((t) => <div key={t.id} className="dw-todo"><span className={t.priority >= 3 ? 'dw-gold' : 'dw-soft'}>{t.priority >= 3 ? '•' : '–'}</span><span className="ellipsis" style={t.priority >= 3 ? { fontWeight: 500 } : null}>{t.title}</span></div>)}{!leftN && <div className="dw-soft">All clear.</div>}</> : dCol(dOthers.slice(2, 4))}</div></>,
      M(<>{hdr('TODAY', dateStr)}{tileGrid(2, 36)}<div className="grow" />{!dKeys.includes('bars') && <><div className="dw-hr" />{hdr('THIS WEEK', `${hm(sw.week)} · 하루 ${hm(sw.avg)}`)}{bars7(60)}</>}</>),
    ],
    내일: [0, 1, 2].map((i) => { const none = !tmrEv.length && !tmrTk.length && !tmrCl.length
      const cl = tmrCl.length > 0 && <div className="dw-soft" style={{ fontSize: 10, marginBottom: 6 }}>수업 {tmrCl.length}교시 · {fmtTime(tmrCl[0].start)}–{fmtTime(tmrCl[tmrCl.length - 1].end)}</div>
      const head = hdr('TOMORROW', <span className="dw-gold">{['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][tmrD.getDay()]} {tmrD.getMonth() + 1}/{tmrD.getDate()}</span>)
      if (none) return M(<>{head}<div className="dw-soft">내일은 비어 있어요</div></>)
      if (i === 0) { const k = tmrCl.length ? 2 : 3, kt = Math.max(0, k - tmrEv.length); return M(<>{head}{cl}{tmrEv.slice(0, k).map(evRow)}{tmrTk.slice(0, kt).map(tkRow)}<div className="grow" />{tmrTk.length > 0 && !kt && <div className="dw-gold" style={{ fontSize: 10 }}>할 일 {tmrTk.length}개</div>}</>) }
      if (i === 1) return M(<>{head}<div className="row" style={{ alignItems: 'stretch', flexWrap: 'nowrap', gap: 0, flex: 1, minHeight: 0 }}><div className="col" style={{ gap: 0, width: '54%', minWidth: 0 }}>{cl}{tmrEv.slice(0, tmrCl.length ? 3 : 4).map(evRow)}{!tmrEv.length && <div className="dw-soft">일정 없음</div>}</div><div className="dw-vr" /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>{tmrTk.slice(0, 4).map(tkRow)}{!tmrTk.length && <div className="dw-soft">할 일 없음</div>}</div></div></>)
      return M(<>{head}{tmrCl.length > 0 && <><div className="dw-cap sp">CLASSES</div><div style={{ margin: '4px 0 10px' }}>{tmrCl.map((c) => c.period + ' ' + c.title).join(' · ')}</div></>}<div className="dw-cap sp">EVENTS</div><div style={{ height: 4 }} />{tmrEv.slice(0, 4).map(evRow)}{!tmrEv.length && <div className="dw-soft">일정 없음</div>}<div style={{ height: 8 }} /><div className="dw-cap sp">TO DO</div><div style={{ height: 4 }} />{tmrTk.slice(0, tmrCl.length ? 4 : 6).map(tkRow)}{!tmrTk.length && <div className="dw-soft">할 일 없음</div>}</>)
    }),
    마감: [4, 5, 11].map((n0, i) => { const n = dueL.length === n0 + 1 ? n0 + 1 : n0; return M(<>{hdr('DUE', <span className={overN ? 'dw-gold' : ''}>{overN ? overN + '개 지남' : '2주 ' + dueL.length + '개'}</span>)}{dueL.slice(0, n).map((t) => <div key={t.id} className="dw-todo"><span className={dueIn(t) <= 0 ? 'dw-gold' : 'dw-soft'} style={{ width: i ? 42 : 36, flexShrink: 0, fontSize: 10 }}>{dueTxt(t)}</span><span className="ellipsis grow" style={t.priority >= 3 ? { fontWeight: 500 } : null}>{t.title}</span>{i > 0 && t.dueTime != null && <span className="dw-soft">{fmtTime(t.dueTime)}</span>}</div>)}{!dueL.length && <div className="dw-soft">2주 안에 마감 없음</div>}{dueL.length > n && <div className="dw-soft" style={{ fontSize: 11 }}>+ {dueL.length - n} more</div>}</>) }),
    일주일: [
      M(<>{hdr('NEXT 7 DAYS', ev7 + '개')}{days7.slice(0, 3).map((x) => <div key={x.k} className="row" style={{ gap: 8, alignItems: 'flex-start', flexWrap: 'nowrap', marginBottom: 5 }}><div className="col" style={{ gap: 0, width: 34, flexShrink: 0 }}><span className={'dw-cap' + (x.i ? '' : ' dw-gold')}>{dayName(x)}</span><span className="dw-soft" style={{ fontSize: 10 }}>{x.x.getMonth() + 1}/{x.x.getDate()}</span></div><span className="ellipsis grow" style={{ fontSize: 11 }}>{x.ev[0] ? x.ev[0].title : '—'}</span>{x.ev.length > 1 && <span className="dw-cap">+{x.ev.length - 1}</span>}</div>)}</>),
      M(<>{hdr('NEXT 7 DAYS', ev7 + '개')}<div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>{days7.map((x) => <div key={x.k} className="col" style={{ gap: 2, minWidth: 0 }}><span className={'dw-cap' + (x.i ? '' : ' dw-gold')}>{'SMTWTFS'[x.x.getDay()]}</span><span className={x.i ? '' : 'dw-gold'} style={{ fontSize: 13, fontWeight: x.i ? 300 : 600 }}>{x.x.getDate()}</span>{x.ev.slice(0, 3).map((e, k) => <span key={k} className="row" style={{ gap: 2, flexWrap: 'nowrap', fontSize: 8, minWidth: 0 }}><i style={{ width: 2, height: 9, borderRadius: 1, background: e.color || 'var(--gold)', flexShrink: 0 }} /><span className="ellipsis">{e.title}</span></span>)}{x.ev.length > 3 && <span className="dw-cap">+{x.ev.length - 3}</span>}</div>)}</div></>),
      M(<>{hdr('NEXT 7 DAYS', ev7 + '개')}{days7.map((x) => <div key={x.k} className="row" style={{ gap: 8, alignItems: 'flex-start', flexWrap: 'nowrap', marginBottom: 6 }}><div className="col" style={{ gap: 0, width: 44, flexShrink: 0 }}><span className={'dw-cap' + (x.i ? '' : ' dw-gold')}>{dayName(x)}</span><span className="dw-soft" style={{ fontSize: 10 }}>{x.x.getMonth() + 1}/{x.x.getDate()}</span></div><div className="col" style={{ gap: 2, flex: 1, minWidth: 0 }}>{x.ev.slice(0, 2).map(evRow)}{!x.ev.length && <span className="dw-soft">—</span>}</div>{x.ev.length > 2 && <span className="dw-cap">+{x.ev.length - 2}</span>}</div>)}</>),
    ],
    디데이목록: [
      M(<>{hdr('D-DAYS', '')}{ddSorted.slice(0, 4).map((x) => <div key={x.id} className="row between" style={{ marginBottom: 6, flexWrap: 'nowrap', gap: 6 }}><span className="ellipsis">{x.title}</span><span className="dw-gold">{ddT(x)}</span></div>)}{!ddSorted.length && <div className="dw-soft">No D-day.</div>}</>),
      M(<>{hdr('D-DAYS', dateStr)}{dd ? <div className="row" style={{ alignItems: 'stretch', flexWrap: 'nowrap', gap: 0, flex: 1 }}><div className="col" style={{ gap: 2, width: '38%', minWidth: 0 }}><span style={{ fontSize: 30, fontWeight: 100, lineHeight: 1 }}>{ddTxt}</span><span className="dw-gold ellipsis">{dd.title}</span><span className="dw-soft" style={{ fontSize: 10 }}>{dd.date.slice(5).replace('-', '.')}</span></div><div className="dw-vr" /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>{ddSorted.slice(1, 5).map((x) => <div key={x.id} className="row between" style={{ marginBottom: 6, flexWrap: 'nowrap', gap: 6 }}><span className="ellipsis">{x.title}</span><span className="dw-gold">{ddT(x)}</span></div>)}{ddSorted.length === 1 && <span className="dw-soft">다른 D-day 없음</span>}</div></div> : <div className="dw-soft">No D-day.</div>}</>),
      M(<>{hdr('D-DAYS', dateStr)}{ddSorted.slice(0, 10).map((x) => <div key={x.id} className="row" style={{ marginBottom: 9, flexWrap: 'nowrap', gap: 8, fontSize: 14 }}><span className="ellipsis grow">{x.title}</span><span className="dw-soft" style={{ fontSize: 10 }}>{x.date.slice(5).replace('-', '.')}</span><span className="dw-gold">{ddT(x)}</span></div>)}{!ddSorted.length && <div className="dw-soft">No D-day.</div>}</>),
    ],
    바로가기: [
      M(<>{hdr('START', '오늘 ' + hm(mins))}<div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>{qsub[0]?.color && <i style={{ width: 7, height: 7, borderRadius: 4, background: qsub[0].color, flexShrink: 0 }} />}<span className="ellipsis" style={{ fontSize: 26, fontWeight: 100 }}>{qsub[0]?.name || '공부'}</span></div><div className="dw-soft" style={{ fontSize: 10 }}>눌러서 시작</div><div className="grow" /><div className="dw-line"><i style={{ width: pct + '%' }} /></div></>),
      M(quickBody(4)),
      M(quickBody(8, true)),
    ],
    주간: [30, 26, 90].map((h, i) => M(<>{hdr('THIS WEEK', i ? dateStr : '')}<div className="dw-big"><span style={{ fontSize: i === 2 ? 38 : 30 }}>{hm(sw.week)}</span></div><div className="dw-soft">하루 평균 {hm(sw.avg)}</div><div className="grow" />{bars7(h)}{i === 2 && <><div className="dw-hr" />{weekSub.slice(0, 5).map((x) => pRow(x.s.name, hm(x.m), x.m / (weekSub[0].m || 1), x.s.color))}</>}</>)),
    과목: [3, 3, 8].map((n) => M(<>{hdr('SUBJECTS', '이번 주 ' + hm(sw.week))}{weekSub.slice(0, n).map((x) => pRow(x.s.name, hm(x.m), x.m / (weekSub[0].m || 1), x.s.color))}{!weekSub.length && <div className="dw-soft">이번 주 공부 기록이 없어요</div>}</>)),
    지금: [0, 1, 2].map((i) => M(<>{nowBody(i > 0)}{i > 0 && nowL.filter((x) => x.e > nmP && x !== nC).slice(0, i === 2 ? 8 : 1).map((x, k) => <div key={k} className="dw-todo" style={{ marginTop: k ? 0 : 10 }}><span className="dw-soft" style={{ width: 38 }}>{fmtTime(x.s)}</span><span className="ellipsis">{x.t}</span></div>)}</>)),
    진도: [3, 3, 8].map((n, i) => M(<>{hdr('PROGRESS', i ? dateStr : '')}{progP.slice(0, n).map((x) => pRow(x.t, i ? `${x.n}/${x.of}${x.u}` : Math.round((x.n / x.of) * 100) + '%', x.n / x.of))}{!progP.length && <div className="dw-soft">진행 중인 교재·인강이 없어요</div>}</>)),
    목표: [0, 1, 2].map((i) => M(<>{hdr('THIS WEEK', `${gDone}/${goalsP.length}`)}{goalsP.map((g) => pRow((g.done ? '✓ ' : '– ') + g.t, i && g.of ? `${g.n}/${g.of}` : '', g.r))}{!goalsP.length && <div className="dw-soft">할 일 › 이번 주 목표에서 정해 보세요</div>}{i === 2 && <><div className="dw-hr" /><div className="row between"><span>이번 주 공부 {hm(sw.week)}</span><span className="dw-soft">하루 {hm(sw.avg)}</span></div></>}</>)),
    오늘: [
      <>{hdr('TODAY', dateStr)}<div className="dw-todo"><span className="dw-gold">{nC ? fmtTime(nC.s) : '—'}</span><span className="ellipsis">{nC ? nC.t : '남은 일정 없음'}</span></div><div className="grow" />{big(24)}<div className="dw-soft" style={{ marginTop: 6 }}>할 일 {leftN}개 남음</div></>,
      <><div className="col" style={{ gap: 0, width: 128, flexShrink: 0 }}>{hdr('TODAY', '')}<div className="dw-todo"><span className="dw-gold">{nC ? fmtTime(nC.s) : '—'}</span><span className="ellipsis">{nC ? nC.t : '없음'}</span></div><div className="grow" />{big(24)}</div><div className="dw-vr" /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>{list(4)}</div></>,
      <>{hdr('TODAY', dateStr)}<div className="dw-todo"><span className="dw-gold">{nC ? fmtTime(nC.s) : '—'}</span><span className="ellipsis">{nC ? nC.t : '남은 일정 없음'}</span></div><div style={{ height: 8 }} />{big(34)}<div className="dw-hr" />{list(6)}<div className="grow" />{ddRow}</>,
    ],
    '': [
      <><div className="dw-cap">{dateStr}</div><div className="grow" />{big(26)}<div className="grow" />{ddRow}</>,
      <><div className="col" style={{ gap: 0, width: 128, flexShrink: 0 }}><div className="dw-cap">{dateStr}</div><div className="grow" />{big(28)}<div className="grow" />{ddRow}</div>
        <div className="dw-vr" />
        <div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><div className="dw-cap sp">TODAY</div><div style={{ height: 10 }} />{list(4)}</div></>,
      <><div className="row between"><span className="dw-cap">{dateStr}</span>{dd && <span><span className="dw-soft">{dd.title}  </span><span className="dw-gold" style={{ fontSize: 13 }}>{ddTxt}</span></span>}</div>
        {quote && <div className="dw-quote">— {quote}</div>}
        <div className="dw-hr" />
        <div className="dw-cap sp">STUDY</div>
        {big(34)}
        <div className="dw-soft dw-subs">{subMins.map((x) => <span key={x.s.id}>{x.s.name} {hm(x.m)}</span>)}</div>
        <div className="dw-hr" />
        <div className="row between"><span className="dw-cap sp">TODAY</span><span className="dw-cap dw-gold">{done} DONE</span></div>
        <div style={{ height: 8 }} />
        {list(6)}</>,
    ],
    공부: [
      <><div className="row between"><span className="dw-cap sp">STUDY</span></div><div style={{ height: 8 }} />{big(30)}<div className="grow" /><div className="row between">{stat('WEEK', hm(sw.week))}{stat('YESTERDAY', hm(sw.yday), true)}</div></>,
      <><div className="col" style={{ gap: 0, width: 150, flexShrink: 0 }}><span className="dw-cap sp">STUDY</span><div style={{ height: 8 }} />{big(34)}<div className="grow" /><div className="row between">{stat('WEEK', hm(sw.week))}{stat('YESTERDAY', hm(sw.yday), true)}</div></div><div className="dw-vr" /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>{bars7(78)}</div></>,
      <><div className="row between"><span className="dw-cap sp">STUDY</span><span className="dw-cap">{dateStr}</span></div><div style={{ height: 10 }} />{big(44)}<div style={{ height: 14 }} /><div className="row between">{stat('WEEK', hm(sw.week))}{stat('7-DAY AVG', hm(sw.avg))}{stat('YESTERDAY', hm(sw.yday), true)}</div><div style={{ height: 14 }} />{bars7(70)}<div className="dw-hr" />{subBars(3)}</>,
    ],
    할일: [4, 5, 11].map((n) => <><div className="row between"><span className="dw-cap sp">TODAY</span><span className="dw-cap dw-gold">{done} DONE</span></div><div style={{ height: 10 }} />{list(n)}</>),
    디데이: [40, 52, 52].map((sz, i) => <><div className="dw-cap">{dateStr}</div><div className="grow" />
      {dd ? <><div style={{ fontSize: sz, fontWeight: 100, lineHeight: 1 }}>{ddTxt}</div><div className="row" style={{ gap: 8, marginTop: 4 }}><span className="dw-gold">{dd.title}</span><span className="dw-soft">{dd.date.slice(5).replace('-', '.')}</span></div><div className="dw-soft" style={{ fontSize: 10, marginTop: 2 }}>남은 주말 {wkP(dd)}번</div></> : <div className="dw-soft">No D-day.</div>}
      {i > 0 && quote && <div className="dw-soft" style={{ marginTop: 10, fontSize: 12 }}>— {quote}</div>}
      {i === 2 && ddList.length > 1 && <><div className="dw-hr" />{ddList.slice(1, 6).map((x) => <div key={x.id} className="row between" style={{ marginBottom: 8 }}><span>{x.title}</span><span className="dw-gold">D-{Math.round((new Date(x.date) - new Date(d)) / 86400000)}</span></div>)}</>}
      {i < 2 && <div className="grow" />}</>),
    달력: [
      <><div className="dw-cap">{['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][now.getMonth()]} {now.getFullYear()}</div><div style={{ height: 8 }} />{month(16)}</>,
      <><div className="col" style={{ gap: 0, flex: 1 }}><div className="dw-cap">{dateStr}</div><div className="grow" /><div style={{ fontSize: 28, fontWeight: 100 }}>{hm(mins)}</div><div className="dw-cap dw-gold">TODAY</div></div>{month(20)}</>,
      <><div className="row between"><span className="dw-cap">{dateStr}</span><span className="dw-cap dw-gold">TODAY {hm(mins)}</span></div><div style={{ height: 8 }} />{month(39, true)}</>,
    ],
    캘린더: [
      <><div className="dw-cap">{MONS[now.getMonth()]} {now.getFullYear()}</div><div style={{ height: 6 }} />{calGrid(16, 13, 2, true)}</>,
      <><div className="col" style={{ gap: 0, flexShrink: 0 }}><div className="dw-cap">{MONS[now.getMonth()]} {now.getFullYear()}</div><div style={{ height: 6 }} />{calGrid(17, 14, 2, false)}</div><div className="dw-vr" /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>{agenda(4)}</div></>,
      <><div className="row between"><span className="dw-cap">{MONS[now.getMonth()]} {now.getFullYear()}</span><span className="dw-cap">{dateStr}</span></div><div style={{ height: 6 }} />{calGrid(39, 24, 3, true)}<div className="dw-hr" style={{ margin: '6px 0 8px' }} />{agenda(5)}</>,
    ],
    시간표: [6, 5, 10].map((n, vi) => { const cls = classesOn(d); return <><div className="row between"><span className="dw-cap sp">CLASSES</span>{vi > 0 && <span className="dw-cap">{dateStr}</span>}</div><div style={{ height: 8 }} />
      {cls.slice(0, n).map((c) => <div key={c.id} className="dw-todo" style={c.end <= nm ? { color: 'var(--soft)' } : c.start <= nm ? { color: 'var(--gold)' } : null}><span className="dw-soft" style={{ width: 12 }}>{c.period}</span><span className="ellipsis grow">{c.title}</span>{vi > 0 && c.room && <span className="dw-soft">{c.room}</span>}<span className="dw-soft">{fmtTime(c.start)}</span></div>)}
      {!cls.length && <div className="dw-soft">오늘은 수업이 없어요</div>}</> }),
    다짐: [14, 17, 22].map((sz) => <><div className="dw-cap">{dateStr}</div><div className="grow" /><div style={{ fontSize: sz, lineHeight: 1.45 }}>{quote || '앱에서 다짐을 적어 보세요'}</div><div className="grow" /></>),
  }
  // 잠금 화면 미리보기 — 위젯 스크립트(scriptable.js)의 잠금 화면 분기와 같은 내용
  const bar = (r, wd) => <i className="dw-lbar" style={{ width: wd }}><b style={{ width: Math.max(0, Math.min(1, r)) * 100 + '%' }} /></i>
  const B = { fontSize: 22, fontWeight: 100 }, S = { fontSize: 8 }, DIM = { opacity: .55 }, ROW = { display: 'flex', justifyContent: 'space-between', gap: 6, width: '100%', minWidth: 0 }
  // 노트 위젯 미리보기
  const nHead = (fs) => <><div className="row" style={{ flexWrap: 'nowrap', gap: 6 }}><span className="ellipsis grow" style={{ fontSize: fs + 0.5 }}>{n0 ? n0.t : '노트가 없어요'}</span></div><div className="dw-hr" style={{ margin: '5px 0 6px' }} /></>
  const nLines = (k, fs, from = 0) => (n0?.l || []).slice(from, from + k).map((l, i) => nRow(l, i, fs))
  const nMark = (l) => (l.k === 'todo' ? (l.d ? '✓' : '·') : l.k === 'b' ? '·' : '')
  const Lfor = (kind) => {
    if (kind === '습관') { const hs = habW(), on = hs.filter((x) => x.on).length, nx = hs.find((x) => !x.on); return { c: hs.length ? [[on + '/' + hs.length, { fontSize: 14 }], ['HABITS', S], [bar(on / hs.length, 34)]] : [['—', B]], r: [['습관 ' + on + '/' + hs.length], ...hs.filter((x) => !x.on).slice(0, 2).map((x) => ['· ' + x.t, { fontSize: 9.5 }])], i: hs.length ? `습관 ${on}/${hs.length}` + (nx ? ' · ' + nx.t : ' · 모두 완료') : '습관 없음' } }
    if (kind === '노트') return { c: [['NOTE', S], [n0?.t || '없음', { fontSize: 11 }]], r: [[n0?.t || '노트 없음'], ...(n0?.l || []).slice(0, 2).map((l) => [(nMark(l) ? nMark(l) + ' ' : '') + l.x, { fontSize: 9.5 }])], i: n0?.t || '노트 없음' }
    const left = items.filter((t) => !t.done)
    if (kind === '디데이') return { c: [[dd ? (ddN === 0 ? 'D' : ddN) : '–', B], ['D-DAY', S]], r: [[ddTxt || 'No D-day', { fontSize: 24, fontWeight: 100 }], [dd ? <span style={ROW}><span>{dd.title}  {dd.date.slice(5).replace('-', '.')}</span><span style={{ fontSize: 10 }}>주말 {wkP(dd)}번</span></span> : ''], [ddNext ? `${ddNext.title} D-${Math.round((new Date(ddNext.date) - new Date(d)) / 86400000)}` : '', { ...DIM, fontSize: 10 }]], i: dd ? `${ddTxt} ${dd.title} · 주말 ${wkP(dd)}번` : 'No D-day' }
    if (kind === '공부') return { c: [[hm(mins), { fontSize: 14 }], [pct + '%', S], [bar(mins / goal, 34)]], r: [[<><b>{hm(mins)}</b> / {hm(goal)}<span className="grow" />{pct}%</>], [bar(mins / goal, 136)], [<span style={ROW}><span>이번 주 {hm(sw.week)}</span><span>어제 {hm(sw.yday)}</span></span>]], i: `공부 ${hm(mins)} / ${hm(goal)} · ${pct}%` }
    if (kind === '할일') return { c: [[left.length, { fontSize: 24, fontWeight: 100 }], ['할 일', S], [`${done}/${done + left.length}`, S]], r: [[<span style={{ ...ROW, fontSize: 8, letterSpacing: 2 }}><span>TODAY</span><span>{done}/{items.length}</span></span>], ...items.slice(0, 3).map((t) => [(t.done ? '✓ ' : '– ') + t.title, t.done ? DIM : null]), ...(items.length ? [] : [['All clear.']])], i: left.length ? `할 일 ${left.length}개 · ${left[0].title}` : '오늘 할 일 끝' }
    if (kind === '달력') {
      const byDay = {}; for (const x of sessions) byDay[x.date] = (byDay[x.date] || 0) + x.dur
      const pre = d.slice(0, 7), mv = Object.entries(byDay).filter(([k]) => k.startsWith(pre)).map(([, v]) => v)
      const total = mv.reduce((a, v) => a + v, 0), days = mv.filter(Boolean).length, hit = mv.filter((v) => v >= goal).length
      const mx = Math.max(goal, ...sw.last7.map((x) => x.m))
      const spark = <span className="dw-lspark">{sw.last7.map((x, k) => <i key={k} style={{ height: Math.max(2, Math.round((x.m / mx) * 18)), opacity: !x.m ? .25 : k === 6 ? 1 : .6 }} />)}</span>
      return { c: [[days, B], ['DAYS', S], [bar(days / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(), 34)]], r: [[<span style={ROW}><span>{MONS[now.getMonth()]} · {hm(total)}</span><span style={{ fontSize: 9 }}>{days}일 · 달성 {hit}</span></span>], [spark], [<span style={{ ...ROW, fontSize: 8 }}><span>최근 7일</span><span>평균 {hm(sw.avg)}</span></span>]], i: `${MONS[now.getMonth()]} ${hm(total)} · ${days}일` }
    }
    if (kind === '캘린더') {
      const ag = []
      for (let i = 0; i < 14 && ag.length < 6; i++) {
        const x = new Date(); x.setDate(x.getDate() + i); const k = ymdOf(x)
        for (const e of eventsOn(k)) if (!(i === 0 && e.start != null && (e.end ?? e.start + 60) <= nm)) ag.push({ i, s: e.start, title: e.title })
        for (const t of tasks.filter((t) => t.due === k && !t.done && !t.archived && t.dueTime != null)) ag.push({ i, s: t.dueTime, title: '☐ ' + t.title })
      }
      ag.sort((a, b) => a.i - b.i || (a.s ?? -1) - (b.s ?? -1))
      const wd = (i) => ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][(now.getDay() + i) % 7]
      const when = (a) => (a.i === 0 && a.s == null ? '오늘' : (a.i === 0 ? '' : a.i === 1 ? '내일 ' : wd(a.i) + ' ') + (a.s == null ? '종일' : fmtTime(a.s)))
      const nx = ag.find((a) => a.i > 0 || a.s == null || a.s >= nm) || ag[0]
      return { c: nx ? [[nx.s == null ? '종일' : fmtTime(nx.s), { fontSize: 13 }], [nx.title, S], [nx.i ? (nx.i === 1 ? '내일' : wd(nx.i)) : 'TODAY', { fontSize: 6 }]] : [['—', B]], r: ag.length ? ag.slice(0, 3).map((a) => [<span style={ROW}><span className="ellipsis">{a.title}</span><span style={{ fontSize: 8, flexShrink: 0 }}>{when(a)}</span></span>]) : [['다가오는 일정 없음']], i: nx ? (nx.i === 0 && nx.s == null ? '' : '다음 ') + when(nx) + ' ' + nx.title : '다가오는 일정 없음' }
    }
    if (kind === '다짐') { const q = quote || '앱에서 다짐을 적어 보세요'; return { c: [[q, { fontSize: 9, textAlign: 'center', padding: '0 6px', lineHeight: 1.2 }]], r: [[q, { fontSize: 12, whiteSpace: 'normal' }]], i: q } }
    if (kind === '주간') return { c: [[hm(sw.week), { fontSize: 13 }], ['WEEK', S], [bar(sw.week / (goal * 7), 34)]], r: [[<span style={ROW}><span>이번 주 {hm(sw.week)}</span><span style={{ fontSize: 9 }}>하루 {hm(sw.avg)}</span></span>], [<span className="dw-lspark">{sw.last7.map((x, k) => <i key={k} style={{ height: Math.max(2, Math.round((x.m / Math.max(goal, ...sw.last7.map((y) => y.m))) * 18)), opacity: !x.m ? .25 : k === 6 ? 1 : .6 }} />)}</span>]], i: `이번 주 ${hm(sw.week)} · 하루 ${hm(sw.avg)}` }
    if (kind === '과목') return { c: weekSub[0] ? [[weekSub[0].s.name, S], [hm(weekSub[0].m), { fontSize: 14 }], [bar(weekSub[0].m / Math.max(1, sw.week), 34)]] : [['—', B]], r: weekSub.length ? weekSub.slice(0, 3).map((x) => [<span style={ROW}><span>{x.s.name}</span><span style={{ fontSize: 9 }}>{hm(x.m)}</span></span>]) : [['이번 주 공부 기록 없음']], i: weekSub.length ? weekSub.slice(0, 2).map((x) => x.s.name + ' ' + hm(x.m)).join(' · ') : '이번 주 공부 기록 없음' }
    if (kind === '지금') return { c: nC ? [[nCur ? '남음' : '다음', S], [`${Math.max(0, (nCur ? nC.e : nC.s) - nmP)}분`, { fontSize: 13 }], [nC.t, S]] : [['—', B]], r: nC ? [[<span style={{ ...ROW, fontSize: 8 }}><span>{nCur ? '지금' : '다음'}</span><span>{fmtTime(nC.s)}–{fmtTime(nC.e)}</span></span>], [nC.t, { fontSize: 20, fontWeight: 100 }], [`${nCur ? '끝까지' : '시작까지'} ${Math.max(0, (nCur ? nC.e : nC.s) - nmP)}분`, { fontSize: 9 }]] : [['오늘 남은 일정 없음']], i: nCur ? `${nC.t} ~${fmtTime(nC.e)}` : nC ? `다음 ${fmtTime(nC.s)} ${nC.t}` : '남은 일정 없음' }
    if (kind === '진도') return { c: progP[0] ? [[Math.round((progP[0].n / progP[0].of) * 100) + '%', { fontSize: 14 }], [progP[0].t, S], [bar(progP[0].n / progP[0].of, 34)]] : [['—', B]], r: progP.length ? progP.slice(0, 3).flatMap((x) => [[<span style={ROW}><span className="ellipsis">{x.t}</span><span style={{ fontSize: 9 }}>{x.n}/{x.of}{x.u}</span></span>], [bar(x.n / x.of, 136)]]) : [['진행 중인 교재·인강 없음']], i: progP[0] ? `${progP[0].t} ${Math.round((progP[0].n / progP[0].of) * 100)}%` : '진행 중인 교재·인강 없음' }
    if (kind === '목표') return { c: goalsP.length ? [[`${gDone}/${goalsP.length}`, B], ['GOALS', S], [bar(gDone / goalsP.length, 34)]] : [['—', B]], r: goalsP.length ? [[<span style={{ ...ROW, fontSize: 8, letterSpacing: 2 }}><span>THIS WEEK</span><span>{gDone}/{goalsP.length}</span></span>], ...goalsP.slice(0, 3).map((g) => [(g.done ? '✓ ' : '– ') + g.t, g.done ? DIM : null])] : [['이번 주 목표 없음']], i: goalsP.length ? `목표 ${gDone}/${goalsP.length}` + (goalsP.find((g) => !g.done) ? ' · ' + goalsP.find((g) => !g.done).t : ' 완료') : '이번 주 목표 없음' }
    if (kind === '오늘') return { c: [[leftN, B], ['할 일', S], [bar(mins / goal, 34)]], r: [[<span style={{ ...ROW, fontSize: 8 }}><span>{['일', '월', '화', '수', '목', '금', '토'][now.getDay()]} {now.getDate()}</span><span>할 일 {leftN}</span></span>], [nC ? `${fmtTime(nC.s)} ${nC.t}` : '남은 일정 없음'], [<span style={ROW}><span>공부 {hm(mins)} / {hm(goal)}</span><span style={{ fontSize: 9 }}>{pct}%</span></span>], [bar(mins / goal, 136)]], i: `할 일 ${leftN} · 공부 ${hm(mins)}` + (nC ? ` · ${fmtTime(nC.s)} ${nC.t}` : '') }
    if (kind === '대시보드') return { c: [[hm(mins), { fontSize: 14 }], [pct + '%', S], [bar(mins / goal, 34)]], r: [[<span style={{ ...ROW, fontSize: 20, fontWeight: 400 }}><span>{dd ? ddTxt : '—'}</span><span>{hm(mins)}</span></span>], [<span style={{ ...ROW, fontSize: 12, fontWeight: 400 }}><span className="ellipsis">{nC ? `${fmtTime(nC.s)} ${nC.t}` : dd ? dd.title : '남은 일정 없음'}</span><span>{pct}%</span></span>], [bar(mins / goal, 136)]], i: (dd ? `${ddTxt} · ` : '') + (nC ? `${fmtTime(nC.s)} · ` : '') + `공부 ${hm(mins)}` }
    if (kind === '내일') { const rows = [...tmrEv.map((e) => [e.title, e.start == null ? '종일' : fmtTime(e.start)]), ...tmrTk.map((t) => ['– ' + t.title, ''])]; const f = tmrEv[0], c1 = tmrCl[0]
      return { c: [['내일', S], [rows.length, B], ['일정·할 일', { fontSize: 6 }]], r: [[<span style={{ ...ROW, fontSize: 8 }}><span>내일 {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][tmrD.getDay()]}</span><span>{tmrCl.length ? `수업 ${tmrCl.length}교시` : ''}</span></span>], ...(rows.length ? rows.slice(0, 3).map((x) => [<span style={ROW}><span className="ellipsis">{x[0]}</span><span style={{ fontSize: 8, flexShrink: 0 }}>{x[1]}</span></span>]) : [[c1 ? `첫 수업 ${fmtTime(c1.start)} ${c1.title}` : '내일은 비어 있어요']])], i: f ? `내일 ${f.start == null ? '' : fmtTime(f.start) + ' '}${f.title}` : c1 ? `내일 ${fmtTime(c1.start)} ${c1.title}` : tmrTk.length ? `내일 할 일 ${tmrTk.length}개` : '내일은 비어 있어요' } }
    if (kind === '마감') return { c: [[dueL.length, B], ['마감', S], [overN ? overN + ' 지남' : '2주', { fontSize: 6 }]], r: dueL.length ? [...dueL.slice(0, 3).map((t) => [<span style={ROW}><span className="ellipsis">{t.title}</span><span style={{ fontSize: 8, flexShrink: 0 }}>{dueTxt(t)}</span></span>]), ...(dueL.length > 3 ? [[`+ ${dueL.length - 3} more`, { ...DIM, fontSize: 7 }]] : [])] : [['2주 안에 마감 없음']], i: dueL[0] ? `${dueTxt(dueL[0])} ${dueL[0].title}` : '2주 안에 마감 없음' }
    if (kind === '일주일') { const ds = days7.filter((x) => x.ev.length).slice(0, 3), nx = days7.find((x) => x.ev.length)
      return { c: [[ev7, B], ['7 DAYS', S]], r: ds.length ? ds.map((x) => [<span style={ROW}><span className="ellipsis">{dayName(x)}  {x.ev[0].title}</span><span style={{ fontSize: 8, flexShrink: 0 }}>{x.ev.length > 1 ? '+' + (x.ev.length - 1) : x.ev[0].start == null ? '종일' : fmtTime(x.ev[0].start)}</span></span>]) : [['7일 안에 일정 없음']], i: nx ? `${nx.i === 0 ? '' : nx.i === 1 ? '내일 ' : dayName(nx) + ' '}${nx.ev[0].start == null ? '종일' : fmtTime(nx.ev[0].start)} ${nx.ev[0].title}` : '7일 안에 일정 없음' } }
    if (kind === '디데이목록') return { c: dd ? [[ddN === 0 ? 'D' : ddN, B], [dd.title, S]] : [['—', B]], r: ddSorted.length ? ddSorted.slice(0, 3).map((x) => [<span style={ROW}><span className="ellipsis">{x.title}</span><span style={{ fontSize: 9, flexShrink: 0 }}>{ddT(x)}</span></span>]) : [['No D-day']], i: ddSorted.length ? ddSorted.slice(0, 2).map((x) => ddT(x) + ' ' + x.title).join(' · ') : 'No D-day' }
    if (kind === '바로가기') return { c: [['시작', S], [qsub[0]?.name || '공부', { fontSize: 13 }], [bar(mins / goal, 34)]], r: [[<span style={{ ...ROW, fontSize: 8 }}><span>공부 시작</span><span>오늘 {hm(mins)}</span></span>], [qsub[0]?.name || '공부', { fontSize: 20, fontWeight: 100 }], [bar(mins / goal, 136)]], i: `공부 시작 · ${qsub[0]?.name || ''} · 오늘 ${hm(mins)}` }
    if (kind === '시간표') {
      const cls = classesOn(d), cur = cls.find((c) => c.start <= nm && c.end > nm), next = cls.find((c) => c.start > nm), c = cur || next
      const after = c ? cls.filter((x) => x.start > c.start).slice(0, 3).map((x) => x.title).join(' · ') : ''
      return { c: c ? [[c.period + '교시', S], [c.title, { fontSize: 13 }], [cur ? '~' + fmtTime(c.end) : fmtTime(c.start), S]] : [[cls.length ? '끝' : '—', B]], r: [[<span style={{ ...ROW, fontSize: 8 }}><span>{cur ? `지금 ${cur.period}교시` : next ? `다음 ${next.period}교시` : '시간표'}</span><span>{c ? `${fmtTime(c.start)}–${fmtTime(c.end)}` : ''}</span></span>], [c ? c.title : cls.length ? '오늘 수업 끝' : '오늘 수업 없음', { fontSize: 20, fontWeight: 100 }], [c?.room ? c.room + (after ? ' · ' + after : '') : after, { fontSize: 10 }]], i: c ? (cur ? `${c.period}교시 ${c.title} ~${fmtTime(c.end)}` : `다음 ${c.period}교시 ${c.title} ${fmtTime(c.start)}`) : cls.length ? '오늘 수업 끝' : '오늘 수업 없음' }
    }
    if (kind === '묶음') return { c: [[dd ? (ddN === 0 ? 'D' : ddN) : '—', B], [nxP ? nxP.w : 'D-DAY', S]], r: [[<span style={ROW}><span className="ellipsis">{dd ? dd.title : 'No D-day'}</span><span style={{ fontSize: 15 }}>{ddTxt || ''}</span></span>], [<span style={ROW}><span className="ellipsis">{nxP ? nxP.t : '다가오는 일정 없음'}</span><span>{nxP ? nxP.w : ''}</span></span>]], i: (dd ? ddTxt + ' ' + dd.title : 'No D-day') + (nxP ? ' · ' + nxP.w + ' ' + nxP.t : '') }
    if (kind === '시리즈') { const x = seriesSummary(tasks, subjects, st.seriesColors || {})[0]; return { c: x ? [[`${x.d}/${x.n}`, { fontSize: 13 }], [x.t, S], [bar(x.d / (x.n || 1), 34)]] : [['—', B]], r: x ? [[<span style={ROW}><span className="ellipsis">{x.t}</span><span style={{ fontSize: 9 }}>{x.d}/{x.n}</span></span>], [bar(x.d / (x.n || 1), 136)], [x.next ? '다음 ' + x.next.title : '', { fontSize: 10 }]] : [['진행 중인 시리즈 없음']], i: x ? `${x.t} ${x.d}/${x.n}` : '진행 중인 시리즈 없음' } }
    return { c: [[hm(mins), { fontSize: 14 }], [pct + '%', S], [bar(mins / goal, 34)]], r: [[<><b>{hm(mins)}</b> / {hm(goal)}<span className="grow" />{ddTxt}</>], [bar(mins / goal, 136)], [todo[0] ? '– ' + todo[0].title : dd?.title || 'All clear.']], i: hm(mins) + (dd ? ` · ${ddTxt} ${dd.title}` : '') }
  }
  V['진행'] = V['공부']; V['남은분'] = V['지금']
  // 10분 플래너 · 하루 진행 · 한 줄 요약 · 한 주 공책 (위젯과 같은 배치를 간단히)
  const tenRows = (n) => <div className="col" style={{ gap: 0, flex: 1 }}>{Array.from({ length: n }, (_, i) => <div key={i} className="row" style={{ gap: 2, flexWrap: 'nowrap', borderBottom: '0.5px solid var(--dw-rule, rgba(0,0,0,.12))', padding: '2px 0', alignItems: 'center' }}><span style={{ fontSize: 7, width: 12, opacity: .55 }}>{i + 9}</span>{Array.from({ length: 6 }, (_, k) => <i key={k} style={{ flex: 1, height: 5, borderRadius: 1.5, background: (i === 0 && k > 1) || (i === 1 && k < 3) ? 'rgba(102,119,143,.6)' : 'transparent' }} />)}</div>)}</div>
  V['10분'] = [M(<>{hdr('10 MIN', hm(mins))}{tenRows(7)}</>), M(<>{hdr('10 MIN', hm(mins))}<div className="row" style={{ gap: 10, flexWrap: 'nowrap', flex: 1 }}>{tenRows(6)}{tenRows(6)}</div></>), M(<>{hdr('10 MIN', hm(mins))}<div className="row" style={{ gap: 10, flexWrap: 'nowrap', flex: 1 }}>{tenRows(9)}{tenRows(9)}</div></>)]
  const dayR = Math.max(0, Math.min(1, (new Date().getHours() * 60 + new Date().getMinutes() - (st.dayStart ?? 420)) / Math.max(60, (st.dayEnd ?? 1440) - (st.dayStart ?? 420))))
  V['하루'] = [0, 1, 2].map((i) => M(<>{hdr('TODAY', Math.round(dayR * 100) + '% 지남')}<div className="grow" /><div className="dw-big"><span style={{ fontSize: 30 }}>{hm(Math.max(0, (st.dayEnd ?? 1440) - new Date().getHours() * 60 - new Date().getMinutes()))}</span> <span className="dw-soft">남음</span></div>{bar(dayR, '100%')}<div className="row between dw-soft" style={{ fontSize: 8 }}><span>기상</span><span>공부 {hm(mins)}</span><span>취침</span></div>{i > 0 && <div className="dw-soft" style={{ marginTop: 8 }}>다음 일정</div>}</>))
  V['한줄'] = [15, 19, 24].map((sz) => M(<><div className="dw-cap">{dateStr}</div><div className="grow" /><div style={{ fontSize: sz, lineHeight: 1.4 }}>오늘 {hm(mins)} 공부했고, 할 일이 남았어요</div><div className="grow" /></>))
  V['공책'] = [0, 1, 2].map((i) => M(<div className="row" style={{ gap: 4, flexWrap: 'wrap', flex: 1, alignContent: 'stretch' }}>{['월', '화', '수', '목', '금', '토', '일'].map((d) => <div key={d} style={{ flex: i === 2 ? '1 1 45%' : '1 1 12%', minHeight: i === 2 ? 46 : 0, border: '0.5px solid var(--dw-rule, rgba(0,0,0,.15))', borderRadius: 4, padding: 3, fontSize: 8 }}>{d}</div>)}</div>))
  // 숫자만 · 선 그래프 · 원호 · 종이 메모 · 인쇄 · 반반 · 큰 수 · 세 단 · 자동 · 묶음 (위젯과 같은 배치를 간단히)
  const bigV = (v, c2) => [48, 60, 96].map((sz) => M(<><div className="dw-cap">{dateStr}</div><div className="grow" /><div style={{ fontSize: sz, fontWeight: 100, lineHeight: 1 }}>{v}</div><div className="dw-soft" style={{ fontSize: 11, marginTop: 4 }}>{c2}</div><div className="grow" /></>))
  V['숫자'] = bigV(hm(mins), `오늘 공부 · ${pct}%`)
  V['숫자:디데이'] = bigV(dd ? ddTxt : '—', dd ? dd.title : 'No D-day')
  V['숫자:할일'] = bigV(String(leftN), leftN ? `남은 할 일 · ${done}개 완료` : '오늘 할 일 끝')
  V['숫자:주간'] = bigV(hm(sw.week), `이번 주 공부 · 하루 ${hm(sw.avg)}`)
  const sparkSvg = (h) => { const v = sw.last7.map((x) => x.m), mx = Math.max(goal, ...v) * 1.08, y = (m) => 4 + (h - 8) * (1 - m / mx); return <svg viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h, display: 'block' }}><line x1="0" x2="100" y1={y(goal)} y2={y(goal)} stroke="var(--gold)" strokeOpacity=".35" strokeDasharray="3 3" strokeWidth=".6" vectorEffect="non-scaling-stroke" /><polyline points={v.map((m, i) => `${(i / 6) * 100},${y(m)}`).join(' ')} fill="none" stroke="var(--gold)" strokeWidth="1.3" vectorEffect="non-scaling-stroke" /></svg> }
  V['선그래프'] = [50, 60, 200].map((h) => M(<>{hdr('7 DAYS', '평균 ' + hm(sw.avg))}<div className="dw-big"><span style={{ fontSize: 26 }}>{hm(mins)}</span><span className="dw-soft">오늘</span></div><div className="grow" />{sparkSvg(h)}</>))
  const arcR = Math.min(1, mins / goal), arcA = Math.PI * (1 + arcR)
  const arcP = (wd, sz) => <div style={{ position: 'relative', width: wd, margin: '0 auto' }}><svg viewBox="0 0 100 54" style={{ width: '100%', display: 'block' }}><path d="M4,50 A46,46 0 0 1 96,50" fill="none" stroke="var(--gold)" strokeOpacity=".2" strokeWidth="2.5" />{arcR > 0.02 && <path d={`M4,50 A46,46 0 0 1 ${50 + 46 * Math.cos(arcA)},${50 + 46 * Math.sin(arcA)}`} fill="none" stroke="var(--gold)" strokeWidth="2.5" />}</svg><div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, textAlign: 'center' }}><div style={{ fontSize: sz, fontWeight: 100, lineHeight: 1 }}>{hm(mins)}</div><div className="dw-gold" style={{ fontSize: 8 }}>{pct}% · {hm(goal)}</div></div></div>
  V['원호'] = [
    M(<>{hdr('TODAY', '')}<div className="grow" />{arcP('100%', 20)}<div className="grow" /></>),
    <><div className="col" style={{ width: '48%', flexShrink: 0, justifyContent: 'center' }}>{arcP('100%', 22)}</div><div className="dw-vr" /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>{hdr('TODAY', dateStr)}{subBars(3)}</div></>,
    M(<>{hdr('TODAY', dateStr)}<div className="grow" />{arcP('80%', 38)}<div className="grow" /><div className="dw-hr" />{subBars(4)}</>),
  ]
  const memoP = (fs, n) => { const lh = Math.round(fs * 1.75), rows = [n0 ? n0.t : '노트가 없어요', ...(n0?.l || []).map((l) => (nMark(l) ? nMark(l) + ' ' : '') + l.x)].slice(0, n); return <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: `repeating-linear-gradient(to bottom, transparent 0 ${lh - 1}px, rgba(143,160,187,.32) ${lh - 1}px ${lh}px) 0 17px / 100% 100% no-repeat #fbfbf9`, color: '#2a2f38', padding: '17px 18px', overflow: 'hidden' }}><i style={{ position: 'absolute', left: 11, top: 0, bottom: 0, width: 0.6, background: 'rgba(214,163,176,.55)' }} />{rows.map((x, i) => <div key={i} className="ellipsis" style={{ height: lh, lineHeight: lh + 'px', fontSize: fs, fontWeight: i === 0 ? 500 : 300 }}>{x}</div>)}</div> }
  V['메모지'] = [memoP(11, 7), memoP(12.5, 6), memoP(12.5, 16)]
  const tblP = (rows, cols, fs, head) => <div style={{ border: '0.7px solid currentColor' }}>{rows.map((r, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: cols, borderTop: i ? '0.7px solid currentColor' : 0 }}>{r.map((x, j) => { const lab = (head && !i) || (!head && !j); return <span key={j} className={'ellipsis' + (lab ? ' dw-soft' : '')} style={{ padding: '4px 6px', borderLeft: j ? '0.7px solid currentColor' : 0, fontSize: lab ? 8 : fs }}>{x}</span> })}</div>)}</div>
  const pRows = [['STUDY', `${hm(mins)} / ${hm(goal)}  ${pct}%`], ['D-DAY', dd ? `${ddTxt}  ${dd.title}` : '—'], ['NEXT', nC ? `${fmtTime(nC.s)}  ${nC.t}` : '—'], ['TO DO', `${leftN} 남음 · ${done} 완료`]], pHd = hdr('DAILY SHEET', `${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()]} ${now.getMonth() + 1}.${String(now.getDate()).padStart(2, '0')}`)
  V['인쇄'] = [M(<>{pHd}{tblP([['STUDY', `${hm(mins)} · ${pct}%`], ['D-DAY', dd ? ddTxt : '—'], ['TO DO', `${leftN} 남음`]], '44px 1fr', 10.5)}</>), M(<>{pHd}{tblP(pRows, '54px 1fr', 12)}</>), M(<>{pHd}{tblP(pRows, '54px 1fr', 12)}<div style={{ height: 12 }} />{tblP([['NO', 'TO DO', 'DONE'], ...items.slice(0, 8).map((t, i) => [i + 1, t.title, t.done ? '✓' : ''])], '32px 1fr 44px', 11.5, true)}</>)]
  const tdRows = (n, fs) => <>{items.slice(0, n).map((t) => <div key={t.id} className={'dw-todo' + (t.done ? ' dw-soft' : '')} style={{ fontSize: fs }}><span className={t.priority >= 3 ? 'dw-gold' : 'dw-soft'}>{t.done ? '✓' : t.priority >= 3 ? '•' : '–'}</span><span className="ellipsis" style={t.done ? { textDecoration: 'line-through' } : null}>{t.title}</span></div>)}{!items.length && <div className="dw-soft">All clear.</div>}</>
  const nColP = (k, fs) => <><div className="ellipsis" style={{ fontSize: fs + 1, marginBottom: 4 }}>{n0 ? n0.t : '노트가 없어요'}</div>{nLines(k, fs)}</>
  const halfP = (k, n) => <><div className="col" style={{ gap: 0, flex: 1, minWidth: 0, overflow: 'hidden' }}>{nColP(k, 11)}</div><div className="dw-vr" /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>{hdr('TO DO', `${done}/${items.length}`)}{tdRows(n, 12.5)}</div></>
  V['반반'] = [M(<><div style={{ overflow: 'hidden', flex: '0 0 50%' }}>{nColP(2, 10)}</div><div className="dw-hr" style={{ margin: '5px 0' }} />{hdr('TO DO', `${done}/${items.length}`)}{tdRows(2, 11.5)}</>), halfP(5, 4), halfP(16, 12)]
  V['큰수'] = [[34, 2], [38, 2], [64, 7]].map(([sz, n]) => M(<>{hdr('TODAY', dateStr)}<div className="dw-big"><span style={{ fontSize: sz }}>{hm(mins)}</span><span className="grow" /><span className="dw-gold">{pct}%</span></div><div className="dw-line"><i style={{ width: pct + '%' }} /></div><div style={{ height: 10 }} />{list(n)}</>))
  const col3 = (k, right, body) => <div className="col" style={{ gap: 0, flex: 1, minWidth: 0, overflow: 'hidden' }}>{hdr(k, right)}{body}</div>
  const threeP = (n, fs) => <>{col3('PLAN', '', <>{agP.slice(0, n).map(({ i, x, e }, k) => <div key={k} style={{ marginBottom: 4 }}><div className="dw-gold" style={{ fontSize: 8 }}>{i === 0 ? '' : i === 1 ? '내일 ' : '일월화수목금토'[x.getDay()] + ' '}{e.start == null ? '종일' : fmtTime(e.start)}</div><div className="ellipsis" style={{ fontSize: fs }}>{e.title}</div></div>)}{!agP.length && <span className="dw-soft">일정 없음</span>}</>)}<div className="dw-vr" />{col3('TO DO', `${done}/${items.length}`, tdRows(n + 1, fs))}<div className="dw-vr" />{col3('NOTE', '', <><div className="ellipsis" style={{ fontSize: fs + 0.5, marginBottom: 3 }}>{n0 ? n0.t : '노트가 없어요'}</div>{nLines(n * 2, fs - 0.5)}</>)}</>
  V['세단'] = [M(<>{[['NEXT', agP[0] ? agP[0].e.title : '일정 없음'], ['TO DO', items.find((t) => !t.done)?.title || 'All clear.'], ['NOTE', n0 ? n0.t : '노트 없음']].map(([k, v]) => <div key={k} style={{ flex: 1 }}><div className="dw-cap">{k}</div><div className="ellipsis" style={{ fontSize: 12 }}>{v}</div></div>)}</>), threeP(2, 10), threeP(6, 11.5)]
  const hrNow = now.getHours(), autoK = hrNow >= 5 && hrNow < 12 ? '오늘' : hrNow >= 12 && hrNow < 20 ? '공부' : '내일'
  V['자동'] = V[autoK] || V['']
  const nxP = nC ? { t: nC.t, w: nCur ? '지금 ~' + fmtTime(nC.e) : fmtTime(nC.s) } : agP[0] ? { t: agP[0].e.title, w: (agP[0].i === 1 ? '내일 ' : agP[0].i ? '일월화수목금토'[agP[0].x.getDay()] + ' ' : '') + (agP[0].e.start == null ? '종일' : fmtTime(agP[0].e.start)) } : null
  V['묶음'] = [0, 1, 2].map((i) => M(<><div className="dw-cap">D-DAY</div><div className="row" style={{ gap: 8, alignItems: 'baseline', flexWrap: 'nowrap' }}><span style={{ fontSize: i ? 36 : 30, fontWeight: 100 }}>{dd ? ddTxt : '—'}</span>{i > 0 && dd && <span className="dw-gold ellipsis" style={{ fontSize: 13 }}>{dd.title}</span>}</div>{!i && dd && <div className="dw-gold ellipsis" style={{ fontSize: 11 }}>{dd.title}</div>}<div className="grow" /><div className="dw-hr" /><div className="grow" /><div className="dw-cap">NEXT</div><div className="ellipsis" style={{ fontSize: i ? 16 : 13 }}>{nxP ? nxP.t : '다가오는 일정 없음'}</div>{nxP && <div className="dw-gold" style={{ fontSize: 9 }}>{nxP.w}</div>}{i === 2 && <><div className="grow" /><div className="dw-hr" />{ddSorted.slice(1, 5).map((x) => <div key={x.id} className="row between" style={{ fontSize: 12 }}><span className="ellipsis">{x.title}</span><span className="dw-gold">{ddT(x)}</span></div>)}</>}</>))
  V['달력:과목'] = V['달력']
  const hRowP = (x, i, dots) => <div key={i} className="row" style={{ gap: 7, flexWrap: 'nowrap', alignItems: 'center', marginBottom: 7, fontSize: 11.5 }}><i style={{ width: 11, height: 11, borderRadius: 6, border: '1px solid ' + (x.on ? (x.c || 'var(--gold)') : 'var(--soft)'), background: x.on ? (x.c || 'var(--gold)') : 'transparent', flexShrink: 0 }} /><span className="ellipsis grow" style={{ opacity: x.on ? 0.55 : 1 }}>{x.t}</span>{dots && <span className="row" style={{ gap: 3, flexWrap: 'nowrap', flexShrink: 0 }}>{x.w.map((v, k) => <i key={k} style={{ width: 4, height: 4, borderRadius: 2, background: v ? (x.c || 'var(--gold)') : 'var(--rule)' }} />)}</span>}</div>
  const hsP = habW(), hOn = hsP.filter((x) => x.on).length, hHead = hdr('HABITS', hsP.length ? `${hOn}/${hsP.length}` : '')
  V['습관'] = [
    M(<>{hHead}{hsP.slice(0, 4).map((x, i) => hRowP(x, i, false))}{!hsP.length && <span className="dw-soft">앱에서 습관을 추가해 보세요</span>}</>),
    M(<>{hHead}{hsP.length > 4 ? <div className="row" style={{ gap: 12, flexWrap: 'nowrap', alignItems: 'flex-start' }}><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>{hsP.slice(0, 4).map((x, i) => hRowP(x, i, true))}</div><div className="dw-vr" style={{ alignSelf: 'stretch' }} /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>{hsP.slice(4, 8).map((x, i) => hRowP(x, i, true))}</div></div> : hsP.map((x, i) => hRowP(x, i, true))}</>),
    M(<>{hHead}{hsP.slice(0, 10).map((x, i) => hRowP(x, i, true))}</>),
  ]
  V['노트'] = [
    M(<div style={{ overflow: 'hidden', height: '100%' }}>{nHead(10.5)}{nLines(6, 10.5)}</div>),
    M(<div style={{ overflow: 'hidden', height: '100%' }}>{nHead(11)}<div className="row" style={{ gap: 12, flexWrap: 'nowrap', alignItems: 'flex-start' }}><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>{nLines(4, 11)}</div>{(n0?.l || []).length > 4 && <><div className="dw-vr" style={{ alignSelf: 'stretch' }} /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>{nLines(4, 11, 4)}</div></>}</div></div>),
    M(<div style={{ overflow: 'hidden', height: '100%' }}>{nHead(12)}{nLines(16, 12)}</div>),
  ]
  // 내 위젯 1~3 미리보기 (설정 › 내 위젯 구성과 같음)
  for (let i = 0; i < 3; i++) {
    const cw = (st.customWidgets || [])[i] || {}, rows = cw.layout === 'rows', ttl = cw.name || '내 위젯 ' + (i + 1)
    const ks = (cw.blocks || []).filter((k, j, a) => TLp[k] && a.indexOf(k) === j); if (!ks.length) ks.push('date', 'study', 'next', 'todo')
    const wideK = new Set(cw.wide || []), bigK = new Set(cw.big || []), T = (n) => ks.slice(0, n).map((k) => { const x = [...TLp[k]]; x.big = bigK.has(k); x.wide = wideK.has(k) || x.big; return x })
    const half = Math.ceil(Math.min(4, ks.length) / 2), ks4 = ks.slice(0, 4), oth = ks4.filter((k) => k !== 'todo')
    V['구성' + (i + 1)] = rows ? [
      M(dCol(ks.slice(0, 3))),
      <><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>{hdr(ttl, '')}{dCol(ks4.slice(0, half))}</div><div className="dw-vr" /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>{hdr('', dateStr)}{dCol(ks4.slice(half))}</div></>,
      M(<>{hdr(ttl, dateStr)}{dCol(ks.slice(0, 6))}</>),
    ] : [
      M(<><div className="grow" />{tileGrid(2, 19, false, T(4))}<div className="grow" /></>),
      ks4.includes('todo')
        ? <><div className="col" style={{ gap: 0, width: '45%', flexShrink: 0, minWidth: 0 }}>{dCol(oth.slice(0, oth.slice(0, 3).some(dGraph) ? 2 : 3))}</div><div className="dw-vr" /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>{dLine('todo')}</div></>
        : <><div className="col" style={{ gap: 0, width: '45%', flexShrink: 0, minWidth: 0 }}>{dCol(oth.slice(0, 2))}</div><div className="dw-vr" /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>{dCol(oth.slice(2, 4))}</div></>,
      M(<>{hdr(ttl, dateStr)}{tileGrid(2, 36, false, T(6))}</>),
    ]
  }
  // 타이머·공부 시간 (미리보기는 타이머가 안 도는 상태 기준)
  const qs0 = qsub[0]
  const tmB = (sz) => <>{hdr('STUDY', pct + '%')}<div className="dw-big"><span style={{ fontSize: sz }}>{hm(mins)}</span><span className="dw-soft">/ {hm(goal)}</span></div><div className="dw-line"><i style={{ width: pct + '%' }} /></div><div className="dw-gold" style={{ marginTop: 5, fontSize: 11 }}>▶ {qs0 ? qs0.name + ' 시작' : '공부 시작'}</div></>
  const subL = (n) => <>{subMins.slice(0, n).map((x) => pRow(x.s.name, hm(x.m), x.m / (subMins[0].m || 1), x.s.color))}{!subMins.length && <div className="dw-soft">오늘 기록이 없어요</div>}</>
  V['타이머'] = [
    M(<><div className="dw-cap">{dateStr}</div><div className="grow" />{tmB(30)}</>),
    <><div className="col" style={{ gap: 0, width: '50%', flexShrink: 0, minWidth: 0 }}><div className="dw-cap">{dateStr}</div><div className="grow" />{tmB(30)}</div><div className="dw-vr" /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>{hdr('TODAY', '')}{subL(4)}</div></>,
    M(<>{hdr('TODAY', dateStr)}{tmB(46)}<div className="dw-hr" />{hdr('SUBJECTS', '이번 주 ' + hm(sw.week))}{subL(4)}<div className="grow" /><div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>{qsub.slice(0, 4).map((x) => btn(x.name, x.id, x.color))}</div></>),
  ]
  // 시리즈 진행 · 이번 주 배치 · D-day까지 주차 (위젯 스크립트와 같은 계산)
  const srs = seriesSummary(tasks, subjects, st.seriesColors || {})
  const srRow = (x, big) => <div key={x.id} style={{ marginBottom: big ? 9 : 7 }}><div className="row between" style={{ fontSize: 12, flexWrap: 'nowrap', gap: 6 }}><span className="ellipsis">{x.t}</span><span className={x.d >= x.n ? 'dw-gold' : 'dw-soft'} style={{ fontSize: 11 }}>{x.d}/{x.n}</span></div><div className="dw-line" style={{ marginTop: 3 }}><i style={{ width: (x.d / (x.n || 1)) * 100 + '%', background: x.color || null }} /></div>{big && x.next && <div className="dw-soft" style={{ fontSize: 9, marginTop: 2 }}>다음 {x.next.title}</div>}</div>
  const srNone = <span className="dw-soft" style={{ fontSize: 12 }}>진행 중인 시리즈가 없어요</span>
  V['시리즈'] = [
    M(<>{hdr('SERIES', '')}{srs[0] ? <><div className="ellipsis" style={{ fontSize: 12 }}>{srs[0].t}</div><div className="dw-big"><span style={{ fontSize: 30 }}>{srs[0].d}</span><span className="dw-soft">/ {srs[0].n}</span></div><div className="dw-line"><i style={{ width: (srs[0].d / (srs[0].n || 1)) * 100 + '%', background: srs[0].color || null }} /></div>{srs[0].next && <div className="dw-soft ellipsis" style={{ fontSize: 10, marginTop: 6 }}>다음 {srs[0].next.title}</div>}</> : srNone}</>),
    M(<>{hdr('SERIES', dateStr)}{srs.length ? srs.slice(0, 3).map((x) => srRow(x)) : srNone}</>),
    M(<>{hdr('SERIES', dateStr)}{srs.length ? srs.slice(0, 7).map((x) => srRow(x, true)) : srNone}</>),
  ]
  const wks = (st.weekStart ?? 1) % 7, bw0 = new Date(d + 'T12:00:00'); bw0.setDate(bw0.getDate() - ((bw0.getDay() - wks + 7) % 7))
  const bwDays = Array.from({ length: 7 }, (_, i) => { const x = new Date(bw0); x.setDate(x.getDate() + i); return ymdOf(x) })
  const bwOf = (k) => tasks.filter((t) => t.due === k && !t.archived && !t.deleted)
  const bwLeft = bwDays.reduce((a, k) => a + bwOf(k).filter((t) => !t.done).length, 0)
  const dotI = (t, i) => <i key={i} style={{ width: 6, height: 6, borderRadius: 3, flexShrink: 0, background: t.done ? 'var(--gold)' : 'transparent', border: t.done ? 0 : '1px solid var(--soft)', boxSizing: 'border-box' }} />
  const WDN = ['일', '월', '화', '수', '목', '금', '토']
  const bwCols = (max, nums) => <div className="row" style={{ flexWrap: 'nowrap', gap: 0, alignItems: 'flex-start' }}>{bwDays.map((k) => { const l = bwOf(k); return <div key={k} className="col" style={{ flex: 1, alignItems: 'center', gap: 4 }}><span className={k === d ? '' : 'dw-soft'} style={{ fontSize: 10, fontWeight: k === d ? 500 : undefined }}>{WDN[new Date(k + 'T12:00:00').getDay()]}</span>{nums && <span className="dw-soft" style={{ fontSize: 9 }}>{+k.slice(8)}</span>}{l.slice(0, max).map(dotI)}{l.length > max && <span className="dw-soft" style={{ fontSize: 7 }}>+{l.length - max}</span>}</div> })}</div>
  const tdLeft = bwOf(d).filter((t) => !t.done)
  V['배치'] = [
    M(<>{hdr('THIS WEEK', '남은 ' + bwLeft)}{bwCols(5, false)}</>),
    M(<>{hdr('THIS WEEK', '남은 ' + bwLeft)}{bwCols(4, true)}<div className="grow" /><div className="dw-soft ellipsis" style={{ fontSize: 10 }}>{tdLeft.length ? '오늘 · ' + tdLeft[0].title + (tdLeft.length > 1 ? ` 외 ${tdLeft.length - 1}개` : '') : '오늘 남은 할 일 없음'}</div></>),
    M(<>{hdr('THIS WEEK', '남은 ' + bwLeft)}{bwDays.map((k) => { const l = bwOf(k), nx = l.filter((t) => !t.done).map((t) => t.title).slice(0, 2).join(' · '); return <div key={k} className="row" style={{ gap: 8, flexWrap: 'nowrap', alignItems: 'center', marginBottom: 9, fontSize: 11 }}><span className={k === d ? '' : 'dw-soft'} style={{ width: 34, flexShrink: 0, fontWeight: k === d ? 500 : undefined }}>{WDN[new Date(k + 'T12:00:00').getDay()]} {+k.slice(8)}</span><span className="row" style={{ gap: 2, flexWrap: 'nowrap', flexShrink: 0 }}>{l.slice(0, 8).map(dotI)}</span><span className={'ellipsis' + (nx ? '' : ' dw-soft')} style={{ fontSize: 10 }}>{nx || (l.length ? '다 했어요' : '')}</span></div> })}</>),
  ]
  const wkDd = ddays.filter((x) => x.date >= d).sort((a, b) => b.date.localeCompare(a.date))[0]
  const wkInfo = (() => {
    if (!wkDd) return null
    const cur = ymdOf(bw0), e0 = new Date(wkDd.date + 'T12:00:00'); e0.setDate(e0.getDate() - ((e0.getDay() - wks + 7) % 7)); const end = ymdOf(e0)
    const wGoal = +st.goalWeekly || goal * 7, weeks = []
    const s0 = new Date(bw0); s0.setDate(s0.getDate() - 56)
    for (const x = new Date(s0); ymdOf(x) <= end && weeks.length < 80; x.setDate(x.getDate() + 7)) {
      const k = ymdOf(x), e = new Date(x); e.setDate(e.getDate() + 6); const ke = ymdOf(e)
      const m = k <= cur ? sessions.filter((y) => y.date >= k && y.date <= ke).reduce((a, y) => a + y.dur, 0) : 0
      weeks.push({ k, r: Math.min(1, m / wGoal), m, now: k === cur, fut: k > cur, end: k === end })
    }
    const first = weeks.findIndex((x) => x.m > 0 || x.now), left = Math.max(0, Math.round((new Date(wkDd.date + 'T12:00:00') - new Date(d + 'T12:00:00')) / 864e5))
    return { weeks: weeks.slice(Math.max(0, first)), lw: Math.floor(left / 7), ld: left % 7 }
  })()
  const sq = (z) => <div className="row" style={{ gap: 3, flexWrap: 'wrap' }}>{wkInfo.weeks.map((x) => <i key={x.k} style={{ width: z, height: z, borderRadius: 2, boxSizing: 'border-box', background: x.fut ? 'transparent' : x.m ? `color-mix(in srgb, var(--gold) ${Math.round(25 + 75 * x.r)}%, transparent)` : 'var(--rule)', border: x.fut ? '1px solid var(--rule)' : x.now ? '1px solid var(--ink)' : 0, outline: x.end ? '1px solid var(--gold)' : 0 }} />)}</div>
  const wkBody = (z, big) => wkInfo ? <><div className="dw-big"><span style={{ fontSize: big }}>{wkInfo.lw}</span><span className="dw-soft">주</span><span style={{ fontSize: big * 0.72, marginLeft: 4 }}>{wkInfo.ld}</span><span className="dw-soft">일</span></div><div style={{ height: 8 }} />{sq(z)}</> : <span className="dw-soft" style={{ fontSize: 12 }}>D-day를 추가해 주세요</span>
  V['주차'] = [M(<>{hdr('WEEKS', wkDd?.title || '')}{wkBody(10, 30)}</>), M(<>{hdr('WEEKS', wkDd?.title || '')}{wkBody(11, 36)}</>), M(<>{hdr('WEEKS', wkDd?.title || '')}{wkBody(16, 36)}</>)]
  // 노트 표 · 노트 보드 · 노트 사진 (위젯 스크립트와 같은 데이터)
  const tbW = tablesForWidget(getState())[0], bdW = boardsForWidget(getState())[0]
  const none = (s) => <span className="dw-soft" style={{ fontSize: 12 }}>{s}</span>
  const tblV = (nr, nc, fs) => !tbW ? none('노트에 표를 만들어 주세요') : <div className="col" style={{ gap: 0 }}>{tbW.r.slice(0, nr).map((r, i, a) => <div key={i} className="row" style={{ flexWrap: 'nowrap', gap: 6, padding: '3px 0', borderBottom: i < a.length - 1 ? 'var(--dw-rw, .6px) solid var(--rule)' : 0, fontSize: i === 0 && tbW.h ? fs - 2 : fs, color: i === 0 && tbW.h ? 'var(--soft)' : undefined }}>{Array.from({ length: Math.min(nc, r.length) }, (_, j) => <span key={j} className="ellipsis" style={{ flex: 1, minWidth: 0 }}>{r[j]}</span>)}</div>)}</div>
  V['표'] = [M(<>{hdr('TABLE', tbW?.t || '')}{tblV(4, 2, 11)}</>), M(<>{hdr('TABLE', tbW?.t || '')}{tblV(4, 4, 11)}</>), M(<>{hdr('TABLE', tbW?.t || '')}{tblV(10, 4, 12)}</>)]
  const bdV = (nc, nr) => !bdW ? none('노트에 보드를 만들어 주세요') : <div className="row" style={{ gap: 10, flexWrap: 'nowrap', alignItems: 'flex-start' }}>{bdW.c.slice(0, nc).map((c, i) => <div key={i} className="col" style={{ flex: 1, minWidth: 0, gap: 4 }}><div className="row between dw-soft" style={{ fontSize: 9, flexWrap: 'nowrap' }}><span className="ellipsis">{c.n}</span><span>{c.k}</span></div>{c.x.slice(0, nr).map((x, k) => <div key={k} className="ellipsis" style={{ fontSize: 11, lineHeight: 1.35 }}>{x}</div>)}{c.k > nr && <span className="dw-soft" style={{ fontSize: 8 }}>+{c.k - nr}</span>}</div>)}</div>
  V['보드'] = [
    M(<>{hdr('BOARD', bdW?.t || '')}{!bdW ? none('노트에 보드를 만들어 주세요') : bdW.c.slice(0, 3).map((c, i) => <div key={i} className="row between" style={{ fontSize: 12, marginBottom: 5, flexWrap: 'nowrap' }}><span className="ellipsis">{c.n}</span><span style={{ fontSize: 20, fontWeight: 200 }}>{c.k}</span></div>)}</>),
    M(<>{hdr('BOARD', bdW?.t || '')}{bdV(3, 3)}</>),
    M(<>{hdr('BOARD', bdW?.t || '')}{bdV(4, 8)}</>),
  ]
  const phV = !phW ? M(none('노트에 사진을 넣어 주세요')) : <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: phUrl ? `url(${phUrl}) center / cover` : 'var(--rule)', display: 'flex', alignItems: 'flex-end', padding: 12 }}><span style={{ fontSize: 10, color: '#fff', background: 'rgba(27,29,34,.42)', borderRadius: 7, padding: '3px 8px' }}>{phW.t}</span></div>
  V['사진'] = [phV, phV, phV]
  const L = kind === '타이머' ? Lfor('공부') : kind === '진행' ? { ...Lfor('공부'), c: [[pct + '%', B], [`공부 ${hm(mins)}`, S], [bar(mins / goal, 34)]] }
    : kind === '남은분' ? { ...Lfor('지금'), c: nC ? [[nCur ? '끝까지' : '시작까지', S], [`${Math.max(0, (nCur ? nC.e : nC.s) - nmP)}분`, { fontSize: 15 }], [nC.t, S]] : [['—', B]] }
    : Lfor({ '숫자:디데이': '디데이', '숫자:할일': '할일', '숫자:주간': '주간', '선그래프': '주간', '메모지': '노트', '인쇄': '오늘', '반반': '오늘', '세단': '오늘', '자동': autoK, '달력:과목': '달력' }[kind] || kind)
  const [vs, vm, vl] = V[kind] || V[''] // 미리보기가 없는 형태도 화면이 멈추지 않게
  return (
    <>
      <div className="scroll-x" style={{ marginBottom: 6 }}><div className="row" style={{ gap: 6 }}>
        {WIDGET_KINDS.map(([k, l]) => <button key={k} className={'chip' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>{l}</button>)}
      </div></div>
      <div className="tiny muted">{kind ? <>위젯 편집 › Parameter 에 <b>{kind}</b> 입력</> : '위젯 편집 › Parameter 를 비워 두면 기본 형태'}</div>
      <div className="dw-row">
        <div className="dw dw-s" style={{ ...ff, ...WTH }}><div className="dw-in">{vs}</div></div>
        <div className="dw dw-m" style={{ ...ff, ...WTH }}><div className="dw-in">{vm}</div></div>
        <div className="dw dw-l" style={{ ...ff, ...WTH }}><div className="dw-in">{vl}</div></div>
      </div>
      <div className="tiny muted" style={{ marginTop: 8 }}>잠금 화면 · 원형 · 직사각형 · 한 줄 (Parameter 같음, 아이폰·아이패드 공통)</div>
      <div className="dw-lock" style={ff}>
        <div className="dw-li">{['일', '월', '화', '수', '목', '금', '토'][now.getDay()]} {now.getMonth() + 1}월 {now.getDate()}일 · {L.i}</div>
        <div className="dw-clock">{now.getHours()}:{String(now.getMinutes()).padStart(2, '0')}</div>
        <div className="row" style={{ gap: 12, alignItems: 'center' }}>
          <div className="dw-lc">{L.c.map((x, k) => <span key={k} style={x[1]}>{x[0]}</span>)}</div>
          <div className="dw-lr">{L.r.map((x, k) => <div key={k} style={x[1]}>{x[0]}</div>)}</div>
        </div>
      </div>
    </>
  )
}
