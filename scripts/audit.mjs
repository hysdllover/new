// 실기기 크기 기준 화면 점검: 모든 화면을 열어 오류 · 가로 넘침 · '다시 불러오기' 상자를 찾음
// 사용: npm run dev 로 띄운 뒤 `npm run audit` (Playwright 필요: npm i -D playwright 또는 전역 설치)
// 옵션: AUDIT_URL=http://localhost:5173  AUDIT_SHOT=1 (스크린샷 audit-shots/ 에 저장)
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
let pw
try { pw = require('playwright') } catch { try { pw = createRequire('/opt/node22/lib/node_modules/')('playwright') } catch { console.error('playwright 가 필요해요: npm i -D playwright'); process.exit(1) } }
const { chromium } = pw

const URL0 = (process.env.AUDIT_URL || 'http://localhost:5173') + '/?demo'
const SHOT = !!process.env.AUDIT_SHOT
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1'
const UA_IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15'
const DEVICES = [
  ['16ProMax', 440, 956, 3, UA_IPHONE, true],
  ['16ProMax-가로', 956, 440, 3, UA_IPHONE, true],
  ['iPadPro13', 1032, 1376, 2, UA_IPAD, false],
  ['iPadPro13-가로', 1376, 1032, 2, UA_IPAD, false],
  ['iPadPro11', 834, 1210, 2, UA_IPAD, false],
]
const SEGS = { home: [''], planner: ['today', 'page', 'days3', 'week', 'month', 'timetable'], tasks: ['day', 'list', 'board', 'matrix', 'kanban', 'gantt', 'table', 'archive'], study: ['log', 'timer', 'records', 'subjects', 'review', 'progress', 'plan'], notes: ['daily', 'pages', 'todos', 'hub', 'graph', 'library'], health: [''], settings: [''] }

const b = await chromium.launch()
let bad = 0
if (SHOT) mkdirSync('audit-shots', { recursive: true })
for (const [name, w, h, dpr, ua, mobile] of DEVICES) for (const scheme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, userAgent: ua, isMobile: mobile, hasTouch: true, colorScheme: scheme })
  const p = await ctx.newPage()
  let errs = []
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)))
  await p.goto(URL0); await p.waitForTimeout(800)
  for (const [tab, segs] of Object.entries(SEGS)) for (const seg of segs) {
    errs = []
    await p.evaluate(([tab, seg]) => { sessionStorage.setItem('safari_note', '1'); localStorage.setItem('nav', JSON.stringify({ tab, seg: seg ? { [tab]: seg } : {}, params: {} })) }, [tab, seg])
    await p.reload(); await p.waitForSelector('.content-inner', { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(400)
    const r = await p.evaluate(() => ({
      hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      boxes: document.querySelectorAll('.err-box').length,
    }))
    const issues = [errs.length && '오류: ' + [...new Set(errs)].join(' / '), r.hscroll && '화면 가로 넘침', r.boxes && `다시 불러오기 상자 ${r.boxes}개`].filter(Boolean)
    if (issues.length) { bad++; console.log(`✗ ${name} ${scheme} ${tab}/${seg} — ${issues.join(' · ')}`) }
    if (SHOT) await p.screenshot({ path: `audit-shots/${name}-${scheme}-${tab}-${seg || 'main'}.png` })
  }
  await ctx.close()
}
await b.close()
console.log(bad ? `문제 ${bad}곳` : '모든 화면 정상')
process.exit(bad ? 1 : 0)
