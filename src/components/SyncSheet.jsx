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
      </div>
      {s.error && <div className="tiny" style={{ color: 'var(--danger)' }}>{s.error}</div>}
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
