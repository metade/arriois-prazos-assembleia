import test from 'node:test'
import assert from 'node:assert/strict'
import { daysBefore, fullDaysBefore, parseDate } from '../src/dates.js'
import { fullWorkingDaysBefore } from '../src/holidays.js'
import { calculate, earliestSessionDate } from '../src/rules.js'
import { deadlineMarkup } from '../src/deadline-markup.js'
import { planningWarnings } from '../src/planning-warnings.js'
import { completionIssues } from '../src/progress.js'
import { readUrlState } from '../src/url-state.js'

const action = (model, id) => model.dates.find(item => item.id === id)

test('23 novembro: cinco dias pelo meio, não sete datas inclusivas nem trânsito postal', () => {
  const model = calculate('2026-11-23', 'extraordinaria')
  assert.equal(model.callDate, '2026-11-18') // Existing legal reference stays separate.
  assert.equal(model.callPlanningDate, '2026-11-17')
  assert.equal(action(model, 'convocation').date, '2026-11-17')
  assert.equal(action(model, 'edict').date, '2026-11-17')
  const between = []
  for (let date = daysBefore(model.callDispatch.date, -1); date < model.sessionDate; date = daysBefore(date, -1)) between.push(date)
  assert.deepEqual(between, ['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'])
  assert.equal(action(model, 'handoff').date, '2026-11-13')
  assert.equal(action(model, 'documents').legalDate, '2026-11-18')
  assert.equal(action(model, 'documents').date, '2026-11-18') // Thu 19 + Fri 20.
  assert.equal(action(model, 'publicity').date, '2026-11-18')
})

test('ordinária: oito dias completos, incluindo fins de semana', () => {
  const model = calculate('2026-11-25', 'ordinaria')
  assert.equal(model.callDate, '2026-11-17')
  assert.equal(model.callPlanningDate, '2026-11-16')
  assert.equal(action(model, 'convocation').date, '2026-11-16') // 17–24 inclusive.
  assert.equal(action(model, 'handoff').date, '2026-11-12')
  assert.equal(action(model, 'documents').date, '2026-11-20') // Mon 23 + Tue 24.
  assert.equal(action(model, 'activity').date, '2026-11-20') // Own rule stays unchanged.
})

test('dois dias úteis completos: exemplo oficial de quarta-feira e transição de ano', () => {
  assert.equal(fullWorkingDaysBefore('2026-11-25', 2).date, '2026-11-20')
  assert.equal(fullWorkingDaysBefore('2026-10-07', 2).date, '2026-10-01') // Fri 2 + Tue 6; Mon 5 holiday.
  assert.equal(fullWorkingDaysBefore('2027-01-04', 2).date, '2026-12-29') // Wed 30 + Thu 31.
  assert.equal(fullWorkingDaysBefore('2026-02-19', 2, true).date, '2026-02-13') // Mon 16 + Wed 18.
  assert.equal(fullDaysBefore('2027-01-04', 5), '2026-12-29')
})

test('margem adicional é aplicada depois dos dias completos, sem alterar limites', () => {
  const base = calculate('2026-11-23', 'extraordinaria')
  const expected = ['2026-11-17', '2026-11-16', '2026-11-13', '2026-11-13', '2026-11-13', '2026-11-13']
  for (let buffer = 0; buffer <= 5; buffer++) {
    const state = readUrlState(`?date=2026-11-23&type=extraordinaria&buffer-convocation=${buffer}`)
    const model = calculate(state.date, state.type, { stepBuffers: state.stepBuffers })
    const call = action(model, 'convocation')
    assert.equal(call.date, expected[buffer])
    assert.equal(call.legalDate, action(base, 'convocation').legalDate)
    assert.ok(parseDate(model.sessionDate) - parseDate(call.date) - 1 >= 5)
    assert.ok(parseDate(model.sessionDate) - parseDate(call.date) <= 10)
    assert.equal(model.sessionDate, base.sessionDate)
  }
})

test('meta cautelosa ultrapassada mantém aviso interno e não inventa atraso legal', () => {
  const model = calculate('2026-11-23', 'extraordinaria')
  const call = action(model, 'convocation')
  assert.deepEqual(completionIssues(call, '2026-11-18', model), [])
  assert.ok(planningWarnings(model, new Date('2026-11-18T10:00:00Z')).some(text => text.includes('metas internas')))
  assert.ok(completionIssues(action(model, 'documents'), '2026-11-19', model).some(text => text.includes('limite legal')))
  const html = deadlineMarkup(model.dates, { today: '2026-11-16', model })
  assert.match(html, /5 dias de calendário completos entre a expedição e a sessão/)
  assert.match(html, /0 dias úteis de margem adicional/)
  assert.match(html, /Contagem de planeamento cauteloso/)
})

test('17h00 afeta o envio previsto hoje; não o envio daqui a duas semanas', () => {
  const model = calculate('2026-11-23', 'extraordinaria', { bufferDays: 0 })
  assert.ok(!planningWarnings(model, new Date('2026-11-03T18:00:00Z')).some(text => text.includes('protocolo')))
  assert.ok(!planningWarnings(model, new Date('2026-11-17T16:59:59Z')).some(text => text.includes('protocolo')))
  assert.ok(planningWarnings(model, new Date('2026-11-17T17:00:00Z')).some(text => text.includes('protocolo')))
  assert.equal(earliestSessionDate('2026-11-17', 'extraordinaria', { bufferDays: 0, now: new Date('2026-11-17T16:59:59Z') }), '2026-11-23')
  assert.equal(earliestSessionDate('2026-11-17', 'extraordinaria', { bufferDays: 0, now: new Date('2026-11-17T17:00:00Z') }), '2026-11-24')
  assert.equal(model.sessionDate, '2026-11-23')
})
