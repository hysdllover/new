// 리포트 이미지 (1080폭, 길이는 내용만큼) — 앱 본문 폰트, 작고 얇은 글씨 · 가는 선 · 넉넉한 여백
// 테마: app(앱 색) · light · dark · paper
const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb
const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`

export const REPORT_THEMES = [['app', '앱 색'], ['light', '밝게'], ['dark', '어둡게'], ['paper', '종이']]
const PAL = {
  light: { bg: '#fbfaf7', ink: '#2c2f36', soft: '#9a968e', acc: '#55658a', rule: '#e6e2da' },
  dark: { bg: '#23272f', ink: '#e7e5e0', soft: '#8c919c', acc: '#b3a6cf', rule: '#383d48' },
  paper: { bg: '#f3eee3', ink: '#3b372f', soft: '#9c927f', acc: '#6e7a52', rule: '#ddd4c2' },
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
const finish = async (c, g, T, ops, W, y) => {
  c.width = W; c.height = Math.max(Math.round(W * 0.8), y)
  g.fillStyle = T.bg; g.fillRect(0, 0, W, c.height); g.textBaseline = 'top'
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
  const W = 1080, P = 104, IW = W - P * 2
  const ctx = setup(theme), { T, c, g, f, spaced } = ctx
  const { ink, soft, acc, rule } = T
  const TH = 200 // 큰 숫자 굵기 (얇게)
  const fit = (text, size, maxW) => { g.font = f(size); let s = String(text); if (g.measureText(s).width <= maxW) return s; while (s && g.measureText(s + '…').width > maxW) s = s.slice(0, -1); return s + '…' }
  const wrap = (text, size, maxW) => { g.font = f(size); const out = []; let cur = ''; for (const ch of String(text)) { if (g.measureText(cur + ch).width > maxW && cur) { out.push(cur); cur = ch } else cur += ch } if (cur) out.push(cur); return out }
  const ops = []; let y = P
  const add = (h, fn) => { const y0 = y; ops.push(() => fn(y0)); y += h }
  if (!dateTxt) { const dd0 = new Date(d.date + 'T00:00'); dateTxt = `${dd0.getFullYear()}. ${dd0.getMonth() + 1}. ${dd0.getDate()} (${'일월화수목금토'[dd0.getDay()]})` }
  const pct = Math.round(Math.min(1, d.mins / (d.goal || 1)) * 100)
  const bars = (vals, labels, bh) => add(bh + 64, (y0) => { const n = vals.length, gap = n > 20 ? 5 : 8, bw = (IW - gap * (n - 1)) / n, mx = Math.max(60, ...vals); vals.forEach((m, i) => { const h = Math.max(2, (m / mx) * bh); g.fillStyle = m ? acc : rule; g.globalAlpha = m ? 0.35 + 0.65 * (m / mx) : 1; g.fillRect(P + i * (bw + gap), y0 + bh - h, bw, h) }); g.globalAlpha = 1; g.font = f(18); g.fillStyle = soft; labels.forEach((l, i) => { if (!l) return; g.fillText(l, P + i * (bw + gap) + (bw - g.measureText(l).width) / 2, y0 + bh + 14) }) })

  // 머리: 날짜 · REPORT + 가는 선
  add(58, (y0) => { g.font = f(24); g.fillStyle = soft; g.fillText(dateTxt, P, y0); spaced(head, 18, W - P, y0 + 4, soft, true) })
  add(60, (y0) => { g.fillStyle = rule; g.fillRect(P, y0, IW, 1.5) })

  const secTitle = (k) => add(54, (y0) => { spaced(title(k, d).toUpperCase(), 18, P, y0, soft); g.fillStyle = rule; g.fillRect(P, y0 + 40, IW, 1) })

  for (const k of secs) {
    if (k === 'study') {
      // 큰 공부 시간 + 목표·% + 가는 진행선 + 요약 숫자 셋
      add(118, (y0) => { g.font = f(104, TH); g.fillStyle = ink; g.fillText(hm(d.mins), P - 4, y0); const w = g.measureText(hm(d.mins)).width; g.font = f(26); g.fillStyle = soft; g.fillText(`/ ${hm(d.goal)}`, P + w + 18, y0 + 68); g.fillStyle = acc; const t2 = `${pct}%`; g.fillText(t2, W - P - g.measureText(t2).width, y0 + 68) })
      add(52, (y0) => { g.fillStyle = rule; g.fillRect(P, y0 + 14, IW, 2); g.fillStyle = acc; g.fillRect(P, y0 + 13, Math.max(4, IW * (pct / 100)), 4) })
      const stats = d.stats || [['이번 주', hm(d.wk || 0)], ['공부 기록', String(d.sess?.length || 0)], ['끝낸 일', String(d.done.length)]]
      add(140, (y0) => { const cw = IW / 3; stats.forEach(([l, v], i) => { const x = P + cw * i; spaced(l, 16, x, y0, soft); g.font = f(40, TH); g.fillStyle = ink; g.fillText(String(v), x, y0 + 34) }) })
      continue
    }
    if (k === 'subjects') {
      if (!d.subs.length) continue
      secTitle(k); add(18, () => {})
      const mx = d.subs[0].m || 1
      for (const x of d.subs) {
        add(66, (y0) => { g.font = f(28); g.fillStyle = ink; g.fillText(fit(x.sub?.name || '과목 없음', 28, IW - 200), P, y0); const tv = hm(x.m); g.fillStyle = soft; g.fillText(tv, W - P - g.measureText(tv).width, y0); g.fillStyle = rule; g.fillRect(P, y0 + 46, IW, 1.5); g.fillStyle = x.sub?.color || acc; g.fillRect(P, y0 + 45, Math.max(4, IW * (x.m / mx)), 3.5) })
        for (const n of x.notes) for (const l of wrap(n, 22, IW)) add(34, (y0) => { g.font = f(22); g.fillStyle = soft; g.fillText(l, P, y0 - 6) })
      }
      add(30, () => {}); continue
    }
    if (k === 'hours') {
      if (!d.hours.some(Boolean)) continue
      secTitle(k); add(24, () => {})
      bars(d.hours, d.hours.map((_, i) => ([0, 6, 12, 17].includes(i) ? String(i + 6) : '')), 110)
      continue
    }
    if (k === 'days') {
      if (!d.days?.some((x) => x.m)) continue
      secTitle(k); add(24, () => {})
      bars(d.days.map((x) => x.m), d.days.map((x) => x.l), 130)
      continue
    }
    if (k === 'cal') {
      if (!d.cal) continue
      secTitle(k); add(24, () => {})
      add(calGrid(ctx, P, 0, IW, d.cal, false) + 30, (y0) => calGrid(ctx, P, y0, IW, d.cal))
      continue
    }
    const ls = lines(k, d)
    if (!ls.length) continue
    secTitle(k); add(22, () => {})
    // 목록이 길면 두 단으로
    const items = ls.map((l) => { const m = /^(✓|–|↺) /.exec(l); return { mark: m ? m[1] : '', text: m ? l.slice(2) : l } })
    if (ls.length >= 6) {
      const half = Math.ceil(items.length / 2), colW = IW / 2 - 18
      for (let i = 0; i < half; i++) add(46, (y0) => [items[i], items[i + half]].forEach((it, j) => { if (!it) return; const x = P + j * (colW + 36); g.font = f(24); if (it.mark) { g.fillStyle = it.mark === '✓' ? acc : soft; g.fillText(it.mark, x, y0) } g.fillStyle = ink; g.fillText(fit(it.text, 24, colW - (it.mark ? 34 : 0)), x + (it.mark ? 34 : 0), y0) }))
    } else {
      for (const it of items) { const ws2 = wrap(it.text, 26, IW - (it.mark ? 36 : 0)); ws2.forEach((w2, i) => add(i < ws2.length - 1 ? 38 : 48, (y0) => { g.font = f(26); if (i === 0 && it.mark) { g.fillStyle = it.mark === '✓' ? acc : soft; g.fillText(it.mark, P, y0) } g.fillStyle = ink; g.fillText(w2, P + (it.mark ? 36 : 0), y0) })) }
    }
    add(30, () => {})
  }
  return finish(c, g, T, ops, W, y + P - 30)
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
