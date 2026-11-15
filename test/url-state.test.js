import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_BUFFERS } from '../src/rules.js'
import { readUrlState, urlForState } from '../src/url-state.js'

test('lê os dados de uma sessão partilhada', () => {
  assert.deepEqual(readUrlState('?date=2026-10-07&type=extraordinaria&carnival=1&initiative=2026-09-28'), {
    date: '2026-10-07', type: 'extraordinaria', carnival: true, bufferDays: 2, stepBuffers: { ...DEFAULT_BUFFERS }, initiativeDate: '2026-09-28'
  })
  assert.equal(readUrlState('?date=2026-11-05&type=ordinaria').type, 'ordinaria')
})

test('ignora datas e tipos inválidos no URL', () => {
  assert.deepEqual(readUrlState('?date=2026-02-30&type=anything&initiative=invalid'), {
    date: '', type: 'extraordinaria', carnival: false, bufferDays: 2, stepBuffers: { ...DEFAULT_BUFFERS }, initiativeDate: ''
  })
})

test('atualiza o URL preservando outros parâmetros e a âncora', () => {
  const url = urlForState('https://example.org/prazos/?ref=share&carnival=1#fontes', {
    date: '2026-10-07', type: 'extraordinaria', carnival: false, bufferDays: 2, stepBuffers: { ...DEFAULT_BUFFERS }, initiativeDate: '2026-09-28'
  })
  assert.equal(url.pathname, '/prazos/')
  assert.equal(url.search, '?ref=share&date=2026-10-07&type=extraordinaria&buffer=2&initiative=2026-09-28')
  assert.equal(url.hash, '#fontes')
})


test('restaura todos os valores de margem e usa 2 para ausentes ou inválidos', () => {
  for (let bufferDays = 0; bufferDays <= 5; bufferDays++) {
    const url = urlForState('https://example.org/', { date: '2026-10-07', type: 'extraordinaria', bufferDays })
    assert.equal(readUrlState(url.search).bufferDays, bufferDays)
  }
  for (const value of ['', '-1', '6', '2.5', 'abc', '02', 'Infinity', ' 0']) {
    assert.equal(readUrlState(`?buffer=${encodeURIComponent(value)}`).bufferDays, 2)
  }
  assert.equal(readUrlState('').bufferDays, 2)
})
