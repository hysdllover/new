// 일정을 공부 기록으로: studyLog 켠 일정이 끝나면 그 시간을 공부 기록으로 (기기 둘이 해도 id 같아 하나)
import { getState } from '../store/store.js'
import { eventsOn } from '../engine/scheduler.js'
import { addSession } from '../store/actions.js'
import { today, addDays, nowMin, parseYmd } from '../engine/date.js'

const ts = (d, m) => { const x = parseYmd(d); x.setMinutes(m); return x.getTime() }
export function eventStudyLogs() {
  const t = today(), m = nowMin(), sess = getState().sessions || {}
  let n = 0
  for (let i = 0; i < 3; i++) {
    const d = addDays(t, -i)
    for (const e of eventsOn(d)) {
      if (!e.studyLog || e.start == null || e.end == null) continue
      if (d === t && e.end > m) continue // 아직 안 끝남
      const id = `ev-${e.id}-${d}`
      if (sess[id]) continue // 이미 기록(지운 것 포함)
      if (addSession({ id, subjectId: e.subjectId || null, start: ts(d, e.start), end: ts(d, e.end), kind: 'event', note: e.title })) n++
    }
  }
  return n
}
