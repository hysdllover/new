// 영수증 이미지: 화면의 영수증과 같은 구성을 캔버스에 그려 PNG로 (3배 해상도)
const FAM = '"Courier New", Courier, "Noto Serif KR Variable", "Noto Serif KR", serif'
const C = { desk: '#f2f2f1', paper: '#ffffff', ink: '#2b2e35', soft: '#8b9099', x: '#c9a0a8' }

// rows: [kind, a, b] — c(가운데) · no(가운데 흐리게) · h(머리) · l(왼쪽·오른쪽) · i(한 줄) · x(못 끝낸 일) · soft · dash · dbl · sm · blank · bc
export async function drawReceipt(rows, no) {
  await Promise.all(['300', '400'].map((w) => document.fonts.load(`${w} 12px ${FAM}`, '가나다 0123 ABC').catch(() => {})))
  const S = 3, W = 310, M = 22, PX = 18, LH = 20.4
  const gap = { dash: 19, dbl: 25, sm: 6, blank: 24, bc: 50 }
  const bodyH = rows.reduce((a, [k]) => a + (gap[k] ?? LH), 0)
  const PH = 20 + bodyH + 16, H = PH + M * 2 + 14
  const c = document.createElement('canvas'); c.width = (W + M * 2) * S; c.height = H * S
  const g = c.getContext('2d'); g.scale(S, S)
  g.fillStyle = C.desk; g.fillRect(0, 0, W + M * 2, H)
  // 종이 + 위아래 지그재그
  const x0 = M, y0 = M + 7
  g.fillStyle = C.paper; g.fillRect(x0, y0, W, PH)
  g.save(); g.beginPath(); g.rect(x0, 0, W, H); g.clip()
  g.beginPath()
  for (let x = 0; x < W; x += 12) { g.moveTo(x0 + x, y0); g.lineTo(x0 + x + 6, y0 - 6); g.lineTo(x0 + x + 12, y0) }
  for (let x = 0; x < W; x += 12) { g.moveTo(x0 + x, y0 + PH); g.lineTo(x0 + x + 6, y0 + PH + 6); g.lineTo(x0 + x + 12, y0 + PH) }
  g.fill(); g.restore()

  const L = x0 + PX, R = x0 + W - PX
  const font = (w = 300) => `${w} 12px ${FAM}`
  const fit = (s, max) => { s = String(s); if (g.measureText(s).width <= max) return s; while (s && g.measureText(s + '…').width > max) s = s.slice(0, -1); return s + '…' }
  const spaced = (s, cx, y, sp) => { let w = 0; for (const ch of s) w += g.measureText(ch).width + sp; let x = cx - (w - sp) / 2; for (const ch of s) { g.fillText(ch, x, y); x += g.measureText(ch).width + sp } }
  const rule = (y, dash, color = C.soft, w = R - L, from = L) => { g.save(); g.strokeStyle = color; g.globalAlpha = 0.7; g.lineWidth = 1; g.setLineDash(dash); g.beginPath(); g.moveTo(from, y); g.lineTo(from + w, y); g.stroke(); g.restore() }
  g.textBaseline = 'middle'
  let y = y0 + 20
  for (const [k, a, b] of rows) {
    const h = gap[k] ?? LH, mid = y + h / 2
    g.font = font(); g.fillStyle = C.ink
    if (k === 'c') spaced(a, x0 + W / 2, mid, 2.6)
    else if (k === 'no') { g.fillStyle = C.soft; spaced(a, x0 + W / 2, mid, 1) }
    else if (k === 'h' || k === 'i') g.fillText(fit(a, R - L), L, mid)
    else if (k === 'soft') { g.fillStyle = C.soft; g.fillText(a, L, mid) }
    else if (k === 'x') { g.fillStyle = C.x; g.fillText('✗', L, mid); const w = g.measureText('✗ ').width; g.fillStyle = C.ink; g.fillText(fit(a, R - L - w), L + w, mid) }
    else if (k === 'l') { const bw = g.measureText(b).width; g.fillText(fit(a, R - L - bw - 10), L, mid); g.fillText(b, R - bw, mid) }
    else if (k === 'dash') rule(mid, [3, 3])
    else if (k === 'sm') rule(mid, [3, 3], C.soft, (R - L) * 0.42, R - (R - L) * 0.42)
    else if (k === 'dbl') { rule(mid - 1.5, []); rule(mid + 1.5, []) }
    else if (k === 'blank') rule(mid + 6, [], C.soft, (R - L) * 0.8)
    else if (k === 'bc') {
      const w = a.reduce((s, v) => s + v, 0); let x = x0 + W / 2 - w / 2
      g.fillStyle = C.ink; g.globalAlpha = 0.8
      a.forEach((v, i) => { if (!(i % 2)) g.fillRect(x, y + 2, v, 32); x += v })
      g.globalAlpha = 1; g.fillStyle = C.soft; g.font = '300 9.5px ' + FAM; spaced(no, x0 + W / 2, y + 44, 4.5)
    }
    y += h
  }
  return new Promise((res) => c.toBlob(res, 'image/png'))
}
