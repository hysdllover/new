// 한 번만 쓰는 점검: 통합이 볼 수 있는 monologue 의 칸 구성과 최근 페이지 모양을 Actions 요약에 표시 (아무것도 고치지 않음)
const T = process.env.NOTION_TOKEN
const nt = async (path, method = 'GET', body) => {
  const r = await fetch('https://api.notion.com/v1' + path, { method, body: body && JSON.stringify(body), headers: { Authorization: `Bearer ${T}`, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json' } })
  return r.json()
}
const note = (s) => console.log('::notice::' + s.replace(/\n/g, ' ¶ ').slice(0, 3800))
const plain = (a) => (a || []).map((t) => t.plain_text).join('')
const all = await nt('/search', 'POST', { filter: { property: 'object', value: 'data_source' }, page_size: 50 })
note('ALL DS: ' + (all.results || []).map((d) => `${plain(d.title)}=${d.id}`).join(' | '))
const r = { results: (all.results || []).filter((d) => /habit|해빗|습관|트래커/i.test(plain(d.title))) }
for (const ds of r.results || []) {
  const d = await nt(`/data_sources/${ds.id}`)
  const props = Object.entries(d.properties || {}).map(([k, v]) => `${k}:${v.type}${v[v.type]?.options ? '[' + v[v.type].options.map((o) => o.name).join('/') + ']' : ''}${v.type === 'formula' ? '{' + v.formula.expression + '}' : ''}`)
  note(`DS ${ds.id} "${plain(d.title)}" parent=${JSON.stringify(d.parent)} props: ${props.join(' | ')}`)
  const q = await nt(`/data_sources/${ds.id}/query`, 'POST', { page_size: 3, sorts: [{ timestamp: 'created_time', direction: 'descending' }] })
  for (const p of q.results || []) {
    const pv = Object.entries(p.properties).map(([k, v]) => { const x = v[v.type]; return `${k}=${Array.isArray(x) ? (x[0]?.plain_text ?? x.map((o) => o.name).join(',')) : typeof x === 'object' && x ? (x.start || x.name || JSON.stringify(x).slice(0, 60)) : x}` })
    const kids = await nt(`/blocks/${p.id}/children?page_size=40`)
    const blocks = (kids.results || []).map((b) => `${b.type}${b.has_children ? '+' : ''}:${plain(b[b.type]?.rich_text).slice(0, 25)}`)
    note(`PAGE ${p.id} icon=${JSON.stringify(p.icon)?.slice(0, 40)} ${pv.join(' | ')} ¶ BLOCKS(${blocks.length}): ${blocks.join(' / ')}`)
  }
}
if (!r.results?.length) note('monologue 데이터 소스를 못 찾음')
