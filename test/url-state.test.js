import test from 'node:test'
import assert from 'node:assert/strict'
import { readUrlState, urlForState } from '../src/url-state.js'

test('lê os dados de uma sessão partilhada', () => {
  assert.deepEqual(readUrlState('?date=2026-10-07&type=extraordinaria&carnival=1&initiative=2026-09-28'), {
    date: '2026-10-07', type: 'extraordinaria', carnival: true, initiativeDate: '2026-09-28'
  })
  assert.equal(readUrlState('?date=2026-11-05&type=ordinaria').type, 'ordinaria')
})

test('ignora datas e tipos inválidos no URL', () => {
  assert.deepEqual(readUrlState('?date=2026-02-30&type=anything&initiative=invalid'), {
    date: '', type: 'extraordinaria', carnival: false, initiativeDate: ''
  })
})

test('atualiza o URL preservando outros parâmetros e a âncora', () => {
  const url = urlForState('https://example.org/prazos/?ref=share&carnival=1#fontes', {
    date: '2026-10-07', type: 'extraordinaria', carnival: false, initiativeDate: '2026-09-28'
  })
  assert.equal(url.pathname, '/prazos/')
  assert.equal(url.search, '?ref=share&date=2026-10-07&type=extraordinaria&initiative=2026-09-28')
  assert.equal(url.hash, '#fontes')
})
