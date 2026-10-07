// 업데이트 뒤 처음 열 때 조용히 한 줄로 알려 줄 '새로워진 점' (맨 위가 최신)
export const CHANGES = [
  { v: '2026.10.07', items: ['카드 하나에 오류가 나도 앱이 멈추지 않아요', '글꼴을 앱 안에 넣어 인터넷 없이도 같은 모양', '앱 아이콘에 남은 할 일 수 표시', '설정 › 문제 신고에서 진단 정보 복사'] },
  { v: '2026.10.06', items: ['노트 HTML 내보내기', '노트 목록 접기 · 페이지 전체 화면', '구분선 모양 선택', '표 줄·칸 옮기기와 정렬'] },
]

// 새 버전이면 { v, items } · 처음 설치면 기록만 하고 null
export function pendingChanges() {
  try {
    const seen = localStorage.getItem('seen_ver'), cur = CHANGES[0].v
    if (seen === cur) return null
    localStorage.setItem('seen_ver', cur)
    if (!seen) return null
    return CHANGES.filter((c) => c.v > seen)
  } catch { return null }
}
