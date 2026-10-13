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
import { fmtTime, fmtClock, today, WD, weekStart, addDays } from '../../engine/date.js'
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
  // 기록 카드 · 매거진 계열 (위젯 끝까지 종이 · 먹색 · 도장만 바랜 회갈색)
  const VPc = WTH ? 'transparent' : '#f4f4f1', VIc = WTH ? 'currentColor' : '#2e2f33', VSc = WTH ? 'color-mix(in srgb, currentColor 58%, transparent)' : 'rgba(46,47,51,.5)', LNc = WTH ? 'color-mix(in srgb, currentColor 18%, transparent)' : 'rgba(46,47,51,.16)', STAMPc = '#8b7a77', MONO = 'Menlo, ui-monospace, monospace' // 위젯 테마를 고르면 그 바탕·글자색 위에
  const MONS3 = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], DAYS3 = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const doyP = Math.floor((new Date(d + 'T12:00:00') - new Date(now.getFullYear() + '-01-01T12:00:00')) / 864e5) + 1
  const lab = (s, extra) => <span style={{ fontSize: 6.5, letterSpacing: '.18em', color: VSc, ...extra }}>{s}</span>
  const mono = (s, fs, extra) => <span style={{ fontFamily: MONO, fontSize: fs, ...extra }}>{s}</span>
  const paperV = (kids, pad = 14) => <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: VPc, padding: pad, color: WTH ? 'inherit' : VIc, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>{kids}</div>
  // 카드: 머리(제목 · 작은 줄 · 도장) + 이중선 + 칸 줄 (cols 너비, 0 = 남는 폭)
  const cardV = (title, sub, stamp, cols, head, rows0, n, tc = 1) => { const rows = [...rows0.slice(0, head ? n - 1 : n)]; while (rows.length < (head ? n - 1 : n)) rows.push(cols.map(() => '')); return paperV(<><div className="row between" style={{ alignItems: 'flex-start', marginBottom: 4 }}><div className="col" style={{ gap: 2 }}><span style={{ fontSize: 8, letterSpacing: '.3em' }}>{title}</span>{mono(sub, 7.5, { color: VSc })}</div>{stamp && mono(stamp, 7.5, { color: STAMPc, border: '1px solid ' + STAMPc, borderRadius: 3, padding: '0 4px' })}</div><div style={{ borderTop: '.8px solid ' + VIc, borderBottom: '.4px solid ' + VIc, height: 2 }} />
    {[...(head ? [[head, 1]] : []), ...rows.map((r) => [r, 0])].map(([r, isH], i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: cols.map((x) => (x ? x + 'px' : 'minmax(0,1fr)')).join(' '), height: 20, alignItems: 'center', borderBottom: '.6px solid ' + LNc, color: isH || r.dim ? VSc : VIc }}>{r.map((v, j) => <span key={j} className="ellipsis" style={{ padding: '0 5px', fontFamily: isH || j === tc ? undefined : MONO, fontSize: isH ? 6.5 : j === tc ? 10.5 : 8.5, letterSpacing: isH ? '.15em' : 0, textAlign: cols.length > 2 && j === cols.length - 1 ? 'right' : 'left', borderLeft: j ? '.6px solid ' + LNc : 0, fontWeight: r.bold ? 600 : undefined }}>{v}</span>)}</div>)}</>, 14) }
  const rcRows = sessions.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).map((x) => Object.assign([x.date.slice(5).replace('-', '.'), subjects.find((s) => s.id === x.subjectId)?.name || '공부', hm(x.dur)], { dim: x.date !== d }))
  V['기록카드'] = [[true, 4], [false, 6], [false, 15]].map(([sm, n]) => cardV(sm ? 'RECORD' : 'STUDY RECORD CARD', `No. ${doyP}  ·  ${hm(mins)}`, mins > 0 ? `${MONS3[now.getMonth()]} ${now.getDate()}` : null, [sm ? 36 : 42, 0, sm ? 38 : 46], ['DATE', 'SUBJECT', 'TIME'], rcRows, n))
  const ddRows = ddSorted.map((x, i) => Object.assign([ddT(x), x.title, x.date.slice(5).replace('-', '.')], { dim: i > 0 }))
  V['디데이카드'] = [[true, 4], [false, 6], [false, 15]].map(([sm, n]) => cardV(sm ? 'D-DAY' : 'D-DAY RECORD', `No. ${doyP}  ·  ${ddSorted.length}`, null, [sm ? 48 : 56, 0, sm ? 38 : 46], ['LEFT', 'TITLE', 'DATE'], ddRows, n))
  const tmOf = (ts) => { const x = new Date(ts); return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}` }
  const jnRows = [...today0.map((x) => ({ m: x.start || 0, r: [x.start ? tmOf(x.start) : '—', subjects.find((s) => s.id === x.subjectId)?.name || '공부', hm(x.dur)] })), ...doneT.map((t) => ({ m: t.doneAt, r: [tmOf(t.doneAt), t.title, '완료'] }))].sort((a, b) => a.m - b.m).map((x) => x.r).concat(rcRows.filter((r) => r.dim))
  V['일지'] = [[true, 4], [false, 6], [false, 15]].map(([sm, n]) => cardV('JOURNAL', `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}  ${DAYS3[now.getDay()]}`, null, [sm ? 36 : 42, 0, sm ? 34 : 42], ['TIME', 'ENTRY', ''], jnRows, n))
  const ctRows = [['STU', dd ? dd.title : '공부의 기록'], [String(doyP), `${MONS3[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}${dd ? '  ·  ' + ddTxt : ''}`], ...subMins.map((x, i) => ['', `${i + 1}. ${x.s.name}   ${hm(x.m)}`]), ['', `Total   ${hm(mins)} / ${hm(goal)}`], ...items.filter((t) => !t.done).map((t) => Object.assign(['', 'Note. ' + t.title], { dim: true }))]
  V['목록카드'] = [[true, 5], [false, 6], [false, 16]].map(([sm, n]) => cardV(sm ? 'CATALOG' : 'CATALOG CARD', 'STU ' + doyP, null, [sm ? 34 : 44, 0], null, ctRows, n))
  const wkDays = Array.from({ length: 7 }, (_, i) => addDays(wsP, i))
  const tcRows = wkDays.map((k) => { const ss = sessions.filter((x) => x.date === k), st2 = ss.filter((x) => x.start).map((x) => { const a = new Date(x.start); const m0 = a.getHours() * 60 + a.getMinutes(); return [m0, m0 + x.dur] }), tv = (m0) => (m0 == null ? '—' : `${String(Math.floor(m0 / 60) % 24).padStart(2, '0')}:${String(m0 % 60).padStart(2, '0')}`), tot = ss.reduce((a, x) => a + x.dur, 0); return Object.assign([['일', '월', '화', '수', '목', '금', '토'][new Date(k + 'T12:00:00').getDay()], k > d ? '' : tv(st2.length ? Math.min(...st2.map((x) => x[0])) : null), k > d ? '' : tv(st2.length ? Math.max(...st2.map((x) => x[1])) : null), k > d ? '' : tot ? hm(tot) : '—'], { dim: k > d, bold: k === d }) })
  const tcWeek = sessions.filter((x) => x.date >= wsP && x.date <= d).reduce((a, x) => a + x.dur, 0)
  V['타임카드'] = [[true, 4], [false, 9], [false, 9]].map(([sm, n]) => cardV('TIME CARD', `WEEK OF ${wsP.slice(5).replace('-', '.')}  ·  ${hm(tcWeek)}`, null, [sm ? 30 : 36, 0, 0, 0], ['DAY', 'IN', 'OUT', 'HOURS'], sm ? tcRows.filter((r, i) => wkDays[i] <= d).slice(-3) : [...tcRows, ['', '', 'TOTAL', hm(tcWeek)]], n, 0))
  const magHead = () => null
  const magNum = (sz) => <div className="col" style={{ gap: 0, flexShrink: 0 }}><span style={{ fontSize: sz, fontWeight: 100, lineHeight: 1 }}>{now.getDate()}</span>{lab(`${MONS3[now.getMonth()]}  ·  ${DAYS3[now.getDay()]}`)}</div>
  const magHl = quote || (dd ? `${dd.title}까지 ${ddTxt}` : '오늘을 기록하다')
  // 매거진 차례: D-day · 공부 · 일정 · 오늘의 Top 3 (앱 '오늘'에서 정한 3개)
  const top3P = (getState().days?.[d]?.top3 || []).map((id) => tasks.find((t) => t.id === id)).filter(Boolean).slice(0, 3)
  const tocP = [['D-DAY', dd ? `${ddTxt}  ${dd.title}` : '—'], ['STUDY', `${hm(mins)} / ${hm(goal)}   ${pct}%`], ['SCHEDULE', nC ? `${nCur ? '지금 ~' + fmtTime(nC.e) : fmtTime(nC.s)}  ${nC.t}` : '남은 일정 없음'], ...[0, 1, 2].map((i) => [i ? '' : 'TOP 3', top3P[i]?.title || (i ? '' : '앱 오늘에서 3가지를 정해 보세요'), top3P[i] ? (top3P[i].done ? 2 : 1) : 0])]
  V['매거진'] = [paperV(<>{magHead(true)}<div className="grow" />{magNum(64)}<div className="grow" /><div style={{ fontSize: 10 }} className="ellipsis">{dd ? `${ddTxt}  ${dd.title}` : magHl}</div></>),
    paperV(<>{magHead()}<div className="row" style={{ gap: 14, flexWrap: 'nowrap', alignItems: 'flex-start' }}>{magNum(76)}<div className="dw-vr" style={{ alignSelf: 'stretch' }} /><div className="col" style={{ minWidth: 0, gap: 4, paddingTop: 4 }}><div style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.35 }}>{magHl}</div></div></div><div className="grow" /><div className="dw-hr" /><div className="row between" style={{ fontSize: 8, marginTop: 4 }}><span>공부 {hm(mins)}</span><span>{ddTxt || ''}</span><span style={{ color: VSc }}>할 일 {leftN}</span></div></>),
    paperV(<>{magHead()}<div className="row" style={{ gap: 14, flexWrap: 'nowrap', alignItems: 'flex-start' }}>{magNum(96)}<div className="dw-vr" style={{ alignSelf: 'stretch' }} /><div className="col" style={{ minWidth: 0, gap: 4, paddingTop: 4 }}><div style={{ fontSize: 16, fontWeight: 300, lineHeight: 1.35 }}>{magHl}</div></div></div><div style={{ borderTop: '.9px solid ' + VIc, borderBottom: '.4px solid ' + VIc, height: 1.5, margin: '16px 0 4px' }} />{tocP.map(([k, v, tk], i) => <div key={i} className="row" style={{ gap: 0, height: 22, flexWrap: 'nowrap', alignItems: 'center', borderTop: i ? '.5px solid ' + LNc : 0 }}>{mono(v ? String(i + 1).padStart(2, '0') : '', 8.5, { width: 24, color: VSc })}{lab(k, { width: 54 })}{!!tk && <i style={{ width: 7, height: 7, boxSizing: 'border-box', border: '.8px solid ' + VSc, background: tk === 2 ? VSc : 'transparent', marginRight: 6, flexShrink: 0 }} />}<span className="ellipsis" style={{ fontSize: 11.5, color: tk === 2 ? VSc : undefined }}>{v}</span></div>)}</>)]
  const DFp = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'], MFp = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
  const newsHl = dd ? `${dd.title}, ${ddN === 0 ? '바로 오늘' : ddN + '일 앞으로'}` : quote || '오늘의 공부 기록'
  const newsP = (size) => paperV(<><div className="row between" style={{ fontSize: 7 }}>{lab(size ? `${DFp[now.getDay()]}, ${MFp[now.getMonth()]} ${now.getDate()}` : `${MONS3[now.getMonth()]} ${now.getDate()}  ·  ${DAYS3[now.getDay()]}`, { color: VIc, fontSize: 7 })}{mono(hm(mins), 7, { color: VSc })}</div><div style={{ borderTop: '1.1px solid ' + VIc, borderBottom: '.4px solid ' + VIc, height: 1.5, margin: '3px 0 10px' }} /><div style={{ fontSize: [13, 15, 21][size], lineHeight: 1.25 }}>{newsHl}</div>
    {size === 0 ? <><div className="grow" />{lab(`오늘 ${hm(mins)} 공부 · 목표의 ${pct}%`, { fontSize: 8, letterSpacing: 0 })}</> : <><div style={{ borderTop: '.4px solid ' + VIc, margin: '7px 0' }} /><div className="row" style={{ gap: 10, flexWrap: 'nowrap', alignItems: 'stretch', flex: 1, minHeight: 0 }}><div style={{ flex: 1, minWidth: 0, fontSize: size === 2 ? 11 : 10, lineHeight: 1.4 }}>{lab('STUDY', { display: 'block', marginBottom: 4 })}오늘 {hm(mins)} 공부했다. {subMins.map((x) => `${x.s.name} ${hm(x.m)}`).join(', ')}{subMins.length ? '. ' : ''}{mins >= goal ? '목표를 채웠다.' : `목표까지 ${hm(goal - mins)} 남았다.`}{quote ? ` “${quote}”` : ''}</div><i style={{ borderLeft: '.5px solid ' + VSc }} /><div style={{ flex: 1, minWidth: 0, fontSize: size === 2 ? 11 : 10, lineHeight: 1.5 }}>{lab('TO DO', { display: 'block', marginBottom: 4 })}{items.filter((t) => !t.done).slice(0, size === 2 ? 12 : 4).map((t) => <div key={t.id} className="ellipsis">· {t.title}</div>)}</div></div></>}</>)
  V['신문'] = [newsP(0), newsP(1), newsP(2)]
  // 흑백 인쇄풍 시트 계열 (위젯 본체의 phead · pform · pbig · pbook · phours 와 같은 모양): 칸 띠 · 큰 수 상자 · 줄 목록 · 체크 칸 · 진행 선 · 시간 줄
  const shHead = (l, r) => <div className="row between" style={{ fontSize: 8, letterSpacing: '.12em', marginBottom: 8, flexWrap: 'nowrap', gap: 6, flexShrink: 0 }}><span className="ellipsis">{l}</span><span className="nowrap">{r}</span></div>
  const shTab = (cols, rows, n, opt = {}) => { const r2 = rows.slice(0, n); while (r2.length < n) r2.push(Object.assign(cols.map(() => ''), {})); return <div style={{ border: '.7px solid currentColor', flex: 1, display: 'flex', flexDirection: 'column' }}>{r2.map((r, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: cols.map((x) => (x ? x + 'px' : 'minmax(0,1fr)')).join(' '), flex: 1, minHeight: 0, borderTop: i ? '.7px solid currentColor' : 0, alignItems: 'center', fontWeight: r.b ? 500 : undefined }}>{r.map((v, j) => { const lab = (opt.head && i === 0) || (opt.lab0 && j === 0); return <span key={j} className="ellipsis" style={{ padding: '0 6px', alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: opt.center?.includes(j) ? 'center' : !lab && opt.right?.includes(j) ? 'flex-end' : 'flex-start', borderLeft: j ? '.7px solid currentColor' : 0, fontSize: lab ? 8 : opt.fs || 11, fontWeight: !lab && opt.bc === j ? 500 : undefined, opacity: lab || r.dim ? 0.55 : 1 }}>{v}</span> })}</div>)}</div> }
  const BL = '.7px solid currentColor', HL = '.7px solid color-mix(in srgb, currentColor 40%, transparent)', GAP = <div style={{ height: 6, flexShrink: 0 }} />
  const capS = { fontSize: 6.5, opacity: 0.55, letterSpacing: '.06em' }
  const shLine = (r) => <span style={{ display: 'flex', alignItems: 'flex-end', height: 3, width: '100%' }}><i style={{ width: `${Math.round(Math.max(0, Math.min(1, r || 0)) * 100)}%`, height: 2.2, background: 'currentColor' }} /><i style={{ flex: 1, height: 0.6, background: 'currentColor', opacity: 0.45 }} /></span>
  const shChk = (on) => <i style={{ width: 8, height: 8, boxSizing: 'border-box', border: '.8px solid currentColor', background: on ? 'currentColor' : 'transparent', display: 'inline-block', flexShrink: 0 }} />
  const shCols = (...xs) => <div className="row" style={{ gap: 6, flexWrap: 'nowrap', alignItems: 'stretch', flex: 1, minHeight: 0 }}>{xs}</div>
  // 칸 띠: rows = [[[라벨, 값, 너비, 글 크기]]] · fill 이면 남은 높이를 줄마다 나눔
  const shForm = (rows, fs = 13, fill, h = 34) => <div className="col" style={{ gap: 0, border: BL, flex: fill ? 1 : '0 0 auto', minHeight: 0 }}>{rows.map((cells, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: cells.map((c) => (c[2] ? c[2] + 'px' : 'minmax(0,1fr)')).join(' '), height: fill ? undefined : h, flex: fill ? 1 : undefined, borderTop: i ? BL : 0 }}>{cells.map((c, j) => <div key={j} className="col" style={{ gap: 0, padding: '4px 6px', borderLeft: j ? BL : 0, justifyContent: 'space-between', minWidth: 0 }}><span className="ellipsis" style={capS}>{c[0]}</span><span className="ellipsis" style={{ fontSize: c[3] || fs, fontWeight: (c[3] || fs) >= 22 ? 100 : 300, lineHeight: 1.15 }}>{c[1]}</span></div>)}</div>)}</div>
  const shBig = (cap, num, ns, sub, r, wd) => <div className="col" style={{ gap: 0, border: BL, padding: '6px 8px 8px', minWidth: 0, flex: wd ? `0 0 ${wd}` : 1 }}><span className="ellipsis" style={capS}>{cap}</span><div className="grow" /><span className="ellipsis" style={{ fontSize: ns, fontWeight: 100, lineHeight: 1.1 }}>{num}</span>{sub && <span className="ellipsis" style={{ fontSize: 9.5, opacity: 0.55, marginTop: 2 }}>{sub}</span>}{r != null && <span style={{ marginTop: 6 }}>{shLine(r)}</span>}</div>
  // 줄 목록: 위아래 굵은 선 · 줄 사이 가는 선 · 값이 true/false 면 체크 칸 · 수면 진행 선
  const shBook = (cols, rows, n, o = {}) => { const r2 = rows.slice(0, n); while (r2.length < n) r2.push(cols.map(() => '')); return <div className="col" style={{ gap: 0, flex: 1, minHeight: 0, minWidth: 0, borderTop: '1.2px solid currentColor', borderBottom: '1.2px solid currentColor' }}>{r2.map((r, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: cols.map((x) => (x ? x + 'px' : 'minmax(0,1fr)')).join(' '), flex: 1, minHeight: 0, alignItems: 'center', borderTop: i ? (o.head && i === 1 ? BL : HL) : 0, fontWeight: r.b ? 500 : undefined, opacity: r.dim ? 0.55 : 1 }}>{r.map((v, j) => { const hd = o.head && i === 0, lab = hd || (o.lab0 && j === 0); return <span key={j} className="ellipsis" style={{ padding: `0 2px 0 ${j ? 4 : 1}px`, display: 'flex', alignItems: 'center', alignSelf: 'stretch', justifyContent: o.center?.includes(j) ? 'center' : o.right?.includes(j) ? 'flex-end' : 'flex-start', fontSize: hd ? 6.5 : lab ? 7.5 : o.fs || 11, opacity: lab ? 0.55 : 1, letterSpacing: hd ? '.06em' : undefined, borderRight: o.vr?.includes(j) ? BL : 0, marginRight: o.vr?.includes(j) ? 2 : 0 }}>{!hd && typeof v === 'boolean' ? shChk(v) : !hd && typeof v === 'number' ? shLine(v) : v}</span> })}</div>)}</div> }
  const nowH = Math.floor(nmP / 60)
  const shHours = (h0, n, fs = 10) => <div className="col" style={{ gap: 0, border: BL, flex: 1, minWidth: 0 }}>{Array.from({ length: n }, (_, i) => { const hh = h0 + i, L = nowL.filter((x) => Math.floor(x.s / 60) === hh), cur = hh === nowH; return <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px minmax(0,1fr)', flex: 1, minHeight: 0, alignItems: 'stretch', borderTop: i ? HL : 0 }}><span style={{ fontSize: 7.5, opacity: cur ? 1 : 0.55, fontWeight: cur ? 500 : undefined, borderRight: BL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{String(hh % 24).padStart(2, '0')}</span><span className="ellipsis" style={{ padding: '0 6px', fontSize: fs, opacity: hh < nowH ? 0.55 : 1, fontWeight: cur ? 500 : undefined, display: 'flex', alignItems: 'center' }}>{L.map((x) => (x.s % 60 ? ':' + String(x.s % 60).padStart(2, '0') + ' ' : '') + x.t).join('   ')}</span></div> })}</div>
  const WDK = '일월화수목금토', shDay = (x) => `${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][x.getDay()]} ${x.getMonth() + 1}.${String(x.getDate()).padStart(2, '0')}`, dHd = shDay(now)
  // 주간표
  const wkPs = Array.from({ length: 7 }, (_, i) => addDays(wsP, i)), dTot = (k) => (k === d ? mins : sessions.filter((x) => x.date === k).reduce((a, x) => a + x.dur, 0)), wkTotP = wkPs.filter((k) => k <= d).reduce((a, k) => a + dTot(k), 0)
  const wkAvg = Math.round(wkTotP / Math.max(1, wkPs.filter((k) => k <= d).length)), wkLast = wkPs.filter((k) => k <= d).reduce((a, k) => a + dTot(addDays(k, -7)), 0), wkHd = 'WEEK OF ' + wsP.slice(5).replace('-', '.')
  const todayOf = (id) => subMins.find((x) => x.s.id === id)?.m || 0, mxWs = Math.max(1, ...weekSub.map((x) => x.m))
  const shDays = (fs) => <div style={{ border: BL, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', flex: 1, minHeight: 0 }}>{wkPs.map((k, i) => { const fut = k > d, v = dTot(k), dt = new Date(k + 'T12:00:00'); return <div key={k} className="col" style={{ gap: 0, padding: '4px 5px 6px', borderLeft: i ? BL : 0, minWidth: 0 }}><span style={{ ...capS, opacity: k === d ? 1 : 0.55 }}>{WDK[dt.getDay()]} {dt.getDate()}</span><div className="grow" /><span style={{ fontSize: fs, fontWeight: k === d ? 500 : 300, marginBottom: 4 }}>{fut ? '' : v ? hm(v) : '—'}</span>{shLine(fut ? 0 : v / goal)}</div> })}</div>
  const wkForm = shForm([[['WEEK', hm(wkTotP)], ['AVG / DAY', hm(wkAvg)], ['TODAY', hm(mins)], ['LAST WEEK', hm(wkLast)]]], 13)
  V['주간표'] = [M(<>{shHead('WEEKLY SHEET', wsP.slice(5).replace('-', '.'))}{shForm([[['WEEK', hm(wkTotP)], ['AVG', hm(wkAvg)]], [['TODAY', hm(mins)], ['GOAL', pct + '%']]], 15, true)}</>),
    M(<>{shHead('WEEKLY SHEET', wkHd)}{wkForm}{GAP}{shDays(10)}</>),
    M(<>{shHead('WEEKLY SHEET', wkHd)}{wkForm}{GAP}<div style={{ flex: '0 0 38%', display: 'flex' }}>{shDays(12)}</div>{GAP}{shBook([0, 110, 54, 54], [['SUBJECT', '', 'TODAY', 'WEEK'], ...weekSub.map((x) => [x.s.name, x.m / mxWs, todayOf(x.s.id) ? hm(todayOf(x.s.id)) : '—', hm(x.m)])], 9, { head: true, right: [2, 3] })}</>)]
  // 과목표
  const sjRows = subjects.map((s) => ({ s, t: todayOf(s.id), w: weekSub.find((x) => x.s.id === s.id)?.m || 0 })).filter((x) => x.t || x.w).sort((a, b) => b.t - a.t || b.w - a.w), mxT = Math.max(1, ...sjRows.map((x) => x.t)), sjSub = `목표 ${hm(goal)} · ${pct}%`
  V['과목표'] = [M(<>{shHead('SUBJECT SHEET', dHd)}{shBig('TODAY', hm(mins), 34, sjSub, mins / goal)}</>),
    M(<>{shHead('SUBJECT SHEET', dHd)}{shCols(shBig('TODAY', hm(mins), 32, sjSub, mins / goal, '36%'), shBook([0, 60, 44], [['SUBJECT', '', 'TODAY'], ...sjRows.map((x) => Object.assign([x.s.name, x.t / mxT, x.t ? hm(x.t) : '—'], { dim: !x.t }))], 6, { head: true, right: [2], fs: 10.5 }))}</>),
    M(<>{shHead('SUBJECT SHEET', dHd)}{shForm([[['TODAY', hm(mins)], ['GOAL', pct + '%'], ['WEEK', hm(sw.week)], ['AVG / DAY', hm(wkAvg)]]], 14)}{GAP}{shBook([0, 54, 54, 100], [['SUBJECT', 'TODAY', 'WEEK', ''], ...sjRows.map((x) => Object.assign([x.s.name, x.t ? hm(x.t) : '—', hm(x.w), x.w / Math.max(1, ...sjRows.map((y) => y.w))], { dim: !x.t }))], 15, { head: true, right: [1, 2], fs: 11.5 })}</>)]
  // 일정표
  const allDayP = eventsOn(d).filter((e) => e.start == null).map((e) => e.title), plHd = allDayP.length ? '종일 ' + allDayP[0] + (allDayP.length > 1 ? ' +' + (allDayP.length - 1) : '') : dHd
  const plRows = nowL.filter((x) => x.e > nmP).map((x) => [fmtTime(x.s), x.t])
  V['일정표'] = [M(<>{shHead('SCHEDULE SHEET', plHd)}{shBook([40, 0], plRows.length ? plRows : [['', '남은 일정 없음']], 6, { lab0: true, fs: 10 })}</>),
    M(<>{shHead('SCHEDULE SHEET', plHd)}{shCols(shHours(Math.max(0, Math.min(12, nowH - 1)), 6), shHours(Math.max(0, Math.min(12, nowH - 1)) + 6, 6))}</>),
    M(<>{shHead('SCHEDULE SHEET', plHd)}{shHours(Math.max(0, Math.min(6, nowH - 1)), 18, 11)}</>)]
  // 디데이표
  const dd0 = ddSorted[0], ddRest = ddSorted.slice(1), ddDt = (x) => x.date.slice(5).replace('-', '.'), ddWd = (x) => ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date(x.date + 'T12:00:00').getDay()], ddN0 = ddSorted.length + (ddSorted.length === 1 ? ' item' : ' items')
  const ddBig = (wd) => shBig(dd0 ? `${ddDt(dd0)}  ${ddWd(dd0)}` : 'D-DAY', dd0 ? ddT(dd0) : '—', 34, dd0 ? dd0.title : 'D-day 를 추가해 보세요', null, wd)
  V['디데이표'] = [M(<>{shHead('D-DAY SHEET', ddN0)}{ddBig()}</>),
    M(<>{shHead('D-DAY SHEET', ddN0)}{shCols(ddBig('40%'), shBook([46, 0, 38], [['D-DAY', 'TITLE', 'DATE'], ...ddRest.map((x) => [ddT(x), x.title, ddDt(x)])], 6, { head: true, right: [2], fs: 10.5 }))}</>),
    M(<>{shHead('D-DAY SHEET', ddN0)}{shForm([[['NEXT', dd0 ? ddT(dd0) : '—', 120, 30], ['TITLE', dd0 ? dd0.title : 'D-day 를 추가해 보세요', 0, 15], ['DATE', dd0 ? `${ddDt(dd0)}  ${ddWd(dd0)}` : '', 80, 13]]], 13, false, 92)}{GAP}{shBook([62, 0, 50, 40], [['D-DAY', 'TITLE', 'DATE', 'DAY'], ...ddRest.map((x) => [ddT(x), x.title, ddDt(x), ddWd(x)])], 12, { head: true, right: [2, 3], fs: 11.5 })}</>)]
  // 월간표
  const moY = now.getFullYear(), moM = now.getMonth(), moN = new Date(moY, moM + 1, 0).getDate(), moWs = st.weekStart ?? 1, moLead = (new Date(moY, moM, 1).getDay() - moWs + 7) % 7, moKey = (n) => `${moY}-${String(moM + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`
  const moV = Array.from({ length: moN }, (_, i) => dTot(moKey(i + 1))), moTot = moV.reduce((a, v) => a + v, 0), moDays = moV.filter(Boolean).length, moBi = moV.indexOf(Math.max(...moV))
  const moGrid = (big) => <div style={{ border: BL, flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gridTemplateRows: `14px repeat(${Math.ceil((moLead + moN) / 7)}, 1fr)` }}>{[...Array.from({ length: 7 }, (_, i) => <span key={'h' + i} style={{ fontSize: 6.5, opacity: 0.55, textAlign: 'center', borderLeft: i ? BL : 0 }}>{'SMTWTFS'[(i + moWs) % 7]}</span>), ...Array.from({ length: Math.ceil((moLead + moN) / 7) * 7 }, (_, i) => { const dn = i - moLead + 1, v = dn >= 1 && dn <= moN ? moV[dn - 1] : 0; return <span key={i} style={{ borderTop: BL, borderLeft: i % 7 ? BL : 0, padding: '2px 4px', fontSize: big ? 9.5 : 8, lineHeight: 1.2, fontWeight: moKey(dn) === d ? 600 : undefined, overflow: 'hidden', whiteSpace: big ? 'pre' : 'nowrap' }}>{dn >= 1 && dn <= moN ? dn + (v ? (big ? '\n' : ' ') + hm(v) : '') : ''}</span> })]}</div>
  const moBest = moV[moBi] ? `${moM + 1}/${moBi + 1}` : '—', moHd = `${MONS[moM]} ${moY}  ·  ${hm(moTot)}`
  V['월간표'] = [M(<>{shHead('MONTHLY SHEET', MONS[moM])}{shForm([[['TOTAL', hm(moTot)], ['DAYS', moDays + '일']], [['BEST', moBest], ['TODAY', hm(mins)]]], 14, true)}</>),
    M(<>{shHead('MONTHLY SHEET', moHd)}{moGrid(false)}</>),
    M(<>{shHead('MONTHLY SHEET', moHd)}{shForm([[['TOTAL', hm(moTot)], ['DAYS', moDays + '일'], ['AVG / DAY', hm(Math.round(moTot / Math.max(1, now.getDate())))], ['BEST', moV[moBi] ? `${moBest}  ${hm(moV[moBi])}` : '—']]], 13)}{GAP}{moGrid(true)}</>)]
  // 노트표: 공책처럼 왼쪽 여백 칸
  const ntRows = (n0?.l || []).map((l, i) => Object.assign([l.k === 'todo' ? !!l.d : String(i + 1), l.x], { dim: l.k === 'todo' && l.d, b: l.k === 'h' }))
  V['노트표'] = [[18, 6, 10], [24, 6, 11], [24, 17, 11]].map(([c0, n, fs]) => M(<>{shHead(n0 ? n0.t : 'NOTE', '')}{shBook([c0, 0], ntRows.length ? ntRows : [['', n0 ? '내용 없음' : '앱에서 노트를 써 보세요']], n, { lab0: true, center: [0], vr: [0], fs })}</>))
  // 수업표
  const cNow = clsP.find((c) => c.start <= nmP && c.end > nmP), cLeft = clsP.filter((c) => c.end > nmP).length
  const ttBig = (wd, ns) => shBig(cNow ? 'NOW' : 'NEXT', cNx ? cNx.period + '교시' : '—', ns, cNx ? `${cNx.title}  ${fmtTime(cNx.start)}–${fmtTime(cNx.end)}` : clsP.length ? '오늘 수업 끝' : '오늘 수업 없음', cNow ? (nmP - cNow.start) / (cNow.end - cNow.start) : null, wd)
  const ttDays = wkPs.filter((k) => classesOn(k).length || new Date(k + 'T12:00:00').getDay() % 6 !== 0), ttPer = [...new Set(ttDays.flatMap((k) => classesOn(k).map((c) => c.period)))].sort((a, b) => a - b)
  const ttRows = ttPer.map((p) => [String(p), ...ttDays.map((k) => classesOn(k).find((c) => c.period === p)?.title || '')])
  V['수업표'] = [M(<>{shHead('TIMETABLE', dHd)}{ttBig(null, 30)}</>),
    M(<>{shHead('TIMETABLE', `${dHd}  ·  ${cLeft} left`)}{shCols(ttBig('34%', 28), shBook([22, 0, 40], [['NO', 'CLASS', 'TIME'], ...(clsP.length ? clsP.map((c) => Object.assign([String(c.period), c.title, fmtTime(c.start)], { b: c === cNow, dim: c.end <= nmP })) : [['', '오늘 수업 없음', '']])], 6, { head: true, right: [2], lab0: true, fs: 10 }))}</>),
    M(<>{shHead('TIMETABLE', ttPer.length ? 'WEEK OF ' + wsP.slice(5).replace('-', '.') : '이번 주 수업 없음')}{shForm([[[cNow ? 'NOW' : 'NEXT', cNx ? `${cNx.period}교시  ${cNx.title}` : '—'], ['TIME', cNx ? `${fmtTime(cNx.start)}–${fmtTime(cNx.end)}` : '—', 100], ['LEFT', String(cLeft), 60]]], 13)}{GAP}{shTab([30, ...ttDays.map(() => 0)], [['', ...ttDays.map((k) => WDK[new Date(k + 'T12:00:00').getDay()] + ' ' + Number(k.slice(8)))], ...ttRows], 12, { head: true, center: [0], bc: ttDays.indexOf(d) + 1 || -1, fs: 11 })}</>)]
  // 내일표
  const tmTimed = [...tmrCl.map((c) => ({ s: c.start, x: c.period + '교시 ' + c.title + (c.room ? '  · ' + c.room : '') })), ...tmrEv.filter((e) => e.start != null).map((e) => ({ s: e.start, x: e.title }))].sort((a, b) => a.s - b.s)
  const tmRows = [...tmrEv.filter((e) => e.start == null).map((e) => ['종일', e.title]), ...tmTimed.map((x) => [fmtTime(x.s), x.x])], tmTk = tmrTk.map((t) => [false, t.title]), tmHd = shDay(tmrD)
  const tmCols = (n, fs) => shCols(<div style={{ flex: '0 0 56%', display: 'flex', minWidth: 0 }}>{shBook([40, 0], [['TIME', 'SCHEDULE'], ...(tmRows.length ? tmRows : [['', '일정 없음']])], n, { head: true, lab0: true, fs })}</div>, shBook([15, 0], [['', 'PREPARE'], ...(tmTk.length ? tmTk : [['', '할 일 없음']])], n, { head: true, fs }))
  V['내일표'] = [M(<>{shHead('TOMORROW', tmHd)}{shBook([40, 0], [...tmRows, ...tmrTk.map((t) => ['할 일', t.title])].length ? [...tmRows, ...tmrTk.map((t) => ['할 일', t.title])] : [['', '내일 일정 없음']], 6, { lab0: true, fs: 10 })}</>),
    M(<>{shHead('TOMORROW', tmHd)}{tmCols(6, 10)}</>),
    M(<>{shHead('TOMORROW', tmHd)}{shForm([[['CLASSES', String(tmrCl.length)], ['EVENTS', String(tmrEv.length)], ['TASKS', String(tmrTk.length)], ['FIRST', tmTimed[0] ? fmtTime(tmTimed[0].s) : '—']]], 14)}{GAP}{tmCols(14, 11)}</>)]
  // 마감표
  const tdN = dueL.filter((t) => dueIn(t) === 0).length, wkN = dueL.filter((t) => dueIn(t) > 0 && dueIn(t) <= 6).length, duHd = `${dueL.length} left${overN ? `  ·  ${overN} over` : ''}`
  const duRow = (t) => Object.assign([false, t.title, dueTxt(t)], { b: dueIn(t) <= 0 })
  V['마감표'] = [M(<>{shHead('DUE SHEET', duHd)}{shBook([15, 0, 44], dueL.length ? dueL.map(duRow) : [['', '마감 없음', '']], 6, { right: [2], fs: 10 })}</>),
    M(<>{shHead('DUE SHEET', duHd)}{shCols(shBig('2 WEEKS', String(dueL.length), 36, overN ? overN + '개 지남' : `이번 주 ${tdN + wkN}개`, null, '30%'), shBook([15, 0, 50], [['', 'TASK', 'DUE'], ...(dueL.length ? dueL.map(duRow) : [['', '2주 안에 마감 없음', '']])], 6, { head: true, right: [2], fs: 10.5 }))}</>),
    M(<>{shHead('DUE SHEET', duHd)}{shForm([[['OVER', String(overN)], ['TODAY', String(tdN)], ['THIS WEEK', String(wkN)], ['2 WEEKS', String(dueL.length)]]], 14)}{GAP}{shBook([15, 0, 50, 62], [['', 'TASK', 'DATE', 'DUE'], ...(dueL.length ? dueL.map((t) => Object.assign([false, t.title, t.due.slice(5).replace('-', '.'), dueTxt(t)], { b: dueIn(t) <= 0 })) : [['', '2주 안에 마감 없음', '', '']])], 14, { head: true, right: [2, 3], fs: 11.5 })}</>)]
  // 진도표: 두 줄 칸(제목 · 쪽수 / 진행 선)
  const pgPc = (x) => Math.round((x.n / x.of) * 100), pgAvg = progP.length ? Math.round(progP.reduce((a, x) => a + pgPc(x), 0) / progP.length) : 0, pgHd = progP.length + (progP.length === 1 ? ' item' : ' items')
  const pgBlocks = (n, fs) => <div className="col" style={{ gap: 0, flex: 1, minHeight: 0, minWidth: 0, borderTop: '1.2px solid currentColor', borderBottom: '1.2px solid currentColor' }}>{Array.from({ length: n }, (_, i) => { const x = progP[i]; return <div key={i} className="col" style={{ gap: 0, flex: 1, minHeight: 0, padding: '3px 1px 5px', borderTop: i ? HL : 0 }}>{x ? <><div className="row" style={{ gap: 4, flexWrap: 'nowrap', alignItems: 'baseline' }}><span className="ellipsis" style={{ fontSize: fs }}>{x.t}</span><span className="nowrap" style={{ fontSize: 7.5, opacity: 0.55 }}>{x.n} / {x.of}{x.u}   {pgPc(x)}%</span></div><div className="grow" />{shLine(x.n / x.of)}</> : !i && !progP.length ? <span style={{ fontSize: fs, opacity: 0.55 }}>진행 중인 교재·인강 없음</span> : null}</div> })}</div>
  const pgTop = progP.slice().sort((a, b) => b.n / b.of - a.n / a.of)[0]
  V['진도표'] = [M(<>{shHead('PROGRESS SHEET', pgHd)}{pgBlocks(3, 10)}</>),
    M(<>{shHead('PROGRESS SHEET', pgHd)}{shCols(shBig('AVERAGE', pgAvg + '%', 34, `${progP.length}개 진행 중`, pgAvg / 100, '30%'), pgBlocks(3, 10.5))}</>),
    M(<>{shHead('PROGRESS SHEET', pgHd)}{shForm([[['ITEMS', String(progP.length), 70], ['AVERAGE', pgAvg + '%', 80], ['CLOSEST', pgTop ? `${pgTop.t}  ${pgPc(pgTop)}%` : '—']]], 14)}{GAP}{pgBlocks(8, 11.5)}</>)]
  // 습관표: 7일 네모 칸
  const hbP = habW(), hbCnt = (x) => x.w.filter(Boolean).length, hbHd = `TODAY ${hbP.filter((x) => x.on).length} / ${hbP.length}`, hbDays = Array.from({ length: 7 }, (_, i) => addD(i - 6))
  const hbBest = hbP.slice().sort((a, b) => hbCnt(b) - hbCnt(a))[0], hbAll = hbP.reduce((a, x) => a + hbCnt(x), 0)
  const hbBook = (n, fs) => shBook([0, ...hbDays.map(() => 22), 30], [['HABIT', ...hbDays.map((x) => WDK[x.getDay()]), '7D'], ...(hbP.length ? hbP.map((x) => [x.t, ...x.w.map(Boolean), hbCnt(x) + '/7']) : [['앱에서 습관을 추가해 보세요', '', '', '', '', '', '', '', '']])], n, { head: true, center: [1, 2, 3, 4, 5, 6, 7], right: [8], fs })
  V['습관표'] = [M(<>{shHead('HABIT SHEET', hbHd)}{shBook([0, 42], [['HABIT', 'TODAY'], ...(hbP.length ? hbP.map((x) => [x.t, !!x.on]) : [['앱에서 습관 추가', '']])], 6, { head: true, center: [1], fs: 10 })}</>),
    M(<>{shHead('HABIT SHEET', hbHd)}{hbBook(6, 10)}</>),
    M(<>{shHead('HABIT SHEET', hbHd)}{shForm([[['TODAY', `${hbP.filter((x) => x.on).length} / ${hbP.length}`], ['7 DAYS', hbP.length ? Math.round((hbAll / (hbP.length * 7)) * 100) + '%' : '—'], ['MOST', hbBest ? `${hbBest.t}  ${hbCnt(hbBest)}/7` : '—', 130]]], 14)}{GAP}{hbBook(12, 11)}</>)]
  // 공부 기록표
  const lgSub = (id) => subjects.find((y) => y.id === id)?.name || '기타', lgT = (ts) => { const x = new Date(ts); return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}` }
  const lgS = today0.slice().sort((a, b) => (a.start || 0) - (b.start || 0)), lgMx = Math.max(1, ...lgS.map((x) => x.dur || 0)), lgFirst = lgS.find((x) => x.start)
  const lgRows = (big) => lgS.map((x) => [x.start ? lgT(x.start) : '—', lgSub(x.subjectId) + (big && x.note ? '  · ' + x.note : ''), (x.dur || 0) / lgMx, hm(x.dur || 0)])
  const lgForm = shForm([[['TOTAL', hm(mins)], ['SESSIONS', String(lgS.length)], ['GOAL', pct + '%'], ['FIRST', lgFirst ? lgT(lgFirst.start) : '—']]], 14)
  const lgBook = (n, big) => { const r = lgRows(big).slice(-(n - 1)); return shBook([42, 0, big ? 96 : 70, 44], [['START', 'SUBJECT', '', 'TIME'], ...(r.length ? r : [['', '오늘 기록 없음', '', '']])], n, { head: true, right: [3], lab0: true, fs: big ? 11.5 : 10.5 }) }
  V['기록표'] = [M(<>{shHead('STUDY LOG', dHd)}{shBig('TOTAL', hm(mins), 34, `${lgS.length}번 · 목표 ${pct}%`, mins / goal)}</>),
    M(<>{shHead('STUDY LOG', dHd)}{lgForm}{GAP}{lgBook(4, false)}</>),
    M(<>{shHead('STUDY LOG', dHd)}{lgForm}{GAP}{lgBook(15, true)}</>)]
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
    : Lfor({ '숫자:디데이': '디데이', '숫자:할일': '할일', '숫자:주간': '주간', '선그래프': '주간', '메모지': '노트', '인쇄': '오늘', '반반': '오늘', '세단': '오늘', '자동': autoK, '달력:과목': '달력', '기록카드': '공부', '디데이카드': '디데이목록', '일지': '오늘', '매거진': '오늘', '신문': '오늘', '목록카드': '공부', '타임카드': '주간', '주간표': '주간', '과목표': '과목', '일정표': '일주일', '디데이표': '디데이목록', '월간표': '달력', '노트표': '노트', '수업표': '시간표', '내일표': '내일', '마감표': '마감', '진도표': '진도', '습관표': '습관', '기록표': '공부' }[kind] || kind)
  const FULLP = new Set(['메모지', '기록카드', '디데이카드', '일지', '매거진', '신문', '목록카드', '타임카드']) // 자체 종이를 쓰는 형태: 미리보기도 가장자리까지
  const [vs, vm, vl] = V[kind] || V[''] // 미리보기가 없는 형태도 화면이 멈추지 않게
  return (
    <>
      <div className="scroll-x" style={{ marginBottom: 6 }}><div className="row" style={{ gap: 6 }}>
        {WIDGET_KINDS.map(([k, l]) => <button key={k} className={'chip' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>{l}</button>)}
      </div></div>
      <div className="tiny muted">{kind ? <>위젯 편집 › Parameter 에 <b>{kind}</b> 입력</> : '위젯 편집 › Parameter 를 비워 두면 기본 형태'}</div>
      <div className="dw-row">
        <div className={'dw dw-s' + (FULLP.has(kind) ? ' dw-full' : '')} style={{ ...ff, ...WTH }}><div className="dw-in">{vs}</div></div>
        <div className={'dw dw-m' + (FULLP.has(kind) ? ' dw-full' : '')} style={{ ...ff, ...WTH }}><div className="dw-in">{vm}</div></div>
        <div className={'dw dw-l' + (FULLP.has(kind) ? ' dw-full' : '')} style={{ ...ff, ...WTH }}><div className="dw-in">{vl}</div></div>
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
