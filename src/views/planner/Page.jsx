// 오늘 페이지: 노트 한 장 — 날짜 · 오늘의 하나 · 할 일 · 일정 · 메모 + 오른쪽 10분 공부 시간표(새벽 5시~다음 날 4시)
// 타이머 기록은 과목 색으로 자동 칠해지고(계획은 옅게), 스티커로 꾸밀 수 있음 · A4 한 장으로 인쇄
import { useState, useRef } from 'react'
import { useColl, useRec, useSettings, find } from '../../store/store.js'
import { goalFor } from '../../engine/goal.js'
import { printPlanner } from '../../lib/plannerPrint.js'
import { shareBlob } from '../../lib/shareCard.js'
import { myFontCSS } from '../../lib/fonts.js'
import MoodWeather from '../../components/MoodWeather.jsx'
import { dayRec, setDay, toggleTask } from '../../store/actions.js'
import { eventsOn } from '../../engine/scheduler.js'
import { parseYmd, fmtTime, tsToMin, diffDays } from '../../engine/date.js'
import { Check, AutoText, toast } from '../../components/ui.jsx'
import { StickerLayer, StickerTray, addSticker } from '../../components/Stickers.jsx'

const WDE = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const H0 = 5, HN = 24 // 5시부터 24줄
const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`

export default function Page({ date }) {
  const [deco, setDeco] = useState(false)
  const pageRef = useRef(null), [busy, setBusy] = useState(false)
  // 보이는 그대로 이미지로 (모노톤): 화면 지면을 그린 뒤 회색조로 바꿔 공유 시트 · 저장
  const saveShot = async () => {
    const node = pageRef.current; if (!node) return
    setBusy(true)
    try {
      const { toCanvas, getFontEmbedCSS } = await import('html-to-image')
      // 글꼴까지 화면 그대로: 앱 글꼴(스타일시트) + 내 폰트(파일)
      const th = st.theme || {}, mine = [th.font, th.headFont, th.noteFont, th.handFont].filter((k) => k?.startsWith('my:')).map((k) => k.slice(3))
      const fontEmbedCSS = [await getFontEmbedCSS(node).catch(() => ''), await myFontCSS(mine).catch(() => '')].join('\n')
      const opt = { fontEmbedCSS, filter: (n) => !(n.tagName === 'TEXTAREA' && !n.value), pixelRatio: 3, backgroundColor: getComputedStyle(node).backgroundColor || getComputedStyle(document.body).backgroundColor }
      let c
      try { await toCanvas(node, opt); c = await toCanvas(node, opt) } catch { c = await toCanvas(node, { ...opt, skipFonts: true }) } // 사파리: 두 번째에 글자까지 그려짐
      const g = c.getContext('2d'), im = g.getImageData(0, 0, c.width, c.height), px = im.data
      for (let i = 0; i < px.length; i += 4) { const v = Math.round(px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114); px[i] = px[i + 1] = px[i + 2] = v }
      g.putImageData(im, 0, 0)
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'))
      if (!blob) throw new Error('image')
      await shareBlob(blob, `오늘페이지-${date}.png`)
    } catch { toast('이미지를 만들지 못했어요') }
    setBusy(false)
  }
  const tasks = useColl('tasks'), subjects = useColl('subjects'), sessions = useColl('sessions').filter((s) => s.date === date)
  useRec('days', date); useColl('events')
  const day = dayRec(date), plan = day.grid || {}
  const st = useSettings(), ddays = useColl('ddays').filter((x) => x.date >= date).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || a.date.localeCompare(b.date))
  const dd = ddays[0], dn = dd ? diffDays(dd.date, date) : 0
  const d = parseYmd(date)
  const color = (id) => subjects.find((s) => s.id === id)?.color || 'var(--accent)'
  const list = tasks.filter((t) => !t.archived && t.due === date).sort((a, b) => (a.dueTime == null) - (b.dueTime == null) || (a.dueTime ?? 0) - (b.dueTime ?? 0) || (a.order ?? 0) - (b.order ?? 0))
  const evs = eventsOn(date)
  const one = day.one?.taskId ? find('tasks', day.one.taskId)?.title : day.one?.text
  // 10분 칸: 실제 기록(진하게) · 계획(옅게) — 자정 넘은 기록(0~4시)은 아래쪽 줄로
  const actual = {}
  for (const s of sessions) { if (s.start == null) continue; const a = tsToMin(s.start); for (let m = Math.floor(a / 10) * 10; m < a + (s.dur || 0); m += 10) actual[(m % 1440) / 10] = s.subjectId }
  const total = sessions.reduce((a, s) => a + (s.dur || 0), 0)
  const bySub = subjects.map((s) => ({ s, m: sessions.filter((x) => x.subjectId === s.id).reduce((a, x) => a + (x.dur || 0), 0) })).filter((x) => x.m)
  return (
    <div className="col">
      <div className="row no-print" style={{ gap: 6 }}>
        <button className={'btn sm' + (deco ? ' on-acc' : '')} onClick={() => setDeco(!deco)}>{deco ? '꾸미기 끝' : '스티커'}</button>
        <span className="grow" />
        <button className="btn sm" disabled={busy} onClick={saveShot}>{busy ? '만드는 중…' : '이미지 저장'}</button>
        <button className="btn sm" onClick={() => printPlanner('day', date)}>인쇄 (A4)</button>
      </div>
      {deco && <StickerTray onPick={(k, c) => addSticker(date, k, c)} />}
      <div className="npage" ref={pageRef}>
        <StickerLayer date={date} editable={deco} />
        <div className="np-head">
          <span className="np-date">{WDE[d.getDay()]}, {d.getMonth() + 1}/{d.getDate()}/{d.getFullYear()}</span>
          {dd && <span className="np-dd">{dd.title} {dn === 0 ? 'D-day' : 'D-' + dn}</span>}
          <span className="np-st">Study Time <b>{hm(total)}</b> <span className="muted">/ {hm(goalFor(st, date))}</span></span>
        </div>
        <MoodWeather date={date} />
        <div className="np-body">
          <div className="np-left">
            {one && <section><div className="np-cap">오늘의 하나</div><div className="np-one">{one}</div></section>}
            <section>
              <div className="np-cap">할 일 {list.length ? `${list.filter((t) => t.done).length}/${list.length}` : ''}</div>
              {list.map((t) => <div key={t.id} className={'np-row' + (t.done ? ' done' : '') + (t.hl ? ' hl' : '')} style={t.hl ? { '--hlc': color(t.subjectId) } : undefined}><Check on={t.done} onClick={() => toggleTask(t.id)} color={subjects.find((s) => s.id === t.subjectId)?.color} /><span className="grow np-tw"><span className="ttl">{t.title}</span></span>{t.dueTime != null && <span className="tiny muted">{fmtTime(t.dueTime)}</span>}</div>)}
              {!list.length && <div className="np-line" />}
            </section>
            {evs.length > 0 && <section><div className="np-cap">일정</div>{evs.map((e, i) => <div key={i} className="np-row"><span className="np-ev" style={{ background: e.color || 'var(--accent)' }} /><span className="grow">{e.title}</span><span className="tiny muted">{e.start != null ? fmtTime(e.start) : '종일'}</span></div>)}</section>}
            {bySub.length > 0 && <section><div className="np-cap">과목별</div>{bySub.map((x) => <div key={x.s.id} className="np-row"><span className="np-ev" style={{ background: x.s.color }} /><span className="grow">{x.s.name}</span><span className="tiny muted">{hm(x.m)}</span></div>)}</section>}
            <section className="grow">
              <div className="np-cap">메모</div>
              <AutoText className="np-memo" value={day.comment || ''} placeholder="오늘 한 줄 일기" onChange={(v) => setDay(date, { comment: v })} />
            </section>
          </div>
          <div className="np-grid" aria-label="10분 공부 시간표">
            {Array.from({ length: HN }, (_, i) => {
              const h = (H0 + i) % 24
              return (
                <div key={i} className="np-gr">
                  <span className="np-h">{h % 12 || 12}</span>
                  {Array.from({ length: 6 }, (_, k) => { const idx = h * 6 + k, a = actual[idx], p = plan[idx]; return <i key={k} style={a ? { background: color(a) } : p ? { background: `color-mix(in srgb, ${color(p)} 25%, transparent)` } : null} /> })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
