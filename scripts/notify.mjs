// GitHub Actions 에서 5분마다 실행: 동기화 Gist 를 읽어 알림 시각이 된 항목을 Web Push 로 발송
import webpush from 'web-push'
import { matches } from '../src/engine/recurrence.js'
import { reminderTimes, reminderBody, absMinutes, digestDue, digestText, isQuiet, nightMissed, morningBrief, eveningBrief, kindOn, eventKind, eventRemind, notifyLink, handleLate } from '../src/engine/reminders.js'
import { goalFor } from '../src/engine/goal.js'

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
const T0 = Date.now()
const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(T0)).map((p) => [p.type, p.value]))
const date = `${parts.year}-${parts.month}-${parts.day}`
const now = +parts.hour * 60 + +parts.minute
const nowF = now + +parts.second / 60 // 초까지
// 미리 보기: 이 실행이 앞으로 몇 분 안에 올 알림까지 맡아, 그 시각까지 기다렸다가 정확히 보냄
// (GitHub 예약 실행은 5분 간격 → 5분, 외부에서 1분마다 깨우면 1분) · 다음 실행은 이 실행이 끝난 뒤 이어서
const AHEAD = Math.max(0, Math.min(6, +(process.env.NOTIFY_AHEAD ?? (process.env.GITHUB_EVENT_NAME === 'schedule' ? 5 : 1))))
const atMs = (at) => T0 + (at - nowF) * 60000
// GitHub 예약 실행은 몇 시간씩 늦어질 수 있음 → 지난 실행 이후 놓친 시간까지 (최대 6시간) 한 번에 확인
// 지난 실행 시각은 Actions 기록에서 (gist 에는 1시간에 한 번만 남김 · 보낼 게 없을 때 gist 를 매번 고치지 않게)
const meta = sentFile._meta || {}
async function prevRun() {
  const repo = process.env.GITHUB_REPOSITORY, tok = process.env.GITHUB_TOKEN
  if (!repo || !tok) return null
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/notify.yml/runs?status=success&per_page=1`, { headers: { Authorization: `Bearer ${tok}`, Accept: 'application/vnd.github+json' } })
    const t = r.ok ? Date.parse((await r.json()).workflow_runs?.[0]?.run_started_at) : NaN
    return Number.isFinite(t) ? t : null
  } catch { return null }
}
const last = Math.max((await prevRun()) || 0, meta.lastRun || 0)
const since = last ? Math.ceil((Date.now() - last) / 60000) + 1 : WINDOW
const win = Math.min(360, Math.max(WINDOW, since))
const due = (at) => at != null && at <= now + AHEAD && at > now - win

const out = []
const add = (key, at, title, body, url = './') => { if (due(at) && !sentFile[key]) out.push({ key, title, body, url, late: now - at, at }) }
// 실행 기록 저장 — 보낸 알림이 있거나 1시간이 지났을 때만 (앱 설정 ‘마지막 확인’)
const before = JSON.stringify(sentFile)
async function finish(files = {}) {
  const cutoff = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)
  for (const [k, d] of Object.entries(sentFile)) if (!k.startsWith('_') && d < cutoff) delete sentFile[k]
  if (JSON.stringify(sentFile) === before && !Object.keys(files).length && Date.now() - (meta.lastRun || 0) < 55 * 60000) { console.log('바뀐 것 없음 · gist 그대로'); return }
  sentFile._meta = { ...meta, lastRun: Date.now(), lastWin: win }
  await gh(`/gists/${id}`, { method: 'PATCH', body: JSON.stringify({ files: { 'push-sent.json': { content: JSON.stringify(sentFile) }, ...files } }) })
}

// 할 일 알림: 정시·N분 전·하루 전·당일 아침 (날짜를 넘는 알림도 계산)
const nowAbs = absMinutes(date, now)
const digest = settings.digest?.on && kindOn(settings, 'task')
if (digest) {
  // 알림 요약: 요약 시각에만, 다음 요약 전까지의 할 일 알림을 한 번에
  const dg = digestDue(alive(T?.tasks), date, now, settings.digest.times, win)
  if (dg?.items.length && !sentFile[dg.key]) { const x = digestText(dg.items); out.push({ key: dg.key, title: x.title, body: x.body, url: notifyLink.tasks() }) }
}
for (const t of digest || !kindOn(settings, 'task') ? [] : alive(T?.tasks)) {
  for (const r of reminderTimes(t)) {
    const key = `t:${t.id}:${t.due}:${r.off}`
    if (r.at <= nowAbs + AHEAD && r.at > nowAbs - win && !sentFile[key]) out.push({ key, title: t.title, body: reminderBody(t, r.off), url: notifyLink.task(t.id), late: nowAbs - r.at, at: now - (nowAbs - r.at) })
  }
}
for (const e of alive(E?.events)) {
  const rm = eventRemind(e, settings)
  if (e.start == null || rm == null || !kindOn(settings, eventKind(e))) continue
  const on = e.repeat ? matches(e.repeat, e.date, date) : (e.date === date || (e.endDate && date >= e.date && date <= e.endDate))
  if (!on) continue
  add(`e:${e.id}:${date}`, e.start - rm - (e.bufferBefore || 0), e.title, `${hm(e.start)} 시작${e.location ? ' · ' + e.location : ''}`, notifyLink.event(e.id, date))
}
const logs = alive(H?.medLogs)
for (const m of kindOn(settings, 'med') ? alive(H?.meds) : []) {
  if (!m.active) continue
  for (const tm of m.times || []) {
    if (logs.some((l) => l.id === `${m.id}_${date}_${tm}` && l.taken)) continue
    add(`m:${m.id}:${date}:${tm}`, parseT(tm), `${m.name} 복용`, tm, notifyLink.med())
  }
}
// 아침 요약 · 저녁 목표 알림
const sessions = alive(S?.sessions).filter((s) => s.date === date)
const studied = sessions.reduce((a, s) => a + (s.dur || 0), 0)
const morning = parseT(settings.notifyMorning === undefined ? '07:30' : settings.notifyMorning)
if (morning != null && kindOn(settings, 'am')) {
  const evToday = alive(E?.events).filter((e) => e.repeat ? matches(e.repeat, e.date, date) : (e.date === date || (e.endDate && date >= e.date && date <= e.endDate)))
  const x = morningBrief({ date, tasks: alive(T?.tasks), events: evToday, days: alive(E?.days), ddays: alive(S?.ddays) })
  add(`am:${date}`, morning, x.title, x.body, notifyLink.home())
}
const evening = parseT(settings.notifyEvening === undefined ? '21:00' : settings.notifyEvening)
const closed = alive(E?.days).find((x) => x.id === date)?.closed
if (evening != null && kindOn(settings, 'pm') && !closed) {
  const x = eveningBrief({ date, studied, goal: goalFor(settings, date), tasks: alive(T?.tasks) })
  add(`pm:${date}`, evening, x.title, x.body, notifyLink.close())
}

// 자는 시간(취침~기상)엔 보내지 않음 · 기상 때 밤사이 할 일 알림을 한 번에
const wake = settings.dayStart ?? 7 * 60, sleep = settings.dayEnd ?? 1440
if (settings.quietNight !== false) {
  // 자는 시간에 걸린 알림은 보내지 않음 (앞으로 몇 분 안의 것도 그 시각 기준)
  for (let i = out.length - 1; i >= 0; i--) { const n = out[i], m = ((Math.round(n.at ?? now) % 1440) + 1440) % 1440; if (isQuiet(m, wake, sleep)) { sentFile[n.key] = date; out.splice(i, 1) } }
  if (isQuiet(now, wake, sleep) && !out.length) { console.log(`${date} ${hm(now)} 자는 시간 · 보류`); await finish(); process.exit(0) }
  if (now >= wake && now < wake + win && !sentFile[`night:${date}`]) {
    const miss = nightMissed(alive(T?.tasks), date, wake, sleep)
    if (miss.length) { const x = digestText(miss); out.push({ key: `night:${date}`, title: '밤사이 할 일', body: x.body, url: notifyLink.tasks() }) }
  }
}
if (!out.length) { console.log(`${date} ${hm(now)} 보낼 알림 없음 (확인 범위 ${win}분)`); await finish(); process.exit(0) }
// 늦게 도착한 알림: 설정에 따라 묶기 · 건너뛰기 · 하나씩 (건너뛴 것도 보낸 것으로 표시해 다시 안 보냄)
{
  const r = handleLate(out, settings.lateMode || 'bundle', `miss:${date}:${now}`)
  for (const n of r.drop) sentFile[n.key] = date
  out.splice(0, out.length, ...r.send)
  if (!out.length) { console.log(`${date} ${hm(now)} 늦은 알림 ${r.drop.length}개 건너뜀`); await finish(); process.exit(0) }
}

// 선언형 웹 푸시 (iOS 18.4+): 서비스 워커가 깨어나지 않아도 iOS 가 바로 표시 · 앱 아이콘 배지도 함께
// 예전 방식 필드(title·body·url)도 같이 넣어 서비스 워커 처리와 호환
const APP_URL = process.env.APP_URL || settings.appUrl || 'https://hysdllover.github.io/new/'
const badgeN = alive(T?.tasks).filter((t) => !t.done && !t.archived && t.due && t.due <= date).length
const payload = (n) => JSON.stringify({
  web_push: 8030,
  notification: { title: n.title, body: n.body || '', tag: n.key, navigate: new URL(n.url || './', APP_URL).href, silent: false, ...(settings.appBadge !== false ? { app_badge: String(badgeN) } : null) },
  title: n.title, body: n.body, tag: n.key, url: n.url,
})
webpush.setVapidDetails('mailto:study-dashboard@users.noreply.github.com', push.vapid.publicKey, push.vapid.privateKey)
const dead = new Set()
// 앞으로 올 알림이 있으면 보낼 때마다 기록을 저장 (기다리는 중 실행이 끊겨도 두 번 가지 않게)
const saveSent = () => gh(`/gists/${id}`, { method: 'PATCH', body: JSON.stringify({ files: { 'push-sent.json': { content: JSON.stringify(sentFile) } } }) }).catch((e) => console.error('save', e.message))
const waiting = out.some((n) => (n.at ?? now) > nowF)
out.sort((a, b) => (a.at ?? -1e9) - (b.at ?? -1e9))
for (const n of out) {
  const wait = n.at != null ? atMs(n.at) - Date.now() : 0
  if (wait > 0) { console.log('wait', Math.round(wait / 1000) + 's', n.key); await new Promise((r) => setTimeout(r, wait)) }
  for (const s of push.subs) {
    // urgency high: 휴대폰이 절전 중이어도 바로 깨워 전달 (Apple · 구글 푸시 서버 우선 처리)
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload(n), { TTL: 3600, urgency: 'high' }) }
    catch (err) { if (err.statusCode === 404 || err.statusCode === 410) dead.add(s.endpoint); else console.error(err.statusCode, err.body) }
  }
  sentFile[n.key] = date
  console.log('sent', n.key, n.title, `(${Math.round((Date.now() - atMs(n.at ?? nowF)) / 1000)}s)`)
  if (waiting) await saveSent()
}
await finish(dead.size ? { 'push.json': { content: JSON.stringify({ ...push, subs: push.subs.filter((s) => !dead.has(s.endpoint)) }, null, 1) } } : {})
