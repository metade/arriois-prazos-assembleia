import test from 'node:test'
import assert from 'node:assert/strict'
import { easter, holidays, latestWorkingDate, workingDaysBefore } from '../src/holidays.js'
import { calculate, earliestSessionDate } from '../src/rules.js'
import { todayInLisbon } from '../src/dates.js'

test('feriados móveis em vários anos', () => {
  assert.equal(easter(2026), '2026-04-05')
  assert.equal(easter(2027), '2027-03-28')
  assert.equal(holidays(2026).get('2026-04-03'), 'Sexta-feira Santa')
  assert.equal(holidays(2026).get('2026-06-04'), 'Corpo de Deus')
  assert.equal(holidays(2027).get('2027-03-26'), 'Sexta-feira Santa')
  assert.equal(holidays(2027).get('2027-05-27'), 'Corpo de Deus')
})

test('5 de outubro de 2026 altera o recuo de dois dias úteis', () => {
  assert.deepEqual(workingDaysBefore('2026-10-07', 2), {
    date: '2026-10-02', holidays: [{ date: '2026-10-05', name: 'Implantação da República' }]
  })
})

test('13 de junho em Lisboa e Carnaval facultativo', () => {
  assert.equal(workingDaysBefore('2025-06-17', 2).date, '2025-06-12')
  assert.equal(workingDaysBefore('2025-06-17', 2).holidays[0].name, 'Santo António · feriado municipal de Lisboa')
  assert.equal(workingDaysBefore('2026-02-19', 2).date, '2026-02-17')
  assert.equal(workingDaysBefore('2026-02-19', 2, true).date, '2026-02-16')
})

test('contagem cruza o ano e usa os feriados de ambos os anos', () => {
  assert.equal(workingDaysBefore('2027-01-04', 2).date, '2026-12-30')
  assert.equal(workingDaysBefore('2027-01-04', 2).holidays[0].date, '2027-01-01')
})

test('sessão extraordinária de 7 de outubro de 2026', () => {
  const result = calculate('2026-10-07', 'extraordinaria')
  assert.equal(result.callDate, '2026-10-02')
  assert.equal(result.dates.find(x => x.id === 'documents').date, '2026-10-02')
  assert.equal(result.dates.find(x => x.id === 'publicity').date, '2026-10-02')
  assert.equal(result.memberRequest.national.date, '2026-09-24')
  assert.equal(result.memberRequest.local.date, '2026-09-29')
  assert.equal(result.memberRequest.cautious, '2026-09-24')
  assert.ok(!result.dates.some(x => x.id === 'activity'))
  assert.equal(result.initiative, null)
})

test('sessão ordinária tem convocação, informação da Junta e conflito próprios', () => {
  const result = calculate('2026-10-07', 'ordinaria')
  assert.equal(result.callDate, '2026-09-29')
  assert.equal(result.dates.find(x => x.id === 'activity').date, '2026-10-02')
  assert.equal(result.memberRequest.national.date, '2026-09-29')
  assert.equal(result.memberRequest.local.date, '2026-09-24')
  assert.equal(result.memberRequest.cautious, '2026-09-24')
})

test('prazo ligado à iniciativa só é calculado quando a data é fornecida', () => {
  assert.equal(calculate('2026-10-07', 'extraordinaria', { initiativeDate: '2026-09-28' }).initiative.latestCall, '2026-10-03')
})

test('PAOD distingue as 24 horas da meta interna de envio', () => {
  const weekday = calculate('2026-10-07', 'extraordinaria').dates.find(x => x.id === 'paod')
  assert.equal(weekday.date, '2026-10-06')
  assert.match(weekday.detail, /24 horas antes, à mesma hora da sessão/)
  assert.match(weekday.detail, /17h00/)
  const saturday = calculate('2026-10-10', 'extraordinaria').dates.find(x => x.id === 'paod')
  assert.equal(saturday.date, '2026-10-09')
  assert.match(saturday.detail, /12h00 na véspera de sábado/)
  assert.match(saturday.detail, /às 12h00 ou depois/)
})

test('a data atual usa o calendário de Lisboa mesmo perto da meia-noite', () => {
  assert.equal(todayInLisbon(new Date('2026-09-26T23:30:00Z')), '2026-09-27')
  assert.equal(todayInLisbon(new Date('2026-12-31T23:30:00Z')), '2026-12-31')
})

test('data inicial é a primeira que permite os prazos obrigatórios', () => {
  assert.equal(earliestSessionDate('2026-09-26', 'extraordinaria'), '2026-10-03')
  assert.equal(earliestSessionDate('2026-10-02', 'extraordinaria'), '2026-10-07')
  assert.equal(earliestSessionDate('2026-09-26', 'ordinaria'), '2026-11-01')
  const date = earliestSessionDate('2026-04-01', 'extraordinaria')
  const result = calculate(date, 'extraordinaria')
  assert.ok(result.callDispatch.date >= '2026-04-01')
  assert.ok(result.dispatch.date >= '2026-04-01')
})

test('afixação e expedição passam para dia útil anterior sem mudar o limite legal', () => {
  assert.equal(latestWorkingDate('2026-09-26').date, '2026-09-25')
  const saturdayLimit = calculate('2026-10-01', 'extraordinaria')
  assert.equal(saturdayLimit.callDate, '2026-09-26')
  assert.equal(saturdayLimit.callDispatch.date, '2026-09-25')
  assert.match(saturdayLimit.dates.find(x => x.id === 'convocation').detail, /antecipada/)
  const holidayLimit = calculate('2026-10-10', 'extraordinaria')
  assert.equal(holidayLimit.callDate, '2026-10-05')
  assert.equal(holidayLimit.callDispatch.date, '2026-10-02')
  assert.equal(holidayLimit.dates.find(x => x.id === 'convocation').holidays[0].name, 'Implantação da República')
  const ordinary = calculate('2026-11-05', 'ordinaria')
  assert.equal(ordinary.dates.find(x => x.id === 'activity').date, '2026-10-30')
})
