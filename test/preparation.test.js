import test from 'node:test'
import assert from 'node:assert/strict'
import { calculate, carnivalAffects, earliestSessionDate } from '../src/rules.js'
import { postalCutoffReached } from '../src/dates.js'
import { planningWarnings } from '../src/planning-warnings.js'
import { sessionStatus } from '../src/session-status.js'
import { deadlineMarkup } from '../src/deadline-markup.js'

const preparation = model => model.dates.find(item => item.id === 'handoff')

test('margens 0 a 5 só mudam a preparação, preservam limites legais e cruzam feriados e ano', () => {
  const expected = ['2026-12-31', '2026-12-30', '2026-12-29', '2026-12-28', '2026-12-24', '2026-12-23']
  const base = calculate('2027-01-06', 'extraordinaria')
  for (let bufferDays = 0; bufferDays <= 5; bufferDays++) {
    const model = calculate('2027-01-06', 'extraordinaria', { bufferDays })
    assert.equal(preparation(model).date, expected[bufferDays])
    assert.equal(model.callDate, '2027-01-01')
    assert.deepEqual(model.dates.filter(x => x.id !== 'handoff'), base.dates.filter(x => x.id !== 'handoff'))
  }
  assert.equal(preparation(calculate('2026-06-22', 'extraordinaria', { bufferDays: 5 })).date, '2026-06-09')
  for (const bufferDays of [-1, 6, 2.5, '5', NaN]) assert.equal(calculate('2027-01-06', 'extraordinaria', { bufferDays }).bufferDays, 2)
})

test('Carnaval pode afetar apenas a margem de preparação', () => {
  assert.equal(carnivalAffects('2026-02-28', 'extraordinaria', { bufferDays: 0 }), false)
  assert.equal(carnivalAffects('2026-02-28', 'extraordinaria', { bufferDays: 5 }), true)
  assert.equal(preparation(calculate('2026-02-28', 'extraordinaria', { bufferDays: 5 })).date, '2026-02-16')
  assert.equal(preparation(calculate('2026-02-28', 'extraordinaria', { bufferDays: 5, carnival: true })).date, '2026-02-13')
})

test('sugestão automática respeita a margem e a janela extraordinária', () => {
  for (const type of ['ordinaria', 'extraordinaria']) {
    for (const today of ['2026-02-16', '2026-06-09', '2026-12-24']) {
      for (const bufferDays of [0, 2, 5]) {
        const date = earliestSessionDate(today, type, { bufferDays, carnival: true })
        const model = calculate(date, type, { bufferDays, carnival: true })
        assert.ok(preparation(model).date >= today)
        assert.ok(model.callInWindow)
        assert.ok(model.dates.filter(x => x.nature === 'Obrigatório').every(x => x.date >= today))
      }
    }
  }
})

test('17h00 de Lisboa inclui verão e inverno e muda apenas a sugestão automática', () => {
  for (const [today, before, after, session] of [
    ['2026-10-02', '2026-10-02T15:59:59Z', '2026-10-02T16:00:00Z', '2026-10-07'],
    ['2026-12-30', '2026-12-30T16:59:59Z', '2026-12-30T17:00:00Z', '2027-01-04']
  ]) {
    assert.equal(postalCutoffReached(new Date(before)), false)
    assert.equal(postalCutoffReached(new Date(after)), true)
    assert.equal(earliestSessionDate(today, 'extraordinaria', { bufferDays: 0, now: new Date(before) }), session)
    const suggested = calculate(earliestSessionDate(today, 'extraordinaria', { bufferDays: 0, now: new Date(after) }), 'extraordinaria', { bufferDays: 0 })
    assert.ok(suggested.callDispatch.date > today)
    assert.ok(suggested.callInWindow)
    const manual = calculate(session, 'extraordinaria', { bufferDays: 0 })
    assert.equal(manual.sessionDate, session)
    assert.ok(planningWarnings(manual, new Date(after)).some(x => x.includes('protocolo')))
    assert.ok(!planningWarnings(manual, new Date(before)).some(x => x.includes('protocolo')))
    assert.equal(sessionStatus(session, today, manual).tone, 'soon')
  }
})

test('avisos internos não classificam a sessão como atrasada', () => {
  for (const bufferDays of [0, 1, 2, 5]) {
    const model = calculate('2026-10-07', 'extraordinaria', { bufferDays })
    assert.equal(planningWarnings(model, new Date('2026-09-24T10:00:00Z')).some(x => x.includes('Margem reduzida')), bufferDays < 2)
    assert.equal(sessionStatus(model.sessionDate, '2026-10-01', model).tone, 'soon')
  }
})

test('cartões incluem tarefas, assinatura e limite postal', () => {
  const html = deadlineMarkup(calculate('2026-10-07', 'extraordinaria').dates)
  assert.match(html, /Preparação e logística/)
  assert.equal((html.match(/<li>/g) || []).length, 5)
  assert.match(html, /assinatura do presidente da Mesa antes de enviar/)
  assert.match(html, /Expedição pelos CTT: antes das 17h00/)
})
