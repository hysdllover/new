// 내보내기·인쇄 시트: 앱 어디서나 같은 자리(⋯ 메뉴 › 내보내기·인쇄…)·같은 이름·같은 모양
import { Icon } from './ui.jsx'

// opts: [{ icon, label, desc, run }] — 누르면 시트를 닫고 실행
export default function ExportSheet({ close, opts }) {
  return (
    <div className="col" style={{ gap: 4 }}>
      {opts.filter(Boolean).map((o) => (
        <button key={o.label} className="exp-row" onClick={() => { close(); setTimeout(o.run, 60) }}>
          <Icon name={o.icon} size={17} />
          <span className="grow"><span className="small">{o.label}</span>{o.desc && <span className="tiny muted">{o.desc}</span>}</span>
          <Icon name="next" size={13} />
        </button>
      ))}
    </div>
  )
}
