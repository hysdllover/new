import { useMemo, useState } from 'react'
import { useColl } from '../../store/store.js'
import { linksOf, noteTitle } from '../../lib/notes.js'
import { openNote, setParams, go } from '../../nav.js'
import { Card, Toggle, Empty } from '../../components/ui.jsx'

// 간단한 힘 기반 배치 (고정 반복 횟수 → 결정적 결과)
function simulate(nodes, edges, W, H) {
  const n = nodes.length
  nodes.forEach((p, i) => { const a = (i / n) * Math.PI * 2; p.x = W / 2 + Math.cos(a) * W * .3; p.y = H / 2 + Math.sin(a) * H * .3; p.vx = 0; p.vy = 0 })
  const idx = Object.fromEntries(nodes.map((p, i) => [p.id, i]))
  for (let it = 0; it < 260; it++) {
    const k = 1 - it / 260
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = nodes[i], b = nodes[j]
      let dx = a.x - b.x, dy = a.y - b.y
      const d2 = Math.max(80, dx * dx + dy * dy)
      const f = 2200 / d2
      dx *= f; dy *= f
      a.vx += dx; a.vy += dy; b.vx -= dx; b.vy -= dy
    }
    for (const [s, t] of edges) {
      const a = nodes[idx[s]], b = nodes[idx[t]]
      if (!a || !b) continue
      const dx = b.x - a.x, dy = b.y - a.y
      const d = Math.sqrt(dx * dx + dy * dy) || 1
      const f = (d - 90) * 0.02
      a.vx += dx / d * f * 10; a.vy += dy / d * f * 10; b.vx -= dx / d * f * 10; b.vy -= dy / d * f * 10
    }
    for (const p of nodes) {
      p.vx += (W / 2 - p.x) * 0.004; p.vy += (H / 2 - p.y) * 0.004
      p.x += Math.max(-20, Math.min(20, p.vx)) * k; p.y += Math.max(-20, Math.min(20, p.vy)) * k
      p.vx *= .5; p.vy *= .5
      p.x = Math.max(40, Math.min(W - 40, p.x)); p.y = Math.max(20, Math.min(H - 20, p.y))
    }
  }
  return nodes
}

export default function Graph() {
  const notes = useColl('notes').filter((n) => n.type !== 'daily')
  const subjects = useColl('subjects'), projects = useColl('projects')
  const [hubs, setHubs] = useState(true)
  const W = 700, H = 520
  const { nodes, edges } = useMemo(() => {
    const byTitle = Object.fromEntries(notes.map((n) => [(n.title || '').trim(), n.id]))
    const nodes = notes.map((n) => ({ id: n.id, label: noteTitle(n), kind: 'note', color: subjects.find((s) => s.id === n.subjectId)?.color }))
    const edges = []
    for (const n of notes) for (const t of linksOf(n)) if (byTitle[t] && byTitle[t] !== n.id) edges.push([n.id, byTitle[t]])
    if (hubs) {
      for (const s of subjects) if (notes.some((n) => n.subjectId === s.id)) { nodes.push({ id: 's:' + s.id, label: s.name, kind: 'hub', color: s.color }); notes.filter((n) => n.subjectId === s.id).forEach((n) => edges.push([n.id, 's:' + s.id])) }
      for (const p of projects) if (notes.some((n) => n.projectId === p.id)) { nodes.push({ id: 'p:' + p.id, label: p.name, kind: 'hub', color: p.color }); notes.filter((n) => n.projectId === p.id).forEach((n) => edges.push([n.id, 'p:' + p.id])) }
    }
    return { nodes: simulate(nodes, edges, W, H), edges }
  }, [notes, subjects, projects, hubs])
  const pos = Object.fromEntries(nodes.map((p) => [p.id, p]))
  const deg = {}
  edges.forEach(([a, b]) => { deg[a] = (deg[a] || 0) + 1; deg[b] = (deg[b] || 0) + 1 })
  if (!notes.length) return <Empty>노트에 [[다른 노트 제목]] 을 쓰면 연결이 그려져요</Empty>
  return (
    <Card>
      <Toggle label="과목 · 프로젝트 허브 표시" checked={hubs} onChange={setHubs} />
      <svg viewBox={`0 0 ${W} ${H}`} className="graph">
        {edges.map(([a, b], i) => pos[a] && pos[b] && <line key={i} x1={pos[a].x} y1={pos[a].y} x2={pos[b].x} y2={pos[b].y} stroke="var(--line)" strokeWidth={b.includes(':') ? 1 : 1.6} strokeDasharray={b.includes(':') ? '3 3' : null} />)}
        {nodes.map((p) => (
          <g key={p.id} style={{ cursor: 'pointer' }} onClick={() => p.kind === 'hub' ? (setParams('notes', { hubId: p.id }), go('notes', 'hub')) : openNote(p.id)}>
            <circle cx={p.x} cy={p.y} r={p.kind === 'hub' ? 11 : 5 + Math.min(8, (deg[p.id] || 0) * 1.5)} fill={p.kind === 'hub' ? 'var(--surface)' : p.color || 'var(--accent)'} stroke={p.color || 'var(--accent)'} strokeWidth={p.kind === 'hub' ? 2 : 0} />
            <text x={p.x} y={p.y + (p.kind === 'hub' ? 26 : 20)} textAnchor="middle" fontSize="11" fill={p.kind === 'hub' ? 'var(--muted)' : 'var(--text)'}>{p.label.length > 12 ? p.label.slice(0, 11) + '…' : p.label}</text>
          </g>
        ))}
      </svg>
    </Card>
  )
}
