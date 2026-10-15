// GitHub Actions 에서 하루 한 번: 동기화 Gist 의 공부 기록을 노션 monologue 데이터베이스에 하루 한 페이지로 올림
// 최근 DAYS 일만 확인하고, 내용이 바뀐 날만 고침 (보낸 내용 요약은 gist 의 notion-sent.json)
import { createHash } from 'node:crypto'
import { buildDay, notionProps, notionBlocks } from '../src/lib/notionDay.js'

const { GIST_TOKEN, NOTION_TOKEN } = process.env
let DS = process.env.NOTION_DS || '3f96255d-22c8-4606-86a5-fd480c1ade04'
const DAYS = +process.env.DAYS || 3
const FULL = process.env.FULL === 'true'
const DESC = 'study-dashboard-sync'
if (!GIST_TOKEN || !NOTION_TOKEN) { console.log(`::error::시크릿 없음: ${!GIST_TOKEN ? 'GIST_TOKEN ' : ''}${!NOTION_TOKEN ? 'NOTION_TOKEN' : ''}`); process.exit(1) }

const gh = async (path, opt = {}) => {
  const r = await fetch('https://api.github.com' + path, { ...opt, headers: { Authorization: `Bearer ${GIST_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' } })
  if (!r.ok) throw new Error(`GitHub ${r.status} ${path}`)
  return r.json()
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function nt(path, method = 'GET', body) {
  for (let i = 0; ; i++) {
    await sleep(350) // 노션 API: 초당 3회
    const r = await fetch('https://api.notion.com/v1' + path, { method, body: body && JSON.stringify(body), headers: { Authorization: `Bearer ${NOTION_TOKEN}`, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json' } })
    if (r.status === 429 && i < 5) { await sleep((+r.headers.get('retry-after') || 1) * 1000); continue }
    if (!r.ok) throw new Error(`노션 ${r.status} ${path.split('?')[0]} ${(await r.text()).slice(0, 400)}`)
    return r.json()
  }
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

async function main() {
const id = await findGist()
if (!id) { console.log('동기화 Gist 없음'); process.exit(0) }
const g = await gh(`/gists/${id}`)
const [T, E, S] = await Promise.all(['tasks', 'events', 'study'].map((n) => fileJson(g, n + '.json')))
const state = { tasks: T?.tasks, days: E?.days, sessions: S?.sessions, subjects: S?.subjects }
const sent = (await fileJson(g, 'notion-sent.json')) || {}

// 대상 날짜 (한국 시간 기준 오늘부터 DAYS 일 전까지 · FULL 이면 기록이 있는 모든 날)
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
const back = (n) => new Date(Date.parse(today) - n * 86400000).toISOString().slice(0, 10)
const dates = FULL
  ? [...new Set(Object.values(state.sessions || {}).filter((s) => !s.deleted).map((s) => s.date))].filter((d) => d <= today).sort()
  : Array.from({ length: DAYS }, (_, i) => back(DAYS - 1 - i))

// 데이터 소스 확인 — 못 찾으면 통합이 볼 수 있는 'monologue' 를 찾아 씀
async function resolveDS() {
  try { await nt(`/data_sources/${DS}`); return } catch (e) { if (!/ 404 /.test(e.message)) throw e }
  const r = await nt('/search', 'POST', { query: 'monologue', filter: { property: 'object', value: 'data_source' }, page_size: 10 })
  const hit = r.results?.find((x) => (x.title || []).map((t) => t.plain_text).join('').trim().toLowerCase() === 'monologue') || r.results?.[0]
  if (hit) { DS = hit.id; console.log('monologue 데이터 소스:', DS); return }
  const any = await nt('/search', 'POST', { page_size: 10 })
  const names = (any.results || []).map((x) => (x.title || x.properties?.title?.title || Object.values(x.properties || {}).find((p) => p.type === 'title')?.title || []).map((t) => t.plain_text).join('') || '(제목 없음)')
  throw new Error(`통합이 monologue 에 접근할 수 없어요. 지금 볼 수 있는 것 ${names.length}개: ${names.join(', ') || '없음'} — monologue 페이지 ··· → 연결 → study-log 추가`)
}
await resolveDS()

let changed = 0
for (const date of dates) {
  const day = buildDay(state, date)
  if (!day) continue
  const props = notionProps(day), blocks = notionBlocks(day)
  const hash = createHash('sha1').update(JSON.stringify([props, blocks])).digest('hex').slice(0, 12)
  if (sent[date] === hash && !FULL) continue
  const found = await nt(`/data_sources/${DS}/query`, 'POST', { filter: { property: 'date', date: { equals: date } }, page_size: 5 })
  let page = found.results?.[0]?.id
  if (page) {
    await nt(`/pages/${page}`, 'PATCH', { properties: props })
    let cur = null
    do {
      const kids = await nt(`/blocks/${page}/children?page_size=100${cur ? '&start_cursor=' + cur : ''}`)
      for (const b of kids.results) await nt(`/blocks/${b.id}`, 'DELETE')
      cur = kids.has_more ? kids.next_cursor : null
    } while (cur)
    await nt(`/blocks/${page}/children`, 'PATCH', { children: blocks })
  } else {
    page = (await nt('/pages', 'POST', { parent: { type: 'data_source_id', data_source_id: DS }, properties: props, children: blocks })).id
  }
  sent[date] = hash
  changed++
  console.log(`${date} ${day.title} · ${day.done}/${day.count} · ${day.total}분`)
}

// 30일 지난 기록 정리 후 저장
for (const d of Object.keys(sent)) if (d < back(30)) delete sent[d]
if (changed) await gh(`/gists/${id}`, { method: 'PATCH', body: JSON.stringify({ files: { 'notion-sent.json': { content: JSON.stringify(sent) } } }) })
console.log(changed ? `${changed}일 올림` : '바뀐 날 없음')
}
// 실패 이유를 Actions 요약(Annotations)에 바로 보이게
main().catch((e) => { console.log(`::error::${String(e?.cause?.message || e?.message || e).slice(0, 900).replace(/\n/g, ' ')}`); process.exit(1) })
