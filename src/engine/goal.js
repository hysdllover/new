// 하루 목표 공부 시간(분): 요일별 목표(설정 › 요일별 다르게)가 있으면 그 요일 값, 없으면 기본 하루 목표
import { parseYmd } from './date.js'

export const goalFor = (st, date) => {
  const v = +st?.goalByDay?.[parseYmd(date).getDay()]
  return v > 0 ? v : +st?.goalDaily || 240
}
