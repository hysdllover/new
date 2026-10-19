// 영수증 리포트: 하루를 타자기 영수증 한 장으로 — No.YYMMDD 요일 · D-DAY · STUDY · TO-DO · TAX(못 끝낸 일) · MEMO
import { useEffect, useRef, useState } from 'react'
import { FONTS } from '../theme/theme.js'
import { drawReceipt } from '../lib/receiptImage.js'
import { shareBlob } from '../lib/shareCard.js'
import { setDay, dayRec } from '../store/actions.js'
import { toast, Icon } from './ui.jsx'

const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const hm = (m) => `${Math.floor((m || 0) / 60)}h ${String((m || 0) % 60).padStart(2, '0')}m`
const noOf = (date) => date.slice(2, 4) + date.slice(5, 7) + date.slice(8, 10)
const dd = (n) => (n === 0 ? 'D-DAY' : 'D-' + n)

export function receiptData(d) {
  const seen = new Set(), todo = []
  for (const t of [...d.done, ...d.left]) if (!seen.has(t.id)) { seen.add(t.id); todo.push(t) }
  return { no: noOf(d.date), dow: DOW[new Date(d.date + 'T00:00').getDay()], todo, done: todo.filter((t) => t.done).length, tax: todo.filter((t) => !t.done) }
}

// 바코드: 번호로 정해지는 막대 (같은 날은 늘 같은 모양)
function bars(no) {
  let s = (+no * 2654435761) % 2147483648
  const r = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648
  const out = [1.5, 1.5, 1.5, 2]
  for (let k = 0; k < 44; k++) out.push((1 + Math.floor(r() * 3)) * 1.1)
  return out.concat([2, 1.5, 1.5, 1.5])
}

const L = ({ a, b, cls }) => <div className={'rc-l' + (cls ? ' ' + cls : '')}><span>{a}</span><span>{b}</span></div>

// 이미지용 줄 목록 (화면 영수증과 같은 순서)
export function receiptRows(d) {
  const r = receiptData(d), dash = ['dash']
  return [
    ['c', '✦ DAILY RECEIPT ✦'], ['no', `No.${r.no}  ${r.dow}`], dash,
    ...(d.ddays.length ? [['h', '[D-DAY]'], ...d.ddays.map((x) => ['l', x.t, dd(x.n)]), dash] : []),
    ['h', '[STUDY]'], ...(d.subs.length ? d.subs.map((x) => ['l', x.sub?.name || '과목 없음', hm(x.m)]) : [['soft', 'NO ITEMS']]), ['sm'], ['l', 'SUBTOTAL', hm(d.mins)], dash,
    ['l', '[TO-DO]', `${r.done} / ${r.todo.length} COMPLETE`], ...(r.todo.length ? r.todo.map((t) => (t.done ? ['i', '✓ ' + t.title] : ['x', t.title])) : [['soft', 'NO ITEMS']]), dash,
    ...(r.tax.length ? [['h', '[TAX]'], ...r.tax.map((t) => ['i', '+ ' + t.title]), dash] : []),
    ['h', '[MEMO]'], ...(d.comment ? d.comment.split('\n').map((x) => ['i', x]) : [['blank']]),
    ['dbl'], ['bc', bars(r.no)],
  ]
}

export function receiptText(d) {
  const r = receiptData(d)
  return [
    '✦ DAILY RECEIPT ✦', `No.${r.no}  ${r.dow}`,
    ...(d.ddays.length ? ['', '[D-DAY]', ...d.ddays.map((x) => `${x.t}  ${dd(x.n)}`)] : []),
    '', '[STUDY]', ...d.subs.map((x) => `${x.sub?.name || '과목 없음'}  ${hm(x.m)}`), `SUBTOTAL  ${hm(d.mins)}`,
    '', `[TO-DO]  ${r.done} / ${r.todo.length} COMPLETE`, ...r.todo.map((t) => (t.done ? '✓ ' : '✗ ') + t.title),
    ...(r.tax.length ? ['', '[TAX]', ...r.tax.map((t) => '+ ' + t.title)] : []),
    ...(d.comment ? ['', '[MEMO]', d.comment] : []),
  ].join('\n')
}

export default function Receipt({ d, step, nextOff }) {
  const r = receiptData(d), paper = useRef(null)
  const [feed, setFeed] = useState(0)
  useEffect(() => { FONTS.notoserif.load().catch(() => {}) }, []) // 한글: 얇은 명조 (타자기 글씨와 어울리게)
  const share = async () => { const text = receiptText(d); try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('복사했어요') } } catch {} }
  const saveImg = async () => {
    try { const blob = await drawReceipt(receiptRows(d), r.no); const res = await shareBlob(blob, `영수증-${r.no}.png`); if (res === 'saved') toast('이미지를 저장했어요') } catch { toast('이미지를 만들지 못했어요') }
  }
  const printA4 = () => {
    const el = document.createElement('div'); el.id = 'print-area'
    el.innerHTML = `<div class="rc-print">${paper.current.outerHTML}</div>`
    document.body.appendChild(el); document.body.classList.add('print-area')
    const done = () => { el.remove(); document.body.classList.remove('print-area'); window.removeEventListener('afterprint', done) }
    window.addEventListener('afterprint', done)
    setTimeout(() => { window.print(); setTimeout(done, 1500) }, 80)
  }
  const memo = dayRec(d.date).comment || ''
  return (
    <div className="col rc">
      <div className="rc-top">
        <button className="icon-btn" onClick={() => step(-1)} aria-label="이전 날"><Icon name="back" size={15} /></button>
        <button className="rc-print-btn" onClick={() => setFeed(feed + 1)}>PRINT</button>
        <button className="icon-btn" disabled={nextOff} onClick={() => step(1)} aria-label="다음 날"><Icon name="next" size={15} /></button>
      </div>
      <div key={feed} className={'rc-slot' + (feed ? ' feed' : '')}>
        <div className="rc-paper" ref={paper}>
          <div className="rc-c rc-t">✦ DAILY RECEIPT ✦</div>
          <div className="rc-c rc-no">No.{r.no}&nbsp;&nbsp;{r.dow}</div>
          <div className="rc-dash" />
          {d.ddays.length > 0 && <>
            <div>[D-DAY]</div>
            {d.ddays.map((x, i) => <L key={i} a={x.t} b={dd(x.n)} />)}
            <div className="rc-dash" />
          </>}
          <div>[STUDY]</div>
          {d.subs.length ? d.subs.map((x, i) => <L key={i} a={x.sub?.name || '과목 없음'} b={hm(x.m)} />) : <div className="rc-soft">NO ITEMS</div>}
          <div className="rc-sm" />
          <L a="SUBTOTAL" b={hm(d.mins)} />
          <div className="rc-dash" />
          <L a="[TO-DO]" b={`${r.done} / ${r.todo.length} COMPLETE`} />
          {r.todo.length ? r.todo.map((t) => <div key={t.id} className="rc-i">{t.done ? '✓' : <span className="rc-x">✗</span>} {t.title}</div>) : <div className="rc-soft">NO ITEMS</div>}
          <div className="rc-dash" />
          {r.tax.length > 0 && <>
            <div>[TAX]</div>
            {r.tax.map((t) => <div key={t.id} className="rc-i">+ {t.title}</div>)}
            <div className="rc-dash" />
          </>}
          <div>[MEMO]</div>
          {d.comment ? <div className="rc-memo">{d.comment}</div> : <div className="rc-blank" />}
          <div className="rc-dbl" />
          <div className="rc-bc">{bars(r.no).map((w, i) => <i key={i} style={{ width: w, opacity: i % 2 ? 0 : 0.8 }} />)}</div>
          <div className="rc-bcn">{r.no}</div>
        </div>
      </div>
      <textarea key={d.date} className="input rc-memo-in" rows={2} defaultValue={memo} placeholder="MEMO · 오늘 마감하기의 '오늘 한 줄'과 같아요" onBlur={(e) => { const v = e.target.value.trim(); if (v !== memo) setDay(d.date, { comment: v }) }} />
      <div className="rc-actions">
        <button className="btn ghost sm" onClick={share}><Icon name="share" size={14} />텍스트</button>
        <button className="btn ghost sm" onClick={saveImg}><Icon name="image" size={14} />이미지</button>
        <button className="btn ghost sm" onClick={printA4}><Icon name="print" size={14} />A4</button>
      </div>
    </div>
  )
}
