// 알림 링크로 화면 열기: ?go=탭.세그먼트 · ?task=id · ?ev=id&occ=날짜 · ?close=1(하루 마감)
// 앱을 새로 열 때(main) · 이미 열린 앱에서 알림을 눌렀을 때(서비스 워커 메시지) 같이 씀
import { go } from '../nav.js'

export async function openLink(search) {
  const q = new URLSearchParams(search)
  const g = q.get('go')
  if (g) { const [tab, seg] = g.split('.'); go(tab, seg) }
  const tk = q.get('task'), ev = q.get('ev')
  if (tk || ev) {
    const [{ openDetail }, { find }] = await Promise.all([import('../components/ui.jsx'), import('../store/store.js')])
    if (tk) go('tasks', 'day'); else go('planner', 'today')
    const occ = q.get('occ')
    setTimeout(() => { if (tk ? find('tasks', tk) : find('events', ev)) openDetail(tk ? 'task' : 'event', tk || ev, occ ? { occ } : undefined) }, 350)
  }
  if (q.get('close') != null) {
    go('home')
    const { openCloseDay } = await import('../components/CloseDay.jsx')
    setTimeout(openCloseDay, 350)
  }
}
