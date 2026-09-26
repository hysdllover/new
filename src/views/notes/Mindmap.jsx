import { useState } from 'react'
import { patch } from '../../store/store.js'
import { newBlock, noteTitle } from '../../lib/notes.js'
import { AddInput } from '../../components/ui.jsx'

// 노트 블록 → 트리: 제목1 > 제목2 > 나머지 블록
function toTree(note) {
  const root = { id: 'root', text: noteTitle(note), children: [], lvl: 0 }
  let h1 = null, h2 = null
  for (const b of note.blocks || []) {
    if (!b.text || ['divider', 'embed', 'sync', 'file'].includes(b.type)) continue
    const node = { id: b.id, text: b.text.replace(/\[\[|\]\]/g, ''), children: [], type: b.type }
    if (b.type === 'h1') { node.lvl = 1; root.children.push(node); h1 = node; h2 = null }
    else if (b.type === 'h2') { node.lvl = 2; (h1 || root).children.push(node); h2 = node }
    else { node.lvl = 3; (h2 || h1 || root).children.push(node) }
  }
  return root
}

function layout(root) {
  const nodes = [], edges = []
  let row = 0
  const walk = (n, depth) => {
    n.x = depth
    if (!n.children.length) n.y = row++
    else { n.children.forEach((c) => walk(c, depth + 1)); n.y = (n.children[0].y + n.children[n.children.length - 1].y) / 2 }
    nodes.push(n)
    n.children.forEach((c) => edges.push([n, c]))
  }
  walk(root, 0)
  return { nodes, edges, rows: Math.max(1, row) }
}

const COLORS = ['var(--accent)', 'var(--c3)', 'var(--c2)', 'var(--muted)']

export default function Mindmap({ note }) {
  const [sel, setSel] = useState('root')
  const { nodes, edges, rows } = layout(toTree(note))
  const CW = 170, RH = 40
  const W = (Math.max(...nodes.map((n) => n.x)) + 1) * CW + 20, H = rows * RH + 20
  const X = (n) => 10 + n.x * CW, Y = (n) => 10 + n.y * RH + RH / 2
  const add = (text) => {
    const blocks = [...(note.blocks || [])]
    const selNode = nodes.find((n) => n.id === sel)
    const type = !selNode || selNode.lvl === 0 ? 'h1' : selNode.lvl === 1 ? 'h2' : 'bullet'
    // 선택한 노드의 구간 끝에 삽입
    let at = blocks.length
    if (selNode && selNode.lvl > 0) {
      const i = blocks.findIndex((b) => b.id === sel)
      at = i + 1
      const stop = selNode.lvl === 1 ? ['h1'] : selNode.lvl === 2 ? ['h1', 'h2'] : null
      if (stop) while (at < blocks.length && !stop.includes(blocks[at].type)) at++
    }
    blocks.splice(at, 0, newBlock(type, text))
    patch('notes', note.id, { blocks })
  }
  return (
    <div className="col">
      <div className="card mindmap" style={{ padding: 8 }}>
        <div className="scroll-x">
          <svg width={W} height={H} style={{ minWidth: W }}>
            {edges.map(([a, b]) => <path key={a.id + b.id} d={`M${X(a) + 130} ${Y(a)} C${X(a) + 150} ${Y(a)}, ${X(b) - 20} ${Y(b)}, ${X(b)} ${Y(b)}`} fill="none" stroke="var(--line)" strokeWidth="1.5" />)}
            {nodes.map((n) => (
              <g key={n.id} onClick={() => setSel(n.id)} style={{ cursor: 'pointer' }}>
                <rect x={X(n)} y={Y(n) - 14} width={130} height={28} rx={n.lvl === 0 ? 14 : 7}
                  fill={n.lvl === 0 ? 'var(--accent)' : 'var(--surface)'} stroke={sel === n.id ? 'var(--text)' : COLORS[Math.min(n.lvl, 3)]} strokeWidth={sel === n.id ? 1.8 : 1} />
                <text x={X(n) + 65} y={Y(n) + 4} textAnchor="middle" fontSize="11" fill={n.lvl === 0 ? '#fff' : 'var(--text)'}>{n.text.length > 11 ? n.text.slice(0, 10) + '…' : n.text}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
      <AddInput placeholder={`'${(nodes.find((n) => n.id === sel)?.text || '').slice(0, 12)}' 아래에 가지 추가`} onAdd={add} />
      <div className="tiny muted">제목1·제목2·목록 구조가 가지가 됩니다. 노드를 눌러 선택 후 가지를 추가하세요.</div>
    </div>
  )
}
