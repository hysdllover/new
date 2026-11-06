import { useSyncStatus, syncNow, syncLog } from '../sync/sync.js'

const LABEL = { ok: '동기화됨', syncing: '동기화 중…', pending: '보낼 변경 대기 중', error: '오류', idle: '연결됨', off: '꺼짐' }
const when = (t) => new Date(t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

// 상단 동기화 점을 누르면 — 상태 · 마지막 동기화 · 대기 변경 · 최근 기록
export default function SyncSheet() {
  const s = useSyncStatus()
  const log = syncLog().slice(0, 8)
  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="row small" style={{ gap: 8 }}><span className={'sync-dot ' + s.state} />{LABEL[s.state] || s.state}</div>
      <div className="col small" style={{ gap: 4 }}>
        <div className="row" style={{ justifyContent: "space-between" }}><span className="muted">마지막 동기화</span><span>{s.last ? when(s.last) : '—'}</span></div>
        <div className="row" style={{ justifyContent: "space-between" }}><span className="muted">보낼 변경</span><span>{s.pendingN || 0}개</span></div>
        {s.rate && <div className="row" style={{ justifyContent: "space-between" }}><span className="muted">GitHub 남은 요청</span><span style={s.rate.rem < 300 ? { color: 'var(--danger)' } : null}>{s.rate.rem} / {s.rate.lim}{s.rate.reset ? ` · ${new Date(s.rate.reset).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 초기화` : ''}</span></div>}
        {s.rate && <div className="row" style={{ justifyContent: "space-between" }}><span className="muted">이 기기가 1시간 동안 쓴 요청</span><span>{s.rate.mine}회</span></div>}
      </div>
      {s.error && <div className="tiny" style={{ color: 'var(--danger)' }}>{s.error}</div>}
      {s.rate && s.rate.rem < 300 && <div className="tiny muted">한도(시간당 {s.rate.lim}회)를 거의 다 썼어요. 이 기기가 쓴 수보다 훨씬 많이 줄었다면 같은 토큰을 쓰는 다른 곳(다른 기기 · 위젯 · 알림 서버 · 다른 앱)이 요청을 많이 보내는 중이에요. 초기화 시각이 지나면 자동으로 다시 동기화돼요.</div>}
      {log.length > 0 && (
        <div className="col" style={{ gap: 2 }}>
          <div className="tiny muted">최근 기록</div>
          {log.map((x, i) => <div key={i} className="tiny row" style={{ gap: 8 }}><span className="muted" style={{ width: 82, flexShrink: 0 }}>{when(x.at)}</span>
            {x.err ? <span style={{ color: 'var(--danger)' }}>오류 · {x.err}</span> : <span>받음 {x.got} · 보냄 {x.sent}{x.clash ? ' · 겹침 ' + x.clash : ''}</span>}</div>)}
        </div>
      )}
      {s.state !== 'off' && <button className="btn primary" disabled={s.state === 'syncing'} onClick={() => syncNow()}>지금 동기화</button>}
    </div>
  )
}
