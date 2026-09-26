import { useEffect, useState } from 'react'
import { useColl, useSettings, put, patch, remove } from '../../store/store.js'
import { useTimerState, useTick, elapsed, startStopwatch, startPomodoro, pause, resume, stop, skipPhase, setTimerTask } from '../../lib/timer.js'
import { today, fmtClock, fmtDur } from '../../engine/date.js'
import { Card, Icon, Ring, Field, openSheet } from '../../components/ui.jsx'
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
  const live = t && !t.paused && t.phase !== 'break' ? Math.floor((Date.now() - t.segStart) / 60000) : 0
  const total = todayS.reduce((a, s) => a + s.dur, 0) + live
  const sub = t && subjects.find((s) => s.id === t.subjectId)
  const isPomo = t?.mode === 'pomodoro'
  const left = isPomo ? Math.max(0, (t.phaseStart + t.phaseLen - (t.paused ? t.pausedAt : Date.now())) / 1000) : 0
  const phaseRatio = isPomo ? 1 - left / (t.phaseLen / 1000) : 0

  return (
    <div className="grid two">
      <div className="col">
        <Card className="timer-card">
          {t ? (
            <div className="col" style={{ alignItems: 'center', gap: 10 }}>
              <div className="row small muted">
                <span className="dot" style={{ background: sub?.color }} />{sub?.name || '과목 없음'} · {isPomo ? (t.phase === 'work' ? `집중 ${t.cycle}회차` : '휴식') : '스톱워치'}{t.paused ? ' · 일시정지' : ''}
              </div>
              {isPomo ? (
                <Ring value={phaseRatio} size={190} stroke={7} color={t.phase === 'work' ? sub?.color || 'var(--accent)' : 'var(--c2)'}>
                  <div className="big-clock">{fmtClock(left)}</div>
                  <div className="tiny muted">누적 {fmtClock(elapsed(t) / 1000)}</div>
                </Ring>
              ) : <div className="big-clock xl">{fmtClock(elapsed(t) / 1000)}</div>}
              <select className="input" style={{ maxWidth: 320 }} value={t.taskId || ''} onChange={(e) => setTimerTask(e.target.value || null, tasks.find((x) => x.id === e.target.value)?.subjectId)}>
                <option value="">연결할 할 일 (선택)</option>
                {tasks.filter((x) => !x.done && !x.archived).map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
              </select>
              <div className="row">
                {t.paused ? <button className="btn primary" onClick={resume}><Icon name="play" size={16} />계속</button> : <button className="btn" onClick={pause}><Icon name="pause" size={16} />일시정지</button>}
                {isPomo && <button className="btn" onClick={skipPhase}>건너뛰기</button>}
                <button className="btn danger" onClick={stop}><Icon name="stop" size={16} />종료·기록</button>
              </div>
            </div>
          ) : (
            <div className="col" style={{ alignItems: 'center', gap: 12, padding: '10px 0' }}>
              <Ring value={total / (st.goalDaily || 1)} size={150} stroke={7}>
                <div style={{ fontSize: '1.4em', fontWeight: 'var(--fw-b)' }}>{fmtDur(total)}</div>
                <div className="tiny muted">목표 {fmtDur(st.goalDaily)}</div>
              </Ring>
              <div className="row">
                <button className="btn primary" onClick={() => startPomodoro(subjects[0]?.id)}><Icon name="clock" size={16} />뽀모도로 {st.pomodoro.work}분</button>
              </div>
              <div className="tiny muted">아래에서 과목을 눌러 스톱워치를 시작하세요</div>
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
        {st.modules.mock !== false && <MockExam />}
        <WakeCard />
      </div>
    </div>
  )
}

function WakeCard() {
  const [on, setOn] = useState(false)
  return (
    <Card title="화면 켜짐 유지" action={<input type="checkbox" className="sw" checked={on} onChange={async (e) => { const ok = await keepAwake(e.target.checked); setOn(e.target.checked && ok) }} />}>
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
