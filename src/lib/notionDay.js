// 노션 monologue 용 하루 공부 기록 만들기 (scripts/notion.mjs 에서 사용)
// 그날 할 일(마감일·그날 공부한 할 일) 기준 · 과목별로 묶고 완료 표시 · 시간은 공부 기록 그대로
const ORDER = ['국어', '영어', '생윤', '공부']
const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
export const hm = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`)
const norm = (s) => (s || '').replace(/[\s*\-()'‘’“”/]/g, '')
const live = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, r]) => !r.deleted))

// 메모가 없는 기록을 같은 날 할 일과 이어 붙이기 (제목 앞 두 단어가 메모에 들어 있으면)
function guess(note, tids, all) {
  const n = norm(note)
  if (!n) return null
  let best = null, bs = 0
  for (const k of tids) {
    const toks = (all[k].title || '').replace(/\*/g, ' ').split(/[\s-]+/).map(norm).filter(Boolean)
    if (!toks.length || !toks.slice(0, 2).every((t) => n.includes(t.slice(0, 3)))) continue
    const sc = toks.filter((t) => n.includes(t.slice(0, 3))).length + toks.filter((t) => n.includes(t)).length
    if (sc > bs) { best = k; bs = sc }
  }
  return best
}

export function buildDay({ tasks = {}, sessions = {}, subjects = {}, days = {} }, date) {
  const all = tasks, alive = live(tasks)
  const subs = Object.fromEntries(Object.entries(subjects).map(([k, v]) => [k, v.name]))
  const rows = Object.values(live(sessions)).filter((s) => s.date === date)
  const tids = Object.keys(alive).filter((k) => (alive[k].due || '').slice(0, 10) === date)
  for (const r of rows) if (all[r.taskId] && !tids.includes(r.taskId)) tids.push(r.taskId)
  if (!rows.length && !tids.length) return null

  const min = {}, loose = []
  for (const r of rows) {
    const tid = all[r.taskId] ? r.taskId : guess(r.note, tids, all)
    if (tid) min[tid] = (min[tid] || 0) + (r.dur || 0)
    else loose.push(r)
  }
  const groups = new Map()
  const grp = (n) => { if (!groups.has(n)) groups.set(n, new Map()); return groups.get(n) }
  const put = (g, title, done, m) => {
    const key = title.replace(/\*/g, '').trim(), cur = g.get(key)
    if (cur) { cur.min += m; cur.done = cur.done || done } else g.set(key, { title, done, min: m })
  }
  const sorted = tids.map((k) => all[k]).sort((a, b) => (!!b.done - !!a.done) || ((min[b.id] || 0) - (min[a.id] || 0)))
  for (const t of sorted) {
    const sub = subs[t.subjectId] || subs[rows.find((r) => r.taskId === t.id)?.subjectId] || '기타'
    put(grp(sub), (t.title || '').trim() || '제목 없는 할 일', !!t.done, min[t.id] || 0)
  }
  for (const r of loose) {
    const note = (r.note || '').split('\n').map((x) => x.trim()).filter(Boolean).join(' / ') || '공부'
    put(grp(subs[r.subjectId] || '기타'), note, true, r.dur || 0)
  }
  const names = [...ORDER.filter((n) => groups.has(n)), ...[...groups.keys()].filter((n) => !ORDER.includes(n))]
  const list = names.map((n) => { const items = [...groups.get(n).values()]; return { name: n, items, min: items.reduce((a, i) => a + i.min, 0) } })
  const total = rows.reduce((a, r) => a + (r.dur || 0), 0)
  const items = list.flatMap((g) => g.items)
  const done = items.filter((i) => i.done).length
  const comment = (days[date]?.comment || '').trim()
  const [y, mo, d] = date.split('-').map(Number)
  return {
    date, total, done, count: items.length, comment, groups: list,
    title: `${date.slice(5).replace('-', '.')} ${DOW[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()]}`,
    sessions: rows.length, subjects: names,
  }
}

// 노션 API 형식
const txt = (content, a = {}) => ({ type: 'text', text: { content }, annotations: a })
const gray = (s) => txt(s, { color: 'gray' })
export function notionProps(day) {
  const p = {
    day: { title: [txt(day.title)] },
    date: { date: { start: day.date } },
    minutes: { number: day.total },
    sessions: { number: day.sessions },
    subjects: { multi_select: day.subjects.map((name) => ({ name })) },
    'to-do': { rich_text: [txt(`${day.done}/${day.count}`)] },
  }
  if (day.comment) p['one line'] = { rich_text: [txt(day.comment)] }
  return p
}
export function notionBlocks(day) {
  const b = []
  if (day.comment) b.push({ type: 'quote', quote: { rich_text: [txt(day.comment)], color: 'gray' } })
  b.push({ type: 'paragraph', paragraph: { rich_text: [gray(`total ${hm(day.total)} · done ${day.done}/${day.count}`)] } })
  for (const g of day.groups) {
    b.push({
      type: 'callout',
      callout: {
        rich_text: [txt(g.name, { bold: true }), ...(g.min ? [gray('  ' + hm(g.min))] : [])],
        color: 'gray_background',
        children: [
          { type: 'divider', divider: {} },
          ...g.items.map((i) => ({ type: 'to_do', to_do: { checked: i.done, rich_text: [txt(i.title), ...(i.min ? [gray('  ' + hm(i.min))] : [])] } })),
        ],
      },
    })
  }
  return b
}
