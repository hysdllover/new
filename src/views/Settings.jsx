import { useEffect, useState } from 'react'
import { useSettings, setSettings, useColl, put, remove, patch, exportJSON, importJSON, uid } from '../store/store.js'
import { PRESETS, FONTS } from '../theme/theme.js'
import { PALETTE, SOFT_PALETTE } from '../store/schema.js'
import { Card, Seg, Toggle, Field, Icon, toast, confirmSheet, openSheet } from '../components/ui.jsx'
import { ColorPick, TimeInput, SubjectSelect } from '../components/common.jsx'
import { useSyncStatus, connect, disconnect, syncNow, gistInfo, tokenExpiry, listBackups, backupNow, restoreBackup, calendarUrl, readGistFile } from '../sync/sync.js'
import { enablePush, disablePush, pushState, testLocal, isStandalone, pushSupported } from '../lib/push.js'
import { buildScript, WIDGET_KINDS } from '../lib/scriptable.js'
import { TAB_OPTIONS, DEFAULT_TABBAR, tabOpt } from '../nav.js'
import { pickQuote } from '../lib/quote.js'
import { pickColor, harmonize } from '../lib/colors.js'
import { eventsOn, classesOn } from '../engine/scheduler.js'
import { sortTasks } from './tasks/filter.js'
import { download } from '../lib/files.js'
import { useMyFonts, addFont, removeFont, fontFamily, loadAllFonts, SYNC_FONT_MAX } from '../lib/fonts.js'
import { requestPermission } from '../lib/notify.js'
import { fmtTime, today, WD, weekStart } from '../engine/date.js'
import { weekGoals, goalProgress } from '../store/actions.js'
import { DIGEST_TIMES } from '../engine/reminders.js'

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
      <ShareCaptureCard />
      <CalendarSubCard />
      <TabBarCard />
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
          <Toggle label="데일리 노트 자동 기록 · 하루가 끝나면 공부·완료·일정·컨디션을 노트에 채우기" checked={st.daylog !== false} onChange={(v) => setSettings({ daylog: v })} />
          <Toggle label="조용한 모드 · 개수·지연 빨간 표시·이월 횟수 숨기기" checked={!!st.calm} onChange={(v) => setSettings({ calm: v })} />
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
            <Field label="기상 (하루 시작)"><TimeInput allowEmpty={false} value={st.dayStart} onChange={(v) => v != null && setSettings({ dayStart: v })} /></Field>
            <Field label="취침 (하루 끝)"><TimeInput allowEmpty={false} value={st.dayEnd % 1440} onChange={(v) => v != null && setSettings({ dayEnd: v === 0 ? 1440 : v })} /></Field>
          </div>
          <Toggle label="자는 시간엔 알림 보내지 않기 · 기상 때 밤사이 할 일 알림을 한 번에" checked={st.quietNight !== false} onChange={(v) => setSettings({ quietNight: v })} />
          <div className="tiny muted" style={{ marginTop: -6 }}>타임라인·빈 시간 추천·자동 배정도 이 시간 안에서만 해요.</div>
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

// 아이폰 캘린더에 구독 (.ics)
function CalendarSubCard() {
  const sync = useSyncStatus(), st = useSettings()
  const url = calendarUrl()
  return (
    <Card title="아이폰 캘린더에 구독">
      {url ? <>
        <div className="small" style={{ lineHeight: 1.7 }}>
          일정·할 일 마감·D-day 가 아이폰 기본 캘린더 앱에 보여요.<br />
          1. 아래 주소 복사<br />
          2. 아이폰 <b>설정 › 캘린더 › 캘린더 계정 › 계정 추가 › 기타 › 구독 캘린더 추가</b> › 붙여넣기 › 다음 › 저장
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <input className="input grow" readOnly value={url} onFocus={(e) => e.target.select()} />
          <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(url); toast('주소를 복사했어요') } catch { toast('주소를 길게 눌러 복사해 주세요') } }}>복사</button>
        </div>
        <div className="row wrap" style={{ gap: 12, marginTop: 8 }}>
          {[['icsEvents', '일정'], ['icsTasks', '할 일 마감'], ['icsDdays', 'D-day']].map(([k, l]) => <Toggle key={k} label={l} checked={st[k] !== false} onChange={(v) => setSettings({ [k]: v })} />)}
          <Toggle label="학교 수업 (시간표)" checked={!!st.icsClasses} onChange={(v) => setSettings({ icsClasses: v })} />
        </div>
        <div className="tiny muted" style={{ marginTop: 6 }}>앱에서 바꾸면 몇 분 안에 파일이 갱신되고, 캘린더 앱은 iOS 가 정한 주기(보통 1시간 안팎)로 새로 가져와요. 읽기 전용이라 캘린더 앱에서 고친 내용은 돌아오지 않아요.</div>
      </> : <div className="small muted">{sync.state === 'off' ? '동기화를 연결하면 구독 주소가 생겨요.' : '다음 동기화 뒤에 주소가 나타나요.'}</div>}
    </Card>
  )
}

// 공유 시트로 할 일 추가 (iOS 단축어)
function ShareCaptureCard() {
  const base = location.origin + location.pathname
  const tmpl = base + '?add='
  return (
    <Card title="공유 시트로 할 일 · 노트 추가">
      <div className="small" style={{ lineHeight: 1.7 }}>
        사파리·메모 등에서 <b>공유 › 할 일로</b> 를 누르면 받은 편지함에 들어가요.<br />
        1. <b>단축어</b> 앱 › ＋ 새 단축어 › 이름 ‘할 일로’<br />
        2. 단축어 설정(ⓘ) › <b>공유 시트에서 보기</b> 켜기 · 받는 유형: 텍스트·URL<br />
        3. 동작 추가: <b>URL</b> → 아래 주소 붙여넣고 끝에 <b>단축어 입력</b> 변수 넣기 → 이어서 <b>URL 열기</b>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <input className="input grow" readOnly value={tmpl} onFocus={(e) => e.target.select()} />
        <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(tmpl); toast('주소를 복사했어요') } catch { toast('주소를 길게 눌러 복사해 주세요') } }}>복사</button>
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>단축어는 사파리로 열려요. 사파리에서도 한 번 동기화를 연결해 두면 홈 화면 앱에 바로 나타나요.</div>
      <div style={{ borderTop: '1px solid var(--line)', margin: '12px 0' }} />
      <b className="small">노트로 저장</b>
      <div className="small" style={{ lineHeight: 1.7, marginTop: 4 }}>
        기사·블로그·메모 글을 <b>공유 › 노트로</b> 로 저장해요. 링크·고른 글이 담긴 노트가 바로 열려요.<br />
        1. 위와 같이 새 단축어 ‘노트로’ (공유 시트에서 보기 · 텍스트·URL·사파리 웹 페이지)<br />
        2. (선택) 동작 <b>웹 페이지 세부 정보 가져오기 › 이름</b> → 제목으로 씀<br />
        3. 동작 <b>URL</b>: 아래 주소 + <b>단축어 입력</b> (제목을 넣으려면 끝에 <code>&amp;title=</code> + 이름) → <b>URL 열기</b>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <input className="input grow" readOnly value={base + '?note='} onFocus={(e) => e.target.select()} />
        <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(base + '?note='); toast('주소를 복사했어요') } catch { toast('주소를 길게 눌러 복사해 주세요') } }}>복사</button>
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>PDF·사진 파일은 단축어로 넘길 수 없어요. 노트에서 파일 첨부로 추가해 주세요.</div>
    </Card>
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
    <Card title="과목" action={<div className="row" style={{ gap: 4 }}>
      <button className="btn sm ghost" onClick={() => confirmSheet('과목 색 정리', '모든 과목 색을 서로 어울리는 저채도 색으로 다시 정할까요?', () => { const cs = harmonize(subjects.length); subjects.forEach((s, i) => patch('subjects', s.id, { color: cs[i] })); toast('과목 색을 정리했어요') }, '정리')}>색 정리</button>
      <button className="btn sm" onClick={() => put('subjects', { name: '새 과목', color: pickColor(subjects.map((s) => s.color)) })}><Icon name="plus" size={14} />추가</button>
    </div>}>
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
  // 알림 서버(GitHub Actions)가 마지막으로 확인한 시각
  const [last, setLast] = useState(undefined)
  useEffect(() => { if (connected) readGistFile('push-sent.json').then((x) => setLast(x?._meta?.lastRun || null)).catch(() => setLast(null)) }, [connected])
  const ago = last ? Math.round((Date.now() - last) / 60000) : null
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
        {connected && last !== undefined && (
          <div className="small" style={{ color: ago == null || ago > 30 ? 'var(--danger)' : 'var(--muted)' }}>
            알림 서버 마지막 확인: {ago == null ? '아직 없음' : ago < 1 ? '방금' : ago < 60 ? `${ago}분 전` : `${Math.floor(ago / 60)}시간 ${ago % 60}분 전`}
            {(ago == null || ago > 30) && ' · GitHub 예약 실행이 늦어지고 있어요. 아래 ‘정확한 시간에 받기’를 설정하세요.'}
          </div>
        )}
        <div className="row">
          <Field label="아침 요약"><TimeInput value={t2m(st.notifyMorning ?? '07:30')} onChange={(v) => setSettings({ notifyMorning: m2t(v) })} defaultValue={450} /></Field>
          <Field label="저녁 목표 알림"><TimeInput value={t2m(st.notifyEvening ?? '21:00')} onChange={(v) => setSettings({ notifyEvening: m2t(v) })} defaultValue={1260} /></Field>
        </div>
        <Toggle label="할 일 알림 요약해서 받기" checked={!!st.digest?.on} onChange={(v) => setSettings({ digest: { times: DIGEST_TIMES, ...(st.digest || {}), on: v } })} />
        {st.digest?.on && (
          <div className="col" style={{ gap: 6 }}>
            <div className="tiny muted">할 일 알림을 바로 보내지 않고, 아래 시각마다 다음 요약 전까지 예정된 것을 한 번에 보내요. 일정·약 알림은 그대로 바로 와요.</div>
            <div className="row wrap" style={{ gap: 6 }}>
              {(st.digest.times || DIGEST_TIMES).map((tm, i) => (
                <div key={i} className="row" style={{ gap: 2 }}>
                  <TimeInput value={t2m(tm)} allowEmpty={false} onChange={(v) => setSettings({ digest: { ...st.digest, times: (st.digest.times || DIGEST_TIMES).map((x, j) => (j === i ? m2t(v) : x)) } })} />
                  {(st.digest.times || DIGEST_TIMES).length > 1 && <button className="icon-btn" aria-label="삭제" onClick={() => setSettings({ digest: { ...st.digest, times: (st.digest.times || DIGEST_TIMES).filter((_, j) => j !== i) } })}><Icon name="close" size={12} /></button>}
                </div>
              ))}
              {(st.digest.times || DIGEST_TIMES).length < 6 && <button className="chip" onClick={() => setSettings({ digest: { ...st.digest, times: [...(st.digest.times || DIGEST_TIMES), '21:00'] } })}>＋ 시각</button>}
            </div>
          </div>
        )}
        <details className="more">
          <summary>정확한 시간에 받기 (5분마다 깨우기 · 권장)</summary>
          <div className="small" style={{ marginTop: 6, lineHeight: 1.75 }}>
            GitHub 의 예약 실행은 무료라서 몇 시간씩 밀리기도 해요. 무료 서비스 <b>cron-job.org</b> 가 5분마다 알림 확인을 실행하게 하면 제시간에 와요.<br />
            1. github.com › Settings › Developer settings › <b>Fine-grained tokens</b> › 새 토큰: 저장소 <b>hysdllover/new</b> 만 · 권한 <b>Actions: Read and write</b><br />
            2. cron-job.org 가입 › <b>CREATE CRONJOB</b> · URL 은 아래 주소 · 실행 간격 <b>5분</b><br />
            3. <b>ADVANCED</b> › 요청 방식 <b>POST</b> · 헤더 <code>Authorization</code> = <code>Bearer 토큰</code>, <code>Accept</code> = <code>application/vnd.github+json</code> · 본문 <code>{'{"ref":"main"}'}</code><br />
            4. 저장 후 몇 분 뒤 위 ‘마지막 확인’ 이 몇 분 전으로 바뀌면 완료
          </div>
          {[['주소', 'https://api.github.com/repos/hysdllover/new/actions/workflows/notify.yml/dispatches'], ['본문', '{"ref":"main"}']].map(([k, v]) => (
            <div key={k} className="row" style={{ marginTop: 6 }}>
              <span className="tiny muted nowrap" style={{ width: 28 }}>{k}</span>
              <input className="input grow" readOnly value={v} onFocus={(e) => e.target.select()} />
              <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(v); toast('복사했어요') } catch { toast('길게 눌러 복사해 주세요') } }}>복사</button>
            </div>
          ))}
          <div className="tiny muted" style={{ marginTop: 6 }}>토큰은 이 저장소의 Actions 실행 권한만 있어 안전해요. 앱이 열려 있을 때는 앱이 직접 알림을 띄워요.</div>
        </details>
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
        5. 잠금 화면: 잠금 화면 길게 누르기 › 사용자화 › 잠금 화면 › 위젯 추가 › Scriptable → <b>추가한 위젯을 한 번 더 눌러 Script: ‘스터디’ 선택</b> (안 고르면 빈칸) · 잠금 화면도 Parameter 로 공부 · 할일 · 달력 · 캘린더 · 다짐 · 디데이(다음 D-day 는 디데이2) · 시간표 · 주간 · 과목 · 지금 · 진도 · 목표 · 오늘 지정 (비우면 기본, 아이폰·아이패드 같음)<br />
        6. 아이패드 잠금 화면은 iPadOS 17 이상. 빈칸·오류가 보이면 Scriptable 에서 스크립트를 실행 › ‘잠금 화면 미리보기’로 오류 문구를 확인하세요.
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
      <Field label="위젯 글자 크기"><Seg value={String(st.widgetScale || 1)} onChange={(v) => setSettings({ widgetScale: +v })} options={[['0.9', '작게'], ['1', '기본'], ['1.1', '크게'], ['1.2', '더 크게']]} /></Field>
      <Field label="위젯 글자 굵기"><Seg value={String(st.widgetWeight || 0)} onChange={(v) => setSettings({ widgetWeight: +v })} options={[['-1', '더 얇게'], ['0', '기본'], ['1', '보통'], ['2', '진하게']]} /></Field>
      <div className="tiny muted">미리보기에 바로 보여요. 위젯에는 다음 동기화 뒤 반영돼요 (설치한 폰트는 굵기 대신 그 폰트 그대로). 잠금 화면은 ‘크게’까지만 커져요.</div>
    </div>
  )
}

// 홈 화면 위젯 미리보기 (실제 데이터) — Scriptable 위젯과 같은 디자인
function WidgetPreview() {
  const st = useSettings()
  useEffect(() => { loadAllFonts() }, [])
  const ff = { ...(st.widgetFont ? { fontFamily: `"${st.widgetFont}", "Apple SD Gothic Neo", sans-serif` } : null), '--dw-scale': st.widgetScale || 1, fontWeight: [200, 300, 400, 500][(+st.widgetWeight || 0) + 1] }
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
  const nm = now.getHours() * 60 + now.getMinutes()
  const dateStr = `${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()]} · ${now.getDate()} ${['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][now.getMonth()]}`
  const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
  const big = (size) => (
    <>
      <div className="dw-big"><span style={{ fontSize: size }}>{hm(mins)}</span><span className="dw-soft">of {hm(goal)}</span><span className="grow" /><span className="dw-gold">{pct}%</span></div>
      <div className="dw-line"><i style={{ width: pct + '%' }} /></div>
    </>
  )
  const ddRow = dd && <div className="dw-ddrow"><span className="dw-gold">{ddTxt}</span><span className="dw-soft">{dd.title}</span></div>
  const list = (n0) => { const n = items.length === n0 + 1 ? n0 + 1 : n0; return <>{items.slice(0, n).map((t) => t.done
    ? <div key={t.id} className="dw-todo dw-soft"><span>✓</span><span className="ellipsis" style={{ textDecoration: 'line-through' }}>{t.title}</span></div>
    : <div key={t.id} className="dw-todo"><span className={t.priority >= 3 ? 'dw-gold' : 'dw-soft'}>{t.priority >= 3 ? '•' : '–'}</span><span className="ellipsis" style={t.priority >= 3 ? { fontWeight: 500 } : null}>{t.title}</span></div>)}
    {!items.length && <div className="dw-soft">All clear.</div>}{items.length > n && <div className="dw-soft" style={{ fontSize: 11 }}>+ {items.length - n} more</div>}</> }
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
  // 공부 유형: 이번 주·어제·최근 7일
  const sw = (() => {
    const byDay = {}
    for (const x of sessions) byDay[x.date] = (byDay[x.date] || 0) + x.dur
    const off = (k) => { const x = new Date(); x.setDate(x.getDate() - k); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
    const last7 = [6, 5, 4, 3, 2, 1, 0].map((k) => ({ m: byDay[off(k)] || 0, wd: (now.getDay() - k + 7) % 7 }))
    const back = (now.getDay() - (st.weekStart ?? 1) + 7) % 7
    let week = 0; for (let k = 0; k <= back; k++) week += byDay[off(k)] || 0
    return { last7, week, yday: byDay[off(1)] || 0, avg: Math.round(last7.reduce((a, x) => a + x.m, 0) / 7) }
  })()
  const stat = (k, v, gold) => <div className="col" style={{ gap: 2 }}><span className="dw-cap">{k}</span><span className={gold ? 'dw-gold' : ''} style={{ fontSize: 13 }}>{v}</span></div>
  const bars7 = (h) => {
    const max = Math.max(goal, ...sw.last7.map((x) => x.m))
    return <div><div className="dw-bars" style={{ height: h }}>{sw.last7.map((x, i) => <i key={i} style={{ height: Math.max(2, x.m / max * h), opacity: i === 6 ? 1 : .35 + .4 * Math.min(1, x.m / goal) }} />)}<b style={{ bottom: goal / max * h }} /></div>
      <div className="dw-bars-l">{sw.last7.map((x, i) => <span key={i} className={i === 6 ? 'dw-gold' : ''}>{'SMTWTFS'[x.wd]}</span>)}</div></div>
  }
  // 새 유형 미리보기 데이터 (위젯 스크립트와 같은 계산)
  const lecturesP = useColl('lectures'), textbooksP = useColl('textbooks'); useColl('days')
  const wsP = weekStart(d, st.weekStart ?? 1)
  const weekSub = subjects.map((s) => ({ s, m: sessions.filter((x) => x.subjectId === s.id && x.date >= wsP && x.date <= d).reduce((a, x) => a + x.dur, 0) })).filter((x) => x.m).sort((a, b) => b.m - a.m)
  const progP = [...lecturesP.map((x) => ({ t: x.title, n: Object.keys(x.done || {}).filter((k) => +k <= x.total).length, of: x.total || 0, u: '강' })), ...textbooksP.map((x) => ({ t: x.title, n: x.current || 0, of: x.total || 0, u: x.unit || 'p' }))].filter((x) => x.of && x.n < x.of)
  const goalsP = weekGoals().map((g) => { const p = goalProgress(g, tasks); return { t: g.title, done: !!g.done || (p.linked > 0 && p.ratio >= 1), r: p.ratio, n: p.done, of: p.linked } })
  const gDone = goalsP.filter((g) => g.done).length
  const nmP = now.getHours() * 60 + now.getMinutes()
  const nowL = [...eventsOn(d).filter((e) => e.start != null).map((e) => ({ t: e.title, s: e.start, e: e.end ?? e.start + 60, c: e.color, l: e.location })), ...classesOn(d).map((c) => ({ t: c.period + '교시 ' + c.title, s: c.start, e: c.end, l: c.room }))].sort((a, b) => a.s - b.s)
  const nCur = nowL.find((x) => x.s <= nmP && x.e > nmP), nNext = nowL.find((x) => x.s > nmP), nC = nCur || nNext
  const leftN = items.filter((t) => !t.done).length
  const pRow = (k, v, r, c) => <div key={k} style={{ marginBottom: 7 }}><div className="row between" style={{ fontSize: 13 }}><span className="ellipsis">{k}</span><span className="dw-soft">{v}</span></div><div className="dw-line" style={{ marginTop: 3 }}><i style={{ width: Math.min(100, r * 100) + '%', background: c || null }} /></div></div>
  const hdr = (k, right) => <div className="row between" style={{ marginBottom: 8, flexWrap: 'nowrap', gap: 6 }}><span className="dw-cap sp nowrap">{k}</span><span className="dw-cap nowrap">{right}</span></div>
  const M = (x) => <div className="col" style={{ gap: 0, flex: 1, minWidth: 0, height: '100%' }}>{x}</div>
  const nowBody = (big) => nC ? <>{hdr(nCur ? 'NOW' : 'NEXT', big ? dateStr : '')}<div style={{ fontSize: big ? 24 : 20, fontWeight: 100, lineHeight: 1.2 }}>{nC.t}</div><div className="dw-soft" style={{ marginTop: 4 }}>{fmtTime(nC.s)}–{fmtTime(nC.e)}{nC.l ? ' · ' + nC.l : ''}</div><div className="dw-gold" style={{ marginTop: 6, fontSize: 11 }}>{nCur ? '끝까지 ' : '시작까지 '}{Math.max(0, (nCur ? nC.e : nC.s) - nmP)}분</div></> : <>{hdr('NEXT', '')}<div className="dw-soft">오늘 남은 일정이 없어요</div></>
  // 캘린더 유형: 이번 달 + 다가오는 일정
  const MONS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const ymdOf = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  const hasPlan = (k) => eventsOn(k).length > 0 // 캘린더 위젯: 일정만
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
    for (let i = 0; i < 30 && out.length < count; i++) {
      const x = new Date(); x.setDate(x.getDate() + i); const k = ymdOf(x)
      for (const e of eventsOn(k)) { if (i === 0 && e.start != null && (e.end ?? e.start + 60) <= nm) continue; out.push({ k, x, time: e.start == null ? '종일' : fmtTime(e.start), title: e.title, c: e.color }) }
    }
    let last = ''
    return <>{out.slice(0, count).map((a, i) => <div key={i}>{a.k !== last && (last = a.k) && <div className={'dw-cap' + (a.k === d ? ' dw-gold' : '')} style={{ margin: '2px 0 3px' }}>{a.k === d ? 'TODAY' : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][a.x.getDay()] + ' ' + (a.x.getMonth() + 1) + '/' + a.x.getDate()}</div>}
      <div className="dw-todo"><span className="dw-soft" style={{ width: 30, flexShrink: 0 }}>{a.time}</span><i style={{ width: 2, height: 12, borderRadius: 1, flexShrink: 0, background: a.c || 'var(--rule)' }} /><span className="ellipsis">{a.title}</span></div></div>)}
      {!out.length && <div className="dw-soft">다가오는 일정 없음</div>}</>
  }
  // 대시보드 · 내일 · 마감 · 7일 일정 · D-day 목록 · 바로 시작
  const addD = (k) => { const x = new Date(); x.setDate(x.getDate() + k); return x }
  const tmrK = ymdOf(addD(1)), tmrD = addD(1)
  const tmrEv = eventsOn(tmrK), tmrCl = classesOn(tmrK), tmrTk = sortTasks(tasks.filter((t) => !t.archived && !t.done && t.due === tmrK), 'due')
  const dueIn = (t) => Math.round((new Date(t.due + 'T00:00') - new Date(d + 'T00:00')) / 86400000)
  const dueTxt = (t) => { const n = dueIn(t); return n < 0 ? -n + '일 지남' : n === 0 ? '오늘' : n === 1 ? '내일' : 'D-' + n }
  const dueL = sortTasks(tasks.filter((t) => !t.archived && !t.done && t.due && t.due <= ymdOf(addD(14))), 'due')
  const overN = dueL.filter((t) => dueIn(t) < 0).length
  const days7 = Array.from({ length: 7 }, (_, i) => { const x = addD(i), k = ymdOf(x); return { i, x, k, ev: eventsOn(k).filter((e) => !(i === 0 && e.start != null && (e.end ?? e.start + 60) <= nm)) } })
  const ev7 = days7.reduce((a, x) => a + x.ev.length, 0)
  const dayName = (x) => (x.i === 0 ? 'TODAY' : x.i === 1 ? 'TMRW' : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][x.x.getDay()])
  const ddT = (x) => { const n = Math.round((new Date(x.date) - new Date(d)) / 86400000); return n === 0 ? 'D-DAY' : 'D-' + n }
  const qsub = (() => { const out = []; for (const x of [...sessions].sort((a, b) => String(b.date).localeCompare(String(a.date)))) { const s = subjects.find((y) => y.id === x.subjectId); if (s && !out.includes(s)) out.push(s) } for (const s of subjects) if (!out.includes(s)) out.push(s); return out.slice(0, 8) })()
  const evRow = (e, k) => <div key={k} className="dw-todo"><span className="dw-soft" style={{ width: 30, flexShrink: 0 }}>{e.start == null ? '종일' : fmtTime(e.start)}</span><i style={{ width: 2, height: 12, borderRadius: 1, flexShrink: 0, background: e.color || 'var(--rule)' }} /><span className="ellipsis">{e.title}</span></div>
  const tkRow = (t) => <div key={t.id} className="dw-todo"><span className={t.priority >= 3 ? 'dw-gold' : 'dw-soft'}>{t.priority >= 3 ? '•' : '–'}</span><span className="ellipsis grow" style={t.priority >= 3 ? { fontWeight: 500 } : null}>{t.title}</span>{t.dueTime != null && <span className="dw-soft">{fmtTime(t.dueTime)}</span>}</div>
  const tiles = [['STUDY', hm(mins), pct + '%', mins / goal, 1], ['TO DO', leftN, done + ' done', items.length ? done / items.length : 0], ['NEXT', nC ? fmtTime(nC.s) : '—', nC ? nC.t : '남은 일정 없음'], ['D-DAY', dd ? ddTxt : '—', dd ? dd.title : '없음', null, 1]]
  const tileGrid = (cols, size) => <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '12px 12px' }}>{tiles.map((x) => <div key={x[0]} className="col" style={{ gap: 1, minWidth: 0 }}><span className="dw-cap">{x[0]}</span><span className="ellipsis" style={{ fontSize: size, fontWeight: 100, lineHeight: 1.1 }}>{x[1]}</span><span className={'ellipsis ' + (x[4] ? 'dw-gold' : 'dw-soft')} style={{ fontSize: 10 }}>{x[2]}</span>{x[3] != null && <div className="dw-line" style={{ marginTop: 3 }}><i style={{ width: Math.min(100, x[3] * 100) + '%' }} /></div>}</div>)}</div>
  const btn = (s, key, color) => <span key={key} className="row" style={{ flex: 1, minWidth: 0, height: 32, borderRadius: 10, background: 'var(--rule)', justifyContent: 'center', gap: 5, fontSize: 12 }}>{color && <i style={{ width: 6, height: 6, borderRadius: 3, background: color, flexShrink: 0 }} />}<span className="ellipsis">{s}</span></span>
  const quickBody = (n, lg) => <>{hdr('START', '오늘 ' + hm(mins))}{[0, 4].filter((i) => i < Math.min(n, qsub.length)).map((i) => <div key={i} className="row" style={{ gap: 8, marginBottom: 8, flexWrap: 'nowrap' }}>{qsub.slice(i, i + 4).map((s) => btn(s.name, s.id, s.color))}{Array.from({ length: 4 - qsub.slice(i, i + 4).length }, (_, k) => <span key={'p' + k} style={{ flex: 1 }} />)}</div>)}<div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>{btn('+ 할 일', 'a')}{btn('+ 일정', 'b')}{btn('+ 기록', 'c')}</div>{lg && <><div className="dw-hr" />{list(4)}</>}</>
  const V = {
    대시보드: [
      tileGrid(2, 19),
      M(<>{hdr('TODAY', dateStr)}<div className="grow" />{tileGrid(4, 22)}<div className="grow" /></>),
      M(<>{hdr('TODAY', dateStr)}{tileGrid(2, 30)}<div className="dw-hr" />{list(5)}</>),
    ],
    내일: [0, 1, 2].map((i) => { const none = !tmrEv.length && !tmrTk.length && !tmrCl.length
      const cl = tmrCl.length > 0 && <div className="dw-soft" style={{ fontSize: 10, marginBottom: 6 }}>수업 {tmrCl.length}교시 · {fmtTime(tmrCl[0].start)}–{fmtTime(tmrCl[tmrCl.length - 1].end)}</div>
      const head = hdr('TOMORROW', <span className="dw-gold">{['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][tmrD.getDay()]} {tmrD.getMonth() + 1}/{tmrD.getDate()}</span>)
      if (none) return M(<>{head}<div className="dw-soft">내일은 비어 있어요</div></>)
      if (i === 0) { const k = tmrCl.length ? 2 : 3, kt = Math.max(0, k - tmrEv.length); return M(<>{head}{cl}{tmrEv.slice(0, k).map(evRow)}{tmrTk.slice(0, kt).map(tkRow)}<div className="grow" />{tmrTk.length > 0 && !kt && <div className="dw-gold" style={{ fontSize: 10 }}>할 일 {tmrTk.length}개</div>}</>) }
      if (i === 1) return M(<>{head}<div className="row" style={{ alignItems: 'stretch', flexWrap: 'nowrap', gap: 0, flex: 1, minHeight: 0 }}><div className="col" style={{ gap: 0, width: '54%', minWidth: 0 }}>{cl}{tmrEv.slice(0, tmrCl.length ? 3 : 4).map(evRow)}{!tmrEv.length && <div className="dw-soft">일정 없음</div>}</div><div className="dw-vr" /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>{tmrTk.slice(0, 4).map(tkRow)}{!tmrTk.length && <div className="dw-soft">할 일 없음</div>}</div></div></>)
      return M(<>{head}{tmrCl.length > 0 && <><div className="dw-cap sp">CLASSES</div><div style={{ margin: '4px 0 10px' }}>{tmrCl.map((c) => c.period + ' ' + c.title).join(' · ')}</div></>}<div className="dw-cap sp">EVENTS</div><div style={{ height: 4 }} />{tmrEv.slice(0, 4).map(evRow)}{!tmrEv.length && <div className="dw-soft">일정 없음</div>}<div style={{ height: 8 }} /><div className="dw-cap sp">TO DO</div><div style={{ height: 4 }} />{tmrTk.slice(0, tmrCl.length ? 4 : 6).map(tkRow)}{!tmrTk.length && <div className="dw-soft">할 일 없음</div>}</>)
    }),
    마감: [4, 5, 11].map((n0, i) => { const n = dueL.length === n0 + 1 ? n0 + 1 : n0; return M(<>{hdr('DUE', <span className={overN ? 'dw-gold' : ''}>{overN ? overN + '개 지남' : '2주 ' + dueL.length + '개'}</span>)}{dueL.slice(0, n).map((t) => <div key={t.id} className="dw-todo"><span className={dueIn(t) <= 0 ? 'dw-gold' : 'dw-soft'} style={{ width: i ? 42 : 36, flexShrink: 0, fontSize: 10 }}>{dueTxt(t)}</span><span className="ellipsis grow" style={t.priority >= 3 ? { fontWeight: 500 } : null}>{t.title}</span>{i > 0 && t.dueTime != null && <span className="dw-soft">{fmtTime(t.dueTime)}</span>}</div>)}{!dueL.length && <div className="dw-soft">2주 안에 마감 없음</div>}{dueL.length > n && <div className="dw-soft" style={{ fontSize: 11 }}>+ {dueL.length - n} more</div>}</>) }),
    일주일: [
      M(<>{hdr('NEXT 7 DAYS', ev7 + '개')}{days7.slice(0, 3).map((x) => <div key={x.k} className="row" style={{ gap: 8, alignItems: 'flex-start', flexWrap: 'nowrap', marginBottom: 5 }}><div className="col" style={{ gap: 0, width: 34, flexShrink: 0 }}><span className={'dw-cap' + (x.i ? '' : ' dw-gold')}>{dayName(x)}</span><span className="dw-soft" style={{ fontSize: 10 }}>{x.x.getMonth() + 1}/{x.x.getDate()}</span></div><span className="ellipsis grow" style={{ fontSize: 11 }}>{x.ev[0] ? x.ev[0].title : '—'}</span>{x.ev.length > 1 && <span className="dw-cap">+{x.ev.length - 1}</span>}</div>)}</>),
      M(<>{hdr('NEXT 7 DAYS', ev7 + '개')}<div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>{days7.map((x) => <div key={x.k} className="col" style={{ gap: 2, minWidth: 0 }}><span className={'dw-cap' + (x.i ? '' : ' dw-gold')}>{'SMTWTFS'[x.x.getDay()]}</span><span className={x.i ? '' : 'dw-gold'} style={{ fontSize: 13, fontWeight: x.i ? 300 : 600 }}>{x.x.getDate()}</span>{x.ev.slice(0, 3).map((e, k) => <span key={k} className="row" style={{ gap: 2, flexWrap: 'nowrap', fontSize: 8, minWidth: 0 }}><i style={{ width: 2, height: 9, borderRadius: 1, background: e.color || 'var(--gold)', flexShrink: 0 }} /><span className="ellipsis">{e.title}</span></span>)}{x.ev.length > 3 && <span className="dw-cap">+{x.ev.length - 3}</span>}</div>)}</div></>),
      M(<>{hdr('NEXT 7 DAYS', ev7 + '개')}{days7.map((x) => <div key={x.k} className="row" style={{ gap: 8, alignItems: 'flex-start', flexWrap: 'nowrap', marginBottom: 6 }}><div className="col" style={{ gap: 0, width: 44, flexShrink: 0 }}><span className={'dw-cap' + (x.i ? '' : ' dw-gold')}>{dayName(x)}</span><span className="dw-soft" style={{ fontSize: 10 }}>{x.x.getMonth() + 1}/{x.x.getDate()}</span></div><div className="col" style={{ gap: 2, flex: 1, minWidth: 0 }}>{x.ev.slice(0, 2).map(evRow)}{!x.ev.length && <span className="dw-soft">—</span>}</div>{x.ev.length > 2 && <span className="dw-cap">+{x.ev.length - 2}</span>}</div>)}</>),
    ],
    디데이목록: [
      M(<>{hdr('D-DAYS', '')}{ddSorted.slice(0, 4).map((x) => <div key={x.id} className="row between" style={{ marginBottom: 6, flexWrap: 'nowrap', gap: 6 }}><span className="ellipsis">{x.title}</span><span className="dw-gold">{ddT(x)}</span></div>)}{!ddSorted.length && <div className="dw-soft">No D-day.</div>}</>),
      M(<>{hdr('D-DAYS', dateStr)}{dd ? <div className="row" style={{ alignItems: 'stretch', flexWrap: 'nowrap', gap: 0, flex: 1 }}><div className="col" style={{ gap: 2, width: '38%', minWidth: 0 }}><span style={{ fontSize: 30, fontWeight: 100, lineHeight: 1 }}>{ddTxt}</span><span className="dw-gold ellipsis">{dd.title}</span><span className="dw-soft" style={{ fontSize: 10 }}>{dd.date.slice(5).replace('-', '.')}</span></div><div className="dw-vr" /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>{ddSorted.slice(1, 5).map((x) => <div key={x.id} className="row between" style={{ marginBottom: 6, flexWrap: 'nowrap', gap: 6 }}><span className="ellipsis">{x.title}</span><span className="dw-gold">{ddT(x)}</span></div>)}{ddSorted.length === 1 && <span className="dw-soft">다른 D-day 없음</span>}</div></div> : <div className="dw-soft">No D-day.</div>}</>),
      M(<>{hdr('D-DAYS', dateStr)}{ddSorted.slice(0, 10).map((x) => <div key={x.id} className="row" style={{ marginBottom: 9, flexWrap: 'nowrap', gap: 8, fontSize: 14 }}><span className="ellipsis grow">{x.title}</span><span className="dw-soft" style={{ fontSize: 10 }}>{x.date.slice(5).replace('-', '.')}</span><span className="dw-gold">{ddT(x)}</span></div>)}{!ddSorted.length && <div className="dw-soft">No D-day.</div>}</>),
    ],
    바로가기: [
      M(<>{hdr('START', '오늘 ' + hm(mins))}<div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>{qsub[0]?.color && <i style={{ width: 7, height: 7, borderRadius: 4, background: qsub[0].color, flexShrink: 0 }} />}<span className="ellipsis" style={{ fontSize: 26, fontWeight: 100 }}>{qsub[0]?.name || '공부'}</span></div><div className="dw-soft" style={{ fontSize: 10 }}>눌러서 시작</div><div className="grow" /><div className="dw-line"><i style={{ width: pct + '%' }} /></div></>),
      M(quickBody(4)),
      M(quickBody(8, true)),
    ],
    주간: [30, 26, 90].map((h, i) => M(<>{hdr('THIS WEEK', i ? dateStr : '')}<div className="dw-big"><span style={{ fontSize: i === 2 ? 38 : 30 }}>{hm(sw.week)}</span></div><div className="dw-soft">하루 평균 {hm(sw.avg)}</div><div className="grow" />{bars7(h)}{i === 2 && <><div className="dw-hr" />{weekSub.slice(0, 5).map((x) => pRow(x.s.name, hm(x.m), x.m / (weekSub[0].m || 1), x.s.color))}</>}</>)),
    과목: [3, 3, 8].map((n) => M(<>{hdr('SUBJECTS', '이번 주 ' + hm(sw.week))}{weekSub.slice(0, n).map((x) => pRow(x.s.name, hm(x.m), x.m / (weekSub[0].m || 1), x.s.color))}{!weekSub.length && <div className="dw-soft">이번 주 공부 기록이 없어요</div>}</>)),
    지금: [0, 1, 2].map((i) => M(<>{nowBody(i > 0)}{i > 0 && nowL.filter((x) => x.e > nmP && x !== nC).slice(0, i === 2 ? 8 : 1).map((x, k) => <div key={k} className="dw-todo" style={{ marginTop: k ? 0 : 10 }}><span className="dw-soft" style={{ width: 38 }}>{fmtTime(x.s)}</span><span className="ellipsis">{x.t}</span></div>)}</>)),
    진도: [3, 3, 8].map((n, i) => M(<>{hdr('PROGRESS', i ? dateStr : '')}{progP.slice(0, n).map((x) => pRow(x.t, i ? `${x.n}/${x.of}${x.u}` : Math.round((x.n / x.of) * 100) + '%', x.n / x.of))}{!progP.length && <div className="dw-soft">진행 중인 교재·인강이 없어요</div>}</>)),
    목표: [0, 1, 2].map((i) => M(<>{hdr('THIS WEEK', `${gDone}/${goalsP.length}`)}{goalsP.map((g) => pRow((g.done ? '✓ ' : '– ') + g.t, i && g.of ? `${g.n}/${g.of}` : '', g.r))}{!goalsP.length && <div className="dw-soft">할 일 › 이번 주 목표에서 정해 보세요</div>}{i === 2 && <><div className="dw-hr" /><div className="row between"><span>이번 주 공부 {hm(sw.week)}</span><span className="dw-soft">하루 {hm(sw.avg)}</span></div></>}</>)),
    오늘: [
      <>{hdr('TODAY', dateStr)}<div className="dw-todo"><span className="dw-gold">{nC ? fmtTime(nC.s) : '—'}</span><span className="ellipsis">{nC ? nC.t : '남은 일정 없음'}</span></div><div className="grow" />{big(24)}<div className="dw-soft" style={{ marginTop: 6 }}>할 일 {leftN}개 남음</div></>,
      <><div className="col" style={{ gap: 0, width: 128, flexShrink: 0 }}>{hdr('TODAY', '')}<div className="dw-todo"><span className="dw-gold">{nC ? fmtTime(nC.s) : '—'}</span><span className="ellipsis">{nC ? nC.t : '없음'}</span></div><div className="grow" />{big(24)}</div><div className="dw-vr" /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>{list(4)}</div></>,
      <>{hdr('TODAY', dateStr)}<div className="dw-todo"><span className="dw-gold">{nC ? fmtTime(nC.s) : '—'}</span><span className="ellipsis">{nC ? nC.t : '남은 일정 없음'}</span></div><div style={{ height: 8 }} />{big(34)}<div className="dw-hr" />{list(6)}<div className="grow" />{ddRow}</>,
    ],
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
      <><div className="row between"><span className="dw-cap sp">STUDY</span></div><div style={{ height: 8 }} />{big(30)}<div className="grow" /><div className="row between">{stat('WEEK', hm(sw.week))}{stat('YESTERDAY', hm(sw.yday), true)}</div></>,
      <><div className="col" style={{ gap: 0, width: 150, flexShrink: 0 }}><span className="dw-cap sp">STUDY</span><div style={{ height: 8 }} />{big(34)}<div className="grow" /><div className="row between">{stat('WEEK', hm(sw.week))}{stat('YESTERDAY', hm(sw.yday), true)}</div></div><div className="dw-vr" /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>{bars7(78)}</div></>,
      <><div className="row between"><span className="dw-cap sp">STUDY</span><span className="dw-cap">{dateStr}</span></div><div style={{ height: 10 }} />{big(44)}<div style={{ height: 14 }} /><div className="row between">{stat('WEEK', hm(sw.week))}{stat('7-DAY AVG', hm(sw.avg))}{stat('YESTERDAY', hm(sw.yday), true)}</div><div style={{ height: 14 }} />{bars7(70)}<div className="dw-hr" />{subBars(3)}</>,
    ],
    할일: [4, 5, 11].map((n) => <><div className="row between"><span className="dw-cap sp">TODAY</span><span className="dw-cap dw-gold">{done} DONE</span></div><div style={{ height: 10 }} />{list(n)}</>),
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
      <><div className="row between"><span className="dw-cap">{MONS[now.getMonth()]} {now.getFullYear()}</span><span className="dw-cap">{dateStr}</span></div><div style={{ height: 6 }} />{calGrid(39, 24, 3, true)}<div className="dw-hr" style={{ margin: '6px 0 8px' }} />{agenda(5)}</>,
    ],
    시간표: [6, 5, 10].map((n, vi) => { const cls = classesOn(d); return <><div className="row between"><span className="dw-cap sp">CLASSES</span>{vi > 0 && <span className="dw-cap">{dateStr}</span>}</div><div style={{ height: 8 }} />
      {cls.slice(0, n).map((c) => <div key={c.id} className="dw-todo" style={c.end <= nm ? { color: 'var(--soft)' } : c.start <= nm ? { color: 'var(--gold)' } : null}><span className="dw-soft" style={{ width: 12 }}>{c.period}</span><span className="ellipsis grow">{c.title}</span>{vi > 0 && c.room && <span className="dw-soft">{c.room}</span>}<span className="dw-soft">{fmtTime(c.start)}</span></div>)}
      {!cls.length && <div className="dw-soft">오늘은 수업이 없어요</div>}</> }),
    다짐: [14, 17, 22].map((sz) => <><div className="dw-cap">{dateStr}</div><div className="grow" /><div style={{ fontSize: sz, lineHeight: 1.45 }}>{quote || '앱에서 다짐을 적어 보세요'}</div><div className="grow" /></>),
  }
  // 잠금 화면 미리보기 — 위젯 스크립트(scriptable.js)의 잠금 화면 분기와 같은 내용
  const bar = (r, wd) => <i className="dw-lbar" style={{ width: wd }}><b style={{ width: Math.max(0, Math.min(1, r)) * 100 + '%' }} /></i>
  const B = { fontSize: 22, fontWeight: 100 }, S = { fontSize: 8 }, DIM = { opacity: .55 }, ROW = { display: 'flex', justifyContent: 'space-between', gap: 6, width: '100%', minWidth: 0 }
  const L = (() => {
    const left = items.filter((t) => !t.done)
    if (kind === '디데이') return { c: [[dd ? (ddN === 0 ? 'D' : ddN) : '–', B], ['D-DAY', S]], r: [[ddTxt || 'No D-day', { fontSize: 24, fontWeight: 100 }], [dd ? `${dd.title}  ${dd.date.slice(5).replace('-', '.')}` : ''], [ddNext ? `${ddNext.title} D-${Math.round((new Date(ddNext.date) - new Date(d)) / 86400000)}` : '', { ...DIM, fontSize: 10 }]], i: dd ? `${ddTxt} ${dd.title}` : 'No D-day' }
    if (kind === '공부') return { c: [[hm(mins), { fontSize: 14 }], [pct + '%', S], [bar(mins / goal, 34)]], r: [[<><b>{hm(mins)}</b> / {hm(goal)}<span className="grow" />{pct}%</>], [bar(mins / goal, 136)], [<span style={ROW}><span>이번 주 {hm(sw.week)}</span><span>어제 {hm(sw.yday)}</span></span>]], i: `공부 ${hm(mins)} / ${hm(goal)} · ${pct}%` }
    if (kind === '할일') return { c: [[left.length, { fontSize: 24, fontWeight: 100 }], ['할 일', S], [`${done}/${done + left.length}`, S]], r: [[<span style={{ ...ROW, fontSize: 8, letterSpacing: 2 }}><span>TODAY</span><span>{done}/{items.length}</span></span>], ...items.slice(0, 3).map((t) => [(t.done ? '✓ ' : '– ') + t.title, t.done ? DIM : null]), ...(items.length ? [] : [['All clear.']])], i: left.length ? `할 일 ${left.length}개 · ${left[0].title}` : '오늘 할 일 끝' }
    if (kind === '달력') {
      const byDay = {}; for (const x of sessions) byDay[x.date] = (byDay[x.date] || 0) + x.dur
      const pre = d.slice(0, 7), mv = Object.entries(byDay).filter(([k]) => k.startsWith(pre)).map(([, v]) => v)
      const total = mv.reduce((a, v) => a + v, 0), days = mv.filter(Boolean).length, hit = mv.filter((v) => v >= goal).length
      const mx = Math.max(goal, ...sw.last7.map((x) => x.m))
      const spark = <span className="dw-lspark">{sw.last7.map((x, k) => <i key={k} style={{ height: Math.max(2, Math.round((x.m / mx) * 18)), opacity: !x.m ? .25 : k === 6 ? 1 : .6 }} />)}</span>
      return { c: [[days, B], ['DAYS', S], [bar(days / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(), 34)]], r: [[<span style={ROW}><span>{MONS[now.getMonth()]} · {hm(total)}</span><span style={{ fontSize: 9 }}>{days}일 · 달성 {hit}</span></span>], [spark], [<span style={{ ...ROW, fontSize: 8 }}><span>최근 7일</span><span>평균 {hm(sw.avg)}</span></span>]], i: `${MONS[now.getMonth()]} ${hm(total)} · ${days}일` }
    }
    if (kind === '캘린더') {
      const ag = []
      for (let i = 0; i < 14 && ag.length < 6; i++) {
        const x = new Date(); x.setDate(x.getDate() + i); const k = ymdOf(x)
        for (const e of eventsOn(k)) if (!(i === 0 && e.start != null && (e.end ?? e.start + 60) <= nm)) ag.push({ i, s: e.start, title: e.title })
        for (const t of tasks.filter((t) => t.due === k && !t.done && !t.archived && t.dueTime != null)) ag.push({ i, s: t.dueTime, title: '☐ ' + t.title })
      }
      ag.sort((a, b) => a.i - b.i || (a.s ?? -1) - (b.s ?? -1))
      const wd = (i) => ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][(now.getDay() + i) % 7]
      const when = (a) => (a.i === 0 && a.s == null ? '오늘' : (a.i === 0 ? '' : a.i === 1 ? '내일 ' : wd(a.i) + ' ') + (a.s == null ? '종일' : fmtTime(a.s)))
      const nx = ag.find((a) => a.i > 0 || a.s == null || a.s >= nm) || ag[0]
      return { c: nx ? [[nx.s == null ? '종일' : fmtTime(nx.s), { fontSize: 13 }], [nx.title, S], [nx.i ? (nx.i === 1 ? '내일' : wd(nx.i)) : 'TODAY', { fontSize: 6 }]] : [['—', B]], r: ag.length ? ag.slice(0, 3).map((a) => [<span style={ROW}><span className="ellipsis">{a.title}</span><span style={{ fontSize: 8, flexShrink: 0 }}>{when(a)}</span></span>]) : [['다가오는 일정 없음']], i: nx ? (nx.i === 0 && nx.s == null ? '' : '다음 ') + when(nx) + ' ' + nx.title : '다가오는 일정 없음' }
    }
    if (kind === '다짐') { const q = quote || '앱에서 다짐을 적어 보세요'; return { c: [[q, { fontSize: 9, textAlign: 'center', padding: '0 6px', lineHeight: 1.2 }]], r: [[q, { fontSize: 12, whiteSpace: 'normal' }]], i: q } }
    if (kind === '주간') return { c: [[hm(sw.week), { fontSize: 13 }], ['WEEK', S], [bar(sw.week / (goal * 7), 34)]], r: [[<span style={ROW}><span>이번 주 {hm(sw.week)}</span><span style={{ fontSize: 9 }}>하루 {hm(sw.avg)}</span></span>], [<span className="dw-lspark">{sw.last7.map((x, k) => <i key={k} style={{ height: Math.max(2, Math.round((x.m / Math.max(goal, ...sw.last7.map((y) => y.m))) * 18)), opacity: !x.m ? .25 : k === 6 ? 1 : .6 }} />)}</span>]], i: `이번 주 ${hm(sw.week)} · 하루 ${hm(sw.avg)}` }
    if (kind === '과목') return { c: weekSub[0] ? [[weekSub[0].s.name, S], [hm(weekSub[0].m), { fontSize: 14 }], [bar(weekSub[0].m / Math.max(1, sw.week), 34)]] : [['—', B]], r: weekSub.length ? weekSub.slice(0, 3).map((x) => [<span style={ROW}><span>{x.s.name}</span><span style={{ fontSize: 9 }}>{hm(x.m)}</span></span>]) : [['이번 주 공부 기록 없음']], i: weekSub.length ? weekSub.slice(0, 2).map((x) => x.s.name + ' ' + hm(x.m)).join(' · ') : '이번 주 공부 기록 없음' }
    if (kind === '지금') return { c: nC ? [[nCur ? '남음' : '다음', S], [`${Math.max(0, (nCur ? nC.e : nC.s) - nmP)}분`, { fontSize: 13 }], [nC.t, S]] : [['—', B]], r: nC ? [[<span style={{ ...ROW, fontSize: 8 }}><span>{nCur ? '지금' : '다음'}</span><span>{fmtTime(nC.s)}–{fmtTime(nC.e)}</span></span>], [nC.t, { fontSize: 20, fontWeight: 100 }], [`${nCur ? '끝까지' : '시작까지'} ${Math.max(0, (nCur ? nC.e : nC.s) - nmP)}분`, { fontSize: 9 }]] : [['오늘 남은 일정 없음']], i: nCur ? `${nC.t} ~${fmtTime(nC.e)}` : nC ? `다음 ${fmtTime(nC.s)} ${nC.t}` : '남은 일정 없음' }
    if (kind === '진도') return { c: progP[0] ? [[Math.round((progP[0].n / progP[0].of) * 100) + '%', { fontSize: 14 }], [progP[0].t, S], [bar(progP[0].n / progP[0].of, 34)]] : [['—', B]], r: progP.length ? progP.slice(0, 3).flatMap((x) => [[<span style={ROW}><span className="ellipsis">{x.t}</span><span style={{ fontSize: 9 }}>{x.n}/{x.of}{x.u}</span></span>], [bar(x.n / x.of, 136)]]) : [['진행 중인 교재·인강 없음']], i: progP[0] ? `${progP[0].t} ${Math.round((progP[0].n / progP[0].of) * 100)}%` : '진행 중인 교재·인강 없음' }
    if (kind === '목표') return { c: goalsP.length ? [[`${gDone}/${goalsP.length}`, B], ['GOALS', S], [bar(gDone / goalsP.length, 34)]] : [['—', B]], r: goalsP.length ? [[<span style={{ ...ROW, fontSize: 8, letterSpacing: 2 }}><span>THIS WEEK</span><span>{gDone}/{goalsP.length}</span></span>], ...goalsP.slice(0, 3).map((g) => [(g.done ? '✓ ' : '– ') + g.t, g.done ? DIM : null])] : [['이번 주 목표 없음']], i: goalsP.length ? `목표 ${gDone}/${goalsP.length}` + (goalsP.find((g) => !g.done) ? ' · ' + goalsP.find((g) => !g.done).t : ' 완료') : '이번 주 목표 없음' }
    if (kind === '오늘') return { c: [[leftN, B], ['할 일', S], [bar(mins / goal, 34)]], r: [[<span style={{ ...ROW, fontSize: 8 }}><span>{['일', '월', '화', '수', '목', '금', '토'][now.getDay()]} {now.getDate()}</span><span>할 일 {leftN}</span></span>], [nC ? `${fmtTime(nC.s)} ${nC.t}` : '남은 일정 없음'], [<span style={ROW}><span>공부 {hm(mins)} / {hm(goal)}</span><span style={{ fontSize: 9 }}>{pct}%</span></span>], [bar(mins / goal, 136)]], i: `할 일 ${leftN} · 공부 ${hm(mins)}` + (nC ? ` · ${fmtTime(nC.s)} ${nC.t}` : '') }
    if (kind === '대시보드') return { c: [[hm(mins), { fontSize: 14 }], [`할 일 ${leftN}`, S], [bar(mins / goal, 34)]], r: [[<span style={ROW}><span>공부 {hm(mins)}</span><span style={{ fontSize: 9 }}>할 일 {leftN}</span></span>], [nC ? `${fmtTime(nC.s)} ${nC.t}` : '남은 일정 없음'], [<span style={ROW}><span className="ellipsis">{dd ? dd.title : 'No D-day'}</span><span style={{ fontSize: 9 }}>{ddTxt}</span></span>], [bar(mins / goal, 136)]], i: `${hm(mins)} · 할 일 ${leftN}` + (dd ? ` · ${ddTxt}` : '') }
    if (kind === '내일') { const rows = [...tmrEv.map((e) => [e.title, e.start == null ? '종일' : fmtTime(e.start)]), ...tmrTk.map((t) => ['– ' + t.title, ''])]; const f = tmrEv[0], c1 = tmrCl[0]
      return { c: [['내일', S], [rows.length, B], ['일정·할 일', { fontSize: 6 }]], r: [[<span style={{ ...ROW, fontSize: 8 }}><span>내일 {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][tmrD.getDay()]}</span><span>{tmrCl.length ? `수업 ${tmrCl.length}교시` : ''}</span></span>], ...(rows.length ? rows.slice(0, 3).map((x) => [<span style={ROW}><span className="ellipsis">{x[0]}</span><span style={{ fontSize: 8, flexShrink: 0 }}>{x[1]}</span></span>]) : [[c1 ? `첫 수업 ${fmtTime(c1.start)} ${c1.title}` : '내일은 비어 있어요']])], i: f ? `내일 ${f.start == null ? '' : fmtTime(f.start) + ' '}${f.title}` : c1 ? `내일 ${fmtTime(c1.start)} ${c1.title}` : tmrTk.length ? `내일 할 일 ${tmrTk.length}개` : '내일은 비어 있어요' } }
    if (kind === '마감') return { c: [[dueL.length, B], ['마감', S], [overN ? overN + ' 지남' : '2주', { fontSize: 6 }]], r: dueL.length ? [...dueL.slice(0, 3).map((t) => [<span style={ROW}><span className="ellipsis">{t.title}</span><span style={{ fontSize: 8, flexShrink: 0 }}>{dueTxt(t)}</span></span>]), ...(dueL.length > 3 ? [[`+ ${dueL.length - 3} more`, { ...DIM, fontSize: 7 }]] : [])] : [['2주 안에 마감 없음']], i: dueL[0] ? `${dueTxt(dueL[0])} ${dueL[0].title}` : '2주 안에 마감 없음' }
    if (kind === '일주일') { const ds = days7.filter((x) => x.ev.length).slice(0, 3), nx = days7.find((x) => x.ev.length)
      return { c: [[ev7, B], ['7 DAYS', S]], r: ds.length ? ds.map((x) => [<span style={ROW}><span className="ellipsis">{dayName(x)}  {x.ev[0].title}</span><span style={{ fontSize: 8, flexShrink: 0 }}>{x.ev.length > 1 ? '+' + (x.ev.length - 1) : x.ev[0].start == null ? '종일' : fmtTime(x.ev[0].start)}</span></span>]) : [['7일 안에 일정 없음']], i: nx ? `${nx.i === 0 ? '' : nx.i === 1 ? '내일 ' : dayName(nx) + ' '}${nx.ev[0].start == null ? '종일' : fmtTime(nx.ev[0].start)} ${nx.ev[0].title}` : '7일 안에 일정 없음' } }
    if (kind === '디데이목록') return { c: dd ? [[ddN === 0 ? 'D' : ddN, B], [dd.title, S]] : [['—', B]], r: ddSorted.length ? ddSorted.slice(0, 3).map((x) => [<span style={ROW}><span className="ellipsis">{x.title}</span><span style={{ fontSize: 9, flexShrink: 0 }}>{ddT(x)}</span></span>]) : [['No D-day']], i: ddSorted.length ? ddSorted.slice(0, 2).map((x) => ddT(x) + ' ' + x.title).join(' · ') : 'No D-day' }
    if (kind === '바로가기') return { c: [['시작', S], [qsub[0]?.name || '공부', { fontSize: 13 }], [bar(mins / goal, 34)]], r: [[<span style={{ ...ROW, fontSize: 8 }}><span>공부 시작</span><span>오늘 {hm(mins)}</span></span>], [qsub[0]?.name || '공부', { fontSize: 20, fontWeight: 100 }], [bar(mins / goal, 136)]], i: `공부 시작 · ${qsub[0]?.name || ''} · 오늘 ${hm(mins)}` }
    if (kind === '시간표') {
      const cls = classesOn(d), cur = cls.find((c) => c.start <= nm && c.end > nm), next = cls.find((c) => c.start > nm), c = cur || next
      const after = c ? cls.filter((x) => x.start > c.start).slice(0, 3).map((x) => x.title).join(' · ') : ''
      return { c: c ? [[c.period + '교시', S], [c.title, { fontSize: 13 }], [cur ? '~' + fmtTime(c.end) : fmtTime(c.start), S]] : [[cls.length ? '끝' : '—', B]], r: [[<span style={{ ...ROW, fontSize: 8 }}><span>{cur ? `지금 ${cur.period}교시` : next ? `다음 ${next.period}교시` : '시간표'}</span><span>{c ? `${fmtTime(c.start)}–${fmtTime(c.end)}` : ''}</span></span>], [c ? c.title : cls.length ? '오늘 수업 끝' : '오늘 수업 없음', { fontSize: 20, fontWeight: 100 }], [c?.room ? c.room + (after ? ' · ' + after : '') : after, { fontSize: 10 }]], i: c ? (cur ? `${c.period}교시 ${c.title} ~${fmtTime(c.end)}` : `다음 ${c.period}교시 ${c.title} ${fmtTime(c.start)}`) : cls.length ? '오늘 수업 끝' : '오늘 수업 없음' }
    }
    return { c: [[hm(mins), { fontSize: 14 }], [pct + '%', S], [bar(mins / goal, 34)]], r: [[<><b>{hm(mins)}</b> / {hm(goal)}<span className="grow" />{ddTxt}</>], [bar(mins / goal, 136)], [todo[0] ? '– ' + todo[0].title : dd?.title || 'All clear.']], i: hm(mins) + (dd ? ` · ${ddTxt} ${dd.title}` : '') }
  })()
  const [vs, vm, vl] = V[kind]
  return (
    <>
      <div className="scroll-x" style={{ marginBottom: 6 }}><div className="row" style={{ gap: 6 }}>
        {WIDGET_KINDS.map(([k, l]) => <button key={k} className={'chip' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>{l}</button>)}
      </div></div>
      <div className="tiny muted">{kind ? <>위젯 편집 › Parameter 에 <b>{kind}</b> 입력</> : '위젯 편집 › Parameter 를 비워 두면 기본 형태'}</div>
      <div className="dw-row">
        <div className="dw dw-s" style={ff}><div className="dw-in">{vs}</div></div>
        <div className="dw dw-m" style={ff}><div className="dw-in">{vm}</div></div>
        <div className="dw dw-l" style={ff}><div className="dw-in">{vl}</div></div>
      </div>
      <div className="tiny muted" style={{ marginTop: 8 }}>잠금 화면 · 원형 · 직사각형 · 한 줄 (Parameter 같음, 아이폰·아이패드 공통)</div>
      <div className="dw-lock" style={ff}>
        <div className="dw-li">{['일', '월', '화', '수', '목', '금', '토'][now.getDay()]} {now.getMonth() + 1}월 {now.getDate()}일 · {L.i}</div>
        <div className="dw-clock">{now.getHours()}:{String(now.getMinutes()).padStart(2, '0')}</div>
        <div className="row" style={{ gap: 12, alignItems: 'center' }}>
          <div className="dw-lc">{L.c.map((x, k) => <span key={k} style={x[1]}>{x[0]}</span>)}</div>
          <div className="dw-lr">{L.r.map((x, k) => <div key={k} style={x[1]}>{x[0]}</div>)}</div>
        </div>
      </div>
    </>
  )
}

// 하단 탭 직접 정하기 (아이폰 하단 탭 · 아이패드는 사이드바 그대로)
function TabBarCard() {
  const st = useSettings()
  const cur = st.tabBar?.length ? st.tabBar : DEFAULT_TABBAR
  const set = (v) => setSettings({ tabBar: v })
  const move = (i, d) => { const a = [...cur]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; set(a) }
  return (
    <Card title="하단 탭" action={<button className="tiny muted" onClick={() => set(null)}>기본으로</button>}>
      <div className="tiny muted" style={{ marginBottom: 6 }}>아이폰 아래 탭에 둘 화면을 2~5개 골라 순서를 정해요. 뺀 화면은 오른쪽 위 ⋯ 메뉴에 있어요.</div>
      <div className="tabpick-bar">
        {cur.map((k, i) => { const o = tabOpt(k); return o && (
          <div key={k} className="tabpick">
            <Icon name={o.icon} size={18} /><span className="tiny">{o.label}</span>
            <div className="row" style={{ gap: 0 }}>
              <button className="icon-btn" aria-label="앞으로" disabled={i === 0} onClick={() => move(i, -1)}>‹</button>
              {cur.length > 2 && <button className="icon-btn" aria-label="빼기" onClick={() => set(cur.filter((x) => x !== k))}><Icon name="close" size={11} /></button>}
              <button className="icon-btn" aria-label="뒤로" disabled={i === cur.length - 1} onClick={() => move(i, 1)}>›</button>
            </div>
          </div>) })}
      </div>
      {cur.length < 5 && (
        <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
          {TAB_OPTIONS.filter((o) => !cur.includes(o.key)).map((o) => <button key={o.key} className="chip" onClick={() => set([...cur, o.key])}><Icon name={o.icon} size={13} />{o.label}</button>)}
        </div>
      )}
    </Card>
  )
}
