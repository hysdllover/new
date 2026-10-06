import { useEffect, useState } from 'react'
import { useColl, useSettings, put, patch, remove } from '../../store/store.js'
import { useTimerState, useTick, elapsed, remaining, startStopwatch, startCountdown, pause, resume, stop, setTimerTask } from '../../lib/timer.js'
import { today, fmtClock, fmtDur, fmtTime, tsToMin } from '../../engine/date.js'
import { openRecord } from './Log.jsx'
import { Card, Icon, Ring, Field, Seg, openSheet } from '../../components/ui.jsx'
import { SubjectSelect } from '../../components/common.jsx'
import { keepAwake } from '../../lib/notify.js'

export default function Timer() {
  const st = useSettings()
  const t = useTimerState()
  const subjects = useColl('subjects')
  const sessions = useColl('sessions')
  const tasks = useColl('tasks')
  useTick(!!t)
  const d = today()
  const todayS = sessions.filter((s) => s.date === d)
  const bySub = {}
  for (const s of todayS) bySub[s.subjectId] = (bySub[s.subjectId] || 0) + s.dur
  const live = t && !t.paused ? Math.floor((Date.now() - t.segStart) / 60000) : 0
  const total = todayS.reduce((a, s) => a + s.dur, 0) + live
  const sub = t && subjects.find((s) => s.id === t.subjectId)
  const isCd = t?.mode === 'countdown'
  const left = isCd ? remaining(t) / 1000 : 0

  return (
    <div className="grid two">
      <div className="col">
        <Card className="timer-card">
          {t ? (
            <div className="col" style={{ alignItems: 'center', gap: 10 }}>
              <div className="row small muted">
                <span className="dot" style={{ background: sub?.color }} />{sub?.name || '과목 없음'} · {isCd ? `타이머 ${Math.round(t.target / 60000)}분` : '스톱워치'}{t.paused ? ' · 일시정지' : ''}
              </div>
              {isCd ? (
                <Ring value={1 - left / (t.target / 1000)} size={190} stroke={7} color={sub?.color || 'var(--accent)'}>
                  <div className="big-clock">{fmtClock(left)}</div>
                  <div className="tiny muted">공부 {fmtClock(elapsed(t) / 1000)}</div>
                </Ring>
              ) : <div className="big-clock xl">{fmtClock(elapsed(t) / 1000)}</div>}
              <select className="input" style={{ maxWidth: 320 }} value={t.taskId || ''} onChange={(e) => setTimerTask(e.target.value || null, tasks.find((x) => x.id === e.target.value)?.subjectId)}>
                <option value="">연결할 할 일 (선택)</option>
                {tasks.filter((x) => !x.done && !x.archived).map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
              </select>
              <div className="row">
                {t.paused ? <button className="btn primary" onClick={resume}><Icon name="play" size={16} />계속</button> : <button className="btn" onClick={pause}><Icon name="pause" size={16} />일시정지</button>}
                <button className="btn danger" onClick={stop}><Icon name="stop" size={16} />종료·기록</button>
              </div>
            </div>
          ) : (
            <div className="col" style={{ alignItems: 'center', gap: 12, padding: '10px 0' }}>
              <Ring value={total / (st.goalDaily || 1)} size={150} stroke={7}>
                <div style={{ fontSize: '1.4em', fontWeight: 'var(--fw-b)' }}>{fmtDur(total)}</div>
                <div className="tiny muted">목표 {fmtDur(st.goalDaily)}</div>
              </Ring>
              <StartPanel subjects={subjects} />
            </div>
          )}
        </Card>
        <Card title="과목별 스톱워치" action={<span className="small muted">오늘 {fmtDur(total)}</span>}>
          <div className="list">
            {subjects.map((s) => {
              const running = t?.subjectId === s.id && !t.paused
              const m = (bySub[s.id] || 0) + (t?.subjectId === s.id ? live : 0)
              return (
                <div key={s.id} className="item" style={{ alignItems: 'center' }}>
                  <button className={'play-btn' + (running ? ' on' : '')} style={{ '--c': s.color }} onClick={() => running ? pause() : t?.subjectId === s.id && t.paused ? resume() : startStopwatch(s.id)} aria-label={running ? '일시정지' : '시작'}>
                    <Icon name={running ? 'pause' : 'play'} size={16} fill={running ? 'none' : 'currentColor'} />
                  </button>
                  <span className="t">{s.name}</span>
                  <b className="small">{fmtDur(m)}</b>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
      <div className="col">
        <TodayRecords />
        {st.modules.mock !== false && <MockExam />}
        <WakeCard />
      </div>
    </div>
  )
}

// 시작: 스톱워치(시간 재기) 또는 타이머(정한 시간 뒤 자동 종료) — 둘 다 공부 기록으로 저장
const CD_PRESETS = [25, 30, 45, 50, 60, 90, 120]
function StartPanel({ subjects }) {
  const ls = (k, d) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
  const [mode, setMode] = useState(ls('tmMode', 'stopwatch'))
  const [sub, setSub] = useState(ls('tmSub', null) || subjects[0]?.id)
  const [min, setMin] = useState(+ls('tmMin', 50))
  const remember = (k, v) => { try { localStorage.setItem(k, v) } catch {} }
  const start = () => { remember('tmMode', mode); remember('tmSub', sub || ''); remember('tmMin', min); mode === 'countdown' ? startCountdown(sub, min) : startStopwatch(sub) }
  return (
    <div className="col" style={{ gap: 10, width: '100%', maxWidth: 360 }}>
      <Seg value={mode} onChange={setMode} options={[['stopwatch', '스톱워치'], ['countdown', '타이머']]} />
      <SubjectSelect value={sub} onChange={setSub} allowEmpty={false} />
      {mode === 'countdown' && (
        <div className="row wrap" style={{ gap: 6 }}>
          {CD_PRESETS.map((m) => <button key={m} className={'chip' + (min === m ? ' on' : '')} onClick={() => setMin(m)}>{m < 60 ? m + '분' : m % 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m / 60}시간`}</button>)}
          <input className="input" type="number" inputMode="numeric" min="1" style={{ width: 80 }} value={min} onChange={(e) => setMin(Math.max(1, +e.target.value || 1))} aria-label="분" />
        </div>
      )}
      <button className="btn primary" onClick={start}><Icon name="play" size={16} fill="currentColor" />{mode === 'countdown' ? `${min}분 타이머 시작` : '스톱워치 시작'}</button>
      <div className="tiny muted center">{mode === 'countdown' ? '시간이 다 되면 알림과 함께 자동으로 기록돼요' : '종료하면 공부한 시간이 기록돼요'}</div>
    </div>
  )
}

function TodayRecords() {
  const sessions = useColl('sessions').filter((s) => s.date === today()).sort((a, b) => (b.start ?? 0) - (a.start ?? 0))
  const subjects = useColl('subjects')
  return (
    <Card title="오늘 기록" action={<button className="btn sm" onClick={() => openRecord(null)}><Icon name="plus" size={14} />직접 입력</button>}>
      <div className="list">
        {sessions.map((r) => {
          const sub = subjects.find((s) => s.id === r.subjectId)
          return (
            <button key={r.id} className="item" style={{ textAlign: 'left', alignItems: 'center' }} onClick={() => openRecord(r)}>
              <span className="dot" style={{ background: sub?.color }} />
              <span className="t">{sub?.name}{r.note ? <span className="muted small"> · {r.note.slice(0, 20)}</span> : null}</span>
              <span className="small muted">{r.start != null ? fmtTime(tsToMin(r.start)) : ''}</span>
              <b className="small">{fmtDur(r.dur)}</b>
              <Icon name="edit" size={14} />
            </button>
          )
        })}
        {!sessions.length && <div className="empty">타이머를 멈추면 여기 기록돼요. 눌러서 수정할 수 있어요</div>}
      </div>
    </Card>
  )
}

function WakeCard() {
  const [on, setOn] = useState(false)
  return (
    <Card title="화면 켜짐 유지" action={<input type="checkbox" className="sw" switch="" checked={on} onChange={async (e) => { const ok = await keepAwake(e.target.checked); setOn(e.target.checked && ok) }} />}>
      <div className="small muted">타이머 실행 중에는 자동으로 켜집니다. 공부하는 동안 화면이 꺼지지 않게 합니다 (iOS 16.4+).</div>
    </Card>
  )
}

/* ── 모의고사 타이머 ── */
const SUNEUNG = { name: '수능 시간표', sections: [
  { name: '국어', min: 80 }, { name: '휴식', min: 20, rest: true }, { name: '수학', min: 100 }, { name: '점심', min: 50, rest: true },
  { name: '영어', min: 70 }, { name: '휴식', min: 20, rest: true }, { name: '한국사', min: 30 }, { name: '탐구 1', min: 30 }, { name: '탐구 2', min: 30 },
] }
const loadRun = () => { try { return JSON.parse(localStorage.getItem('mock')) } catch { return null } }

function MockExam() {
  const presets = useColl('mocks')
  const [run, setRunS] = useState(loadRun)
  const setRun = (r) => { setRunS(r); try { r ? localStorage.setItem('mock', JSON.stringify(r)) : localStorage.removeItem('mock') } catch {} }
  useTick(!!run && !run.paused)
  const all = [{ id: 'suneung', ...SUNEUNG }, ...presets]
  const preset = run && all.find((p) => p.id === run.presetId)
  let left = 0, sec = null
  if (run && preset) {
    sec = preset.sections[run.idx]
    const used = (run.paused ? run.pausedAt : Date.now()) - run.sectionStart
    left = Math.max(0, sec.min * 60 - used / 1000)
  }
  const advance = run && preset && left === 0 && !run.paused && run.idx < preset.sections.length - 1
  useEffect(() => { if (advance) { setRun({ ...run, idx: run.idx + 1, sectionStart: Date.now() }); try { navigator.vibrate?.(300) } catch {} } }, [advance]) // eslint-disable-line
  const edit = (id) => openSheet(() => <MockEditor id={id} />, { title: '모의고사 시간표', full: true })
  return (
    <Card title="모의고사 타이머" action={<button className="btn sm" onClick={() => edit(put('mocks', { name: '내 시간표', sections: [{ name: '1교시', min: 50 }] }).id)}><Icon name="plus" size={14} />시간표</button>}>
      {run && preset ? (
        <div className="col" style={{ alignItems: 'center' }}>
          <div className="small muted">{preset.name} · {run.idx + 1}/{preset.sections.length}</div>
          <div className={'big-clock xl' + (sec.rest ? ' muted' : '')}>{fmtClock(left)}</div>
          <b>{sec.name}{sec.rest ? '' : ` (${sec.min}분)`}</b>
          <div className="row">
            {run.paused ? <button className="btn primary" onClick={() => setRun({ ...run, paused: false, sectionStart: run.sectionStart + (Date.now() - run.pausedAt) })}>계속</button>
              : <button className="btn" onClick={() => setRun({ ...run, paused: true, pausedAt: Date.now() })}>일시정지</button>}
            {run.idx < preset.sections.length - 1 && <button className="btn" onClick={() => setRun({ ...run, idx: run.idx + 1, sectionStart: Date.now(), paused: false })}>다음 교시</button>}
            <button className="btn danger" onClick={() => setRun(null)}>종료</button>
          </div>
          <div className="mock-steps">{preset.sections.map((s, i) => <span key={i} className={i < run.idx ? 'done' : i === run.idx ? 'cur' : ''}>{s.name}</span>)}</div>
        </div>
      ) : (
        <div className="list">
          {all.map((p) => (
            <div key={p.id} className="item" style={{ alignItems: 'center' }}>
              <div className="t"><div>{p.name}</div><div className="meta">{p.sections.filter((s) => !s.rest).map((s) => s.name).join(' · ')}</div></div>
              {p.id !== 'suneung' && <button className="icon-btn" onClick={() => edit(p.id)} aria-label="편집"><Icon name="edit" size={16} /></button>}
              <button className="btn sm primary" onClick={() => setRun({ presetId: p.id, idx: 0, sectionStart: Date.now() })}>시작</button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function MockEditor({ id }) {
  const p = useColl('mocks').find((x) => x.id === id)
  if (!p) return null
  const set = (sections) => patch('mocks', id, { sections })
  return (
    <div className="form">
      <Field label="이름"><input className="input" value={p.name} onChange={(e) => patch('mocks', id, { name: e.target.value })} /></Field>
      {p.sections.map((s, i) => (
        <div key={i} className="row">
          <input className="input" value={s.name} onChange={(e) => set(p.sections.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
          <input className="input" type="number" style={{ width: 80 }} value={s.min} onChange={(e) => set(p.sections.map((x, j) => j === i ? { ...x, min: +e.target.value } : x))} />
          <label className="row tiny nowrap"><input type="checkbox" checked={!!s.rest} onChange={(e) => set(p.sections.map((x, j) => j === i ? { ...x, rest: e.target.checked } : x))} />휴식</label>
          <button className="icon-btn" onClick={() => set(p.sections.filter((_, j) => j !== i))} aria-label="삭제"><Icon name="close" size={14} /></button>
        </div>
      ))}
      <button className="btn" onClick={() => set([...p.sections, { name: `${p.sections.length + 1}교시`, min: 50 }])}>교시 추가</button>
      <button className="btn danger" onClick={() => remove('mocks', id)}>시간표 삭제</button>
    </div>
  )
}
