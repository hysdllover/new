// 설정: 공부 목표 · 디자인 · 동기화 · 백업 · 위젯 · 데이터 · 정보
import { useEffect, useState, useSyncExternalStore } from 'react'
import { useSettings, setSettings, useColl, exportJSON, importJSON, resetAll, deviceId } from '../store/store.js'
import { Card, Seg, Toggle, Field, Icon, confirmSheet } from '../components/ui.jsx'
import { toast } from '../components/toast.js'
import { useSyncStatus, connect, disconnect, syncNow, token, listBackups, backupNow, restoreBackup, widgetRawUrl } from '../sync/sync.js'
import { buildLoader, WIDGET_KINDS } from '../lib/scriptable.js'
import { WidgetPreview } from './WidgetPreview.jsx'
import { CHANGES } from '../lib/whatsnew.js'
import { fontInfo, onFont, addFont, removeFont } from '../lib/fonts.js'
import { PALETTE } from '../store/schema.js'
import { hm, fmtDate, tsYmd } from '../lib/date.js'

const APP_URL = () => location.origin + location.pathname.replace(/index\.html$/, '')
const download = (name, text, type = 'application/json') => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000) }
const copy = async (text, msg = '복사했어요') => { try { await navigator.clipboard.writeText(text); toast(msg) } catch { toast('복사하지 못했어요') } }

export default function Settings() {
  const st = useSettings()
  return (
    <>
      <header className="page-h"><h1>설정</h1></header>
      <div className="grid two">
        <Card title="공부">
          <div className="form">
            <Field label={`하루 목표 · ${hm(st.goalDaily)}`}><Seg small value={st.goalDaily} onChange={(v) => setSettings({ goalDaily: v })} options={[60, 90, 120, 180, 240, 300].map((m) => [m, hm(m)])} /></Field>
            <Field label="직접 (분)"><input className="input num" type="number" inputMode="numeric" step="10" value={st.goalDaily} onChange={(e) => setSettings({ goalDaily: Math.max(10, +e.target.value || 10) })} /></Field>
            <Field label="주 시작"><Seg small value={st.weekStart} onChange={(v) => setSettings({ weekStart: v })} options={[[1, '월요일'], [0, '일요일']]} /></Field>
          </div>
        </Card>
        <Card title="디자인">
          <div className="form">
            <Field label="테마"><Seg small value={st.theme} onChange={(v) => setSettings({ theme: v })} options={[['basic', '기본'], ['pencil', '연필 아날로그']]} /></Field>
            <Toggle label="필기 느낌" hint="손으로 그린 체크 · 부드러운 점수 선" checked={st.handFx !== false} onChange={(v) => setSettings({ handFx: v })} />
            <FontField />
            <Field label="포인트 색"><div className="chips">{PALETTE.map((c) => <button key={c} className={'chip sw-pick' + (st.accent === c ? ' on' : '')} onClick={() => setSettings({ accent: c })} aria-label={c}><i className="sw" style={{ background: c }} /></button>)}</div></Field>
          </div>
        </Card>
        <SyncCard />
        <BackupCard />
        <WidgetCard />
        <DataCard />
        <Card title="새로워진 점" className="span2">
          {CHANGES.slice(0, 10).map((c) => <div key={c.v} style={{ marginBottom: 8 }}><div className="tiny soft">{c.v}</div>{c.items.map((x, i) => <div key={i} className="small">{x}</div>)}</div>)}
          <div className="tiny soft" style={{ marginTop: 8 }}>예전 스터디 대시보드 코드는 저장소의 backup/study-dashboard-v1 브랜치에 그대로 있어요. 예전 동기화 데이터(gist ‘study-dashboard-sync’)도 지우지 않았어요.</div>
        </Card>
      </div>
    </>
  )
}

// 내 글꼴: 이 기기에만 저장 (사이트 · 저장소에 올리지 않음)
function FontField() {
  const f = useSyncExternalStore(onFont, fontInfo)
  const [busy, setBusy] = useState(false)
  const pick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2'; i.onchange = async () => { const file = i.files[0]; if (!file) return; setBusy(true); try { await addFont(file); toast('글꼴을 바꿨어요') } catch (e) { toast(e.message) } setBusy(false) }; i.click() }
  return (
    <Field label="글꼴">
      <div className="row wrap">
        <span className="grow small">{f ? f.name : '기본 (시스템)'}{f && <span className="soft"> · {(f.size / 1048576).toFixed(1)}MB</span>}</span>
        <button className="btn sm" disabled={busy} onClick={pick}>{busy ? '넣는 중…' : f ? '다른 글꼴' : '내 글꼴 넣기'}</button>
        {f && <button className="btn sm" onClick={() => removeFont().then(() => toast('기본 글꼴로 돌렸어요'))}>기본으로</button>}
      </div>
      <span className="tiny soft">파일 앱에서 ttf · otf 를 고르면 이 기기에만 저장돼요 (아이폰 · 아이패드 각각 한 번). 일본어처럼 글꼴에 없는 글자는 기본 글꼴로 나와요. 위젯은 Scriptable 이라 기본 글꼴이에요.</span>
    </Field>
  )
}

function SyncCard() {
  const s = useSyncStatus(), live = useColl('live')
  const [tok, setTok] = useState(''), [busy, setBusy] = useState(false)
  const on = !!token()
  const devs = live.filter((r) => r.kind === 'device').sort((a, b) => b.at - a.at)
  const label = { off: '꺼짐', idle: '연결됨', syncing: '동기화 중', ok: '동기화됨', error: '잠깐 실패' }[s.state]
  return (
    <Card title="아이폰 · 아이패드 동기화" action={<span className="small soft">{label}</span>}>
      {!on ? (
        <form className="form" onSubmit={async (e) => { e.preventDefault(); if (!tok.trim()) return; setBusy(true); try { await connect(tok); setTok(''); toast('연결했어요') } catch (er) { toast(er.message) } setBusy(false) }}>
          <div className="small muted">GitHub › Settings › Developer settings › Personal access tokens › Tokens (classic)에서 <b>gist</b> 권한만 체크해 만든 토큰을 두 기기 모두에 넣어 주세요. 비공개 gist 하나에 저장돼요.</div>
          <input className="input" type="password" autoComplete="off" placeholder="ghp_…" value={tok} onChange={(e) => setTok(e.target.value)} />
          <div className="tiny soft">토큰은 이 기기에만 저장돼요. 메모 · 채팅 · 공개 저장소에 붙여 넣지 마세요.</div>
          <div className="row end"><button className="btn primary" disabled={busy || !tok.trim()}>{busy ? '연결 중…' : '연결'}</button></div>
        </form>
      ) : (
        <div className="form">
          <div className="small">{s.last ? `마지막 동기화 ${tsYmd(s.last) === tsYmd(Date.now()) ? new Date(s.last).toTimeString().slice(0, 5) : fmtDate(tsYmd(s.last))}` : '아직 동기화 전'}{s.got ? ` · 받음 ${s.got}` : ''}{s.sent ? ' · 보냄' : ''}</div>
          {s.error && <div className="small bad-t">{s.error}</div>}
          {devs.length > 0 && <div className="meta">{devs.map((d) => <span key={d.id}>{d.name}{d.id === 'dev-' + deviceId ? ' (이 기기)' : ''} · {fmtDate(tsYmd(d.at), false)}</span>)}</div>}
          <div className="row wrap">
            <button className="btn" onClick={() => syncNow()} disabled={s.state === 'syncing'}><Icon name="sync" size={15} />지금 동기화</button>
            <button className="btn danger" onClick={() => confirmSheet('연결 끊기', '이 기기의 토큰을 지워요. 데이터는 그대로 남아요.', disconnect, '끊기')}>연결 끊기</button>
          </div>
          <div className="tiny soft">앱을 열 때 · 고친 뒤 잠시 모아서(30초 간격) · 열려 있으면 5분마다 동기화해요. 같은 항목은 나중에 고친 쪽이 남아요.</div>
        </div>
      )}
    </Card>
  )
}

function BackupCard() {
  const s = useSyncStatus()
  const [list, setList] = useState(null), [busy, setBusy] = useState(false)
  const load = () => listBackups().then(setList).catch((e) => setList({ error: e.message }))
  useEffect(() => { if (token()) load() }, [s.state === 'off']) // eslint-disable-line
  return (
    <Card title="자동 백업" action={token() && <button className="lnk" disabled={busy} onClick={async () => { setBusy(true); try { await backupNow(); toast('백업했어요'); load() } catch (e) { toast(e.message) } setBusy(false) }}>지금 백업</button>}>
      {!token() && <div className="small soft">동기화를 연결하면 매주 gist 에 백업하고 최근 4개를 남겨요.</div>}
      {Array.isArray(list) && <div className="rows">{list.map((b) => (
        <div key={b.name} className="row-line"><span className="t small">{fmtDate(b.date)}</span><span className="tiny soft">{Math.round((b.size || 0) / 1024)}KB</span>
          <button className="btn sm" onClick={() => confirmSheet('되돌리기', `${fmtDate(b.date)} 백업으로 되돌릴까요? 백업 뒤에 새로 만든 항목은 그대로 남아요.`, async () => { try { await restoreBackup(b); toast('되돌렸어요') } catch (e) { toast(e.message) } }, '되돌리기', false)}>되돌리기</button></div>
      ))}</div>}
      {Array.isArray(list) && !list.length && <div className="small soft">아직 백업이 없어요 · 다음 동기화 때 만들어져요</div>}
      {list?.error && <div className="small bad-t">{list.error}</div>}
    </Card>
  )
}

function WidgetCard() {
  const st = useSettings(), raw = widgetRawUrl()
  const [kind, setKind] = useState(''), [size, setSize] = useState('medium')
  return (
    <Card title="Scriptable 위젯" className="span2">
      <div className="form">
        <div className="small muted">1. App Store 에서 Scriptable 설치 › 2. 아래 ‘로더 복사’ › Scriptable 에서 새 스크립트에 붙여 넣고 이름을 ‘어학’으로 › 3. 홈 화면에 Scriptable 위젯 추가 › 위젯 편집에서 Script ‘어학’, Parameter 에 아래 이름. 잠금 화면 위젯도 같아요.</div>
        <div className="row wrap">
          <button className="btn primary" disabled={!raw} onClick={() => copy(buildLoader({ widgetRaw: raw, appUrl: APP_URL() }), '로더를 복사했어요 · Scriptable 에 붙여 넣으세요')}><Icon name="copy" size={15} />로더 복사</button>
          {!raw && <span className="small soft">먼저 동기화를 연결해 주세요 (위젯은 동기화된 요약을 읽어요)</span>}
        </div>
        <Field label="위젯 색"><Seg small value={st.widgetTheme} onChange={(v) => { setSettings({ widgetTheme: v }); setTimeout(syncNow, 500) }} options={[['basic', '블루그레이'], ['paper', '종이'], ['pencil', '연필']]} /></Field>
        <Field label="Parameter (눌러서 미리보기)">
          <div className="chips">{WIDGET_KINDS.map(([k, l]) => <button key={k} className={'chip' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>{l}{k ? <span className="soft"> · {k}</span> : <span className="soft"> · 비움</span>}</button>)}</div>
        </Field>
        <div className="tiny soft">{WIDGET_KINDS.find((x) => x[0] === kind)?.[2]}</div>
        <Seg small value={size} onChange={setSize} options={[['small', '소형'], ['medium', '중형'], ['large', '대형'], ['lock', '잠금 화면']]} />
        <WidgetPreview kind={kind} size={size} theme={st.widgetTheme} />
      </div>
    </Card>
  )
}

function DataCard() {
  return (
    <Card title="데이터">
      <div className="form">
        <div className="row wrap">
          <button className="btn" onClick={() => download(`exam-study-${tsYmd(Date.now())}.json`, exportJSON())}><Icon name="down" size={15} />내보내기</button>
          <button className="btn" onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json'; i.onchange = async () => { const f = i.files[0]; if (!f) return; try { const n = importJSON(await f.text()); toast(`합쳤어요 · ${n}개`) } catch (e) { toast(e.message) } }; i.click() }}><Icon name="up" size={15} />가져와 합치기</button>
        </div>
        <button className="btn danger" onClick={() => confirmSheet('모두 지우기', '이 기기의 시험 · 할 일 · 기록을 모두 지울까요? 동기화가 연결돼 있으면 다른 기기의 데이터가 다시 내려올 수 있어요.', () => { resetAll(); toast('지웠어요') }, '모두 지우기')}><Icon name="trash" size={15} />이 기기 데이터 모두 지우기</button>
      </div>
    </Card>
  )
}
