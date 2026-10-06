// 리포트 이미지 (1080폭, 길이는 내용만큼) — 앱 본문 폰트, 작고 얇은 글씨 · 가는 선 · 넉넉한 여백
// 테마: app(앱 색) · light · dark · paper
const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb
const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`

export const REPORT_THEMES = [['app', '앱 색'], ['light', '밝게'], ['dark', '어둡게'], ['paper', '종이']]
const PAL = {
  light: { bg: '#fbfaf7', ink: '#2c2f36', soft: '#9a968e', acc: '#55658a', rule: '#e6e2da' },
  dark: { bg: '#23272f', ink: '#e7e5e0', soft: '#8c919c', acc: '#b3a6cf', rule: '#383d48' },
  paper: { bg: '#f1f1f0', ink: '#33353a', soft: '#94958f', acc: '#6e7a52', rule: '#dedfd9', grain: true },
}
function palette(theme) {
  if (PAL[theme]) return PAL[theme]
  return { bg: css('--bg', '#f7f6f2'), ink: css('--text', '#2b2a28'), soft: css('--muted', '#9a958c'), acc: css('--accent', '#4a5a78'), rule: css('--line', '#e4e0d8') }
}
function setup(theme) {
  const T = palette(theme), font = css('--font', '-apple-system, sans-serif')
  const c = document.createElement('canvas'), g = c.getContext('2d')
  const f = (size, w = 300) => `${w} ${size}px ${font}`
  const spaced = (s, size, x, y, color, right) => { g.font = f(size, 400); g.fillStyle = color; const sp = size * 0.18; let w = 0; for (const ch of s) w += g.measureText(ch).width + sp; let cx = right ? x - w + sp : x; for (const ch of s) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp } }
  return { T, c, g, f, spaced }
}
// 종이 결: 하얀 수채화지처럼 오톨도톨한 요철 (회색만, 누런 기 없음) — 실패하면 고운 입자
const RELIEF = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='480'%3E%3Cfilter id='p' x='0' y='0' width='100%25' height='100%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.075' numOctaves='3' seed='7' stitchTiles='stitch'/%3E%3CfeDiffuseLighting lighting-color='%23fff' surfaceScale='1.1'%3E%3CfeDistantLight azimuth='225' elevation='68'/%3E%3C/feDiffuseLighting%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)' opacity='.36'/%3E%3C/svg%3E"
async function paperGrain(g, W, H) {
  try {
    const img = new Image(); img.src = RELIEF; await img.decode()
    const t = document.createElement('canvas'); t.width = t.height = 480; t.getContext('2d').drawImage(img, 0, 0)
    t.getContext('2d').getImageData(0, 0, 1, 1) // 그릴 수 없는 브라우저면 여기서 실패
    g.fillStyle = g.createPattern(t, 'repeat'); g.fillRect(0, 0, W, H); return
  } catch {}
  const N = 256, t = document.createElement('canvas'); t.width = t.height = N
  const x = t.getContext('2d'), im = x.createImageData(N, N)
  for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() < 0.5 ? 0 : 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = Math.random() * 18 }
  x.putImageData(im, 0, 0)
  g.fillStyle = g.createPattern(t, 'repeat'); g.fillRect(0, 0, W, H)
}
const finish = async (c, g, T, ops, W, y) => {
  c.width = W; c.height = Math.max(Math.round(W * 0.8), y)
  g.fillStyle = T.bg; g.fillRect(0, 0, W, c.height); g.textBaseline = 'top'
  if (T.grain) await paperGrain(g, W, c.height)
  for (const op of ops) op()
  return await new Promise((res) => c.toBlob(res, 'image/png'))
}

// 월 달력 칸 (칸 진하기 = 목표 대비, 칸 안에 공부 시간) → 높이
function calGrid(ctx, x0, y0, w, { month, values, goal, weekStartDow = 1 }, draw = true) {
  const { g, f, T } = ctx
  const y = +month.slice(0, 4), mo = +month.slice(5, 7) - 1, n = new Date(y, mo + 1, 0).getDate()
  const lead = (new Date(y, mo, 1).getDay() - weekStartDow + 7) % 7, rows = Math.ceil((lead + n) / 7)
  const gap = 8, cw = (w - gap * 6) / 7, ch = Math.round(cw * 0.86), head = 40
  const h = head + rows * ch + (rows - 1) * gap
  if (!draw) return h
  g.font = f(18); g.fillStyle = T.soft
  for (let i = 0; i < 7; i++) { const s = '일월화수목금토'[(i + weekStartDow) % 7]; g.fillText(s, x0 + i * (cw + gap) + (cw - g.measureText(s).width) / 2, y0) }
  for (let d = 1; d <= n; d++) {
    const k = `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, v = values[k] || 0, r = Math.min(1, v / (goal || 1))
    const p = lead + d - 1, cx = x0 + (p % 7) * (cw + gap), cy = y0 + head + Math.floor(p / 7) * (ch + gap)
    g.fillStyle = v ? T.acc : T.rule; g.globalAlpha = v ? 0.14 + 0.66 * r : 0.45
    g.beginPath(); g.roundRect ? g.roundRect(cx, cy, cw, ch, 10) : g.rect(cx, cy, cw, ch); g.fill(); g.globalAlpha = 1
    const tc = r >= 0.6 ? T.bg : T.ink
    g.font = f(18); g.fillStyle = r >= 0.6 ? T.bg : T.soft; g.fillText(String(d), cx + 12, cy + 10)
    if (v) { g.font = f(24); g.fillStyle = tc; const s = hm(v); g.fillText(s, cx + cw - 12 - g.measureText(s).width, cy + ch - 34) }
  }
  return h
}

export async function drawReport(d, secs, lines, title, { theme = 'app', head = 'DAILY REPORT', dateTxt } = {}) {
  await document.fonts.ready.catch(() => {})
  const W = 1080, P = 96, IW = W - P * 2
  const ctx = setup(theme), { T, c, g, f, spaced } = ctx
  const { ink, soft, acc, rule } = T
  const TH = 200 // 큰 숫자 굵기 (얇게)
  const fit = (text, size, maxW) => { g.font = f(size); let s = String(text); if (g.measureText(s).width <= maxW) return s; while (s && g.measureText(s + '…').width > maxW) s = s.slice(0, -1); return s + '…' }
  const wrap = (text, size, maxW) => { g.font = f(size); const out = []; let cur = ''; for (const ch of String(text)) { if (g.measureText(cur + ch).width > maxW && cur) { out.push(cur); cur = ch } else cur += ch } if (cur) out.push(cur); return out }
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h) }
  const ops = []; let y = P
  const add = (h, fn) => { const y0 = y; ops.push(() => fn(y0)); y += h }
  if (!dateTxt) { const dd0 = new Date(d.date + 'T00:00'); dateTxt = `${dd0.getFullYear()}. ${dd0.getMonth() + 1}. ${dd0.getDate()} (${'일월화수목금토'[dd0.getDay()]})` }
  const pct = Math.round(Math.min(1, d.mins / (d.goal || 1)) * 100)
  // 가는 막대 + 바닥선 + (있으면) 목표 점선
  const bars = (vals, labels, bh, goal) => add(bh + 66, (y0) => {
    const n = vals.length, gap = n > 20 ? 6 : 12, cw = (IW - gap * (n - 1)) / n, bw = Math.min(n > 20 ? 12 : 18, cw), mx = Math.max(60, goal || 0, ...vals)
    vals.forEach((m, i) => { if (!m) return; const h = Math.max(4, (m / mx) * bh), x = P + i * (cw + gap) + (cw - bw) / 2; g.fillStyle = acc; g.globalAlpha = goal ? (m >= goal ? 1 : 0.55) : 0.4 + 0.6 * (m / mx); rr(x, y0 + bh - h, bw, h, [bw / 2, bw / 2, 2, 2]); g.fill(); if (n <= 7) { g.globalAlpha = 1; g.font = f(18); g.fillStyle = soft; const tv = hm(m); g.fillText(tv, x + bw / 2 - g.measureText(tv).width / 2, y0 + bh - h - 28) } })
    g.globalAlpha = 1; g.fillStyle = rule; g.fillRect(P, y0 + bh, IW, 1.5)
    if (goal) { const gy = y0 + bh - (goal / mx) * bh; g.strokeStyle = soft; g.globalAlpha = 0.6; g.lineWidth = 1.5; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(P, gy); g.lineTo(W - P, gy); g.stroke(); g.setLineDash([]); g.globalAlpha = 1 }
    g.font = f(18); g.fillStyle = soft; labels.forEach((l, i) => { if (!l) return; g.fillText(l, P + i * (cw + gap) + (cw - g.measureText(l).width) / 2, y0 + bh + 16) })
  })

  // 머리: REPORT 글자 · 날짜(크고 얇게)
  add(40, (y0) => spaced(head, 17, P, y0, soft))
  add(84, (y0) => { g.font = f(46, TH); g.fillStyle = ink; g.fillText(dateTxt, P - 2, y0) })

  const secTitle = (k) => add(70, (y0) => { g.fillStyle = rule; g.fillRect(P, y0, IW, 1.2); spaced(title(k, d).toUpperCase(), 17, P, y0 + 30, soft) })

  for (const k of secs) {
    if (k === 'study') {
      // 옅은 바탕 위에 큰 공부 시간 · 진행선 · 요약 숫자 셋 (세로 구분선)
      const stats = d.stats || [['이번 주', hm(d.wk || 0)], ['공부 기록', String(d.sess?.length || 0)], ['끝낸 일', String(d.done.length)]]
      add(330, (y0) => {
        g.fillStyle = acc; g.globalAlpha = 0.06; rr(P - 28, y0, IW + 56, 300, 22); g.fill(); g.globalAlpha = 1
        const X = P + 8, IW2 = IW - 16
        g.font = f(112, TH); g.fillStyle = ink; g.fillText(hm(d.mins), X - 4, y0 + 28); const w = g.measureText(hm(d.mins)).width
        g.font = f(26); g.fillStyle = soft; g.fillText(`/ ${hm(d.goal)}`, X + w + 18, y0 + 102); g.fillStyle = acc; const t2 = `${pct}%`; g.fillText(t2, X + IW2 - g.measureText(t2).width, y0 + 102)
        g.fillStyle = rule; rr(X, y0 + 168, IW2, 5, 3); g.fill(); g.fillStyle = acc; rr(X, y0 + 168, Math.max(6, IW2 * (pct / 100)), 5, 3); g.fill()
        const cw = IW2 / 3
        stats.forEach(([l, v], i) => { const x = X + cw * i + (i ? 28 : 0); if (i) { g.fillStyle = rule; g.fillRect(X + cw * i, y0 + 206, 1.5, 64) } spaced(l, 15, x, y0 + 206, soft); g.font = f(40, TH); g.fillStyle = ink; g.fillText(String(v), x, y0 + 234) })
      })
      add(26, () => {})
      continue
    }
    if (k === 'subjects') {
      if (!d.subs.length) continue
      secTitle(k)
      const tot = d.subs.reduce((a, x) => a + x.m, 0) || 1
      // 과목 비율 띠
      add(46, (y0) => { let x = P; const gap = 4, avail = IW - gap * (d.subs.length - 1); g.save(); rr(P, y0, IW, 12, 6); g.clip(); d.subs.forEach((s2) => { const w = Math.max(6, avail * (s2.m / tot)); g.fillStyle = s2.sub?.color || soft; g.fillRect(x, y0, w, 12); x += w + gap }); g.restore() })
      d.subs.forEach((x, i) => {
        add(62, (y0) => { if (i) { g.strokeStyle = rule; g.lineWidth = 1.2; g.setLineDash([4, 6]); g.beginPath(); g.moveTo(P, y0 - 2); g.lineTo(W - P, y0 - 2); g.stroke(); g.setLineDash([]) }
          g.fillStyle = x.sub?.color || soft; g.beginPath(); g.arc(P + 8, y0 + 28, 7, 0, Math.PI * 2); g.fill()
          g.font = f(27); g.fillStyle = ink; g.fillText(fit(x.sub?.name || '과목 없음', 27, IW - 300), P + 30, y0 + 13)
          const tv = hm(x.m); g.fillText(tv, W - P - g.measureText(tv).width, y0 + 13)
          g.font = f(20); g.fillStyle = soft; const pc = Math.round((x.m / tot) * 100) + '%'; g.fillText(pc, W - P - 120 - g.measureText(pc).width, y0 + 18) })
        for (const n of x.notes) for (const l of wrap(n, 21, IW - 30)) add(32, (y0) => { g.font = f(21); g.fillStyle = soft; g.fillText(l, P + 30, y0 - 6) })
      })
      add(26, () => {}); continue
    }
    if (k === 'hours') {
      if (!d.hours.some(Boolean)) continue
      secTitle(k); add(10, () => {})
      bars(d.hours, d.hours.map((_, i) => ([0, 6, 12, 17].includes(i) ? String(i + 6) + '시' : '')), 120)
      continue
    }
    if (k === 'days') {
      if (!d.days?.some((x) => x.m)) continue
      secTitle(k); add(36, () => {})
      bars(d.days.map((x) => x.m), d.days.map((x) => x.l), 150, d.dayGoal || 0)
      continue
    }
    if (k === 'cal') {
      if (!d.cal) continue
      secTitle(k); add(10, () => {})
      add(calGrid(ctx, P, 0, IW, d.cal, false) + 30, (y0) => calGrid(ctx, P, y0, IW, d.cal))
      continue
    }
    const ls = lines(k, d)
    if (!ls.length) continue
    secTitle(k); add(4, () => {})
    // 표시: 끝낸 것은 채운 작은 네모, 남은 것은 빈 네모, 그 밖은 짧은 선
    const items = ls.map((l) => { const m = /^(✓|–|↺) /.exec(l); return { mark: m ? m[1] : '', text: m ? l.slice(2) : l } })
    const mark = (it, x, y0) => { if (it.mark === '✓') { g.fillStyle = acc; rr(x, y0 + 8, 16, 16, 4); g.fill() } else if (it.mark) { g.strokeStyle = soft; g.lineWidth = 1.6; rr(x + 0.8, y0 + 8.8, 14.4, 14.4, 4); g.stroke() } else { g.fillStyle = soft; g.fillRect(x + 2, y0 + 16, 10, 1.6) } }
    if (ls.length >= 6) {
      const half = Math.ceil(items.length / 2), colW = IW / 2 - 18
      for (let i = 0; i < half; i++) add(46, (y0) => [items[i], items[i + half]].forEach((it, j) => { if (!it) return; const x = P + j * (colW + 36); mark(it, x, y0); g.font = f(24); g.fillStyle = ink; g.fillText(fit(it.text, 24, colW - 32), x + 32, y0) }))
    } else {
      for (const it of items) { const ws2 = wrap(it.text, 26, IW - 34); ws2.forEach((w2, i) => add(i < ws2.length - 1 ? 38 : 50, (y0) => { if (i === 0) mark(it, P, y0 + 1); g.font = f(26); g.fillStyle = ink; g.fillText(w2, P + 34, y0) })) }
    }
    add(26, () => {})
  }
  return finish(c, g, T, ops, W, y + P - 26)
}

// 월별 공부 달력 이미지
export async function drawMonthCal({ month, values, goal = 240, weekStartDow = 1, theme = 'app' }) {
  await document.fonts.ready.catch(() => {})
  const W = 1080, P = 96, IW = W - P * 2
  const ctx = setup(theme), { T, c, g, f, spaced } = ctx
  const y0m = +month.slice(0, 4), mo = +month.slice(5, 7) - 1, n = new Date(y0m, mo + 1, 0).getDate()
  const vals = Array.from({ length: n }, (_, i) => values[`${month.slice(0, 8)}${String(i + 1).padStart(2, '0')}`] || 0)
  const total = vals.reduce((a, v) => a + v, 0), studied = vals.filter(Boolean).length, hit = vals.filter((v) => v >= goal).length
  const ops = []; let y = P
  const add = (h, fn) => { const y0 = y; ops.push(() => fn(y0)); y += h }
  add(80, (y0) => { g.font = f(48, 200); g.fillStyle = T.ink; g.fillText(`${y0m}. ${mo + 1}`, P, y0); spaced('STUDY CALENDAR', 18, W - P, y0 + 22, T.soft, true) })
  add(48, (y0) => { g.fillStyle = T.rule; g.fillRect(P, y0, IW, 1.5) })
  add(calGrid(ctx, P, 0, IW, { month, values, goal, weekStartDow }, false) + 56, (y0) => calGrid(ctx, P, y0, IW, { month, values, goal, weekStartDow }))
  const stats = [['합계', hm(total)], ['공부한 날', `${studied}일`], ['목표 달성', `${hit}일`], ['하루 평균', hm(studied ? Math.round(total / studied) : 0)]]
  add(96, (y0) => { const cw = IW / 4; stats.forEach(([l, v], i) => { const x = P + cw * i; spaced(l, 16, x, y0, T.soft); g.font = f(36, 200); g.fillStyle = T.ink; g.fillText(v, x, y0 + 32) }) })
  return finish(c, g, T, ops, W, y + P - 40)
}
