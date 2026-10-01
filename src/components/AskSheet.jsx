// 내 기록에 물어보기 — 앱 안에서 바로 답 + 단축어(애플 인텔리전스 ‘모델 사용’)로 AI 답
import { useState } from 'react'
import { useColl, useSettings, setSettings } from '../store/store.js'
import { today } from '../engine/date.js'
import { answer, contextFor, aiPrompt } from '../lib/ask.js'
import { toast } from './ui.jsx'

const EXAMPLES = ['이번 주 공부 몇 시간?', '지난주 가장 많이 한 과목', '미룬 할 일', '이번 달 수학 몇 시간', '시험 며칠 남았어?', '오늘 남은 할 일', '이번 주 무슨 요일에 많이 했어?']
const lastAi = () => { try { return JSON.parse(localStorage.getItem('aiAnswer') || 'null') } catch { return null } }

export default function AskSheet({ initial = '' }) {
  const tasks = useColl('tasks'), sessions = useColl('sessions'), subjects = useColl('subjects'), ddays = useColl('ddays')
  const st = useSettings()
  const [q, setQ] = useState(initial)
  const [res, setRes] = useState(null)
  const data = { tasks, sessions, subjects, ddays, today: today(), weekStart: st.weekStart ?? 1 }
  const ask = (text = q) => { setQ(text); setRes(answer(text, data) || { none: true }) }
  const name = st.aiShortcut || '스터디 AI'
  const ai = () => {
    if (!q.trim()) return toast('질문을 먼저 적어 주세요')
    const prompt = aiPrompt(q.trim(), contextFor(data))
    try { localStorage.setItem('aiPending', JSON.stringify({ q: q.trim(), at: Date.now() })) } catch {}
    location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(name)}&input=text&text=${encodeURIComponent(prompt)}`
  }
  const prev = lastAi()
  const back = location.origin + location.pathname + '?ai='
  return (
    <div className="col">
      <form className="row" onSubmit={(e) => { e.preventDefault(); ask() }}>
        <input className="input grow" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="예: 이번 주 수학 몇 시간 했어?" enterKeyHint="search" />
        <button className="btn primary">묻기</button>
      </form>
      <div className="row wrap" style={{ gap: 6 }}>{EXAMPLES.map((x) => <button key={x} className="chip sm" onClick={() => ask(x)}>{x}</button>)}</div>
      {res && !res.none && (
        <div className="card ask-ans">
          <b>{res.text}</b>
          {res.lines?.length > 0 && <ul>{res.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>}
        </div>
      )}
      {res?.none && <div className="small muted">앱 안에서 바로 답할 수 없는 질문이에요. 아래 AI 로 물어보세요.</div>}
      <button className="btn" onClick={ai}>애플 인텔리전스에게 묻기 (단축어 ‘{name}’)</button>
      {prev && <div className="card ask-ans"><div className="tiny muted">지난 AI 답 · {prev.q}</div><div style={{ whiteSpace: 'pre-wrap' }}>{prev.a}</div></div>}
      <details className="more">
        <summary>처음 한 번만: 단축어 만들기</summary>
        <div className="small" style={{ lineHeight: 1.75, marginTop: 6 }}>
          1. <b>단축어</b> › ＋ 새 단축어 › 이름 <b>{name}</b><br />
          2. 동작 <b>모델 사용</b> (애플 인텔리전스) · 모델: 기기 내 또는 비공개 클라우드 컴퓨팅 · 요청: <b>단축어 입력</b><br />
          3. 동작 <b>URL 인코딩</b> (응답) → <b>텍스트</b>: 아래 주소 + 인코딩한 응답 → <b>URL 열기</b><br />
          <span className="muted">질문과 함께 최근 30일 공부·할 일·D-day 요약만 넘어가요. iOS 26 · 애플 인텔리전스 지원 기기 필요.</span>
        </div>
        <div className="row" style={{ marginTop: 6 }}>
          <input className="input grow" readOnly value={back} onFocus={(e) => e.target.select()} />
          <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(back); toast('주소를 복사했어요') } catch { toast('주소를 길게 눌러 복사해 주세요') } }}>복사</button>
        </div>
        <input className="input" style={{ marginTop: 6 }} defaultValue={name} placeholder="단축어 이름" onBlur={(e) => setSettings({ aiShortcut: e.target.value.trim() || null })} />
      </details>
    </div>
  )
}
