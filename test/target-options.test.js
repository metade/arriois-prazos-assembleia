import test from 'node:test'
import assert from 'node:assert/strict'
import { calculate } from '../src/rules.js'
import { targetOptions, effectiveBufferDays } from '../src/target-options.js'

test('datas ajustáveis usam o calendário existente e saltam feriados e fins de semana', () => {
  const model = calculate('2027-01-06', 'extraordinaria')
  assert.deepEqual(targetOptions(model, 'documents').map(item => item.date), [
    '2026-12-23', '2026-12-24', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31'
  ])
  for (const option of targetOptions(model, 'documents')) {
    const changed = calculate(model.sessionDate, model.type, { stepBuffers: { documents: option.bufferDays } })
    const item = changed.dates.find(item => item.id === 'documents')
    assert.equal(item.date, option.date)
    assert.equal(item.legalDate, '2026-12-31')
    assert.equal(effectiveBufferDays(item, model.carnival), option.bufferDays)
  }
})

test('restrições da janela não criam botões sem efeito e a margem mostrada é a efetiva', () => {
  const model = calculate('2026-10-07', 'extraordinaria', { stepBuffers: { convocation: 5 } })
  const options = targetOptions(model, 'convocation')
  assert.equal(new Set(options.map(option => option.date)).size, options.length)
  assert.equal(options[0].date, '2026-09-28')
  const item = model.dates.find(item => item.id === 'convocation')
  assert.equal(effectiveBufferDays(item, false), 3)
  assert.equal(options.findIndex(option => option.date === item.date), 0)
  assert.equal(options.at(-1).bufferDays, 0)
})

test('datas de receção nunca precedem a expedição e preparação acompanha afixação', () => {
  const model = calculate('2026-10-07', 'extraordinaria', { stepBuffers: { edict: 5 } })
  assert.ok(targetOptions(model, 'receipt').every(option => option.date >= model.callDispatch.date))
  const handoff = model.dates.find(item => item.id === 'handoff')
  assert.equal(targetOptions(model, 'handoff').at(-1).date, handoff.baseDate)
})
