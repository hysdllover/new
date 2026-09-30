import { useEffect, useState } from 'react'
import { useSettings, setSettings, useColl, put, remove, patch, exportJSON, importJSON, uid } from '../store/store.js'
import { PRESETS, FONTS } from '../theme/theme.js'
import { PALETTE, SOFT_PALETTE } from '../store/schema.js'
import { Card, Seg, Toggle, Field, Icon, toast, confirmSheet, openSheet } from '../components/ui.jsx'
import { ColorPick, TimeInput, SubjectSelect } from '../components/common.jsx'
import { useSyncStatus, connect, disconnect, syncNow, gistInfo, tokenExpiry, listBackups, backupNow, restoreBackup } from '../sync/sync.js'
import { enablePush, disablePush, pushState, testLocal, isStandalone, pushSupported } from '../lib/push.js'
import { buildScript, WIDGET_KINDS } from '../lib/scriptable.js'
import { pickQuote } from '../lib/quote.js'
import { eventsOn } from '../engine/scheduler.js'
import { sortTasks } from './tasks/filter.js'
import { download } from '../lib/files.js'
import { useMyFonts, addFont, removeFont, fontFamily, loadAllFonts, SYNC_FONT_MAX } from '../lib/fonts.js'
import { requestPermission } from '../lib/notify.js'
import { fmtTime, today, WD } from '../engine/date.js'

export default function Settings() {
  const st = useSettings()
  const th = st.theme
  const setTheme = (p) => setSettings({ theme: { ...th, ...p } })
  const myFonts = useMyFonts()
  return (
    <div className="grid two">
      <SyncCard />
      <PushCard />
      <HomeWidgetCard />
      <Card title="디자인">
        <div className="form">
          <Field label="색상 프리셋">
            <div className="row wrap" style={{ gap: 6 }}>
              {Object.entries(PRESETS).map(([k, p]) => (
                <button key={k} className={'chip' + (th.preset === k && !th.accent ? ' on' : '')} onClick={() => setTheme({ preset: k, accent: null, c2: null, c3: null, c4: null })}>
                  {[p.accent, p.c2, p.c3, p.c4].map((c, i) => <span key={i} className="dot" style={{ background: c, marginRight: -2 }} />)}<span style={{ marginLeft: 4 }}>{p.name}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="포인트 색 직접 선택">
            <div className="row">
              <input type="color" value={th.accent || PRESETS[th.preset]?.accent || '#4a5a78'} onChange={(e) => setTheme({ accent: e.target.value })} />
              <ColorPick value={th.accent} onChange={(c) => setTheme({ accent: c })} colors={SOFT_PALETTE} />
            </div>
          </Field>
          {[['c2', '그래프·달력 색'], ['c3', '보조 색 1'], ['c4', '보조 색 2']].map(([k, l]) => (
            <Field key={k} label={l}>
              <div className="row">
                <input type="color" value={th[k] || PRESETS[th.preset]?.[k] || '#7a8660'} onChange={(e) => setTheme({ [k]: e.target.value })} />
                <ColorPick value={th[k]} onChange={(c) => setTheme({ [k]: c })} colors={SOFT_PALETTE} />
                {th[k] && <button className="chip" onClick={() => setTheme({ [k]: null })}>기본</button>}
              </div>
            </Field>
          ))}
          <Field label="화면 모드"><Seg value={th.mode} onChange={(v) => setTheme({ mode: v })} options={[['system', '시스템'], ['light', '라이트'], ['dark', '다크']]} /></Field>
          <Field label="폰트">
            <select className="input" value={th.font} onChange={(e) => setTheme({ font: e.target.value })}>
              {Object.entries(FONTS).map(([k, f]) => <option key={k} value={k}>{f.name}</option>)}
              {myFonts.map((f) => <option key={f.id} value={'my:' + f.id}>내 폰트 · {f.name}</option>)}
              {th.font?.startsWith('my:') && !myFonts.some((f) => 'my:' + f.id === th.font) && <option value={th.font}>내 폰트 (이 기기에 없음)</option>}
            </select>
          </Field>
          <MyFonts th={th} setTheme={setTheme} fonts={myFonts} />
          <Field label={`글자 크기 ${th.fontSize}px`}><input type="range" min="12" max="16" step="0.5" value={th.fontSize} onChange={(e) => setTheme({ fontSize: +e.target.value })} /></Field>
          <Field label={`글자 굵기 ${th.fontWeight}`}><input type="range" min="300" max="500" step="100" value={th.fontWeight} onChange={(e) => setTheme({ fontWeight: +e.target.value })} /></Field>
          <Field label={`모서리 둥글기 ${th.radius}px`}><input type="range" min="0" max="20" value={th.radius} onChange={(e) => setTheme({ radius: +e.target.value })} /></Field>
          <Field label="간격"><Seg value={th.density} onChange={(v) => setTheme({ density: v })} options={[['compact', '촘촘'], ['normal', '보통'], ['relaxed', '여유']]} /></Field>
          <Field label="카드 스타일"><Seg value={th.card} onChange={(v) => setTheme({ card: v })} options={[['line', '선'], ['shadow', '그림자'], ['flat', '평면'], ['glass', '유리']]} /></Field>
        </div>
      </Card>

      <Card title="기능 켜기 / 끄기">
        {[['planning', '계획 기능 (자동 학습 계획·타임박싱·원형·10분 플래너)'], ['health', '건강 (컨디션·약)'], ['matrix', '아이젠하워 매트릭스'], ['kanban', '칸반'], ['gantt', '간트'], ['db', '표 · DB 뷰'], ['circle', '원형 계획표'], ['graph', '개념 그래프'], ['mindmap', '마인드맵'], ['mock', '모의고사 타이머']].map(([k, l]) => (
          <Toggle key={k} label={l} checked={st.modules[k] !== false} onChange={(v) => setSettings({ modules: { ...st.modules, [k]: v } })} />
        ))}
      </Card>

      <SubjectsCard />
      <ProjectsCard />

      <Card title="플래너 · 공부">
        <div className="form">
          <div className="row">
            <Field label="하루 시작"><TimeInput allowEmpty={false} value={st.dayStart} onChange={(v) => v != null && setSettings({ dayStart: v })} /></Field>
            <Field label="하루 끝"><TimeInput allowEmpty={false} value={st.dayEnd % 1440} onChange={(v) => v != null && setSettings({ dayEnd: v === 0 ? 1440 : v })} /></Field>
          </div>
          <Field label="앱 시작 화면">
            <select className="input" value={st.startTab || 'last'} onChange={(e) => setSettings({ startTab: e.target.value })}>
              {[['last', '마지막으로 보던 화면'], ['home', '홈'], ['tasks.list', '할 일'], ['study.timer', '타이머'], ['study.log', '기록 입력'], ['study.records', '공부 통계'], ['planner.today', '캘린더 · 오늘'], ['planner.month', '캘린더 · 월'], ['notes.daily', '노트 · 데일리']].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <Field label="주 시작"><Seg value={st.weekStart} onChange={(v) => setSettings({ weekStart: v })} options={[[1, '월요일'], [0, '일요일']]} /></Field>
          <div className="row">
            <Field label="하루 목표(분)"><input className="input" type="number" step="10" value={st.goalDaily} onChange={(e) => setSettings({ goalDaily: +e.target.value })} /></Field>
            <Field label="주간 목표(분)"><input className="input" type="number" step="30" value={st.goalWeekly} onChange={(e) => setSettings({ goalWeekly: +e.target.value })} /></Field>
          </div>
          <div className="row">
            {[['work', '집중'], ['short', '휴식'], ['long', '긴 휴식'], ['every', '긴 휴식 주기']].map(([k, l]) => (
              <Field key={k} label={l}><input className="input" type="number" min="1" value={st.pomodoro[k]} onChange={(e) => setSettings({ pomodoro: { ...st.pomodoro, [k]: +e.target.value || 1 } })} /></Field>
            ))}
          </div>
          <Field label="복습 간격(일, 쉼표)"><input className="input" defaultValue={st.reviewIntervals.join(', ')} onBlur={(e) => { const v = e.target.value.split(/[,\s]+/).map(Number).filter((n) => n > 0); if (v.length) setSettings({ reviewIntervals: v }) }} /></Field>
          <Field label="일정 기본 이동·준비 버퍼(분)"><input className="input" type="number" min="0" step="5" value={st.defaultBuffer} onChange={(e) => setSettings({ defaultBuffer: +e.target.value })} /></Field>
          <Toggle label="요일 템플릿 자동 적용" checked={st.autoTemplate} onChange={(v) => setSettings({ autoTemplate: v })} />
          <Toggle label="타이머 중 화면 켜짐 유지" checked={st.wakeLock !== false} onChange={(v) => setSettings({ wakeLock: v })} />
          <Toggle label="알림" checked={st.notify} onChange={async (v) => { setSettings({ notify: v }); if (v) { const p = await requestPermission(); if (p === 'denied') toast('설정 앱에서 알림을 허용해 주세요') } }} />
          <div className="tiny muted">iPhone/iPad 는 Safari 공유 → ‘홈 화면에 추가’ 후 앱으로 열어야 시스템 알림이 표시돼요. 앱이 열려 있을 때 동작합니다.</div>
        </div>
      </Card>

      <TemplatesCard />

      <Card title="백업 · 복원">
        <div className="row wrap">
          <button className="btn" onClick={() => download(`study-backup-${today()}.json`, exportJSON(), 'application/json')}><Icon name="download" size={16} />JSON 내보내기</button>
          <button className="btn" onClick={() => {
            const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/json,.json'
            i.onchange = async () => { const f = i.files[0]; if (!f) return; const text = await f.text(); confirmSheet('복원', '현재 데이터를 백업 파일로 교체할까요?', () => { try { importJSON(text); toast('복원 완료') } catch (e) { toast(e.message) } }, '복원') }
            i.click()
          }}><Icon name="upload" size={16} />JSON 가져오기</button>
        </div>
        <AutoBackups />
        <div className="tiny muted" style={{ marginTop: 8 }}>첨부 파일 원본은 Gist 동기화로 옮겨집니다. JSON 백업에는 목록만 포함돼요.</div>
      </Card>
      <Card title="홈 화면에 설치">
        <div className="small">Safari 에서 공유 버튼 → <b>홈 화면에 추가</b>. 전체 화면·오프라인으로 동작합니다. iPhone 과 iPad 모두 같은 방법으로 설치한 뒤 위 동기화에 같은 토큰을 입력하세요.</div>
      </Card>
    </div>
  )
}

// 자동 백업 목록 (gist 에 매주 저장, 최근 4개)
function AutoBackups() {
  const sync = useSyncStatus()
  const [list, setList] = useState(null), [busy, setBusy] = useState(false)
  const load = () => listBackups().then(setList).catch((e) => setList({ error: e.message }))
  useEffect(() => { if (sync.state !== 'off') load() }, [sync.state === 'off']) // eslint-disable-line
  if (sync.state === 'off') return <div className="tiny muted" style={{ marginTop: 8 }}>동기화를 연결하면 매주 자동 백업돼요.</div>
  return (
    <div style={{ marginTop: 10 }}>
      <div className="row between"><span className="small">자동 백업 <span className="tiny muted">· 매주 · 최근 4개</span></span>
        <button className="btn sm" disabled={busy} onClick={async () => { setBusy(true); try { await backupNow(); toast('백업했어요'); load() } catch (e) { toast(e.message) } setBusy(false) }}>지금 백업</button></div>
      <div className="list">
        {Array.isArray(list) && list.map((b) => (
          <div key={b.name} className="item" style={{ padding: '6px 0', alignItems: 'center' }}>
            <span className="grow small">{fmtDateK(b.date)}</span><span className="tiny muted">{Math.round(b.size / 1024)}KB</span>
            <button className="btn sm" onClick={() => confirmSheet('되돌리기', `${fmtDateK(b.date)} 백업 내용으로 되돌릴까요? 백업 이후 새로 만든 항목은 그대로 남아요.`, async () => { try { await restoreBackup(b); toast('되돌렸어요') } catch (e) { toast(e.message) } }, '되돌리기')}>되돌리기</button>
          </div>
        ))}
        {Array.isArray(list) && !list.length && <div className="tiny muted">아직 백업이 없어요 · 다음 동기화 때 만들어져요</div>}
        {list?.error && <div className="tiny muted">{list.error}</div>}
      </div>
    </div>
  )
}
const fmtDateK = (s) => { const [y, m, d] = s.split('-'); return `${y}년 ${+m}월 ${+d}일` }

function SyncCard() {
  const s = useSyncStatus()
  const st = useSettings()
  const [tok, setTok] = useState('')
  const [busy, setBusy] = useState(false)
  const on = s.state !== 'off'
  const gistId = (() => { try { return localStorage.getItem('gist_id') } catch { return null } })()
  const label = { ok: '동기화됨', syncing: '동기화 중…', pending: '대기 중', error: '오류', idle: '연결됨', off: '꺼짐' }[s.state]
  return (
    <Card title="iPhone ↔ iPad 동기화 (GitHub Gist)" action={<span className="row small"><span className={'sync-dot ' + s.state} />{label}</span>}>
      {!on ? (
        <div className="form">
          <div className="small muted">
            1. github.com → Settings → Developer settings → Personal access tokens → <b>Tokens (classic)</b> → <b>gist</b> 권한만 체크, Expiration 은 <b>No expiration</b> 으로 생성<br />
            2. 아래에 붙여넣고 연결 (두 기기 모두 같은 토큰) — 비공개 Gist 가 자동으로 만들어지거나 찾아집니다.<br />
            ※ 토큰은 메모·채팅·공개 저장소 등에 붙여넣지 마세요. GitHub 가 공개된 토큰을 발견하면 바로 취소해요.
          </div>
          <input className="input" type="password" autoComplete="off" placeholder="ghp_…" value={tok} onChange={(e) => setTok(e.target.value)} />
          <button className="btn primary" disabled={!tok || busy} onClick={async () => { setBusy(true); try { const id = await connect(tok); toast(id ? '동기화 연결됨' : '토큰 저장됨 · 연결은 자동으로 다시 시도해요'); setTok('') } catch (e) { toast(e.message) } setBusy(false) }}>{busy ? '연결 중…' : '연결'}</button>
          {s.error && <div className="small" style={{ color: 'var(--danger)' }}>{s.error}</div>}
        </div>
      ) : (
        <div className="form">
          <div className="small muted">마지막 동기화: {s.last ? new Date(s.last).toLocaleString('ko-KR') : '-'}</div>
          {(() => { const e = tokenExpiry(); if (!e) return null; const d = new Date(e.replace(' UTC', 'Z').replace(' ', 'T')), left = Math.ceil((d - Date.now()) / 86400000)
            return <div className="small" style={{ color: left <= 7 ? 'var(--danger)' : 'var(--muted)' }}>토큰 만료: {d.toLocaleDateString('ko-KR')}{left <= 7 ? ` · ${Math.max(0, left)}일 남음 — 만료 없는 새 토큰으로 바꿔 주세요` : ''}</div> })()}
          {s.error && <div className="small" style={{ color: 'var(--danger)' }}>{s.error}</div>}
          {(s.auth || (tokenExpiry() && new Date(tokenExpiry().replace(' UTC', 'Z').replace(' ', 'T')) - Date.now() < 7 * 86400000)) && <div className="row"><input className="input" type="password" autoComplete="off" placeholder="새 토큰 ghp_…" value={tok} onChange={(e) => setTok(e.target.value)} /><button className="btn primary" disabled={!tok || busy} onClick={async () => { setBusy(true); try { await connect(tok); setTok('') } catch (e) { toast(e.message) } setBusy(false) }}>다시 연결</button></div>}
          <div className="row wrap">
            <button className="btn" onClick={() => syncNow()}><Icon name="sync" size={16} />지금 동기화</button>
            {gistId && <a className="btn" href={`https://gist.github.com/${gistId}`} target="_blank" rel="noreferrer">Gist 보기</a>}
            <button className="btn danger" onClick={() => confirmSheet('연결 해제', '이 기기의 토큰을 지웁니다. 데이터는 그대로 남아요.', disconnect, '해제')}>연결 해제</button>
          </div>
          <div className="tiny muted">앱을 열 때·돌아올 때·편집 후·1분마다 자동 동기화. 같은 항목은 최신 수정이 우선합니다. 홈 화면 앱과 사파리는 저장 공간이 따로라, 위젯을 눌러 사파리로 열었다면 사파리에서도 한 번 연결해 주세요.</div>
        </div>
      )}
      <div className="divider" />
      <Toggle label="약·컨디션도 이 기기에만 저장" checked={st.syncExclude?.meds} onChange={(v) => setSettings({ syncExclude: { ...st.syncExclude, meds: v, medLogs: v, conditions: v } })} />
    </Card>
  )
}

function SubjectsCard() {
  const subjects = useColl('subjects')
  return (
    <Card title="과목" action={<button className="btn sm" onClick={() => put('subjects', { name: '새 과목', color: PALETTE[subjects.length % PALETTE.length] })}><Icon name="plus" size={14} />추가</button>}>
      <div className="list">
        {subjects.map((s) => (
          <div key={s.id} className="row" style={{ padding: '6px 0' }}>
            <input type="color" value={s.color} onChange={(e) => patch('subjects', s.id, { color: e.target.value })} />
            <input className="input" value={s.name} onChange={(e) => patch('subjects', s.id, { name: e.target.value })} />
            <button className="icon-btn" onClick={() => confirmSheet('과목 삭제', `'${s.name}' 과목을 삭제할까요?`, () => remove('subjects', s.id), '삭제')} aria-label="삭제"><Icon name="trash" size={16} /></button>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ProjectsCard() {
  const projects = useColl('projects')
  return (
    <Card title="프로젝트" action={<button className="btn sm" onClick={() => put('projects', { name: '새 프로젝트', color: PALETTE[(projects.length + 2) % PALETTE.length] })}><Icon name="plus" size={14} />추가</button>}>
      <div className="list">
        {projects.map((p) => (
          <div key={p.id} className="row" style={{ padding: '6px 0' }}>
            <input type="color" value={p.color} onChange={(e) => patch('projects', p.id, { color: e.target.value })} />
            <input className="input" value={p.name} onChange={(e) => patch('projects', p.id, { name: e.target.value })} />
            <button className="icon-btn" onClick={() => confirmSheet('프로젝트 삭제', `'${p.name}' 을 삭제할까요? 할 일은 남아요.`, () => remove('projects', p.id), '삭제')} aria-label="삭제"><Icon name="trash" size={16} /></button>
          </div>
        ))}
        {!projects.length && <div className="empty">리포트, 대회 준비처럼 여러 할 일을 묶어 관리해요</div>}
      </div>
    </Card>
  )
}

function TemplatesCard() {
  const tpls = useColl('templates')
  return (
    <Card title="요일별 기본 하루 템플릿" action={<button className="btn sm" onClick={() => openTemplate(put('templates', { name: '새 템플릿', weekdays: [], blocks: [] }).id)}><Icon name="plus" size={14} />추가</button>}>
      <div className="list">
        {tpls.map((t) => (
          <button key={t.id} className="item" style={{ textAlign: 'left' }} onClick={() => openTemplate(t.id)}>
            <div className="t"><div>{t.name}</div><div className="meta">{(t.weekdays || []).sort().map((d) => WD[d]).join('·') || '요일 없음'} · 블록 {t.blocks?.length || 0}개</div></div>
          </button>
        ))}
        {!tpls.length && <div className="empty">예: “월수금 학원 있는 날” — 요일에 맞춰 자동으로 하루를 채워요</div>}
      </div>
    </Card>
  )
}

export function openTemplate(id) { openSheet(() => <TemplateEditor id={id} />, { title: '하루 템플릿', full: true }) }

function TemplateEditor({ id }) {
  const tpls = useColl('templates')
  const t = tpls.find((x) => x.id === id)
  const [nb, setNb] = useState({ title: '', start: 18 * 60, dur: 60, kind: 'study', subjectId: null })
  if (!t) return null
  const up = (p) => patch('templates', id, p)
  const blocks = [...(t.blocks || [])].sort((a, b) => a.start - b.start)
  return (
    <div className="form">
      <Field label="이름"><input className="input" value={t.name} onChange={(e) => up({ name: e.target.value })} /></Field>
      <Field label="적용 요일">
        <div className="row wrap" style={{ gap: 4 }}>
          {WD.map((w, i) => { const on = t.weekdays?.includes(i); return <button key={i} className={'chip' + (on ? ' on' : '')} onClick={() => up({ weekdays: on ? t.weekdays.filter((x) => x !== i) : [...(t.weekdays || []), i] })}>{w}</button> })}
        </div>
      </Field>
      <div className="list">
        {blocks.map((b) => (
          <div key={b.id} className="item">
            <div className="t"><div>{b.title}</div><div className="meta">{fmtTime(b.start)}–{fmtTime(b.start + b.dur)} · {{ study: '공부', break: '휴식', custom: '기타', task: '할 일' }[b.kind]}</div></div>
            <button className="icon-btn" onClick={() => up({ blocks: t.blocks.filter((x) => x.id !== b.id) })} aria-label="삭제"><Icon name="close" size={14} /></button>
          </div>
        ))}
      </div>
      <div className="card" style={{ background: 'var(--surface-2)' }}>
        <div className="form">
          <input className="input" placeholder="블록 이름 (예: 학원, 수학 자습)" value={nb.title} onChange={(e) => setNb({ ...nb, title: e.target.value })} />
          <div className="row">
            <Field label="시작"><TimeInput allowEmpty={false} value={nb.start} onChange={(v) => setNb({ ...nb, start: v ?? 0 })} /></Field>
            <Field label="길이(분)"><input className="input" type="number" step="10" value={nb.dur} onChange={(e) => setNb({ ...nb, dur: +e.target.value })} /></Field>
          </div>
          <div className="row">
            <select className="input" value={nb.kind} onChange={(e) => setNb({ ...nb, kind: e.target.value })}><option value="study">공부</option><option value="break">휴식</option><option value="custom">기타</option></select>
            <SubjectSelect value={nb.subjectId} onChange={(v) => setNb({ ...nb, subjectId: v })} />
          </div>
          <button className="btn" onClick={() => { if (!nb.title) return; up({ blocks: [...(t.blocks || []), { ...nb, id: uid() }] }); setNb({ ...nb, title: '', start: nb.start + nb.dur }) }}>블록 추가</button>
        </div>
      </div>
      <button className="btn danger" onClick={() => remove('templates', id)}>템플릿 삭제</button>
    </div>
  )
}

function PushCard() {
  const st = useSettings()
  const sync = useSyncStatus()
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => { pushState().then(setOn) }, [])
  const connected = sync.state !== 'off'
  const t2m = (v) => v == null ? null : +v.split(':')[0] * 60 + +v.split(':')[1]
  const m2t = (m) => m == null ? null : fmtTime(m)
  return (
    <Card title="알림 (앱을 닫아도 받기)" action={<span className="small">{on ? '● 켜짐' : '꺼짐'}</span>}>
      <div className="form">
        <div className="small muted">
          할 일 시간 · 일정 알림 · 약 · 아침 요약 · 저녁 공부 목표를 푸시로 보내요. GitHub Actions 가 5~10분마다 확인해 보내므로 몇 분 늦을 수 있어요.
        </div>
        {!isStandalone() && <div className="small" style={{ color: 'var(--danger)' }}>iPhone·iPad 는 Safari › 공유 › 홈 화면에 추가 후, 설치된 앱에서 켜야 해요 (iOS 16.4+)</div>}
        {!connected && <div className="small" style={{ color: 'var(--danger)' }}>먼저 위의 동기화를 연결하세요</div>}
        <div className="row wrap">
          {!on ? <button className="btn primary" disabled={busy || !connected || !pushSupported()} onClick={async () => { setBusy(true); try { await enablePush(); setOn(true); setSettings({ notify: true }); toast('이 기기에서 알림을 받아요') } catch (e) { toast(e.message) } setBusy(false) }}>{busy ? '설정 중…' : '이 기기에서 알림 켜기'}</button>
            : <button className="btn" disabled={busy} onClick={async () => { setBusy(true); try { await disablePush(); setOn(false); toast('알림 해제') } catch (e) { toast(e.message) } setBusy(false) }}>이 기기 알림 끄기</button>}
          {on && <button className="btn" onClick={() => testLocal()}>테스트</button>}
        </div>
        <div className="row">
          <Field label="아침 요약"><TimeInput value={t2m(st.notifyMorning ?? '07:30')} onChange={(v) => setSettings({ notifyMorning: m2t(v) })} defaultValue={450} /></Field>
          <Field label="저녁 목표 알림"><TimeInput value={t2m(st.notifyEvening ?? '21:00')} onChange={(v) => setSettings({ notifyEvening: m2t(v) })} defaultValue={1260} /></Field>
        </div>
        <details className="more">
          <summary>처음 한 번만: GitHub 설정</summary>
          <div className="small" style={{ marginTop: 6, lineHeight: 1.7 }}>
            1. github.com/hysdllover/new › <b>Settings › Secrets and variables › Actions</b><br />
            2. <b>New repository secret</b> → 이름 <code>GIST_TOKEN</code>, 값은 동기화에 쓴 토큰<br />
            3. Actions 탭 › <b>Push notifications</b> 가 10분마다 자동 실행돼요<br />
            <span className="muted">푸시 키는 비공개 Gist 에 저장됩니다.</span>
          </div>
        </details>
      </div>
    </Card>
  )
}

function HomeWidgetCard() {
  const sync = useSyncStatus()
  const appUrl = location.origin + location.pathname
  const copy = async () => {
    if (!gistInfo().widgetRaw) await syncNow({ flush: true })
    const { widgetRaw } = gistInfo()
    if (!widgetRaw) { toast('동기화가 끝난 뒤 다시 눌러 주세요'); return }
    const script = buildScript({ widgetRaw, appUrl })
    try { await navigator.clipboard.writeText(script); toast('스크립트를 복사했어요') }
    catch { openSheet(() => <textarea className="input" readOnly value={script} style={{ minHeight: 300, fontFamily: 'monospace', fontSize: 11 }} onFocus={(e) => e.target.select()} />, { title: '스크립트 (전체 선택 후 복사)', full: true }) }
  }
  return (
    <Card title="아이폰·아이패드 홈 화면 위젯">
      <WidgetPreview />
      <WidgetFontField />
      <div className="small" style={{ lineHeight: 1.7, marginTop: 10 }}>
        1. App Store 에서 무료 앱 <b>Scriptable</b> 설치<br />
        2. 아래 <b>스크립트 복사</b> → Scriptable › ＋ › 붙여넣기 → 이름 ‘스터디’<br />
        3. 홈 화면 길게 누르기 › ＋ › Scriptable 위젯(소·중·대) 추가 → 위젯 편집 › Script: ‘스터디’ · Parameter: 위 형태 단어<br />
        4. 투명 배경(아이폰): Scriptable 에서 ‘스터디’ 스크립트를 눌러 실행 › 투명 배경 설정 › 빈 홈 화면 스크린샷·위젯 크기·위치 선택. 같은 크기 위젯이 여러 개면 Parameter 에 @번호를 붙여 구분 (예: 공부@2). 글자색도 같은 메뉴에서 바꿔요.<br />
        5. 잠금 화면: 잠금 화면 길게 누르기 › 사용자화 › 위젯 추가 › Scriptable → 같은 스크립트 선택 · D-day 만 보려면 Parameter: 디데이 (다음 D-day 는 디데이2)
      </div>
      <div className="tiny muted" style={{ marginTop: 4 }}>위젯을 누르면 해당 화면(할 일·공부 기록)이 열려요. iOS 제한으로 사파리에서 열리니, 사파리에서도 한 번 동기화를 연결해 두세요.</div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary" disabled={sync.state === 'off'} onClick={copy}><Icon name="download" size={16} />스크립트 복사</button>
        {sync.state === 'off' && <span className="small muted">동기화를 먼저 연결하세요</span>}
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>스크립트에는 토큰이 들어가지 않아요(위젯 전용 비공개 주소만). 이미 설치했다면 새로 복사해 Scriptable 스크립트 내용을 바꿔 주세요. 갱신 주기는 iOS가 정해요(보통 15분~1시간). 날짜 옆에 시각이 보이면 그때 받은 데이터예요.</div>
    </Card>
  )
}

// 내 폰트 — 다운로드한 폰트 파일을 불러와 앱에 적용 (이 기기에만 저장)
function MyFonts({ th, setTheme, fonts }) {
  const st = useSettings()
  const [busy, setBusy] = useState(false)
  useEffect(() => { loadAllFonts() }, [fonts])
  const missing = th.font?.startsWith('my:') && !fonts.some((f) => 'my:' + f.id === th.font)
  const pick = () => {
    const i = document.createElement('input'); i.type = 'file'
    i.onchange = async () => {
      const f = i.files[0]; if (!f) return
      setBusy(true)
      try { const rec = await addFont(f); setTheme({ font: 'my:' + rec.id }); toast(`‘${rec.name}’ 폰트를 적용했어요`); syncNow() } catch (e) { toast(e.message) }
      setBusy(false)
    }
    i.click()
  }
  return (
    <div className="col" style={{ gap: 6 }}>
      {fonts.map((f) => (
        <div key={f.id} className="row" style={{ gap: 6 }}>
          <span className="grow ellipsis" style={{ fontFamily: `"${fontFamily(f.id)}"`, fontSize: '1.15em' }}>{f.name} 가나다 Aa 123</span>
          <span className="tiny muted">{f.size <= SYNC_FONT_MAX ? (f.synced ? '동기화됨' : '동기화 대기') : '이 기기만'}</span>
          {f.ps && <button className={'chip' + (st.widgetFont === f.ps ? ' on' : '')} onClick={() => { setSettings({ widgetFont: f.ps }); toast('위젯 폰트로 지정했어요') }}>위젯에도</button>}
          <button className="icon-btn" aria-label="삭제" onClick={() => confirmSheet('폰트 삭제', `‘${f.name}’ 폰트를 이 기기에서 지울까요?`, async () => { await removeFont(f.id); if (th.font === 'my:' + f.id) setTheme({ font: 'system' }); syncNow() }, '삭제')}><Icon name="trash" size={14} /></button>
        </div>
      ))}
      <div className="row"><button className="btn sm" disabled={busy} onClick={pick}><Icon name="plus" size={14} />{busy ? '불러오는 중…' : '내 폰트 추가'}</button></div>
      <div className="tiny muted" style={{ lineHeight: 1.6 }}>
        다운로드한 폰트 파일(.ttf · .otf · .woff)을 파일 앱에서 선택하세요. 1MB 이하 폰트는 아이폰·아이패드에 자동으로 동기화되고, 그보다 큰 폰트는 기기마다 한 번씩 추가해 주세요.
        {missing && <><br /><b>지금 고른 내 폰트가 이 기기에 없어 기본 폰트로 보여요. 같은 폰트를 추가해 주세요.</b></>}
      </div>
    </div>
  )
}

// 위젯 폰트 — 기본(산돌고딕 얇게) 또는 기기에 설치한 폰트의 PostScript 이름
function WidgetFontField() {
  const st = useSettings()
  const custom = st.widgetFont != null
  return (
    <div className="col" style={{ gap: 6, marginTop: 10 }}>
      <Field label="위젯 폰트"><Seg value={custom ? 'c' : 'd'} onChange={(v) => setSettings({ widgetFont: v === 'c' ? '' : null })} options={[['d', '기본 · 산돌고딕 얇게'], ['c', '설치한 폰트']]} /></Field>
      {custom && <>
        <input className="input" placeholder="PostScript 이름 (예: NanumMyeongjo)" defaultValue={st.widgetFont} onBlur={(e) => setSettings({ widgetFont: e.target.value.trim() })} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        <div className="tiny muted" style={{ lineHeight: 1.6 }}>타자기체·손글씨체 등 한글 폰트를 폰트 앱(예: iFont)으로 설치한 뒤, 그 폰트의 PostScript 이름을 적어 주세요. 이름이 틀리거나 설치되지 않은 기기에서는 시스템 폰트로 보여요. 스크립트를 다시 복사할 필요 없어요.</div>
      </>}
    </div>
  )
}

// 홈 화면 위젯 미리보기 (실제 데이터) — Scriptable 위젯과 같은 디자인
function WidgetPreview() {
  const st = useSettings()
  useEffect(() => { loadAllFonts() }, [])
  const ff = st.widgetFont ? { fontFamily: `"${st.widgetFont}", "Apple SD Gothic Neo", sans-serif` } : null
  const tasks = useColl('tasks'), sessions = useColl('sessions'), ddays = useColl('ddays'), quotes = useColl('quotes'), subjects = useColl('subjects')
  const d = today()
  const today0 = sessions.filter((x) => x.date === d)
  const mins = today0.reduce((a, x) => a + x.dur, 0)
  const goal = st.goalDaily || 240
  const pct = Math.round(Math.min(1, mins / goal) * 100)
  const todo = sortTasks(tasks.filter((t) => !t.archived && !t.done && t.due && t.due <= d), 'due')
  const doneT = tasks.filter((t) => !t.archived && t.done && t.doneAt && new Date(t.doneAt).toDateString() === new Date().toDateString())
  const done = doneT.length
  const items = sortTasks(tasks.filter((t) => !t.archived && t.due && t.due <= d && (!t.done || t.due === d || doneT.includes(t))), 'due')
  const ddSorted = ddays.filter((x) => x.date >= d).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || a.date.localeCompare(b.date))
  const dd = ddSorted[0], ddNext = ddSorted[1]
  const ddN = dd ? Math.round((new Date(dd.date) - new Date(d)) / 86400000) : null
  const ddTxt = dd ? (ddN === 0 ? 'D-DAY' : 'D-' + ddN) : null
  const qs = [...quotes].sort((a, b) => a.id.localeCompare(b.id))
  const quote = pickQuote(qs)?.text ?? null
  const now = new Date()
  const dateStr = `${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()]} · ${now.getDate()} ${['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][now.getMonth()]}`
  const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
  const big = (size) => (
    <>
      <div className="dw-big"><span style={{ fontSize: size }}>{hm(mins)}</span><span className="dw-soft">of {hm(goal)}</span><span className="grow" /><span className="dw-gold">{pct}%</span></div>
      <div className="dw-line"><i style={{ width: pct + '%' }} /></div>
    </>
  )
  const ddRow = dd && <div className="dw-ddrow"><span className="dw-gold">{ddTxt}</span><span className="dw-soft">{dd.title}</span></div>
  const list = (n) => <>{items.slice(0, n).map((t) => t.done
    ? <div key={t.id} className="dw-todo dw-soft"><span>✓</span><span className="ellipsis" style={{ textDecoration: 'line-through' }}>{t.title}</span></div>
    : <div key={t.id} className="dw-todo"><span className={t.priority >= 3 ? 'dw-gold' : 'dw-soft'}>{t.priority >= 3 ? '•' : '–'}</span><span className="ellipsis">{t.title}</span></div>)}
    {!items.length && <div className="dw-soft">All clear.</div>}</>
  const [kind, setKind] = useState('')
  const ddList = ddays.filter((x) => x.date >= d).sort((a, b) => a.date.localeCompare(b.date))
  const subMins = subjects.map((s) => ({ s, m: today0.filter((x) => x.subjectId === s.id).reduce((a, x) => a + x.dur, 0) })).filter((x) => x.m).sort((a, b) => b.m - a.m)
  const subBars = (n) => <>{subMins.slice(0, n).map((x) => <div key={x.s.id} className="dw-sub"><div className="row between"><span>{x.s.name}</span><span className="dw-soft">{hm(x.m)}</span></div><div className="dw-line"><i style={{ width: (x.m / subMins[0].m) * 100 + '%' }} /></div></div>)}{!subMins.length && <div className="dw-soft">No study yet.</div>}</>
  const month = (cell, nums) => {
    const byDay = {}
    for (const x of sessions) byDay[x.date] = (byDay[x.date] || 0) + x.dur
    const y = now.getFullYear(), mo = now.getMonth(), n = new Date(y, mo + 1, 0).getDate(), ws = st.weekStart ?? 1
    const lead = (new Date(y, mo, 1).getDay() - ws + 7) % 7
    const key = (i) => `${y}-${String(mo + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    return (
      <div className="dw-cal" style={{ gridTemplateColumns: `repeat(7, ${cell}px)` }}>
        {Array.from({ length: 7 }, (_, i) => <span key={'w' + i} className="dw-cap" style={{ textAlign: 'center' }}>{'SMTWTFS'[(i + ws) % 7]}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={'e' + i} />)}
        {Array.from({ length: n }, (_, i) => { const v = byDay[key(i + 1)] || 0, r = Math.min(1, v / goal); return <span key={i} className={'dw-day' + (key(i + 1) === d ? ' on' : '')} style={{ height: nums ? cell * 0.8 : cell * 0.72, background: v ? `color-mix(in srgb, var(--gold) ${Math.round(18 + 72 * r)}%, transparent)` : 'var(--rule)', color: r >= .6 ? 'var(--bg)' : 'var(--soft)' }}>{nums ? i + 1 : ''}</span> })}
      </div>
    )
  }
  // 공부 유형: 이번 주·연속·최근 7일
  const sw = (() => {
    const byDay = {}
    for (const x of sessions) byDay[x.date] = (byDay[x.date] || 0) + x.dur
    const off = (k) => { const x = new Date(); x.setDate(x.getDate() - k); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
    const last7 = [6, 5, 4, 3, 2, 1, 0].map((k) => ({ m: byDay[off(k)] || 0, wd: (now.getDay() - k + 7) % 7 }))
    const back = (now.getDay() - (st.weekStart ?? 1) + 7) % 7
    let week = 0; for (let k = 0; k <= back; k++) week += byDay[off(k)] || 0
    let streak = 0; for (let k = byDay[d] ? 0 : 1; byDay[off(k)]; k++) streak++
    return { last7, week, streak, avg: Math.round(last7.reduce((a, x) => a + x.m, 0) / 7) }
  })()
  const stat = (k, v, gold) => <div className="col" style={{ gap: 2 }}><span className="dw-cap">{k}</span><span className={gold ? 'dw-gold' : ''} style={{ fontSize: 13 }}>{v}</span></div>
  const bars7 = (h) => {
    const max = Math.max(goal, ...sw.last7.map((x) => x.m))
    return <div><div className="dw-bars" style={{ height: h }}>{sw.last7.map((x, i) => <i key={i} style={{ height: Math.max(2, x.m / max * h), opacity: i === 6 ? 1 : .35 + .4 * Math.min(1, x.m / goal) }} />)}<b style={{ bottom: goal / max * h }} /></div>
      <div className="dw-bars-l">{sw.last7.map((x, i) => <span key={i} className={i === 6 ? 'dw-gold' : ''}>{'SMTWTFS'[x.wd]}</span>)}</div></div>
  }
  // 캘린더 유형: 이번 달 + 다가오는 일정
  const MONS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const ymdOf = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  const hasPlan = (k) => eventsOn(k).length > 0 || tasks.some((t) => t.due === k && !t.done && !t.archived)
  const calGrid = (cell, cellH, gap, wd) => {
    const y = now.getFullYear(), mo = now.getMonth(), n = new Date(y, mo + 1, 0).getDate(), ws = st.weekStart ?? 1
    const lead = (new Date(y, mo, 1).getDay() - ws + 7) % 7
    return (
      <div className="dw-cal" style={{ gridTemplateColumns: `repeat(7, ${cell}px)`, gap }}>
        {wd && Array.from({ length: 7 }, (_, i) => <span key={'w' + i} className="dw-cap" style={{ textAlign: 'center', fontSize: 7 }}>{'SMTWTFS'[(i + ws) % 7]}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={'e' + i} />)}
        {Array.from({ length: n }, (_, i) => { const k = ymdOf(new Date(y, mo, i + 1)), has = hasPlan(k), on = k === d
          return <span key={i} className="dw-cday" style={{ height: cellH, border: on ? '1px solid var(--ink)' : null, fontWeight: on ? 600 : null, color: on || has ? 'var(--ink)' : 'var(--soft)' }}>{i + 1}<i style={{ color: 'var(--gold)' }}>{has ? '•' : ''}</i></span> })}
      </div>
    )
  }
  const agenda = (count) => {
    const out = []
    for (let i = 0; i < 14 && out.length < count; i++) {
      const x = new Date(); x.setDate(x.getDate() + i); const k = ymdOf(x)
      for (const e of eventsOn(k)) out.push({ k, x, time: e.start == null ? 'ALL' : fmtTime(e.start), title: e.title })
      for (const t of tasks.filter((t) => t.due === k && !t.done && !t.archived)) out.push({ k, x, time: t.dueTime == null ? '–' : fmtTime(t.dueTime), title: t.title, task: true })
    }
    let last = ''
    return <>{out.slice(0, count).map((a, i) => <div key={i}>{a.k !== last && (last = a.k) && <div className={'dw-cap' + (a.k === d ? ' dw-gold' : '')} style={{ margin: '2px 0 3px' }}>{a.k === d ? 'TODAY' : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][a.x.getDay()] + ' ' + a.x.getDate()}</div>}
      <div className="dw-todo"><span className="dw-soft" style={{ width: 30, flexShrink: 0 }}>{a.time}</span><span className="ellipsis" style={a.task ? { color: 'var(--soft)' } : null}>{a.title}</span></div></div>)}
      {!out.length && <div className="dw-soft">No plans.</div>}</>
  }
  const V = {
    '': [
      <><div className="dw-cap">{dateStr}</div><div className="grow" />{big(26)}<div className="grow" />{ddRow}</>,
      <><div className="col" style={{ gap: 0, width: 128, flexShrink: 0 }}><div className="dw-cap">{dateStr}</div><div className="grow" />{big(28)}<div className="grow" />{ddRow}</div>
        <div className="dw-vr" />
        <div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><div className="dw-cap sp">TODAY</div><div style={{ height: 10 }} />{list(4)}</div></>,
      <><div className="row between"><span className="dw-cap">{dateStr}</span>{dd && <span><span className="dw-soft">{dd.title}  </span><span className="dw-gold" style={{ fontSize: 13 }}>{ddTxt}</span></span>}</div>
        {quote && <div className="dw-quote">— {quote}</div>}
        <div className="dw-hr" />
        <div className="dw-cap sp">STUDY</div>
        {big(34)}
        <div className="dw-soft dw-subs">{subMins.map((x) => <span key={x.s.id}>{x.s.name} {hm(x.m)}</span>)}</div>
        <div className="dw-hr" />
        <div className="row between"><span className="dw-cap sp">TODAY</span><span className="dw-cap dw-gold">{done} DONE</span></div>
        <div style={{ height: 8 }} />
        {list(6)}</>,
    ],
    공부: [
      <><div className="row between"><span className="dw-cap sp">STUDY</span></div><div style={{ height: 8 }} />{big(30)}<div className="grow" /><div className="row between">{stat('WEEK', hm(sw.week))}{stat('STREAK', sw.streak + 'd', true)}</div></>,
      <><div className="col" style={{ gap: 0, width: 150, flexShrink: 0 }}><span className="dw-cap sp">STUDY</span><div style={{ height: 8 }} />{big(34)}<div className="grow" /><div className="row between">{stat('WEEK', hm(sw.week))}{stat('STREAK', sw.streak + 'd', true)}</div></div><div className="dw-vr" /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>{bars7(78)}</div></>,
      <><div className="row between"><span className="dw-cap sp">STUDY</span><span className="dw-cap">{dateStr}</span></div><div style={{ height: 10 }} />{big(44)}<div style={{ height: 14 }} /><div className="row between">{stat('WEEK', hm(sw.week))}{stat('7-DAY AVG', hm(sw.avg))}{stat('STREAK', sw.streak + ' days', true)}</div><div style={{ height: 14 }} />{bars7(70)}<div className="dw-hr" />{subBars(3)}</>,
    ],
    할일: [4, 5, 12].map((n) => <><div className="row between"><span className="dw-cap sp">TODAY</span><span className="dw-cap dw-gold">{done} DONE</span></div><div style={{ height: 10 }} />{list(n)}</>),
    디데이: [40, 52, 52].map((sz, i) => <><div className="dw-cap">{dateStr}</div><div className="grow" />
      {dd ? <><div style={{ fontSize: sz, fontWeight: 100, lineHeight: 1 }}>{ddTxt}</div><div className="row" style={{ gap: 8, marginTop: 4 }}><span className="dw-gold">{dd.title}</span><span className="dw-soft">{dd.date.slice(5).replace('-', '.')}</span></div></> : <div className="dw-soft">No D-day.</div>}
      {i > 0 && quote && <div className="dw-soft" style={{ marginTop: 10, fontSize: 12 }}>— {quote}</div>}
      {i === 2 && ddList.length > 1 && <><div className="dw-hr" />{ddList.slice(1, 6).map((x) => <div key={x.id} className="row between" style={{ marginBottom: 8 }}><span>{x.title}</span><span className="dw-gold">D-{Math.round((new Date(x.date) - new Date(d)) / 86400000)}</span></div>)}</>}
      {i < 2 && <div className="grow" />}</>),
    달력: [
      <><div className="dw-cap">{['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][now.getMonth()]} {now.getFullYear()}</div><div style={{ height: 8 }} />{month(16)}</>,
      <><div className="col" style={{ gap: 0, flex: 1 }}><div className="dw-cap">{dateStr}</div><div className="grow" /><div style={{ fontSize: 28, fontWeight: 100 }}>{hm(mins)}</div><div className="dw-cap dw-gold">TODAY</div></div>{month(20)}</>,
      <><div className="row between"><span className="dw-cap">{dateStr}</span><span className="dw-cap dw-gold">TODAY {hm(mins)}</span></div><div style={{ height: 8 }} />{month(39, true)}</>,
    ],
    캘린더: [
      <><div className="dw-cap">{MONS[now.getMonth()]} {now.getFullYear()}</div><div style={{ height: 6 }} />{calGrid(16, 13, 2, true)}</>,
      <><div className="col" style={{ gap: 0, flexShrink: 0 }}><div className="dw-cap">{MONS[now.getMonth()]} {now.getFullYear()}</div><div style={{ height: 6 }} />{calGrid(17, 14, 2, false)}</div><div className="dw-vr" /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>{agenda(4)}</div></>,
      <><div className="row between"><span className="dw-cap">{MONS[now.getMonth()]} {now.getFullYear()}</span><span className="dw-cap">{dateStr}</span></div><div style={{ height: 6 }} />{calGrid(39, 24, 3, true)}<div className="dw-hr" style={{ margin: '6px 0 8px' }} />{agenda(3)}</>,
    ],
    다짐: [14, 17, 22].map((sz) => <><div className="dw-cap">{dateStr}</div><div className="grow" /><div style={{ fontSize: sz, lineHeight: 1.45 }}>{quote || '앱에서 다짐을 적어 보세요'}</div><div className="grow" />{ddRow}</>),
  }
  const [vs, vm, vl] = V[kind]
  return (
    <>
      <div className="scroll-x" style={{ marginBottom: 6 }}><div className="row" style={{ gap: 6 }}>
        {WIDGET_KINDS.map(([k, l]) => <button key={k} className={'chip' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>{l}</button>)}
      </div></div>
      <div className="tiny muted">{kind ? <>위젯 편집 › Parameter 에 <b>{kind}</b> 입력</> : '위젯 편집 › Parameter 를 비워 두면 기본 형태'}</div>
      <div className="dw-row">
        <div className="dw dw-s" style={ff}>{vs}</div>
        <div className="dw dw-m" style={ff}>{vm}</div>
        <div className="dw dw-l" style={ff}>{vl}</div>
      </div>
      <div className="dw-lock" style={ff}>
        {kind === '디데이' ? <>
          <div className="dw-lc"><b style={{ fontSize: 22, fontWeight: 100 }}>{dd ? (ddN === 0 ? 'D' : ddN) : '–'}</b><span>{dd?.title || 'No D-day'}</span></div>
          <div className="dw-lr"><div><b style={{ fontSize: 24 }}>{ddTxt || 'No D-day'}</b></div>{dd && <div>{dd.title}  <span style={{ opacity: .7 }}>{dd.date.slice(5).replace('-', '.')}</span></div>}{ddNext && <div style={{ opacity: .7, fontSize: 10 }}>{ddNext.title} D-{Math.round((new Date(ddNext.date) - new Date(d)) / 86400000)}</div>}</div>
          <div className="dw-li">{dd ? `${ddTxt} ${dd.title}` : 'No D-day'}</div>
        </> : <>
        <div className="dw-lc"><b>{hm(mins)}</b><span>{pct}%</span><svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="27" /><circle cx="30" cy="30" r="27" className="on" style={{ strokeDasharray: `${2 * Math.PI * 27 * pct / 100} 999` }} /></svg></div>
        <div className="dw-lr"><div><b>{hm(mins)}</b> / {hm(goal)}<span className="grow" />{ddTxt}</div><div className="dw-line"><i style={{ width: pct + '%' }} /></div><div className="ellipsis">{todo[0] ? '– ' + todo[0].title : dd?.title || 'All clear.'}</div></div>
        <div className="dw-li">{hm(mins)}{dd ? ` · ${ddTxt} ${dd.title}` : ''}</div>
        </>}
      </div>
    </>
  )
}
