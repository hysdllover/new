// GitHub Actions 에서 5~10분마다 실행: 동기화 Gist 를 읽어 알림 시각이 된 항목을 Web Push 로 발송
import webpush from 'web-push'
import { matches } from '../src/engine/recurrence.js'
import { reminderTimes, reminderBody, absMinutes } from '../src/engine/reminders.js'

const TOKEN = process.env.GIST_TOKEN
const DESC = 'study-dashboard-sync'
const WINDOW = 15 // 분: 이 안에 도래한 알림을 보냄 (중복은 sent 로 방지)
if (!TOKEN) { console.log('GIST_TOKEN 시크릿이 없어 건너뜀'); process.exit(0) }

const gh = async (path, opt = {}) => {
  const r = await fetch('https://api.github.com' + path, { ...opt, headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' } })
  if (!r.ok) throw new Error(`GitHub ${r.status} ${path}`)
  return r.json()
}
async function findGist() {
  if (process.env.GIST_ID) return process.env.GIST_ID
  for (let p = 1; p <= 5; p++) {
    const list = await gh(`/gists?per_page=100&page=${p}`)
    const g = list.find((x) => x.description === DESC)
    if (g) return g.id
    if (list.length < 100) break
  }
  return null
}
async function fileJson(g, name) {
  const f = g.files?.[name]
  if (!f) return null
  const text = f.truncated ? await (await fetch(f.raw_url)).text() : f.content
  try { return JSON.parse(text) } catch { return null }
}
const alive = (o) => Object.values(o || {}).filter((r) => !r.deleted)
const hm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const parseT = (t) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }

const id = await findGist()
if (!id) { console.log('동기화 Gist 없음'); process.exit(0) }
const g = await gh(`/gists/${id}`)
const push = await fileJson(g, 'push.json')
if (!push?.subs?.length || !push.vapid) { console.log('푸시 구독 없음'); process.exit(0) }
const sentFile = (await fileJson(g, 'push-sent.json')) || {}
const [T, E, S, H, ST] = await Promise.all(['tasks', 'events', 'study', 'health', 'settings'].map((n) => fileJson(g, n + '.json')))
const settings = ST?.settings?.main || {}
if (settings.notify === false) { console.log('알림 꺼짐'); process.exit(0) }

// 사용자 시간대의 현재 날짜·분
const tz = push.tz || 'Asia/Seoul'
const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map((p) => [p.type, p.value]))
const date = `${parts.year}-${parts.month}-${parts.day}`
const now = +parts.hour * 60 + +parts.minute
const due = (at) => at != null && at <= now && at > now - WINDOW

const out = []
const add = (key, at, title, body, url = './') => { if (due(at) && !sentFile[key]) out.push({ key, title, body, url }) }

// 할 일 알림: 정시·N분 전·하루 전·당일 아침 (날짜를 넘는 알림도 계산)
const nowAbs = absMinutes(date, now)
for (const t of alive(T?.tasks)) {
  for (const r of reminderTimes(t)) {
    const key = `t:${t.id}:${t.due}:${r.off}`
    if (r.at <= nowAbs && r.at > nowAbs - WINDOW && !sentFile[key]) out.push({ key, title: t.title, body: reminderBody(t, r.off), url: './' })
  }
}
for (const e of alive(E?.events)) {
  if (e.start == null || e.remind == null) continue
  const on = e.repeat ? matches(e.repeat, e.date, date) : (e.date === date || (e.endDate && date >= e.date && date <= e.endDate))
  if (!on) continue
  add(`e:${e.id}:${date}`, e.start - e.remind - (e.bufferBefore || 0), e.title, `${hm(e.start)} 시작${e.location ? ' · ' + e.location : ''}`)
}
const logs = alive(H?.medLogs)
for (const m of alive(H?.meds)) {
  if (!m.active) continue
  for (const tm of m.times || []) {
    if (logs.some((l) => l.id === `${m.id}_${date}_${tm}` && l.taken)) continue
    add(`m:${m.id}:${date}:${tm}`, parseT(tm), `${m.name} 복용`, tm)
  }
}
// 아침 요약 · 저녁 목표 알림
const sessions = alive(S?.sessions).filter((s) => s.date === date)
const studied = sessions.reduce((a, s) => a + (s.dur || 0), 0)
const morning = parseT(settings.notifyMorning ?? '07:30')
if (morning != null) {
  const todo = alive(T?.tasks).filter((t) => !t.done && !t.archived && t.due && t.due <= date).length
  const reviews = alive(S?.reviews).filter((r) => !r.done && r.next && r.next <= date).length
  const dd = alive(S?.ddays).filter((d) => d.date >= date).sort((a, b) => a.date.localeCompare(b.date))[0]
  const ddTxt = dd ? ` · ${dd.title} D-${Math.round((new Date(dd.date) - new Date(date)) / 86400000)}` : ''
  add(`am:${date}`, morning, '오늘의 공부', `할 일 ${todo}개${reviews ? ` · 복습 ${reviews}개` : ''}${ddTxt}`)
}
const evening = parseT(settings.notifyEvening ?? '21:00')
const goal = settings.goalDaily || 240
if (evening != null && studied < goal) add(`pm:${date}`, evening, '오늘 공부 기록', `지금까지 ${studied}분 · 목표까지 ${goal - studied}분`, './')

if (!out.length) { console.log(`${date} ${hm(now)} 보낼 알림 없음`); process.exit(0) }

webpush.setVapidDetails('mailto:study-dashboard@users.noreply.github.com', push.vapid.publicKey, push.vapid.privateKey)
const dead = new Set()
for (const n of out) {
  for (const s of push.subs) {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify({ title: n.title, body: n.body, tag: n.key, url: n.url }), { TTL: 3600 }) }
    catch (err) { if (err.statusCode === 404 || err.statusCode === 410) dead.add(s.endpoint); else console.error(err.statusCode, err.body) }
  }
  sentFile[n.key] = date
  console.log('sent', n.key, n.title)
}
// 3일 지난 발송 기록 정리
const cutoff = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)
for (const [k, d] of Object.entries(sentFile)) if (d < cutoff) delete sentFile[k]
const files = { 'push-sent.json': { content: JSON.stringify(sentFile) } }
if (dead.size) files['push.json'] = { content: JSON.stringify({ ...push, subs: push.subs.filter((s) => !dead.has(s.endpoint)) }, null, 1) }
await gh(`/gists/${id}`, { method: 'PATCH', body: JSON.stringify({ files }) })
