import { useMemo, useState } from 'react'
import { useColl, useSettings, put, patch, remove } from '../store/store.js'
import { Card, Icon, Empty, Field, AddInput, toast } from '../components/ui.jsx'
import { LineChart } from '../components/charts.jsx'
import { today, addDays, fmtDate, fmtShort, dday, diffDays, fmtDur } from '../engine/date.js'

const MOODS = ['😣', '😕', '😐', '🙂', '😄']

export default function Health() {
  return (
    <div className="grid two">
      <Condition />
      <Meds />
      <HealthLinkCard />
    </div>
  )
}

export function MoodPicker({ value, onChange }) {
  return (
    <div className="row" style={{ gap: 4 }}>
      {MOODS.map((m, i) => <button key={i} className={'mood' + (value === i + 1 ? ' on' : '')} onClick={() => onChange(i + 1)} aria-label={`기분 ${i + 1}`}>{m}</button>)}
    </div>
  )
}

function Condition() {
  const conds = useColl('conditions')
  const sessions = useColl('sessions')
  const d = today()
  const c = conds.find((x) => x.id === d) || { id: d }
  const up = (p) => put('conditions', { ...c, ...p, id: d })
  const byDay = useMemo(() => { const m = {}; for (const s of sessions) m[s.date] = (m[s.date] || 0) + s.dur; return m }, [sessions])
  const days = Array.from({ length: 14 }, (_, i) => addDays(d, i - 13))
  const pts = (f) => days.map((x, i) => [i / 13, f(x)]).filter((p) => p[1] != null)
  // 수면 ↔ 공부시간 비교
  const rows = conds.filter((x) => x.sleep != null && byDay[x.id] != null)
  const good = rows.filter((x) => x.sleep >= 7), bad = rows.filter((x) => x.sleep < 7)
  const avg = (a) => a.length ? Math.round(a.reduce((s, x) => s + byDay[x.id], 0) / a.length) : null
  return (
    <Card title="오늘 컨디션">
      <div className="form">
        {c.steps != null && <div className="small muted">걸음 {c.steps.toLocaleString()}{c.healthAt ? ' · 건강 앱에서 가져옴' : ''}</div>}
        <Field label={`수면 ${c.sleep ?? '-'}시간`}><input type="range" min="0" max="12" step="0.5" value={c.sleep ?? 7} onChange={(e) => up({ sleep: +e.target.value })} /></Field>
        <Field label="기분"><MoodPicker value={c.mood} onChange={(v) => up({ mood: v })} /></Field>
        <Field label="에너지">
          <div className="row" style={{ gap: 4 }}>{[1, 2, 3, 4, 5].map((v) => <button key={v} className={'chip' + (c.energy === v ? ' on' : '')} onClick={() => up({ energy: v })}>{v}</button>)}</div>
        </Field>
        <input className="input" placeholder="메모" value={c.note || ''} onChange={(e) => up({ note: e.target.value })} />
      </div>
      <div className="divider" />
      <div className="tiny muted">최근 14일 · 수면(선) · 기분(점선) · 공부시간(막대 대신 연한 선)</div>
      <LineChart height={120} yMax={12} series={[
        { points: pts((x) => conds.find((y) => y.id === x)?.sleep ?? null), color: 'var(--accent)' },
        { points: pts((x) => { const m = conds.find((y) => y.id === x)?.mood; return m ? m * 2.4 : null }), color: 'var(--c4)', dash: '3 3' },
        { points: pts((x) => (byDay[x] || 0) / 60), color: 'var(--c2)', dash: '1 2' },
      ]} labels={[[0, fmtShort(days[0])], [1, '오늘']]} />
      {good.length > 0 && bad.length > 0 && (
        <div className="small">7시간 이상 잔 날 평균 공부 <b>{fmtDur(avg(good))}</b> · 덜 잔 날 <b>{fmtDur(avg(bad))}</b></div>
      )}
    </Card>
  )
}

function Meds() {
  const meds = useColl('meds')
  const logs = useColl('medLogs')
  const d = today()
  const [edit, setEdit] = useState(null)
  const slots = meds.filter((m) => m.active).flatMap((m) => (m.times?.length ? m.times : ['--']).map((t) => ({ m, t }))).sort((a, b) => a.t.localeCompare(b.t))
  const key = (m, t) => `${m.id}_${d}_${t}`
  const taken = (m, t) => logs.find((l) => l.id === key(m, t))?.taken
  return (
    <Card title="약 · 영양제" action={<span className="small muted">{slots.filter(({ m, t }) => taken(m, t)).length}/{slots.length}</span>}>
      <div className="list">
        {slots.map(({ m, t }) => (
          <div key={m.id + t} className="item" style={{ alignItems: 'center' }}>
            <button className={'check round' + (taken(m, t) ? ' on' : '')} onClick={() => put('medLogs', { id: key(m, t), medId: m.id, date: d, time: t, taken: !taken(m, t) })} aria-label="복용" />
            <span className="t">{m.name}</span>
            <span className="small muted">{t === '--' ? '시간 없음' : t}</span>
          </div>
        ))}
        {!slots.length && <Empty>복용할 약을 추가하면 시간에 맞춰 알려줘요</Empty>}
      </div>
      <div className="divider" />
      <div className="list">
        {meds.map((m) => edit === m.id ? (
          <div key={m.id} className="form" style={{ padding: '8px 0' }}>
            <input className="input" value={m.name} onChange={(e) => patch('meds', m.id, { name: e.target.value })} />
            <Field label="복용 시각">
              <div className="row wrap" style={{ gap: 4 }}>
                {(m.times || []).map((t) => <button key={t} className="chip" onClick={() => patch('meds', m.id, { times: m.times.filter((x) => x !== t) })}>{t} ✕</button>)}
                <input className="input" type="time" style={{ width: 130 }} onChange={(e) => e.target.value && patch('meds', m.id, { times: [...new Set([...(m.times || []), e.target.value])].sort() })} />
              </div>
            </Field>
            <div className="row">
              <button className="btn sm" onClick={() => patch('meds', m.id, { active: !m.active })}>{m.active ? '중단' : '재개'}</button>
              <button className="btn sm danger" onClick={() => remove('meds', m.id)}>삭제</button>
              <button className="btn sm primary" onClick={() => setEdit(null)}>완료</button>
            </div>
          </div>
        ) : (
          <button key={m.id} className="item" style={{ textAlign: 'left' }} onClick={() => setEdit(m.id)}>
            <Icon name="pill" size={16} /><span className="t">{m.name}{!m.active && <span className="muted small"> (중단)</span>}</span><span className="small muted">{(m.times || []).join(', ')}</span>
          </button>
        ))}
      </div>
      <AddInput placeholder="약·영양제 추가" onAdd={(name) => { const r = put('meds', { name, times: ['08:00'], active: true }); setEdit(r.id) }} />
    </Card>
  )
}

// 건강 앱 연동 안내 (단축어 자동화)
export function HealthLinkCard() {
  const url = location.origin + location.pathname + '?health=1&sleep='
  return (
    <Card title="건강 앱에서 수면·걸음 가져오기">
      <div className="small" style={{ lineHeight: 1.75 }}>
        매일 아침 자동으로 어젯밤 수면 시간과 걸음 수를 오늘 컨디션에 넣어요 (단축어 자동화).<br />
        1. <b>단축어</b> › 자동화 › 새로 만들기 › <b>특정 시간</b> (예: 매일 8:00) · <b>즉시 실행</b><br />
        2. <b>건강 샘플 찾기</b>: 유형 ‘수면 분석’, 시작 날짜 ‘지난 1일’, 값 ‘수면 중’ → <b>계산 통계</b> 합계<br />
        3. <b>건강 샘플 찾기</b>: 유형 ‘걸음’, 시작 날짜 ‘어제’ → <b>계산 통계</b> 합계 (선택)<br />
        4. <b>텍스트</b>: 아래 주소 + 수면 합계 + <code>&amp;steps=</code> + 걸음 합계 → <b>URL 열기</b>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <input className="input grow" readOnly value={url} onFocus={(e) => e.target.select()} />
        <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(url); toast('주소를 복사했어요') } catch { toast('주소를 길게 눌러 복사해 주세요') } }}>복사</button>
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>수면 값은 시간·분·초 어느 단위든 알아서 바꿔요. 실행되면 앱이 잠깐 열리며 기록돼요.</div>
    </Card>
  )
}
