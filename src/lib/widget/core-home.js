// 위젯 본체 (홈 화면 위젯 형태별) — Scriptable 에서 실행되는 코드를 글자로 담음. 네 조각을 이어 붙여 본체가 됨
// 템플릿 문자열 안: 백슬래시는 두 번, 백틱 금지
export default () => `  } else if (KIND === 'study') {
    // ── 공부 (시간 위주) ──
    const dayMins = {}
    for (const x of allSess) dayMins[x.date] = (dayMins[x.date] || 0) + (x.dur || 0)
    const ymdOff = (k) => { const d = new Date(d0); d.setDate(d.getDate() - k); return ymd(d) }
    const last7 = [6, 5, 4, 3, 2, 1, 0].map((k) => ({ d: ymdOff(k), m: dayMins[ymdOff(k)] || 0, wd: new Date(ymdOff(k) + 'T00:00').getDay() }))
    const ws = st.weekStart ?? 1, back = (d0.getDay() - ws + 7) % 7
    let week = 0; for (let k = 0; k <= back; k++) week += dayMins[ymdOff(k)] || 0
    const yday = dayMins[ymdOff(1)] || 0
    const avg = Math.round(last7.reduce((a, x) => a + x.m, 0) / 7)
    // 최근 7일 막대 (오늘은 진하게, 목표선 점선)
    const bars = (parent, width, height) => {
      const c = new DrawContext(); c.size = new Size(width, height); c.opaque = false; c.respectScreenScale = true
      const max = Math.max(goal, ...last7.map((x) => x.m)), bw = (width - 6 * 6) / 7
      const gy = height - (goal / max) * height
      c.setFillColor(new Color(dark() ? '#353b45' : '#d3d9e0')); for (let x = 0; x < width; x += 4) c.fillRect(new Rect(x, gy, 2, 0.6))
      last7.forEach((x, i) => {
        const h = Math.max(1.5, (x.m / max) * height)
        c.setFillColor(new Color(dark() ? '#9fadc4' : '#66778f', i === 6 ? 1 : 0.35 + 0.4 * Math.min(1, x.m / goal)))
        const p = new Path(); p.addRoundedRect(new Rect(i * (bw + 6), height - h, bw, h), 2, 2); c.addPath(p); c.fillPath()
      })
      const img = parent.addImage(c.getImage()); img.imageSize = new Size(width, height)
      parent.addSpacer(3)
      const lr = parent.addStack(); lr.spacing = 6
      last7.forEach((x, i) => { const k = lr.addStack(); k.size = new Size((width - 36) / 7, 10); k.centerAlignContent(); t(k, ['S', 'M', 'T', 'W', 'T', 'F', 'S'][x.wd], label(7), i === 6 ? GOLD : SOFT) })
    }
    const stat = (parent, k, v, color = INK) => { const c = parent.addStack(); c.layoutVertically(); t(c, k, label(7), SOFT); c.addSpacer(2); t(c, v, tw(13), color).minimumScaleFactor = 0.7 }
    const r = w.addStack(); r.centerAlignContent(); cap(r, 'STUDY'); r.addSpacer(); t(r, dateStr, label(8), SOFT)
    if (TM) { w.addSpacer(4); const k = w.addStack(); k.centerAlignContent(); t(k, '● ' + TM.name + (TM.paused ? ' 일시정지 ' : ' 공부 중 '), label(8), GOLD); if (TM.paused) t(k, hm(TM.pm), label(8), GOLD); else { const dd2 = timerDate(k, 8); dd2.font = label(8); dd2.textColor = GOLD }; k.addSpacer() }
    w.addSpacer(fam === 'small' ? 8 : 10)
    if (fam === 'small') {
      studyBig(w, 30, inner)
      w.addSpacer()
      const s2 = w.addStack(); stat(s2, 'WEEK', hm(week)); s2.addSpacer(); stat(s2, 'YESTERDAY', hm(yday), GOLD)
    } else if (fam === 'medium') {
      const row = w.addStack()
      const L = row.addStack(); L.layoutVertically(); L.size = new Size(150, 104)
      studyBig(L, 34, 150); L.addSpacer()
      const s2 = L.addStack(); stat(s2, 'WEEK', hm(week)); s2.addSpacer(); stat(s2, 'YESTERDAY', hm(yday), GOLD); s2.addSpacer()
      row.addSpacer(16); vrule(row, 104); row.addSpacer(16)
      const R = row.addStack(); R.layoutVertically(); R.size = new Size(inner - 182.6, 0)
      bars(R, inner - 183, 78); R.addSpacer()
      row.addSpacer()
    } else {
      studyBig(w, 44, inner)
      w.addSpacer(14)
      const s2 = w.addStack(); stat(s2, 'WEEK', hm(week)); s2.addSpacer(); stat(s2, '7-DAY AVG', hm(avg)); s2.addSpacer(); stat(s2, 'YESTERDAY', hm(yday), GOLD)
      w.addSpacer(14)
      bars(w, inner, 70)
      w.addSpacer(14); rule(w, inner); w.addSpacer(10)
      subBars(w, inner, 3)
    }
  } else if (KIND === 'class') {
    // ── 시간표: 오늘 남은 수업 · 오늘 끝났으면 다음 수업일 · 대형은 이번 주 표 ──
    const WDS = ['일', '월', '화', '수', '목', '금', '토']
    const offD = (k) => { const d = new Date(d0); d.setDate(d.getDate() + k); return d }
    const clsOf = (key) => (data.classes && data.classes[key]) || []
    if (fam === 'large' || fam === 'extraLarge') {
      const h = w.addStack(); h.centerAlignContent(); cap(h, 'THIS WEEK'); h.addSpacer(); t(h, dateStr, label(8), SOFT)
      w.addSpacer(10)
      const wd0 = (d0.getDay() + 6) % 7, cols = []
      for (let k = 0; k < 7; k++) { const d = offD(k - wd0), key = ymd(d), l = clsOf(key); if (l.length || k < 5) cols.push({ key, wd: d.getDay(), l }) }
      const np = cols.some((c) => c.l.length) ? Math.max(1, ...cols.map((c) => c.l.reduce((a, x) => Math.max(a, x.period), 0))) : 0
      const cellBg = (a) => inkMode === 'light' ? new Color('#ffffff', a * 1.6) : inkMode === 'dark' ? new Color('#1e232b', a) : dyn('#2a2f38', '#e6e9ee', a)
      const pw = 14, gap = 3, cw = Math.floor((inner - pw - gap * cols.length) / cols.length), rh = Math.max(16, Math.min(34, Math.floor((innerH - 44) / np) - gap))
      if (np) { const hr = w.addStack(); hr.spacing = gap; const hp = hr.addStack(); hp.size = new Size(pw, 12)
      for (const c of cols) { const s = hr.addStack(); s.size = new Size(cw, 12); s.centerAlignContent(); t(s, WDS[c.wd], c.key === today ? F(9, 'Medium') : label(9), c.key === today ? INK : SOFT) }
      w.addSpacer(4) }
      for (let p = 1; p <= np; p++) {
        const r = w.addStack(); r.spacing = gap; const pc = r.addStack(); pc.size = new Size(pw, rh); pc.centerAlignContent(); t(pc, p, tw(9), SOFT)
        for (const c of cols) {
          const x = c.l.find((y) => y.period === p), cell = r.addStack(); cell.size = new Size(cw, rh); cell.cornerRadius = 4; cell.centerAlignContent(); cell.setPadding(0, 2, 0, 2)
          const now = c.key === today && x && x.start <= nm && x.end > nm
          if (x) { cell.backgroundColor = cellBg(now ? 0.16 : c.key === today ? 0.09 : 0.05); cell.addSpacer(); const tx = t(cell, x.title, tw(cols.length > 5 ? 9 : 10), now ? GOLD : c.key < today ? SOFT : INK); tx.minimumScaleFactor = 0.6; cell.addSpacer() }
        }
        w.addSpacer(gap)
      }
      if (!np) t(w, '이번 주 수업이 없어요', tw(13), SOFT)
    } else {
      // 오늘 남은 수업이 없으면 다음 수업일 (앞으로 7일 안)
      let key = today, L = CL, head = 'CLASSES', sub = dateStr
      if (!CL.some((c) => c.end > nm)) for (let k = 1; k < 8; k++) { const d = offD(k), kk = ymd(d); if (clsOf(kk).length) { key = kk; L = clsOf(kk); head = k === 1 ? 'TOMORROW' : 'NEXT'; sub = (d.getMonth() + 1) + '/' + d.getDate() + ' ' + WDS[d.getDay()]; break } }
      const h = w.addStack(); h.centerAlignContent(); cap(h, head); h.addSpacer(); t(h, sub, label(8), SOFT)
      w.addSpacer(fam === 'small' ? 8 : 10)
      const max = fam === 'small' ? 6 : 5, live = key === today
      const st0 = live ? Math.max(0, Math.min(L.findIndex((c) => c.end > nm), L.length - max)) : 0
      for (const c of L.slice(st0, st0 + max)) {
        const r = w.addStack(); r.centerAlignContent(); r.spacing = 8
        const col = live && c === clCur ? GOLD : live && c.end <= nm ? SOFT : INK
        const pn = r.addStack(); pn.size = new Size(12, 0); t(pn, c.period, tw(10), SOFT)
        t(r, c.title, tw(fam === 'small' ? 13 : 14), col).minimumScaleFactor = 0.8
        if (fam !== 'small' && c.room) t(r, c.room, tw(10), SOFT)
        r.addSpacer(); t(r, clk(c.start), tw(10), SOFT)
        w.addSpacer(4)
      }
      if (!L.length) t(w, '수업이 없어요', tw(13), SOFT)
    }
  } else if (KIND === 'tbl') {
    // ── 노트 표: 공식표·단어표 (Parameter 표:노트제목) ──
    const TBS = Array.isArray(data.tables) ? data.tables : []
    const tb = (ARG && TBS.find((x) => nzT(x.t).includes(ARG))) || TBS[0]
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'TABLE'); h.addSpacer(); t(h, tb ? tb.t : '', label(8), SOFT).minimumScaleFactor = 0.7
    w.addSpacer(fam === 'small' ? 8 : 10)
    if (!tb) t(w, '노트에 표를 만들어 주세요', tw(12), SOFT)
    else {
      const nr = Math.min(tb.r.length, fam === 'small' || fam === 'medium' ? 4 : 10)
      const nc = Math.max(1, Math.min(fam === 'small' ? 2 : 4, (tb.r[0] || []).length))
      const cw = Math.floor(inner / nc)
      for (let i = 0; i < nr; i++) {
        const row = tb.r[i] || [], r = w.addStack(); r.centerAlignContent()
        const hd = i === 0 && tb.h
        for (let j = 0; j < nc; j++) { const c = r.addStack(); c.size = new Size(cw, 0); const x = t(c, row[j] || '', hd ? label(fam === 'large' ? 10 : 9) : tw(fam === 'large' ? 12 : 11), hd ? SOFT : INK); x.minimumScaleFactor = 0.7; c.addSpacer() }
        if (i < nr - 1) { w.addSpacer(fam === 'large' ? 5 : 3); rule(w, inner); w.addSpacer(fam === 'large' ? 5 : 3) }
      }
    }
  } else if (KIND === 'boardn') {
    // ── 노트 보드: 칸마다 카드 (Parameter 보드:노트제목) ──
    const BDS = Array.isArray(data.boards) ? data.boards : []
    const bd = (ARG && BDS.find((x) => nzT(x.t).includes(ARG))) || BDS[0]
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'BOARD'); h.addSpacer(); t(h, bd ? bd.t : '', label(8), SOFT).minimumScaleFactor = 0.7
    w.addSpacer(fam === 'small' ? 8 : 10)
    if (!bd) t(w, '노트에 보드를 만들어 주세요', tw(12), SOFT)
    else if (fam === 'small') {
      for (const c of bd.c.slice(0, 3)) { const r = w.addStack(); r.centerAlignContent(); t(r, c.n, tw(12), INK).minimumScaleFactor = 0.7; r.addSpacer(); t(r, String(c.k), thin(20), c.k ? INK : SOFT); w.addSpacer(5) }
    } else {
      const nc = Math.max(1, Math.min(bd.c.length, fam === 'medium' ? 3 : 4)), nr = fam === 'medium' ? 3 : 8
      const cw = Math.floor((inner - (nc - 1) * 10) / nc)
      const row = w.addStack(); row.spacing = 10; row.topAlignContent()
      for (const c of bd.c.slice(0, nc)) {
        const col = row.addStack(); col.layoutVertically(); col.size = new Size(cw, 0)
        const hh = col.addStack(); t(hh, c.n, label(9), SOFT).minimumScaleFactor = 0.7; hh.addSpacer(); t(hh, String(c.k), label(9), SOFT)
        col.addSpacer(5)
        for (const x of c.x.slice(0, nr)) { const r = col.addStack(); t(r, x, tw(11), INK, 2).minimumScaleFactor = 0.8; r.addSpacer(); col.addSpacer(4) }
        if (c.k > nr) t(col, '+' + (c.k - nr), label(8), SOFT)
      }
    }
  } else if (KIND === 'photo') {
    // ── 노트 사진: 필기·도식 한 장 (Parameter 사진:노트제목) ──
    const ph = (ARG && PHOTOS.find((x) => nzT(x.t).includes(ARG))) || PHOTOS[0]
    if (!ph) t(w, '노트에 사진을 넣어 주세요', tw(12), SOFT)
    else {
      try { w.backgroundImage = Image.fromData(Data.fromBase64String(ph.d)) } catch (e) {}
      w.addSpacer()
      const cp = w.addStack(); cp.setPadding(3, 8, 3, 8); cp.cornerRadius = 7; cp.backgroundColor = new Color('#1b1d22', 0.42)
      t(cp, ph.t, tw(10), new Color('#ffffff')).minimumScaleFactor = 0.7
    }
  } else if (KIND === 'series') {
    // ── 시리즈 진행: 이름 · 끝낸 수/전체 · 가는 진행선 · 다음 회차 ──
    const SR = data.series || []
    const bar = (parent, wd, k, c) => { if (PENCIL) { const img = parent.addImage(line(k, wd, c || null)); img.imageSize = new Size(wd, 3); return } const o = parent.addStack(); o.size = new Size(wd, 3); o.cornerRadius = 1.5; o.backgroundColor = RULE; if (k > 0) { const i = o.addStack(); i.size = new Size(Math.max(3, Math.round(wd * Math.min(1, k))), 3); i.cornerRadius = 1.5; i.backgroundColor = c ? new Color(c) : GOLD } o.addSpacer() }
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'SERIES'); h.addSpacer(); t(h, dateStr, label(8), SOFT)
    w.addSpacer(fam === 'small' ? 10 : 12)
    if (!SR.length) t(w, '진행 중인 시리즈가 없어요', tw(12), SOFT)
    else if (fam === 'small') {
      const x = SR[0]
      t(w, x.t, tw(12), INK).minimumScaleFactor = 0.7
      w.addSpacer(4)
      const r = w.addStack(); r.centerAlignContent(); t(r, String(x.d), thin(30), INK); t(r, ' / ' + x.n, tw(12), SOFT)
      w.addSpacer(6); bar(w, inner, x.d / (x.n || 1), x.c)
      w.addSpacer(6); if (x.x) t(w, '다음 ' + x.x, tw(10), SOFT).minimumScaleFactor = 0.7
    } else {
      for (const x of SR.slice(0, fam === 'medium' ? 3 : 7)) {
        const r = w.addStack(); r.centerAlignContent()
        t(r, x.t, tw(12), INK).minimumScaleFactor = 0.7; r.addSpacer(6)
        t(r, x.d + '/' + x.n, tw(11), x.d >= x.n ? GOLD : SOFT)
        w.addSpacer(3); bar(w, inner, x.d / (x.n || 1), x.c)
        if (x.x && fam !== 'medium') { w.addSpacer(3); t(w, '다음 ' + x.x, tw(9), SOFT) }
        w.addSpacer(fam === 'medium' ? 7 : 10)
      }
    }
  } else if (KIND === 'board') {
    // ── 이번 주 배치: 요일별 점 (채운 점 = 끝냄) ──
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'THIS WEEK'); h.addSpacer(); const tot = bwDays.reduce((a, k) => a + bwOf(k).filter((x) => !x.done).length, 0); t(h, '남은 ' + tot, label(8), SOFT)
    w.addSpacer(fam === 'small' ? 8 : 12)
    if (fam === 'large' || fam === 'extraLarge') {
      for (const k of bwDays) {
        const l = bwOf(k), r = w.addStack(); r.centerAlignContent(); r.spacing = 8
        const dd = r.addStack(); dd.size = new Size(34, 0); t(dd, WDN[new Date(k + 'T12:00:00').getDay()] + ' ' + (+k.slice(8)), k === today ? F(11, 'Medium') : tw(11), k === today ? INK : SOFT)
        dots(r, l, 6, 8)
        const nx = l.filter((x) => !x.done).map((x) => x.title).slice(0, 2).join(' · ')
        t(r, nx || (l.length ? '다 했어요' : ''), tw(10), nx ? INK : SOFT).minimumScaleFactor = 0.7
        r.addSpacer()
        w.addSpacer(fam === 'large' ? 9 : 12)
      }
    } else {
      const cw = Math.floor(inner / 7), r = w.addStack()
      for (const k of bwDays) {
        const l = bwOf(k), c = r.addStack(); c.size = new Size(cw, 0); c.layoutVertically()
        const a = c.addStack(); a.addSpacer(); t(a, WDN[new Date(k + 'T12:00:00').getDay()], k === today ? F(10, 'Medium') : label(9), k === today ? INK : SOFT); a.addSpacer()
        if (fam !== 'small') { const a2 = c.addStack(); a2.addSpacer(); t(a2, String(+k.slice(8)), tw(9), SOFT); a2.addSpacer() }
        c.addSpacer(5)
        for (let i = 0; i < Math.min(l.length, fam === 'small' ? 5 : 4); i += 1) { const row = c.addStack(); row.addSpacer(); const x = l[i], d = row.addStack(); d.size = new Size(6, 6); d.cornerRadius = 3; if (x.done) d.backgroundColor = GOLD; else { d.borderWidth = 1; d.borderColor = SOFT } row.addSpacer(); c.addSpacer(3) }
        if (l.length > (fam === 'small' ? 5 : 4)) { const row = c.addStack(); row.addSpacer(); t(row, '+' + (l.length - (fam === 'small' ? 5 : 4)), label(7), SOFT); row.addSpacer() }
      }
      if (fam === 'medium') { w.addSpacer(); const td = bwOf(today).filter((x) => !x.done); t(w, td.length ? '오늘 · ' + td[0].title + (td.length > 1 ? ' 외 ' + (td.length - 1) + '개' : '') : '오늘 남은 할 일 없음', tw(10), SOFT).minimumScaleFactor = 0.7 }
    }
  } else if (KIND === 'weeks') {
    // ── D-day까지 주차: 한 칸 = 한 주 ──
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'WEEKS'); h.addSpacer(); t(h, wkDd ? wkDd.title : '', label(8), SOFT)
    w.addSpacer(fam === 'small' ? 6 : 10)
    if (!wkInfo) t(w, 'D-day를 추가해 주세요', tw(12), SOFT)
    else {
      const r = w.addStack(); r.bottomAlignContent(); t(r, String(wkInfo.lw), thin(fam === 'small' ? 30 : 36), INK); t(r, '주 ', tw(12), SOFT); t(r, String(wkInfo.ld), thin(fam === 'small' ? 22 : 26), INK); t(r, '일', tw(12), SOFT)
      w.addSpacer(fam === 'small' ? 8 : 12)
      const z = fam === 'small' ? 10 : fam === 'medium' ? 11 : 16, gap = fam === 'large' || fam === 'extraLarge' ? 5 : 3
      sqRows(w, wkInfo.weeks, z, gap, inner)
    }
  } else if (KIND === 'todo') {
    // ── 할 일 ──
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'TODAY'); h.addSpacer(); t(h, done + ' DONE', label(8), GOLD)
    w.addSpacer(10)
    todoList(w, fam === 'small' ? 4 : fam === 'medium' ? 5 : 11, fam === 'large' ? 7 : 4)
  } else if (KIND === 'dday') {
    // ── D-day ──
    t(w, dateStr, label(9), SOFT)
    w.addSpacer()
    if (dd) {
      t(w, ddTxt, thin(fam === 'small' ? 40 : 52), INK)
      w.addSpacer(2)
      const r = w.addStack(); r.centerAlignContent(); t(r, dd.title, tw(fam === 'small' ? 12 : 14), GOLD); r.addSpacer(8); t(r, dd.date.slice(5).replace('-', '.'), tw(10), SOFT); r.addSpacer()
      w.addSpacer(2); t(w, '남은 주말 ' + weekends(dd) + '번', tw(10), SOFT)
    } else t(w, 'No D-day.', tw(14), SOFT)
    if (fam !== 'small' && quote) { w.addSpacer(10); t(w, '— ' + quote, tw(12), SOFT, 2) }
    if (fam === 'large' && ddAll.length > 1) {
      w.addSpacer(16); rule(w, inner); w.addSpacer(12)
      for (const x of ddAll.filter((x) => x !== dd).slice(0, 5)) { const r = w.addStack(); r.centerAlignContent(); t(r, x.title, tw(12), INK); r.addSpacer(); t(r, ddT(x), tw(12), GOLD); w.addSpacer(8) }
    }
  } else if (KIND === 'month') {
    // ── 달력 ──
    const h = w.addStack(); h.centerAlignContent(); t(h, MON[d0.getMonth()] + ' ' + d0.getFullYear(), label(9), SOFT); h.addSpacer(); if (fam !== 'small') t(h, 'TODAY ' + hm(mins), label(8), GOLD)
    w.addSpacer(8)
    if (fam === 'medium') {
      const row = w.addStack()
      const L = row.addStack(); L.layoutVertically()
      const G = row.addStack(); G.layoutVertically()
      const sum = monthGrid(G, 20, 3, false)
      L.size = new Size(inner - 7 * 20 - 6 * 3 - 14, 100)
      t(L, hm(sum.total), thin(28), INK); L.addSpacer(4)
      t(L, sum.days + ' DAYS', label(8), SOFT); L.addSpacer(2)
      t(L, sum.hit + ' GOAL', label(8), GOLD); L.addSpacer()
      row.addSpacer()
    } else if (fam === 'small') {
      monthGrid(w, 16, 3, false)
    } else {
      const mRows = Math.ceil((((new Date(d0.getFullYear(), d0.getMonth(), 1).getDay() - (st.weekStart ?? 1) + 7) % 7) + new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate()) / 7)
      const cw = (inner - 6 * 5) / 7
      const sum = monthGrid(w, cw, 5, true, Math.max(cw * 0.8, Math.floor((innerH - Math.round(52 * SCALE)) / mRows) - 5))
      w.addSpacer(4)
      const r = w.addStack(); r.centerAlignContent()
      t(r, 'TOTAL ' + hm(sum.total), label(8), INK); r.addSpacer(); t(r, sum.days + ' DAYS', label(8), SOFT); r.addSpacer(); t(r, sum.hit + ' GOAL', label(8), GOLD)
    }
  } else if (KIND === 'cal') {
    // ── 캘린더: 이번 달 + 아래(중형은 옆) 다가오는 일정 · 할 일은 넣지 않음 ──
    const cal = data.cal || {}
    const y = d0.getFullYear(), m = d0.getMonth(), n = new Date(y, m + 1, 0).getDate()
    const ws = st.weekStart ?? 1, lead = (new Date(y, m, 1).getDay() - ws + 7) % 7
    const key = (dd2) => y + '-' + pad(m + 1) + '-' + pad(dd2)
    const rows = Math.ceil((lead + n) / 7)
    const grid = (parent, cell, cellH, gap, numSize, showWd = true) => {
      if (showWd) {
        const hdr = parent.addStack(); hdr.spacing = gap
        for (let i = 0; i < 7; i++) { const c = hdr.addStack(); c.size = new Size(cell, 10); c.centerAlignContent(); t(c, ['S', 'M', 'T', 'W', 'T', 'F', 'S'][(i + ws) % 7], label(7), SOFT) }
        parent.addSpacer(gap)
      }
      let day = 1 - lead
      while (day <= n) {
        const row = parent.addStack(); row.spacing = gap
        for (let i = 0; i < 7; i++, day++) {
          const c = row.addStack(); c.size = new Size(cell, cellH); c.layoutVertically(); c.centerAlignContent()
          if (day < 1 || day > n) continue
          const k = key(day), evs = cal[k] || [], has = evs.length
          // 오늘: 채우기 대신 테두리 — 틴트/투명 홈 화면에서도 숫자가 보이게
          if (k === today) { c.borderWidth = 1; c.borderColor = INK; c.cornerRadius = Math.min(cell, cellH) / 2 }
          const a = c.addStack(); a.addSpacer(); t(a, day, k === today ? F(numSize, 'SemiBold') : label(numSize), k === today || has ? INK : SOFT); a.addSpacer()
          const b = c.addStack(); b.addSpacer(); t(b, has ? '•' : ' ', label(numSize - 2), has && evs[0].c ? new Color(evs[0].c) : GOLD); b.addSpacer()
        }
        parent.addSpacer(gap)
      }
    }
    // 다가오는 일정 (오늘부터 30일, 오늘 이미 끝난 일정은 빼고)
    const agenda = [], nowM = new Date().getHours() * 60 + new Date().getMinutes()
    for (let i = 0; i < 30 && agenda.length < 12; i++) {
      const dt = new Date(d0); dt.setDate(dt.getDate() + i); const k = ymd(dt)
      const evs = (cal[k] || []).slice().sort((a, b) => (a.s ?? -1) - (b.s ?? -1))
      for (const e of evs) { if (i === 0 && e.s != null && e.s + 60 <= nowM) continue; agenda.push({ k, dt, time: e.s == null ? '종일' : pad(Math.floor(e.s / 60) % 24) + ':' + pad(e.s % 60), title: e.t, c: e.c }) }
    }
    const agendaList = (parent, count, budget) => {
      let last = '', used = 0
      // 다음 일정(오늘 아직 안 지난 첫 일정) 강조
      const nowHM = pad(new Date().getHours()) + ':' + pad(new Date().getMinutes())
      const nextA = agenda.find((a) => a.k > today || (a.k === today && (a.time === '종일' || a.time >= nowHM)))
      for (const a of agenda.slice(0, count)) {
        // 높이 한도: 날짜 머리줄 ≈13 · 일정 줄 ≈22 (글자 크기 비례)
        if (budget) { const need = ((a.k !== last ? 13 : 0) + 22) * SCALE; if (used + need > budget) break; used += need }
        if (a.k !== last) { last = a.k; const h = parent.addStack(); t(h, a.k === today ? 'TODAY' : DAY[a.dt.getDay()] + ' ' + (a.dt.getMonth() + 1) + '/' + a.dt.getDate(), label(8), a.k === today ? GOLD : SOFT); h.addSpacer(); parent.addSpacer(3) }
        const r = parent.addStack(); r.centerAlignContent(); r.spacing = 8
        const hot = a === nextA
        const tm = r.addStack(); tm.size = new Size(34, 0); t(tm, a.time, hot ? label(10) : tw(10), hot ? GOLD : SOFT); tm.addSpacer()
        const bar = r.addStack(); bar.size = new Size(2, 12); bar.cornerRadius = 1; bar.backgroundColor = a.c ? new Color(a.c) : RULE
        t(r, a.title, hot ? F(fam === 'large' ? 14 : 13, 'Medium') : tw(fam === 'large' ? 14 : 13), INK).minimumScaleFactor = 0.85; r.addSpacer()
        parent.addSpacer(5)
      }
      if (!agenda.length) t(parent, '다가오는 일정 없음', tw(13), SOFT)
    }
    const h = w.addStack(); h.centerAlignContent(); t(h, MON[m] + ' ' + y, label(9), SOFT); h.addSpacer(); if (fam !== 'small') t(h, dateStr, label(8), SOFT)
    w.addSpacer(8)
    if (fam === 'small') {
      grid(w, 16, rows > 5 ? 12 : 14, 2, 7, rows < 6)
    } else if (fam === 'medium') {
      const row = w.addStack()
      const L = row.addStack(); L.layoutVertically(); grid(L, 17, rows > 5 ? 14 : 16, 2, 7, false)
      row.addSpacer(14); vrule(row, 110); row.addSpacer(14)
      const R = row.addStack(); R.layoutVertically(); R.size = new Size(inner - 7 * 17 - 12 - 28.6, 0); agendaList(R, 4); R.addSpacer()
      row.addSpacer()
    } else {
      const cw = (inner - 6 * 4) / 7, hd = Math.round(31 * SCALE)
      const ch = Math.min(cw, Math.max(rows > 5 ? 21 : 24, Math.floor((innerH * 0.55 - hd) / rows) - 3))
      grid(w, cw, ch, 3, 10)
      w.addSpacer(4); rule(w, inner); w.addSpacer(8)
      agendaList(w, 12, innerH - hd - rows * (ch + 3) - 13)
    }
  } else if (KIND === 'week') {
    // ── 주간 공부 ──
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'THIS WEEK'); h.addSpacer(); if (fam !== 'small') t(h, dateStr, label(8), SOFT)
    w.addSpacer(fam === 'small' ? 6 : 8)
    const big = w.addStack(); big.bottomAlignContent(); t(big, hm(weekTot), thin(fam === 'large' ? 38 : 30), INK).minimumScaleFactor = 0.6; big.addSpacer(6)
    t(big, lastWeek ? (weekTot >= lastWeek ? '+' : '−') + hm(Math.abs(weekTot - lastWeek)) : '', tw(10), weekTot >= lastWeek ? GOLD : SOFT); big.addSpacer()
    t(w, '하루 평균 ' + hm(weekAvg) + (lastWeek ? ' · 지난주 같은 때 ' + hm(lastWeek) : ''), tw(10), SOFT).minimumScaleFactor = 0.7
    w.addSpacer()
    const bw = fam === 'small' ? inner : fam === 'medium' ? inner : inner
    bars7(w, bw, fam === 'small' ? 30 : fam === 'medium' ? 26 : 90, GOLD, RULE); w.addSpacer(3); wdRow(w, bw)
    if (fam === 'large') {
      w.addSpacer(12); rule(w, inner); w.addSpacer(10)
      for (const x of weekSub.slice(0, 5)) { const r = w.addStack(); r.centerAlignContent(); t(r, x.s.name, tw(12), INK); r.addSpacer(); t(r, hm(x.m), tw(11), SOFT); w.addSpacer(3); pbar(w, x.m / (weekSub[0].m || 1), inner, x.s.color); w.addSpacer(7) }
    }
  } else if (KIND === 'subj') {
    // ── 과목별 (이번 주) ──
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'SUBJECTS'); h.addSpacer(); t(h, '이번 주 ' + hm(weekTot), label(8), SOFT)
    w.addSpacer(fam === 'small' ? 8 : 10)
    const n = fam === 'small' ? 3 : fam === 'medium' ? 3 : 8
    for (const x of weekSub.slice(0, n)) {
      const r = w.addStack(); r.centerAlignContent(); const dot = r.addStack(); dot.size = new Size(6, 6); dot.cornerRadius = 3; dot.backgroundColor = x.s.color ? new Color(x.s.color) : GOLD; r.addSpacer(6)
      t(r, x.s.name, tw(fam === 'small' ? 12 : 13), INK).minimumScaleFactor = 0.8; r.addSpacer()
      if (fam !== 'small' && x.today) { t(r, '오늘 ' + hm(x.today), tw(10), SOFT); r.addSpacer(8) }
      t(r, hm(x.m), tw(fam === 'small' ? 11 : 12), INK)
      w.addSpacer(3); pbar(w, x.m / (weekSub[0].m || 1), inner, x.s.color); w.addSpacer(fam === 'large' ? 9 : 6)
    }
    if (!weekSub.length) t(w, '이번 주 공부 기록이 없어요', tw(12), SOFT)
    if (fam !== 'large') w.addSpacer()
  } else if (KIND === 'now') {
    // ── 지금·다음 ──
    const c = nCur || nNext || nTmr, k = nTmr ? tmr : today
    const h = w.addStack(); h.centerAlignContent(); cap(h, nCur ? 'NOW' : nTmr ? 'TOMORROW' : 'NEXT'); h.addSpacer(); if (fam !== 'small') t(h, dateStr, label(8), SOFT)
    w.addSpacer(fam === 'small' ? 8 : 10)
    if (c) {
      if (c.c) { const bar = w.addStack(); bar.size = new Size(24, 2); bar.cornerRadius = 1; bar.backgroundColor = new Color(c.c); w.addSpacer(6) }
      t(w, c.t, thin(fam === 'small' ? 20 : 24), INK, 2).minimumScaleFactor = 0.6
      w.addSpacer(4)
      t(w, clk(c.s) + '–' + clk(c.e) + (c.l ? ' · ' + c.l : ''), tw(11), SOFT).minimumScaleFactor = 0.7
      w.addSpacer(6)
      if (!nTmr) { const r = w.addStack(); r.centerAlignContent(); t(r, nCur ? '끝까지 ' : '시작까지 ', label(9), SOFT); timerTo(r, nCur ? c.e : c.s, label(11)).textColor = GOLD; r.addSpacer() }
      if (nCur && fam !== 'small') { w.addSpacer(6); pbar(w, (nm - c.s) / Math.max(1, c.e - c.s), inner) }
    } else t(w, '오늘 남은 일정이 없어요', tw(13), SOFT)
    if (fam !== 'small') {
      const rest = NOW.filter((x) => x.e > nm && x !== c).slice(0, fam === 'large' ? 8 : 1)
      if (rest.length) {
        w.addSpacer(fam === 'large' ? 14 : 8); if (fam === 'large') { rule(w, inner); w.addSpacer(10) }
        for (const x of rest) { const r = w.addStack(); r.centerAlignContent(); r.spacing = 8; const tm = r.addStack(); tm.size = new Size(38, 0); t(tm, clk(x.s), tw(10), SOFT); tm.addSpacer(); t(r, x.t, tw(13), INK).minimumScaleFactor = 0.8; r.addSpacer(); w.addSpacer(6) }
      }
    }
    w.addSpacer()
  } else if (KIND === 'prog') {
    // ── 진도 (교재·인강) ──
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'PROGRESS'); h.addSpacer(); if (fam !== 'small') t(h, dateStr, label(8), SOFT)
    w.addSpacer(fam === 'small' ? 8 : 10)
    const n = fam === 'small' ? 3 : fam === 'medium' ? 3 : 8
    for (const x of PROG.slice(0, n)) {
      const r = w.addStack(); r.centerAlignContent(); t(r, x.t, tw(fam === 'small' ? 12 : 13), INK).minimumScaleFactor = 0.8; r.addSpacer(); t(r, fam === 'small' ? Math.round((x.n / x.of) * 100) + '%' : x.n + '/' + x.of + x.u, tw(10), SOFT)
      w.addSpacer(3); pbar(w, x.n / x.of, inner, x.c); w.addSpacer(fam === 'large' ? 10 : 7)
    }
    if (!PROG.length) t(w, '진행 중인 교재·인강이 없어요', tw(12), SOFT)
    w.addSpacer()
  } else if (KIND === 'goals') {
    // ── 이번 주 목표 ──
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'THIS WEEK'); h.addSpacer(); t(h, goalsDone + '/' + GOALS.length, label(8), GOLD)
    w.addSpacer(fam === 'small' ? 8 : 10)
    for (const g of GOALS.slice(0, 3)) {
      const r = w.addStack(); r.centerAlignContent(); r.spacing = 6
      t(r, g.done ? '✓' : '–', tw(12), g.done ? GOLD : SOFT)
      if (g.done) strike(r, g.t, tw(fam === 'small' ? 12 : 14)); else t(r, g.t, tw(fam === 'small' ? 12 : 14), INK).minimumScaleFactor = 0.8
      r.addSpacer(); if (g.of && fam !== 'small') t(r, g.n + '/' + g.of, tw(10), SOFT)
      w.addSpacer(3); pbar(w, g.r, inner); w.addSpacer(fam === 'large' ? 12 : 7)
    }
    if (!GOALS.length) t(w, '앱 › 할 일에서 이번 주 목표를 정해 보세요', tw(12), SOFT, 2)
    if (fam === 'large') { w.addSpacer(8); rule(w, inner); w.addSpacer(10); const s2 = w.addStack(); t(s2, '이번 주 공부 ' + hm(weekTot), tw(12), INK); s2.addSpacer(); t(s2, '하루 ' + hm(weekAvg), tw(11), SOFT) }
    w.addSpacer()
  } else if (KIND === 'today') {
    // ── 오늘 한눈에: 다음 일정 · 공부 · 할 일 ──
    const c = nCur || nNext
    const evLine = (parent, size) => { const r = parent.addStack(); r.centerAlignContent(); t(r, c ? (nCur ? '지금 ' : '') + clk(c.s) : '—', tw(size - 3), GOLD); r.addSpacer(6); t(r, c ? c.t : '남은 일정 없음', tw(size), c ? INK : SOFT).minimumScaleFactor = 0.8; r.addSpacer() }
    if (fam !== 'medium') { const h = w.addStack(); h.centerAlignContent(); cap(h, 'TODAY'); h.addSpacer(); t(h, dateStr, label(8), SOFT); w.addSpacer(8) }
    if (fam === 'small') {
      evLine(w, 12); w.addSpacer(); studyBig(w, 26, inner); w.addSpacer(6)
      t(w, '할 일 ' + items.filter((x) => !x.done).length + '개 남음', tw(11), SOFT)
    } else if (fam === 'medium') {
      const row = w.addStack()
      const lw = Math.round(inner * 0.42)
      const L = row.addStack(); L.layoutVertically(); L.size = new Size(lw, innerH); cap(L, 'TODAY'); L.addSpacer(8); evLine(L, 12); L.addSpacer(); studyBig(L, 26, lw)
      row.addSpacer(12); vrule(row, innerH); row.addSpacer(12)
      const R = row.addStack(); R.layoutVertically(); R.size = new Size(inner - lw - 24.6, innerH); todoList(R, Math.max(3, Math.floor((innerH - 16 * SCALE) / ((TS * 1.3 + 4) * SCALE)) - 1), 4); R.addSpacer(); if (data.sv && data.sv > VER) t(R, '스크립트 업데이트 · 앱에서 다시 복사', label(8), GOLD)
    } else {
      evLine(w, 14); w.addSpacer(10); studyBig(w, 36, inner)
      w.addSpacer(12); rule(w, inner); w.addSpacer(10)
      todoList(w, 6, 6)
      w.addSpacer(); if (dd) ddRow(w, 12)
    }
  } else if (KIND === 'dash' || KIND === 'custom') {
    // ── 대시보드 · 내 위젯(구성1~3: 앱에서 블록·배치를 고름): D-day · 일정 · 공부 시간(타이머 중이면 흐르는 시간) · 할 일 (중·대는 칸마다 누르면 해당 화면) ──
    const left = items.filter((x) => !x.done).length, c = nCur || nNext
    const LG = fam === 'large' || fam === 'extraLarge' // 대형은 글자 크게
    // 칸 고르기 (앱 설정 › 위젯 › 대시보드 칸): dday · next · todo · study · prog · goals · week 중 4개
    const DK = ['dday', 'next', 'todo', 'study', 'prog', 'goals', 'week', 'bars', 'subjbar', 'ring', 'heat', 'hours', 'compare', 'date', 'quote', 'class', 'agenda', 'ddl', 'note', 'notes', 'month', 'left', 'tmrw', 'due', 'start', 'habits', 'review', 'one']
    const CW = KIND === 'custom' ? ((st.customWidgets || [])[DDI] || {}) : null
    const LAY = CW ? (CW.layout === 'rows' ? 'rows' : 'grid') : 'grid'
    const maxN = CW ? (fam === 'small' ? (LAY === 'rows' ? 3 : 4) : fam === 'medium' ? 4 : 6) : 4
    const keys = ((CW ? CW.blocks : st.dashTiles) || []).filter((k, i, a) => DK.includes(k) && a.indexOf(k) === i).slice(0, maxN)
    if (!CW) for (const k of DK) if (keys.length < 4 && !keys.includes(k)) keys.push(k)
    if (CW && !keys.length) keys.push('date', 'study', 'next', 'todo')
    const p0 = PROG[0], g0 = GOALS.find((g) => !g.done)
    const LGd = fam === 'large' || fam === 'extraLarge', gH = fam === 'small' ? 24 : fam === 'medium' ? 26 : 40 // 그래프 높이
    const mPre = d0.getFullYear() + '-' + pad(d0.getMonth() + 1), monthTot = Object.entries(DM).filter(([k2]) => k2.startsWith(mPre)).reduce((a2, [, v]) => a2 + v, 0)
    const ringImg = (r, size, lw) => {
      const c = new DrawContext(); c.size = new Size(size, size); c.opaque = false; c.respectScreenScale = true
      const light = inkMode === 'light', fg = new Color(light ? '#ffffff' : dark() ? '#9fadc4' : '#66778f'), bg = new Color(light ? '#ffffff' : dark() ? '#2a2f37' : '#dce1e7', light ? 0.3 : 1)
      const cx = size / 2, rad = size / 2 - lw
      const arc = (to, col) => { const p = new Path(), n = Math.max(2, Math.round(72 * to)), pts = []; for (let i = 0; i <= n; i++) { const a2 = -Math.PI / 2 + 2 * Math.PI * to * (i / n); pts.push(new Point(cx + rad * Math.cos(a2), cx + rad * Math.sin(a2))) } p.addLines(pts); c.addPath(p); c.setStrokeColor(col); c.setLineWidth(lw); c.strokePath() }
      arc(1, bg); if (r > 0) arc(Math.min(1, r), fg)
      return c.getImage()
    }
    const TL = {
      dday: ['D-DAY', dd ? ddTxt : '—', dd ? dd.title : '없음', null, 'study.progress', GOLD],
      next: [nCur ? 'NOW' : 'NEXT', c ? clk(c.s) : '—', c ? c.t : '남은 일정 없음', null, 'planner.today', SOFT],
      prog: ['PROGRESS', p0 ? Math.round((p0.n / p0.of) * 100) + '%' : '—', p0 ? p0.t : '진행 중인 교재 없음', p0 ? p0.n / p0.of : null, 'study.progress', SOFT],
      goals: ['GOALS', GOALS.length ? goalsDone + '/' + GOALS.length : '—', g0 ? g0.t : GOALS.length ? '모두 완료' : '목표 없음', GOALS.length ? goalsDone / GOALS.length : null, 'tasks', SOFT],
      week: ['THIS WEEK', hm(weekTot), '하루 ' + hm(weekAvg), weekTot / Math.max(1, goal * 7), 'study.records', GOLD],
      // ── 날짜 · 다짐 · 수업 · 일정 · D-day 목록 ──
      date: [DAY[d0.getDay()], (b, f, wd) => { const r = b.addStack(); r.bottomAlignContent(); t(r, String(d0.getDate()), f, INK); r.addSpacer(6); t(r, MON[d0.getMonth()], tw(LGd ? 13 : 10), SOFT); r.addSpacer() }, '', null, 'planner.today', SOFT],
      quote: ['다짐', (b, f, wd) => { b.addSpacer(2); const x = t(b, quote || '앱에서 다짐을 적어 보세요', tw(LGd ? 15 : fam === 'small' ? 11 : 12), INK, LGd ? 4 : 3); x.minimumScaleFactor = 0.75 }, '', null, 'study.records', SOFT],
      class: [clCur ? 'NOW CLASS' : 'NEXT CLASS', (b, f, wd) => { const cc = clCur || clNext; b.addSpacer(2); t(b, cc ? cc.period + '교시 ' + cc.title : CL.length ? '오늘 수업 끝' : '수업 없음', tw(LGd ? 17 : 13), cc ? INK : SOFT).minimumScaleFactor = 0.7; if (cc) t(b, clk(cc.start) + '–' + clk(cc.end) + (cc.room ? ' · ' + cc.room : ''), tw(LGd ? 11 : 9), SOFT) }, '', null, 'planner.timetable', SOFT],
      agenda: ['AGENDA', (b, f, wd) => { b.addSpacer(3); const ev = DAYS7.flatMap((d2) => d2.ev.map((e) => ({ d2, e }))).slice(0, LGd ? 4 : 3); for (const { d2, e } of ev) { const r = b.addStack(); r.centerAlignContent(); t(r, (d2.i === 0 ? '' : d2.i === 1 ? '내일 ' : DAY[d2.x.getDay()] + ' ') + (e.s == null ? '종일' : clk(e.s % 1440)), tw(LGd ? 10 : 8), GOLD); r.addSpacer(5); t(r, e.t, tw(LGd ? 12 : 10), INK).minimumScaleFactor = 0.75; r.addSpacer(); b.addSpacer(2) } if (!ev.length) t(b, '일정 없음', tw(10), SOFT) }, '', null, 'planner.week', SOFT],
      ddl: ['D-DAYS', (b, f, wd) => { b.addSpacer(3); for (const x of ddAll.slice(0, LGd ? 4 : 3)) { const r = b.addStack(); r.centerAlignContent(); t(r, x.title, tw(LGd ? 12 : 10), INK).minimumScaleFactor = 0.75; r.addSpacer(4); t(r, ddT(x), tw(LGd ? 12 : 10), GOLD); b.addSpacer(2) } if (!ddAll.length) t(b, 'No D-day', tw(10), SOFT) }, '', null, 'study.progress', SOFT],
      // ── 그래프 칸 (값 자리에 그리는 함수: (칸, 큰 글꼴, 폭)) ──
      // 이번 주 7일 막대 + 요일
      bars: ['THIS WEEK ' + hm(weekTot), (b, f, wd) => { b.addSpacer(4); bars7(b, wd, gH, GOLD, RULE); b.addSpacer(2); wdRow(b, wd, LGd ? 8 : 7) }, '', null, 'study.records', SOFT],
      // 이번 주 과목 비율: 가로 누적 막대 + 상위 과목
      subjbar: ['SUBJECTS', (b, f, wd) => {
        b.addSpacer(6)
        const tot = weekSub.reduce((a2, x) => a2 + x.m, 0), bar = b.addStack(); bar.size = new Size(wd, LGd ? 10 : 7); bar.cornerRadius = LGd ? 5 : 3.5
        if (!tot) bar.backgroundColor = RULE
        else weekSub.forEach((x, i) => { const sg = bar.addStack(); sg.size = new Size(Math.max(2, Math.round((wd * x.m) / tot) - (i < weekSub.length - 1 ? 1 : 0)), LGd ? 10 : 7); sg.backgroundColor = x.s.color ? new Color(x.s.color) : GOLD; if (i < weekSub.length - 1) bar.addSpacer(1) })
        b.addSpacer(5)
        for (const x of weekSub.slice(0, LGd ? 3 : 2)) { const r = b.addStack(); r.centerAlignContent(); const d = r.addStack(); d.size = new Size(5, 5); d.cornerRadius = 2.5; d.backgroundColor = x.s.color ? new Color(x.s.color) : GOLD; r.addSpacer(4); t(r, x.s.name, tw(LGd ? 11 : 9), INK).minimumScaleFactor = 0.7; r.addSpacer(); t(r, Math.round((x.m / tot) * 100) + '%', tw(LGd ? 11 : 9), SOFT) }
        if (!tot) t(b, '이번 주 기록 없음', tw(9), SOFT)
      }, '', null, 'study.records', SOFT],
      // 오늘 목표 링 + 시간·%
      ring: ['GOAL', (b, f, wd) => {
        b.addSpacer(4); const r = b.addStack(); r.centerAlignContent(); const sz = gH + 14
        const img = r.addImage(ringImg(mins / goal, sz, LGd ? 5 : 4)); img.imageSize = new Size(sz, sz); r.addSpacer(8)
        const cc = r.addStack(); cc.layoutVertically(); t(cc, hm(mins), thin(LGd ? 26 : 18), INK).minimumScaleFactor = 0.6; t(cc, pct + '% · ' + hm(goal), tw(LGd ? 11 : 9), GOLD).minimumScaleFactor = 0.7; r.addSpacer()
      }, '', null, 'study.records', SOFT],
      // 이번 달 공부 히트맵 (칸 진하기 = 목표 대비)
      heat: [MON[d0.getMonth()] + ' ' + hm(monthTot), (b, f, wd) => {
        b.addSpacer(4)
        const y = d0.getFullYear(), m = d0.getMonth(), n = new Date(y, m + 1, 0).getDate(), ws = st.weekStart ?? 1, lead = (new Date(y, m, 1).getDay() - ws + 7) % 7
        const rows = Math.ceil((lead + n) / 7), g = 2, cw = Math.floor((wd - g * 6) / 7), ch = Math.max(4, Math.min(cw, Math.floor((gH + 10 - g * (rows - 1)) / rows)))
        let day = 1 - lead
        for (let ri = 0; ri < rows; ri++) {
          const row = b.addStack(); row.spacing = g
          for (let i = 0; i < 7; i++, day++) { const c = row.addStack(); c.size = new Size(cw, ch); c.cornerRadius = Math.min(2, ch / 3); if (day < 1 || day > n) continue; const k2 = y + '-' + pad(m + 1) + '-' + pad(day), v = DM[k2] || 0; c.backgroundColor = v ? dyn('#66778f', '#9fadc4', 0.2 + 0.75 * Math.min(1, v / goal)) : RULE; if (k2 === today) { c.borderWidth = 1; c.borderColor = INK } }
          if (ri < rows - 1) b.addSpacer(g)
        }
      }, '', null, 'study.records', SOFT],
      // 오늘 시간대 (6~24시)
      hours: ['HOURS', (b, f, wd) => {
        b.addSpacer(4)
        const hs = Array(18).fill(0)
        for (const x of sessions) if (x.start != null) { const st0 = new Date(x.start), a2 = st0.getHours() * 60 + st0.getMinutes(), e2 = a2 + (x.dur || 0); for (let h = 6; h < 24; h++) hs[h - 6] += Math.max(0, Math.min(e2, (h + 1) * 60) - Math.max(a2, h * 60)) }
        const mx = Math.max(30, ...hs), g = 1, bw = Math.max(2, Math.floor((wd - g * 17) / 18)), row = b.addStack(); row.size = new Size(wd, gH); row.bottomAlignContent(); row.spacing = g
        hs.forEach((v) => { const c = row.addStack(); c.size = new Size(bw, Math.max(1.5, Math.round((v / mx) * gH))); c.cornerRadius = 1; c.backgroundColor = v ? GOLD : RULE })
        b.addSpacer(2); const lb = b.addStack(); lb.size = new Size(wd, 0); t(lb, '6', label(6), SOFT); lb.addSpacer(); t(lb, '12', label(6), SOFT); lb.addSpacer(); t(lb, '18', label(6), SOFT); lb.addSpacer(); t(lb, '24', label(6), SOFT)
      }, '', null, 'study.records', SOFT],
      // 지난주 같은 때와 비교 (두 줄 막대)
      compare: ['VS LAST WEEK', (b, f, wd) => {
        b.addSpacer(4); const mx = Math.max(1, weekTot, lastWeek)
        for (const [l, v, c] of [['이번 주', weekTot, GOLD], ['지난주', lastWeek, SOFT]]) { const r = b.addStack(); r.centerAlignContent(); t(r, l, tw(LGd ? 11 : 9), INK); r.addSpacer(); t(r, hm(v), tw(LGd ? 11 : 9), c); b.addSpacer(2); const bb = b.addStack(); bb.size = new Size(wd, 3); bb.cornerRadius = 1.5; bb.backgroundColor = RULE; const fi = bb.addStack(); fi.size = new Size(Math.max(2, Math.round((wd * v) / mx)), 3); fi.cornerRadius = 1.5; fi.backgroundColor = c; bb.addSpacer(); b.addSpacer(LGd ? 6 : 4) }
      }, (weekTot >= lastWeek ? '+' : '−') + hm(Math.abs(weekTot - lastWeek)), null, 'study.records', GOLD],
    }
    // ── 노트 · 이번 달 · 남은 목표 · 내일 · 마감 · 바로 시작 · 습관 · 복습 · 오늘의 하나 ──
    const nt0 = pickNote(), ntOth = NOTES().filter((x) => x !== nt0), EX = data.extra || {}
    const mDays = Object.entries(DM).filter(([k2, v]) => k2.startsWith(mPre) && v > 0).length
    const habs = Array.isArray(EX.habits) ? EX.habits : [], habOn = habs.filter((x) => x.on).length
    const nLn = (b, n, wd) => { for (const l of (nt0 ? nt0.l : []).slice(0, n)) { noteRow(b, l, wd, LGd ? 11 : 9.5, 1); b.addSpacer(2) } }
    Object.assign(TL, {
      note: ['NOTE', (b, f, wd) => { b.addSpacer(2); t(b, nt0 ? nt0.t : '노트가 없어요', F(LGd ? 12.5 : 11, 'Regular'), INK, 1).minimumScaleFactor = 0.75; b.addSpacer(3); nLn(b, LGd ? 5 : fam === 'small' ? 2 : 3, wd) }, '', null, noteUrl(nt0), SOFT],
      notes: ['NOTES', (b, f, wd) => { b.addSpacer(3); for (const x of NOTES().slice(0, LGd ? 4 : 3)) { const r = b.addStack(); r.url = noteUrl(x); r.centerAlignContent(); t(r, x.t, tw(LGd ? 12 : 10), INK).minimumScaleFactor = 0.75; r.addSpacer(4); t(r, noteAgo(x.u), label(6), SOFT); b.addSpacer(2) } if (!NOTES().length) t(b, '노트 없음', tw(10), SOFT) }, '', null, 'notes.pages', SOFT],
      month: ['THIS MONTH', hm(monthTot), mDays + '일 공부', null, 'study.records', GOLD],
      left: [mins >= goal ? 'GOAL DONE' : 'LEFT', hm(Math.max(0, goal - mins)), mins >= goal ? '오늘 목표 달성' : '목표까지 남음', mins / goal, 'study.timer', GOLD],
      tmrw: ['TOMORROW', (b, f, wd) => { b.addSpacer(3); const rows = [...TMR.ev.map((e) => [e.s == null ? '종일' : clk(e.s % 1440), e.t]), ...TMR.tk.map((x) => ['–', x.title])].slice(0, LGd ? 4 : 3); for (const [a2, b2] of rows) { const r = b.addStack(); r.centerAlignContent(); t(r, a2, tw(LGd ? 10 : 8), GOLD); r.addSpacer(5); t(r, b2, tw(LGd ? 12 : 10), INK).minimumScaleFactor = 0.75; r.addSpacer(); b.addSpacer(2) } if (!rows.length) t(b, '내일은 비어 있어요', tw(10), SOFT) }, TMR.cl.length ? '수업 ' + TMR.cl.length : '', null, 'planner.week', SOFT],
      due: ['DUE', (b, f, wd) => { b.addSpacer(3); for (const x of DUE.slice(0, LGd ? 4 : 3)) { const r = b.addStack(); r.centerAlignContent(); if (x.id) r.url = doneUrl(x.id); t(r, dueTxt(x), tw(LGd ? 10 : 8), dueIn(x) <= 0 ? GOLD : SOFT); r.addSpacer(5); t(r, x.title, tw(LGd ? 12 : 10), INK).minimumScaleFactor = 0.75; r.addSpacer(); b.addSpacer(2) } if (!DUE.length) t(b, '2주 안에 마감 없음', tw(10), SOFT) }, '', null, 'tasks', SOFT],
      start: ['START', (b, f, wd) => { b.addSpacer(4); const n = Math.min(QS.length, wd > 200 ? 4 : 2) || 1, g2 = 6, bw = Math.floor((wd - g2 * (n - 1)) / n), r = b.addStack(); r.spacing = g2; for (const sj of (QS.length ? QS : [null]).slice(0, n)) { const x = r.addStack(); x.size = new Size(bw, LGd ? 32 : 26); x.cornerRadius = 8; x.backgroundColor = RULE; x.centerAlignContent(); x.url = startUrl(sj); if (sj && sj.color) { const d = x.addStack(); d.size = new Size(5, 5); d.cornerRadius = 2.5; d.backgroundColor = new Color(sj.color); x.addSpacer(4) } t(x, sj ? sj.name : '공부', tw(LGd ? 12 : 10), INK).minimumScaleFactor = 0.6 } }, '', null, 'study.timer', SOFT],
      habits: ['HABITS', habs.length ? habOn + '/' + habs.length : '—', habs.length ? (habs.find((x) => !x.on) || {}).t || '오늘 모두 완료' : '습관 없음', habs.length ? habOn / habs.length : null, '', SOFT],
      review: ['REVIEW', (EX.rev || 0) + '개', EX.rev ? '오늘 볼 복습' : '오늘 복습 없음', null, 'study.review', GOLD],
      one: ['TODAY ONE', (b, f, wd) => { b.addSpacer(2); t(b, EX.one ? EX.one.t : '오늘의 하나를 정해 보세요', tw(LGd ? 15 : fam === 'small' ? 11 : 12), EX.one ? (EX.one.d ? SOFT : INK) : SOFT, 2).minimumScaleFactor = 0.75 }, EX.one && EX.one.d ? '완료' : '', null, '', GOLD],
    })
    const tilesA = [
      // 할 일: 개수 대신 남은 할 일 제목 (위에서 두 개)
      ['TO DO', (b) => {
        // 칸 높이에 들어가는 만큼 (소 3 · 중 5 · 대 5 안팎, 글자 크기에 맞춰 계산)
        const fs = LG ? 15 : 11, rowH = (fs * 1.3 + (LG ? 3 : 2)) * SCALE
        const room = fam === 'small' ? innerH - 74 * SCALE : fam === 'medium' ? innerH - 20 - 11 * SCALE : innerH - 180 * SCALE - innerH * 0.16 - 6
        const L = items.filter((x) => !x.done).slice(0, Math.max(2, Math.min(LG ? 7 : 6, Math.floor(room / rowH))))
        if (!L.length) t(b, 'All clear.', tw(fs + 1), SOFT)
        L.forEach((x, k) => { if (k) b.addSpacer(LG ? 3 : 2); const imp = x.priority >= 3; t(b, (imp ? '• ' : '– ') + x.title, imp ? F(fs, 'Medium') : tw(fs), INK).minimumScaleFactor = 0.8 })
      }, '', null, 'tasks', SOFT],
      TM ? ['● ' + TM.name, (b, f) => { if (TM.paused) t(b, hm(TM.pm), f, INK); else { const d = timerDate(b, 10); d.font = f; d.textColor = INK } }, (TM.paused ? '일시정지 · ' : '오늘 ') + hm(mins), mins / goal, 'study.timer', GOLD]
        : ['STUDY', hm(mins), pct + '%', mins / goal, 'study.records', GOLD],
    ]
    TL.todo = tilesA[0]; TL.study = tilesA[1]
    const tiles = keys.map((k) => TL[k])
    const cols = fam === 'medium' ? 4 : 2, gap = 12, wd = Math.floor((inner - gap * (cols - 1)) / cols), big = fam === 'small' ? 19 : fam === 'medium' ? 22 : 36
    const line = (P2, k, wd) => {
        const a = P2.addStack(); a.url = link(TL[k][4])
        if (k === 'todo') { a.layoutVertically(); const hh = a.addStack(); cap(hh, 'TO DO'); hh.addSpacer(); a.addSpacer(4); const L3 = items.filter((x) => !x.done); for (const x of L3.slice(0, LGd ? 5 : 3)) { const r = a.addStack(); r.centerAlignContent(); r.spacing = 6; if (x.id) r.url = doneUrl(x.id); const imp = x.priority >= 3; t(r, imp ? '•' : '–', tw(11), imp ? GOLD : SOFT); t(r, x.title, imp ? F(12, 'Medium') : tw(12), INK).minimumScaleFactor = 0.8; r.addSpacer(); a.addSpacer(2) } if (!L3.length) t(a, 'All clear.', tw(12), SOFT); return }
        if (k === 'dday') { a.bottomAlignContent(); t(a, dd ? ddTxt : '—', thin(26), INK).minimumScaleFactor = 0.6; a.addSpacer(6); t(a, dd ? dd.title : 'No D-day', tw(11), GOLD).minimumScaleFactor = 0.7; a.addSpacer() }
        else if (k === 'next') { a.centerAlignContent(); t(a, c ? (nCur ? '지금 ' : '') + clk(c.s) : '—', tw(11), GOLD); a.addSpacer(6); t(a, c ? c.t : '남은 일정 없음', tw(12), c ? INK : SOFT).minimumScaleFactor = 0.75; a.addSpacer() }
        else if (k === 'study') {
          a.bottomAlignContent(); a.url = link(TM ? 'study.timer' : 'study.records')
          if (TM) { t(a, '● ' + TM.name + ' ', tw(10), GOLD); if (TM.paused) t(a, hm(TM.pm), thin(20), INK); else { const d = timerDate(a, 20, true); d.textColor = INK } }
          else { t(a, hm(mins), thin(22), INK).minimumScaleFactor = 0.6; a.addSpacer(5); t(a, 'of ' + hm(goal), tw(9), SOFT) }
          a.addSpacer(); t(a, pct + '%', tw(10), GOLD); P2.addSpacer(5); pbar(P2, mins / goal, wd)
        } else if (k === 'week') { a.bottomAlignContent(); t(a, hm(weekTot), thin(22), INK).minimumScaleFactor = 0.6; a.addSpacer(6); t(a, '이번 주', tw(10), SOFT); a.addSpacer(); t(a, '하루 ' + hm(weekAvg), tw(10), GOLD) }
        else if (typeof TL[k][1] === 'function') { const x = TL[k]; a.centerAlignContent(); t(a, x[0], label(8), SOFT); a.addSpacer(); if (x[2]) t(a, x[2], tw(10), x[5]); x[1](P2, thin(20), wd) }
        else { const x = TL[k]; a.centerAlignContent(); t(a, x[2], tw(12), INK).minimumScaleFactor = 0.75; a.addSpacer(6); t(a, x[1], tw(11), GOLD); if (x[3] != null) { P2.addSpacer(4); pbar(P2, x[3], wd) } }
      }
    const col = (P2, ks, wd2) => ks.forEach((k, i) => { if (i) P2.addSpacer(); line(P2, k, wd2) })
    const titleTxt = CW ? (CW.name || '내 위젯 ' + (DDI + 1)) : 'TODAY'
    if (LAY === 'rows') {
      // 내 위젯 · 줄 배치: 블록을 위에서 아래로 (중형은 두 단)
      if (fam !== 'small') { const h = w.addStack(); h.centerAlignContent(); (CW ? t(h, titleTxt, label(10), SOFT) : cap(h, titleTxt)); h.addSpacer(); t(h, dateStr, label(8), SOFT); w.addSpacer(10) }
      if (fam === 'medium') {
        const half = Math.ceil(keys.length / 2), lw = Math.round((inner - 24.6) / 2), row = w.addStack()
        const L = row.addStack(); L.layoutVertically(); L.size = new Size(lw, MH); col(L, keys.slice(0, half), lw)
        row.addSpacer(12); vrule(row, MH); row.addSpacer(12)
        const R = row.addStack(); R.layoutVertically(); R.size = new Size(inner - lw - 24.6, MH); col(R, keys.slice(half), inner - lw - 24.6); if (keys.length - half < 2) R.addSpacer()
      } else { col(w, keys, inner); FILL = true }
    } else if (fam === 'medium') {
      // 중형: 할 일을 고르면 왼쪽 나머지 세 칸 · 오른쪽 할 일 목록, 안 고르면 왼쪽 두 칸 · 오른쪽 두 칸
      const lw = Math.round(inner * 0.45), rw = inner - lw - 24.6
      const others = keys.filter((k) => k !== 'todo'), hasTodo = keys.includes('todo')
      const row = w.addStack()
      const L = row.addStack(); L.layoutVertically(); L.size = new Size(lw, innerH)
      // 그래프 칸이 끼면 높이가 모자라 왼쪽은 두 칸까지
      const isG = (k) => ['bars', 'subjbar', 'ring', 'heat', 'hours', 'compare', 'note', 'notes', 'tmrw', 'due', 'agenda', 'ddl'].includes(k)
      col(L, hasTodo ? others.slice(0, others.slice(0, 3).some(isG) ? 2 : 3) : others.slice(0, 2), lw)
      row.addSpacer(12); vrule(row, innerH); row.addSpacer(12)
      const R = row.addStack(); R.layoutVertically(); R.size = new Size(rw, innerH)
      if (hasTodo) {
        R.url = link('tasks')
        const rh = R.addStack(); cap(rh, 'TO DO'); rh.addSpacer(); t(rh, dateStr, label(8), SOFT); R.addSpacer(7)
        const fs = 13, rowH = (fs * 1.3 + 4) * SCALE
        const L2 = items.filter((x) => !x.done), n = Math.max(2, Math.floor((innerH - 18 * SCALE) / rowH))
        for (const x of L2.slice(0, n)) { const r = R.addStack(); r.centerAlignContent(); r.spacing = 6; if (x.id) r.url = doneUrl(x.id); const imp = x.priority >= 3; t(r, imp ? '•' : '–', tw(fs - 1), imp ? GOLD : SOFT); t(r, x.title, imp ? F(fs, 'Medium') : tw(fs), INK).minimumScaleFactor = 0.8; r.addSpacer(); R.addSpacer(4) }
        if (!L2.length) t(R, 'All clear.', tw(fs), SOFT)
        R.addSpacer()
      } else col(R, others.slice(2, 4), rw)
    } else {
    if (fam !== 'small') { const h = w.addStack(); h.centerAlignContent(); (CW ? t(h, titleTxt, label(10), SOFT) : cap(h, titleTxt)); h.addSpacer(); t(h, dateStr, label(LG ? 9 : 8), SOFT); w.addSpacer(12) }
    if (fam === 'small') w.addSpacer() // 소형: 두 줄을 알맞은 간격으로 묶어 세로 가운데
    // 줄 나누기: 내 위젯에서 '넓게'로 고른 블록은 한 줄 전체
    const wideSet = new Set(CW && Array.isArray(CW.wide) ? CW.wide : []), rowsG = []
    { let cur = []; keys.forEach((k, j) => { if (wideSet.has(k)) { if (cur.length) rowsG.push(cur); cur = []; rowsG.push([j]) } else { cur.push(j); if (cur.length === cols) { rowsG.push(cur); cur = [] } } }); if (cur.length) rowsG.push(cur) }
    rowsG.splice(fam === 'small' ? 2 : 4) // 높이 한도: 소형 두 줄 · 대형 네 줄
    rowsG.forEach((ids, ri) => {
      const r = w.addStack(); r.spacing = gap
      const wdx = ids.length === 1 && wideSet.has(keys[ids[0]]) ? inner : wd
      for (const x of ids.map((j) => tiles[j])) {
        const wd = wdx
        const b = r.addStack(); b.layoutVertically(); b.size = new Size(wd, 0); if (fam !== 'small') b.url = link(x[4])
        t(b, x[0], label(LG ? 9 : 7), x[0][0] === '●' ? GOLD : SOFT).minimumScaleFactor = 0.7; b.addSpacer(2)
        if (typeof x[1] === 'function') { if (x[0] === 'TO DO') b.addSpacer(3); x[1](b, thin(big), wd) } else t(b, x[1], thin(big), INK).minimumScaleFactor = 0.5
        if (x[2]) t(b, x[2], tw(LG ? 12 : 10), x[5]).minimumScaleFactor = 0.7
        if (x[3] != null) { b.addSpacer(4); pbar(b, x[3], wd) }
      }
      if (ri < rowsG.length - 1) w.addSpacer(fam === 'small' ? Math.round(16 * SCALE) : 14)
    })
    }
    // 대형: 아래에 이번 주 공부 (할 일은 위 칸에 있으니 겹치지 않게)
    if ((fam === 'large' || fam === 'extraLarge') && !CW && !keys.includes('bars')) { w.addSpacer(); rule(w, inner); w.addSpacer(10); const s2 = w.addStack(); s2.centerAlignContent(); cap(s2, 'THIS WEEK'); s2.addSpacer(); t(s2, hm(weekTot) + ' · 하루 ' + hm(weekAvg), label(10), SOFT); w.addSpacer(8); bars7(w, inner, Math.round(innerH * 0.16), GOLD, RULE); w.addSpacer(3); wdRow(w, inner, 9); FILL = true }
  } else if (KIND === 'tmrw') {
    // ── 내일 준비: 수업 · 일정 · 할 일 ──
    const td = new Date(d0.getTime() + 86400000)
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'TOMORROW'); h.addSpacer(); t(h, DAY[td.getDay()] + ' ' + (td.getMonth() + 1) + '/' + td.getDate(), label(8), GOLD)
    w.addSpacer(fam === 'small' ? 8 : 10)
    const clLine = (parent) => { if (!TMR.cl.length) return; const r = parent.addStack(); r.centerAlignContent(); t(r, '수업 ' + TMR.cl.length + '교시', tw(10), SOFT); r.addSpacer(6); t(r, clk(TMR.cl[0].start) + '–' + clk(TMR.cl[TMR.cl.length - 1].end), tw(10), SOFT); r.addSpacer(); parent.addSpacer(6) }
    const evRows = (parent, n, size) => {
      for (const e of TMR.ev.slice(0, n)) {
        const r = parent.addStack(); r.centerAlignContent(); r.spacing = 6
        const tm = r.addStack(); tm.size = new Size(34, 0); t(tm, e.s == null ? '종일' : clk(e.s % 1440), tw(10), SOFT); tm.addSpacer()
        const bar = r.addStack(); bar.size = new Size(2, 12); bar.cornerRadius = 1; bar.backgroundColor = e.c ? new Color(e.c) : RULE
        t(r, e.t, tw(size), INK).minimumScaleFactor = 0.8; r.addSpacer(); parent.addSpacer(5)
      }
      if (TMR.ev.length > n) t(parent, '+ ' + (TMR.ev.length - n) + ' more', tw(10), SOFT)
    }
    const tkRows = (parent, n, size) => {
      for (const x of TMR.tk.slice(0, n)) {
        const r = parent.addStack(); r.centerAlignContent(); r.spacing = 6; if (x.id) r.url = doneUrl(x.id)
        const imp = x.priority >= 3; t(r, imp ? '•' : '–', tw(size - 1), imp ? GOLD : SOFT); t(r, x.title, imp ? F(size, 'Medium') : tw(size), INK).minimumScaleFactor = 0.85; r.addSpacer()
        if (x.dueTime != null) t(r, clk(x.dueTime), tw(10), SOFT)
        parent.addSpacer(5)
      }
      if (TMR.tk.length > n) t(parent, '+ ' + (TMR.tk.length - n) + ' more', tw(10), SOFT)
    }
    if (!TMR.ev.length && !TMR.tk.length && !TMR.cl.length) t(w, '내일은 비어 있어요', tw(13), SOFT)
    else if (fam === 'small') { clLine(w); const k = TMR.cl.length ? 2 : 3, kt = Math.max(0, k - TMR.ev.length); evRows(w, k, 12); if (kt) tkRows(w, kt, 12); w.addSpacer(); if (TMR.tk.length && !kt) t(w, '할 일 ' + TMR.tk.length + '개', tw(10), GOLD) }
    else if (fam === 'medium') {
      const row = w.addStack()
      const lw = Math.round(inner * 0.54)
      const L = row.addStack(); L.layoutVertically(); L.size = new Size(lw, MH); clLine(L); evRows(L, TMR.cl.length ? 3 : 4, 12); if (!TMR.ev.length) t(L, '일정 없음', tw(12), SOFT); L.addSpacer()
      row.addSpacer(12); vrule(row, MH); row.addSpacer(12)
      const R = row.addStack(); R.layoutVertically(); R.size = new Size(inner - lw - 24.6, MH); tkRows(R, 4, 12); if (!TMR.tk.length) t(R, '할 일 없음', tw(12), SOFT); R.addSpacer()
      row.addSpacer()
    } else {
      if (TMR.cl.length) { cap(w, 'CLASSES'); w.addSpacer(5); t(w, TMR.cl.map((c) => c.period + ' ' + c.title).join(' · '), tw(12), INK, 2); w.addSpacer(12) }
      cap(w, 'EVENTS'); w.addSpacer(5); evRows(w, 4, 13); if (!TMR.ev.length) t(w, '일정 없음', tw(12), SOFT)
      w.addSpacer(10); cap(w, 'TO DO'); w.addSpacer(5); tkRows(w, TMR.cl.length ? 4 : 6, 13); if (!TMR.tk.length) t(w, '할 일 없음', tw(12), SOFT)
    }
  } else if (KIND === 'due') {
    // ── 마감 임박: 지난 것 + 2주 안 (누르면 완료 확인) ──
    const over = DUE.filter((x) => dueIn(x) < 0).length
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'DUE'); h.addSpacer(); t(h, over ? over + '개 지남' : '2주 ' + DUE.length + '개', label(8), over ? GOLD : SOFT)
    w.addSpacer(10)
    const n0 = fam === 'small' ? 4 : fam === 'medium' ? 5 : 11, n = DUE.length === n0 + 1 ? n0 + 1 : n0
    for (const x of DUE.slice(0, n)) {
      const r = w.addStack(); r.centerAlignContent(); r.spacing = 8; if (x.id) r.url = doneUrl(x.id)
      const tg = r.addStack(); tg.size = new Size(fam === 'small' ? 36 : 42, 0); t(tg, dueTxt(x), tw(10), dueIn(x) <= 0 ? GOLD : SOFT).minimumScaleFactor = 0.7; tg.addSpacer()
      t(r, x.title, x.priority >= 3 ? F(TS, 'Medium') : tw(TS), INK).minimumScaleFactor = 0.85; r.addSpacer()
      if (fam !== 'small' && x.dueTime != null) t(r, clk(x.dueTime), tw(10), SOFT)
      w.addSpacer(fam === 'large' ? 7 : 4)
    }
    if (!DUE.length) t(w, '2주 안에 마감 없음', tw(TS), SOFT)
    else if (DUE.length > n) t(w, '+ ' + (DUE.length - n) + ' more', tw(11), SOFT)
  } else if (KIND === 'week7') {
    // ── 7일 일정: 중형은 7칸, 소·대형은 날짜별 줄 ──
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'NEXT 7 DAYS'); h.addSpacer(); t(h, ev7 + '개', label(8), SOFT)
    w.addSpacer(fam === 'small' ? 8 : 10)
    const evBar = (parent, e, hgt) => { const b = parent.addStack(); b.size = new Size(2, hgt); b.cornerRadius = 1; b.backgroundColor = e.c ? new Color(e.c) : GOLD }
    if (fam === 'medium') {
      const gap = 4, cw = Math.floor((inner - gap * 6) / 7), row = w.addStack(); row.spacing = gap
      for (const d of DAYS7) {
        const c = row.addStack(); c.layoutVertically(); c.size = new Size(cw, MH)
        const a = c.addStack(); t(a, ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.x.getDay()], label(7), d.i === 0 ? GOLD : SOFT); a.addSpacer()
        const b = c.addStack(); t(b, d.x.getDate(), d.i === 0 ? F(13, 'SemiBold') : tw(13), d.i === 0 ? GOLD : INK); b.addSpacer()
        c.addSpacer(4)
        for (const e of d.ev.slice(0, 3)) { const r = c.addStack(); r.centerAlignContent(); r.spacing = 2; evBar(r, e, 9); t(r, e.t, tw(8), INK); r.addSpacer(); c.addSpacer(3) }
        if (d.ev.length > 3) t(c, '+' + (d.ev.length - 3), label(7), SOFT)
        c.addSpacer()
      }
    } else {
      const nd = fam === 'small' ? 3 : 7, ne = fam === 'small' ? 1 : 2
      for (const d of DAYS7.slice(0, nd)) {
        const r = w.addStack(); r.topAlignContent(); r.spacing = 8
        const L = r.addStack(); L.size = new Size(fam === 'small' ? 34 : 44, 0); L.layoutVertically(); t(L, dayName(d), label(7), d.i === 0 ? GOLD : SOFT); t(L, (d.x.getMonth() + 1) + '/' + d.x.getDate(), tw(10), SOFT)
        const R = r.addStack(); R.layoutVertically()
        d.ev.slice(0, ne).forEach((e, j) => {
          const q = R.addStack(); q.centerAlignContent(); q.spacing = 5
          if (fam !== 'small') { const tm = q.addStack(); tm.size = new Size(32, 0); t(tm, e.s == null ? '종일' : clk(e.s % 1440), tw(10), SOFT); tm.addSpacer() }
          evBar(q, e, 11); t(q, e.t, tw(fam === 'small' ? 11 : 12), INK).minimumScaleFactor = 0.8; q.addSpacer()
          if (j === ne - 1 && d.ev.length > ne) t(q, '+' + (d.ev.length - ne), label(7), SOFT)
          R.addSpacer(2)
        })
        if (!d.ev.length) t(R, '—', tw(11), SOFT)
        r.addSpacer()
        w.addSpacer(fam === 'small' ? 5 : 7)
      }
    }
  } else if (KIND === 'ddl') {
    // ── D-day 목록 ──
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'D-DAYS'); h.addSpacer(); if (fam !== 'small') t(h, dateStr, label(8), SOFT)
    w.addSpacer(fam === 'small' ? 8 : 10)
    const ddLine = (parent, x, size) => { const r = parent.addStack(); r.centerAlignContent(); t(r, x.title, tw(size), INK).minimumScaleFactor = 0.8; r.addSpacer(6); if (fam !== 'small') { t(r, x.date.slice(5).replace('-', '.'), tw(10), SOFT); r.addSpacer(8) } t(r, ddT(x), tw(size), GOLD) }
    if (!ddAll.length) t(w, 'No D-day.', tw(13), SOFT)
    else if (fam === 'medium') {
      const row = w.addStack()
      const lw = Math.round(inner * 0.38)
      const L = row.addStack(); L.layoutVertically(); L.size = new Size(lw, MH)
      t(L, ddT(ddAll[0]), thin(34), INK).minimumScaleFactor = 0.5; L.addSpacer(2); t(L, ddAll[0].title, tw(12), GOLD).minimumScaleFactor = 0.7; t(L, ddAll[0].date.slice(5).replace('-', '.'), tw(10), SOFT); L.addSpacer()
      row.addSpacer(12); vrule(row, MH); row.addSpacer(12)
      const R = row.addStack(); R.layoutVertically(); R.size = new Size(inner - lw - 24.6, MH)
      for (const x of ddAll.slice(1, 5)) { const r = R.addStack(); r.centerAlignContent(); t(r, x.title, tw(12), INK).minimumScaleFactor = 0.8; r.addSpacer(6); t(r, ddT(x), tw(12), GOLD); R.addSpacer(7) }
      if (ddAll.length === 1) t(R, '다른 D-day 없음', tw(11), SOFT)
      R.addSpacer()
    } else {
      const n = fam === 'small' ? 4 : 10
      for (const x of ddAll.slice(0, n)) { ddLine(w, x, fam === 'small' ? 12 : 14); w.addSpacer(fam === 'small' ? 6 : 10) }
    }
  } else if (KIND === 'quick') {
    // ── 바로 시작: 과목 누르면 스톱워치 시작 · 빠른 추가 (소형은 최근 과목 하나) ──
    const s0 = QS[0]
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'START'); h.addSpacer(); t(h, '오늘 ' + hm(mins), label(8), GOLD)
    w.addSpacer(fam === 'small' ? 8 : 10)
    const btn = (parent, s, url, wd, hgt, color, size = 12) => { const b = parent.addStack(); b.size = new Size(wd, hgt); b.cornerRadius = 10; b.backgroundColor = RULE; b.centerAlignContent(); b.url = url; if (color) { const d = b.addStack(); d.size = new Size(6, 6); d.cornerRadius = 3; d.backgroundColor = new Color(color); b.addSpacer(5) } t(b, s, tw(size), INK).minimumScaleFactor = 0.6; return b }
    const running = (parent) => { const k = parent.addStack(); k.centerAlignContent(); k.url = link('study.timer'); t(k, '● ' + TM.name + ' ', tw(12), GOLD); if (TM.paused) t(k, hm(TM.pm), tw(12), INK); else timerDate(k, 12); k.addSpacer(); t(k, TM.paused ? '일시정지' : '공부 중', label(8), SOFT) }
    if (fam === 'small') {
      w.url = TM ? link('study.timer') : startUrl(s0)
      if (TM) { t(w, TM.name, tw(12), GOLD); w.addSpacer(2); const r = w.addStack(); if (TM.paused) t(r, hm(TM.pm), thin(30), INK); else timerDate(r, 30, true); r.addSpacer() }
      else { const r = w.addStack(); r.centerAlignContent(); if (s0 && s0.color) { const d = r.addStack(); d.size = new Size(7, 7); d.cornerRadius = 3.5; d.backgroundColor = new Color(s0.color); r.addSpacer(6) } t(r, s0 ? s0.name : '공부', thin(26), INK).minimumScaleFactor = 0.5; r.addSpacer(); w.addSpacer(2); t(w, '눌러서 시작', tw(10), SOFT) }
      w.addSpacer(); pbar(w, mins / goal, inner)
    } else {
      const per = 4, gap = 8, bw = Math.floor((inner - gap * (per - 1)) / per)
      if (TM) { running(w); w.addSpacer(10) }
      const subs = QS.slice(0, TM ? (fam === 'medium' ? 0 : 4) : fam === 'medium' ? 4 : 8)
      for (let i = 0; i < subs.length; i += per) { const r = w.addStack(); r.spacing = gap; for (const s of subs.slice(i, i + per)) btn(r, s.name, startUrl(s), bw, 34, s.color); w.addSpacer(gap) }
      if (!subjects.length && !TM) { t(w, '앱 › 설정에서 과목을 추가해 보세요', tw(12), SOFT); w.addSpacer(gap) }
      const aw = Math.floor((inner - gap * 2) / 3), r2 = w.addStack(); r2.spacing = gap
      btn(r2, '+ 할 일', newUrl('task'), aw, 30, null, 11); btn(r2, '+ 일정', newUrl('event'), aw, 30, null, 11); btn(r2, '+ 기록', newUrl('record'), aw, 30, null, 11)
      if (fam === 'large' || fam === 'extraLarge') { w.addSpacer(14); rule(w, inner); w.addSpacer(10); todoList(w, 4, 5) }
    }
  } else if (KIND === 'timer') {
    // ── 타이머 · 공부 시간: 진행 중이면 흐르는 시간, 아니면 오늘 공부 + 바로 시작 · 과목별 오늘 시간 ──
    const LG = fam === 'large' || fam === 'extraLarge', s0 = QS[0]
    const tmBlock = (P2, big, wd) => {
      const h = P2.addStack(); h.centerAlignContent()
      if (TM) {
        if (TM.color) { const d = h.addStack(); d.size = new Size(6, 6); d.cornerRadius = 3; d.backgroundColor = new Color(TM.color); h.addSpacer(5) }
        t(h, TM.name, tw(LG ? 13 : 11), INK).minimumScaleFactor = 0.7; h.addSpacer(); t(h, TM.paused ? '일시정지' : TM.mode === 'countdown' ? '남음' : '공부 중', label(LG ? 9 : 8), GOLD)
        P2.addSpacer(2)
        const r = P2.addStack(); if (TM.paused) t(r, hm(TM.pm), thin(big), INK); else { const d = timerDate(r, big, true); d.textColor = INK } r.addSpacer()
      } else {
        cap(h, 'STUDY'); h.addSpacer(); t(h, pct + '%', label(LG ? 9 : 8), GOLD)
        P2.addSpacer(2)
        const r = P2.addStack(); r.bottomAlignContent(); t(r, hm(mins), thin(big), INK).minimumScaleFactor = 0.5; r.addSpacer(5); t(r, '/ ' + hm(goal), tw(LG ? 12 : 10), SOFT).minimumScaleFactor = 0.7; r.addSpacer()
      }
      P2.addSpacer(5); pbar(P2, mins / goal, wd)
      P2.addSpacer(5)
      const f = P2.addStack(); f.centerAlignContent()
      if (TM) t(f, '오늘 ' + hm(mins) + ' / ' + hm(goal), tw(LG ? 11 : 10), SOFT)
      else t(f, s0 ? '▶ ' + s0.name + ' 시작' : '▶ 공부 시작', tw(LG ? 12 : 10), GOLD)
      f.addSpacer()
    }
    const subList = (P2, n, wd, size) => {
      const xs = subMins.slice(0, n), mx = (xs[0] && xs[0].m) || 1
      for (const x of xs) {
        const r = P2.addStack(); r.centerAlignContent(); const d = r.addStack(); d.size = new Size(6, 6); d.cornerRadius = 3; d.backgroundColor = x.s.color ? new Color(x.s.color) : GOLD; r.addSpacer(6)
        t(r, x.s.name, tw(size), INK).minimumScaleFactor = 0.8; r.addSpacer(); t(r, hm(x.m), tw(size - 1), SOFT)
        P2.addSpacer(3); pbar(P2, x.m / mx, wd, x.s.color); P2.addSpacer(LG ? 8 : 5)
      }
      if (!xs.length) t(P2, '오늘 기록이 없어요', tw(size), SOFT)
    }
    w.url = TM ? link('study.timer') : startUrl(s0)
    if (fam === 'small') {
      t(w, dateStr, label(8), SOFT); w.addSpacer()
      tmBlock(w, 30, inner)
    } else if (fam === 'medium') {
      const lw = Math.round(inner * 0.5), rw = inner - lw - 24.6
      const row = w.addStack()
      const L = row.addStack(); L.layoutVertically(); L.size = new Size(lw, innerH); L.url = TM ? link('study.timer') : startUrl(s0)
      t(L, dateStr, label(8), SOFT); L.addSpacer(); tmBlock(L, 30, lw)
      row.addSpacer(12); vrule(row, innerH); row.addSpacer(12)
      const R = row.addStack(); R.layoutVertically(); R.size = new Size(rw, innerH); R.url = link('study.records')
      const rh = R.addStack(); cap(rh, 'TODAY'); rh.addSpacer(); R.addSpacer(8)
      subList(R, Math.max(2, Math.floor((innerH - 18) / (22 * SCALE))), rw, 12); R.addSpacer()
    } else {
      const h = w.addStack(); h.centerAlignContent(); cap(h, TM ? 'TIMER' : 'TODAY'); h.addSpacer(); t(h, dateStr, label(9), SOFT)
      w.addSpacer(12)
      tmBlock(w, 46, inner)
      w.addSpacer(14); rule(w, inner); w.addSpacer(10)
      const sh = w.addStack(); cap(sh, 'SUBJECTS'); sh.addSpacer(); t(sh, '이번 주 ' + hm(weekTot), label(9), SOFT); w.addSpacer(8)
      subList(w, 4, inner, 13)
      w.addSpacer()
      // 바로 시작 버튼 (과목 4개)
      const per = 4, gap = 8, bw = Math.floor((inner - gap * (per - 1)) / per), r2 = w.addStack(); r2.spacing = gap
      for (const sj of QS.slice(0, per)) { const b = r2.addStack(); b.size = new Size(bw, 32); b.cornerRadius = 10; b.backgroundColor = RULE; b.centerAlignContent(); b.url = startUrl(sj); if (sj.color) { const d = b.addStack(); d.size = new Size(6, 6); d.cornerRadius = 3; d.backgroundColor = new Color(sj.color); b.addSpacer(5) } t(b, sj.name, tw(12), INK).minimumScaleFactor = 0.6 }
      FILL = true
    }
  } else if (KIND === 'habit') {
    // ── 습관: 오늘 체크(누르면 완료/취소) + 최근 7일 점 ──
    const hs = HABITS(), on = hs.filter((x) => x.on).length
    w.url = link('habits')
    const h = w.addStack(); h.size = new Size(inner, 0); h.centerAlignContent(); cap(h, 'HABITS'); h.addSpacer(); t(h, hs.length ? on + '/' + hs.length : '', label(8), on && on === hs.length ? GOLD : SOFT)
    w.addSpacer(fam === 'small' ? 8 : 10)
    if (!hs.length) t(w, '앱에서 습관을 추가해 보세요', tw(11), SOFT)
    const fs = fam === 'large' ? 13 : 11.5, showW = fam !== 'small'
    const hRow = (P2, x, wd) => {
      const r = P2.addStack(); r.size = new Size(wd, 0); r.centerAlignContent(); r.spacing = 7; r.url = habitUrl(x)
      const z = Math.round(fs * 0.95), b = r.addStack(); b.size = new Size(z, z); b.cornerRadius = z / 2; b.borderWidth = 1; b.borderColor = x.on ? (x.c ? new Color(x.c) : GOLD) : SOFT
      if (x.on) { if (PENCIL) { b.centerAlignContent(); t(b, '✓', F(Math.max(7, z * 0.8), 'Regular'), x.c ? new Color(x.c) : GOLD) } else b.backgroundColor = x.c ? new Color(x.c) : GOLD }
      t(r, x.t, tw(fs), x.on ? SOFT : INK, 1).minimumScaleFactor = 0.8; r.addSpacer()
      if (showW) { const dots = r.addStack(); dots.spacing = 3; dots.centerAlignContent(); for (const v of (x.w || []).slice(0, 7)) { const d = dots.addStack(); d.size = new Size(4, 4); d.cornerRadius = 2; d.backgroundColor = v ? (x.c ? new Color(x.c) : GOLD) : RULE } }
      P2.addSpacer(fam === 'small' ? 6 : 8)
    }
    const n = fam === 'small' ? 4 : fam === 'medium' ? 8 : 10
    if (fam === 'medium' && hs.length > 4) {
      const cw = Math.floor((inner - 25) / 2), row = w.addStack(); row.topAlignContent()
      const L = row.addStack(); L.layoutVertically(); L.size = new Size(cw, 0); for (const x of hs.slice(0, 4)) hRow(L, x, cw)
      row.addSpacer(12); vrule(row, Math.max(20, MH - 6)); row.addSpacer(12)
      const R = row.addStack(); R.layoutVertically(); R.size = new Size(cw, 0); for (const x of hs.slice(4, n)) hRow(R, x, cw)
    } else for (const x of hs.slice(0, n)) hRow(w, x, inner)
  } else if (KIND === 'note') {
    // ── 노트: 내용 보기 위주 — 작은 제목 한 줄 + 본문을 높이만큼 (중형은 넘치면 두 단) ──
    const n = pickNote(), L0 = n ? n.l : []
    w.url = noteUrl(n)
    const fs = fam === 'small' ? 10.5 : fam === 'medium' ? 11 : 12
    const h = w.addStack(); h.size = new Size(inner, 0); h.centerAlignContent()
    t(h, n ? n.t : '노트가 없어요', F(fs + 0.5, 'Regular'), INK, 1).minimumScaleFactor = 0.8; h.addSpacer(); if (n) { h.addSpacer(6); t(h, noteAgo(n.u), label(7), SOFT) }
    w.addSpacer(5); rule(w, inner); w.addSpacer(fam === 'small' ? 5 : 7)
    const avail = innerH - (fs + 0.5) * 1.3 * SCALE - 13
    if (!L0.length) t(w, n ? '내용 없음' : '앱에서 노트를 써 보세요', tw(fs), SOFT)
    else if (fam === 'medium') {
      const cw = Math.floor((inner - 25) / 2), row = w.addStack(); row.size = new Size(inner, avail); row.topAlignContent()
      const L = row.addStack(); L.layoutVertically(); L.size = new Size(cw, avail); const k = noteFlow(L, L0, cw, avail, fs); L.addSpacer()
      if (k < L0.length) { row.addSpacer(12); vrule(row, avail); row.addSpacer(12); const R = row.addStack(); R.layoutVertically(); R.size = new Size(cw, avail); noteFlow(R, L0.slice(k), cw, avail, fs); R.addSpacer() }
      row.addSpacer(); FILL = true
    } else noteFlow(w, L0, inner, avail, fs)
  } else if (KIND === 'quote') {
    // ── 다짐 ──
    t(w, dateStr, label(9), SOFT)
    w.addSpacer()
    t(w, quote || '앱에서 다짐을 적어 보세요', tw(fam === 'small' ? 14 : fam === 'medium' ? 17 : 22), INK, fam === 'large' ? 8 : 4)
    w.addSpacer()
  } else if (fam === 'small') {
    // ── 기본 ──
    t(w, dateStr, label(9), SOFT)
    w.addSpacer()
    studyBig(w, 26, inner)
    w.addSpacer()
    ddRow(w)
  } else if (fam === 'medium') {
    const row = w.addStack()
    const L = row.addStack(); L.layoutVertically(); L.size = new Size(140, innerH); L.url = link('study.records')
    t(L, dateStr, label(9), SOFT); L.addSpacer()
    studyBig(L, 28, 140)
    L.addSpacer()
    ddRow(L, 12)
    row.addSpacer(16); vrule(row, innerH); row.addSpacer(16)
    const R = row.addStack(); R.layoutVertically(); R.size = new Size(inner - 172.6, innerH); R.url = link('tasks')
    cap(R, 'TODAY'); R.addSpacer(10)
    todoList(R, 4)
    R.addSpacer()
    row.addSpacer() // 줄을 위젯 폭만큼 채워 가운데로 밀리지 않게
  } else {
    const top = w.addStack(); top.centerAlignContent()
    t(top, dateStr, label(9), SOFT); top.addSpacer()
    if (dd) { t(top, dd.title + '  ', tw(10), SOFT); t(top, ddTxt, tw(13), GOLD) }
    w.addSpacer(14)
    if (quote) { t(w, '— ' + quote, tw(14), INK, 2); w.addSpacer(14) }
    rule(w, inner); w.addSpacer(12)
    const S = w.addStack(); S.layoutVertically(); S.url = link('study.records')
    cap(S, 'STUDY'); S.addSpacer(6)
    studyBig(S, 34, inner)
    S.addSpacer(7)
    const subs = S.addStack(); subs.spacing = 12
    for (const x of subMins) t(subs, x.s.name + ' ' + hm(x.m), tw(10), SOFT)
    subs.addSpacer()
    w.addSpacer(12); rule(w, inner); w.addSpacer(12)
    const T = w.addStack(); T.layoutVertically(); T.url = link('tasks')
    const h = T.addStack(); cap(h, 'TODAY'); h.addSpacer(); t(h, done + ' DONE', label(8), GOLD)
    T.addSpacer(9)
    todoList(T, 6)
  }
  if (!lock && !FILL) w.addSpacer()
} catch (e) {
  // 그리다 실패해도 빈칸 대신 원인을 보여 줌
  w = new ListWidget()
  if (!lock) { w.setPadding(16, 16, 16, 16); w.backgroundColor = BG }
  const msg = String((e && e.message) || e)
  if (fam === 'accessoryInline') { inline('위젯 오류 · ' + msg); return w }
  t(w, '위젯 오류', label(lock ? 10 : 12), lock ? null : INK)
  t(w, lock ? msg.slice(0, 60) : msg + ' · 스크립트를 앱에서 다시 복사해 보세요', tw(lock ? 9 : 11), lock ? null : SOFT, lock ? 2 : 4)
}
return w
}

`
