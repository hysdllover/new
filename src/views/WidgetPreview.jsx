// 설정 › 위젯 미리보기: 위젯 본체(src/widget/core.js)와 같은 내용을 HTML 로 대략 그림
import { useMemo } from 'react'
import { useColl } from '../store/store.js'
import { widgetPayload } from '../sync/widgetData.js'
import { today, dday, hm, fmtShort, addDays, parseYmd } from '../lib/date.js'

const TH = { basic: ['#f5f6f8', '#3d4a5e', '#8794a8', '#d9dee6', '#5b6b86'], paper: ['#fbfbf9', '#3a4659', '#8a93a2', '#dedfdb', '#4a5a78'], pencil: ['#fcfcfa', '#45484e', '#8d9096', '#d8d8d4', '#5d6066'] }
const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// 형태마다 그리는 함수 (Parameter 이름 → 미리보기) — 새 형태를 넣으면 여기도 (tests/widgetkinds.test.js)
export const PREVIEW_KINDS = ['', '디데이', '공부', '할일', '점수', '교재']

export function WidgetPreview({ kind, size, theme }) {
  useColl('tasks'); useColl('sessions'); useColl('exams'); useColl('scores'); useColl('materials')
  const D = useMemo(() => widgetPayload(), [kind, size, theme]) // eslint-disable-line
  const [bg, ink, soft, rule, acc] = TH[theme] || TH.basic, t0 = today()
  const lock = size === 'lock'
  const exams = D.exams.filter((e) => !e.date || e.date >= t0), ex0 = exams[0], mToday = D.mins[t0] || 0
  const tasks = D.tasks.filter((x) => x.due && (x.due < t0 ? !x.done : x.due === t0)), left = tasks.filter((x) => !x.done).length
  const days7 = Array.from({ length: 7 }, (_, i) => addDays(t0, i - 6)), mx = Math.max(D.goal, ...days7.map((k) => D.mins[k] || 0), 1)
  const st = { '--wbg': lock ? '#4a5160' : bg, '--wink': lock ? '#fff' : ink, '--wsoft': lock ? 'rgba(255,255,255,.7)' : soft, '--wrule': lock ? 'rgba(255,255,255,.35)' : rule, '--wacc': lock ? '#fff' : acc }
  const Line = ({ r, c }) => <i className="wp-line"><b style={{ width: Math.min(1, r || 0) * 100 + '%', ...(c ? { background: c } : null) }} /></i>
  const Head = ({ l, r }) => <div className="wp-head"><span>{l}</span><span>{r}</span></div>
  const DD = ({ e, big }) => e ? <div><div className="wp-dd" style={{ fontSize: big, color: e.color || ink }}>{dday(e.date)}</div><div className="wp-b">{e.name}{e.sub ? ' · ' + e.sub : ''}</div>{e.date && <div className="wp-s">{fmtShort(e.date)}{e.target ? ' · 목표 ' + e.target : ''}</div>}</div> : <div className="wp-s">시험 없음</div>
  const Study = () => <div><div><span className="wp-dd" style={{ fontSize: 24 }}>{hm(mToday)}</span> <span className="wp-s">/ {hm(D.goal)}</span></div><Line r={mToday / D.goal} /></div>
  const Tasks = ({ n }) => <div>{tasks.slice(0, n).map((x) => <div key={x.id} className={'wp-task' + (x.done ? ' done' : '')}><i />{x.t}<span>{x.due < t0 ? fmtShort(x.due) : x.area || ''}</span></div>)}{!tasks.length && <div className="wp-s">오늘 할 일이 없어요</div>}</div>
  const Bars = ({ h }) => <div className="wp-bars" style={{ height: h }}>{days7.map((k) => <div key={k}><b style={{ height: ((D.mins[k] || 0) / mx) * 100 + '%', opacity: k === t0 ? 1 : 0.45 }} /><span>{WD[parseYmd(k).getDay()]}</span></div>)}</div>

  let body
  if (lock) {
    body = kind === '공부' ? <><div className="wp-dd" style={{ fontSize: 20 }}>{hm(mToday)} <span className="wp-s">/ {hm(D.goal)}</span></div><Line r={mToday / D.goal} /></>
      : kind === '할일' ? <Tasks n={3} />
      : kind === '점수' ? exams.slice(0, 3).map((e) => <div key={e.id} className="wp-row"><span>{e.name}</span><span>{e.last ?? '—'}{e.target ? ' / ' + e.target : ''}</span></div>)
      : exams.slice(0, 3).map((e) => <div key={e.id} className="wp-row"><span>{e.name}</span><span>{dday(e.date)}</span></div>)
  } else if (kind === '디데이') body = <><Head l="D-DAY" r={exams.length > 1 ? exams.length + ' EXAMS' : ''} /><DD e={ex0} big={size === 'small' ? 34 : 44} />{size !== 'small' && exams.slice(1, size === 'medium' ? 3 : 7).map((e) => <div key={e.id} className="wp-row"><span><i className="sw" style={{ background: e.color }} /> {e.name}</span><span>{dday(e.date)}</span></div>)}</>
  else if (kind === '공부') body = <><Head l="STUDY" r="TODAY" /><Study />{size !== 'small' && <Bars h={size === 'medium' ? 44 : 120} />}</>
  else if (kind === '할일') body = <><Head l="TO DO" r={tasks.length ? `${tasks.length - left} / ${tasks.length}` : ''} /><Tasks n={size === 'large' ? 12 : 4} /></>
  else if (kind === '점수') body = <><Head l="SCORE" />{exams.filter((e) => e.last != null || e.target).slice(0, size === 'small' ? 1 : size === 'medium' ? 2 : 5).map((e) => <div key={e.id} style={{ marginBottom: 8 }}><div className="wp-row"><b>{e.name}</b><span><span className="wp-dd" style={{ fontSize: 18 }}>{e.last ?? '—'}</span> / {e.target || e.max}</span></div><Line r={e.last != null ? e.last / (e.target || e.max) : 0} c={e.color} />{size !== 'small' && <div className="wp-s">{e.trend.length > 1 ? e.trend.join(' › ') : e.lastDate ? '최근 ' + fmtShort(e.lastDate) : '아직 점수 없음'}</div>}</div>)}</>
  else if (kind === '교재') body = <><Head l="BOOKS" />{D.books.slice(0, size === 'small' ? 2 : size === 'medium' ? 3 : 6).map((b, i) => <div key={i} style={{ marginBottom: 7 }}><div className="wp-row"><span>{b.t}</span><span>{b.cur}/{b.total}{b.unit}</span></div><Line r={b.cur / b.total} /></div>)}{!D.books.length && <div className="wp-s">진행 중인 교재가 없어요</div>}</>
  else body = size === 'small' ? <><DD e={ex0} big={30} /><div style={{ flex: 1 }} /><Study /></> : <div className="wp-split"><div><DD e={ex0} big={size === 'medium' ? 30 : 40} /><div style={{ height: 12 }} /><Study />{size === 'large' && <Bars h={70} />}</div><i className="wp-vr" /><div><Head l="TO DO" r={tasks.length ? `${tasks.length - left}/${tasks.length}` : ''} /><Tasks n={size === 'medium' ? 4 : 13} /></div></div>
  return <div className={'wprev wp-' + size} style={st}>{body}</div>
}
