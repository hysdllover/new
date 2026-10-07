// 노트 템플릿: 기본 양식 + 내가 저장한 템플릿(노트에 isTemplate 표시)
import { list, put, patch, uid } from '../store/store.js'

const B = (type, text = '') => ({ id: uid(), type, text })

export const BUILTIN = [
  { id: 'blank', name: '빈 페이지', icon: '📄', desc: '아무것도 없이 시작', blocks: () => [B('text')] },
  { id: 'cornell', name: '코넬 노트', icon: '📘', desc: '키워드·질문 / 필기 / 요약', blocks: () => [
    B('h2', '키워드 · 질문'), B('bullet'), B('bullet'),
    B('divider'),
    B('h2', '필기'), B('text'),
    B('divider'),
    B('h2', '요약 (세 줄)'), B('text'),
  ] },
  { id: 'lecture', name: '강의 노트', icon: '🎧', desc: '핵심 개념 / 예시 / 질문 / 복습', blocks: () => [
    B('quote', '강의 · 몇 강 · 날짜'),
    B('h2', '핵심 개념'), B('bullet'), B('bullet'),
    B('h2', '예시 · 풀이'), B('text'),
    B('h2', '모르는 것 · 질문'), B('bullet'),
    B('h2', '복습'), B('todo'),
  ] },
  { id: 'wrong', name: '오답 정리', icon: '✏️', desc: '문제 / 내 풀이 / 틀린 이유 / 바른 풀이', blocks: () => [
    B('quote', '출처 · 문항 번호'),
    B('h2', '문제'), B('text'),
    B('h2', '내 풀이'), B('text'),
    B('h2', '틀린 이유'), B('bullet', '개념 부족 · 실수 · 시간 부족 중'), B('bullet'),
    B('h2', '바른 풀이'), B('text'),
    B('h2', '다음엔 이렇게'), B('text'),
  ] },
  { id: 'unit', name: '단원 요약', icon: '🗂️', desc: '개념 / 공식 / 자주 나오는 문제', blocks: () => [
    B('h2', '핵심 개념'), B('bullet'),
    B('h2', '공식 · 정의'), B('bullet'),
    B('h2', '자주 나오는 문제'), B('bullet'),
    B('h2', '헷갈리는 것'), B('text'),
  ] },
]

export const myTemplates = () => list('notes').filter((n) => n.isTemplate).sort((a, b) => (a.title || '').localeCompare(b.title || ''))

// 템플릿 블록 복사 (id 새로, 할 일 연결은 끊음)
const copyBlocks = (blocks) => (blocks || []).map(({ taskId, ...b }) => ({ ...b, id: uid() }))

export function blocksOf(tpl) {
  if (tpl.blocks && typeof tpl.blocks === 'function') return tpl.blocks()
  return copyBlocks(tpl.blocks)
}

export function createFromTemplate(tpl, extra = {}) {
  const custom = typeof tpl.blocks !== 'function'
  return put('notes', {
    title: '', type: 'page', icon: tpl.id === 'blank' ? undefined : tpl.icon || undefined,
    subjectId: custom ? tpl.subjectId || null : null,
    ...extra, blocks: blocksOf(tpl),
  })
}

export const saveAsTemplate = (note, on = true) => patch('notes', note.id, { isTemplate: on })
