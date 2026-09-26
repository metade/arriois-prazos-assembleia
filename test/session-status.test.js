import test from 'node:test'
import assert from 'node:assert/strict'
import { calculate } from '../src/rules.js'
import { sessionStatus } from '../src/session-status.js'

test('estado da sessão distingue histórico, prazo passado, prazo próximo e tempo disponível', () => {
  const sessionDate = '2026-10-07'
  const model = calculate(sessionDate, 'extraordinaria')

  assert.equal(sessionStatus(sessionDate, '2026-10-08', model).tone, 'past')
  assert.equal(sessionStatus(sessionDate, '2026-10-03', model).tone, 'late')
  assert.match(sessionStatus(sessionDate, '2026-10-06', model).detail, /amanhã/)
  assert.equal(sessionStatus(sessionDate, '2026-09-30', model).tone, 'soon')
  assert.equal(sessionStatus(sessionDate, '2026-10-02', model).tone, 'soon')
  assert.equal(sessionStatus(sessionDate, '2026-09-26', model).tone, 'good')
})

test('sugestão interna e pedido individual não fazem a sessão aparecer atrasada', () => {
  const sessionDate = '2026-10-07'
  const model = calculate(sessionDate, 'extraordinaria')
  assert.equal(model.dates.find(item => item.id === 'handoff').date, '2026-09-30')
  assert.equal(model.memberRequest.cautious, '2026-09-24')
  assert.equal(sessionStatus(sessionDate, '2026-10-01', model).tone, 'soon')
})

test('sessão ordinária usa também o prazo obrigatório da informação da Junta', () => {
  const sessionDate = '2026-11-05'
  const model = calculate(sessionDate, 'ordinaria')
  assert.equal(sessionStatus(sessionDate, '2026-10-31', model).tone, 'late')
})
