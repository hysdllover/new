// 처음 실행: 짧은 환영 · 하루 목표 · 과목 · 홈 화면 추가/동기화 안내 (한 번만, 데이터가 없을 때만)
import { useSettings, setSettings, useColl, list } from '../store/store.js'
import { openSheet, Icon } from './ui.jsx'
import { isStandalone } from '../lib/push.js'
import { go } from '../nav.js'

const KEY = 'welcomed'
const GOALS = [120, 180, 240, 300, 360]

export function maybeWelcome() {
  try {
    if (localStorage.getItem(KEY) || location.search.includes('demo')) return
    // 이미 쓰던 사람(기록·할 일·노트가 있음)에겐 띄우지 않음
    if (list('tasks').length || list('sessions').length || list('notes').length) { localStorage.setItem(KEY, '1'); return }
    localStorage.setItem(KEY, '1') // 띄운 순간 기록 → 쓸어 내려 닫아도 다시 안 뜸
  } catch { return }
  openSheet((close) => <Welcome close={close} />, { title: '반가워요' })
}

function Welcome({ close }) {
  const st = useSettings()
  const subjects = useColl('subjects')
  // 설정은 해당 분류(동기화 · 위젯)를 바로 열어 둠
  const goTo = (tab, seg, sec) => { if (sec) try { localStorage.setItem('set_sec', sec) } catch {} close(); go(tab, seg) }
  return (
    <div className="col welcome" style={{ gap: 16 }}>
      <div className="small muted" style={{ lineHeight: 1.6 }}>공부 시간 · 할 일 · 캘린더 · 노트를 한곳에 모아요. 기록은 이 기기에 저장되고, 원하면 아이폰·아이패드끼리 동기화할 수 있어요.</div>
      <div className="col" style={{ gap: 8 }}>
        <div className="lbl">하루 목표 공부 시간</div>
        <div className="row wrap" style={{ gap: 6 }}>
          {GOALS.map((g) => <button key={g} className={'chip' + ((st.goalDaily || 240) === g ? ' on' : '')} onClick={() => setSettings({ goalDaily: g })}>{g / 60}시간</button>)}
        </div>
      </div>
      <div className="col" style={{ gap: 8 }}>
        <div className="lbl">과목</div>
        <div className="row wrap" style={{ gap: 6 }}>
          {subjects.map((s) => <span key={s.id} className="chip"><span className="dot" style={{ background: s.color }} />{s.name}</span>)}
        </div>
        <button className="tiny muted" style={{ alignSelf: 'flex-start' }} onClick={() => goTo('study', 'subjects')}>과목 바꾸기 →</button>
      </div>
      <div className="list welcome-tips">
        {!isStandalone() && <div className="item"><Icon name="share" size={16} /><div className="t"><div>홈 화면에 추가</div><div className="meta">Safari 공유 버튼 › 홈 화면에 추가 — 앱처럼 전체 화면으로 열려요</div></div></div>}
        <button className="item" style={{ textAlign: 'left' }} onClick={() => goTo('settings', null, 'sync')}><Icon name="sync" size={16} /><div className="t"><div>기기끼리 동기화</div><div className="meta">설정 › 동기화 — GitHub 토큰 하나로 아이폰·아이패드가 같은 기록을 봐요</div></div><Icon name="next" size={14} /></button>
        <button className="item" style={{ textAlign: 'left' }} onClick={() => goTo('settings', null, 'widget')}><Icon name="layers" size={16} /><div className="t"><div>홈 화면 위젯</div><div className="meta">설정 › 위젯 — Scriptable 로 공부 시간 · 할 일 · D-day 를 홈 화면에</div></div><Icon name="next" size={14} /></button>
      </div>
      <button className="btn primary" onClick={close}>시작하기</button>
    </div>
  )
}
