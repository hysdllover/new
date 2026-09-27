import { useColl, useSettings } from '../../store/store.js'
import { Card, Icon, Empty, Ring, openSheet } from '../../components/ui.jsx'
import RecordEditor from '../../components/RecordEditor.jsx'
import { FileThumb } from '../../components/Attach.jsx'
import { setParams } from '../../nav.js'
import { today, addDays, fmtDate, fmtDur, fmtTime, tsToMin } from '../../engine/date.js'

export const openRecord = (rec, opt = {}) => openSheet((close) => <RecordEditor rec={rec} date={opt.date} subjectId={opt.subjectId} onDone={close} />, { title: rec ? '공부 기록 수정' : '공부 기록 입력' })

export default function Log({ params = {} }) {
  const st = useSettings()
  const sessions = useColl('sessions')
  const subjects = useColl('subjects')
  const files = useColl('files')
  const date = params.logDate || today()
  const setDate = (d) => setParams('study', { logDate: d })
  const list = sessions.filter((s) => s.date === date).sort((a, b) => (b.start ?? b.createdAt ?? 0) - (a.start ?? a.createdAt ?? 0))
  const total = list.reduce((a, s) => a + s.dur, 0)
  const bySub = subjects.map((s) => ({ s, m: list.filter((x) => x.subjectId === s.id).reduce((a, x) => a + x.dur, 0) })).filter((x) => x.m)

  return (
    <div className="grid two">
      <Card title="공부 기록 입력">
        <RecordEditor date={date} compact />
      </Card>
      <div className="col">
        <div className="row between">
          <div className="row">
            <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="이전 날"><Icon name="back" /></button>
            <label className="date-label"><b>{fmtDate(date)}</b><input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
            <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="다음 날"><Icon name="next" /></button>
          </div>
          {date !== today() && <button className="btn sm" onClick={() => setDate(today())}>오늘</button>}
        </div>
        <Card>
          <div className="row" style={{ gap: 14 }}>
            <Ring value={total / (st.goalDaily || 1)} size={72}><b className="small">{Math.round(total / (st.goalDaily || 1) * 100)}%</b></Ring>
            <div className="grow">
              <div style={{ fontSize: '1.3em', fontWeight: 'var(--fw-b)' }}>{fmtDur(total)}</div>
              <div className="stack-bar">{bySub.map(({ s, m }) => <i key={s.id} style={{ flex: m, background: s.color }} title={s.name} />)}</div>
              <div className="row wrap tiny muted" style={{ gap: 8, marginTop: 4 }}>{bySub.map(({ s, m }) => <span key={s.id}><span className="dot" style={{ background: s.color }} /> {s.name} {fmtDur(m)}</span>)}</div>
            </div>
          </div>
        </Card>
        <Card title={`기록 ${list.length}`}>
          <div className="list">
            {list.map((r) => {
              const sub = subjects.find((s) => s.id === r.subjectId)
              const pics = (r.files || []).map((id) => files.find((f) => f.id === id)).filter(Boolean)
              return (
                <button key={r.id} className="item rec-item" onClick={() => openRecord(r)}>
                  <span className="rec-bar" style={{ background: sub?.color || 'var(--muted)' }} />
                  <div className="t">
                    <div className="row between"><b>{sub?.name || '과목 없음'}</b><span>{fmtDur(r.dur)}</span></div>
                    <div className="meta">
                      {r.start != null ? <span>{fmtTime(tsToMin(r.start))}–{fmtTime(tsToMin(r.start) + r.dur)}</span> : <span>시각 없음</span>}
                      <span className="badge">{r.kind === 'manual' ? '직접 입력' : r.kind === 'pomodoro' ? '뽀모도로' : '타이머'}</span>
                      {r.focus > 0 && <span>{'★'.repeat(r.focus)}</span>}
                    </div>
                    {r.note && <div className="small" style={{ marginTop: 3, whiteSpace: 'pre-wrap' }}>{r.note}</div>}
                    {pics.length > 0 && <div className="row wrap" style={{ gap: 4, marginTop: 6 }} onClick={(e) => e.stopPropagation()}>{pics.map((f) => <FileThumb key={f.id} file={f} size={48} />)}</div>}
                  </div>
                </button>
              )
            })}
            {!list.length && <Empty>이 날의 기록이 없어요</Empty>}
          </div>
        </Card>
      </div>
    </div>
  )
}
