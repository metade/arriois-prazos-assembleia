import test from 'node:test'
import assert from 'node:assert/strict'
import { calculate, earliestSessionDate, STEP_IDS, DEFAULT_BUFFERS, carnivalAffects } from '../src/rules.js'
import { completionIssues, normalizeProgress, progressKey, readProgress, saveProgress } from '../src/progress.js'
import { planningWarnings } from '../src/planning-warnings.js'
import { sessionStatus } from '../src/session-status.js'
import { deadlineMarkup } from '../src/deadline-markup.js'
import { readUrlState, urlForState } from '../src/url-state.js'

const byId = (model, id) => model.dates.find(item => item.id === id)
const storage = () => {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
}

test('cada margem preserva todos os limites legais e as outras metas independentes', () => {
  for (const type of ['ordinaria', 'extraordinaria']) {
    const base = calculate('2026-11-25', type)
    for (const id of STEP_IDS) {
      for (const days of [0, 5]) {
        const model = calculate(base.sessionDate, type, { stepBuffers: { [id]: days } })
        for (const action of model.dates) assert.equal(action.legalDate, byId(base, action.id).legalDate)
        for (const action of base.dates.filter(item => ![id, 'handoff', 'receipt'].includes(item.id))) {
          assert.equal(byId(model, action.id).date, action.date)
        }
      }
    }
  }
})

test('margens cruzam feriados e anos sem alterar os limites; receção não precede expedição', () => {
  const model = calculate('2027-01-06', 'extraordinaria', { stepBuffers: { convocation: 2, documents: 5, receipt: 5 } })
  assert.equal(model.callDate, '2027-01-01')
  assert.equal(model.callDispatch.date, '2026-12-29')
  assert.equal(byId(model, 'documents').legalDate, '2026-12-31')
  assert.equal(byId(model, 'documents').date, '2026-12-23')
  assert.ok(byId(model, 'receipt').date >= model.callDispatch.date)
  assert.equal(byId(calculate('2026-06-22', 'ordinaria', { stepBuffers: { documents: 5 } }), 'documents').date, '2026-06-09')
})

test('margens altas respeitam janela extraordinária e assinalam limites', () => {
  const model = calculate('2026-10-07', 'extraordinaria', { stepBuffers: { convocation: 5, edict: 5, receipt: 5 } })
  assert.equal(model.callDispatch.date, '2026-09-28')
  assert.equal(byId(model, 'edict').date, '2026-09-28')
  assert.match(byId(model, 'convocation').bufferNote, /10 dias/)
  assert.ok(byId(model, 'receipt').date >= model.callDispatch.date)
  assert.ok(model.callInWindow)
  const laterEdict = calculate('2026-10-07', 'extraordinaria', { stepBuffers: { edict: 5 } })
  assert.equal(byId(laterEdict, 'handoff').baseDate, byId(laterEdict, 'edict').date)
})

test('sugestão automática satisfaz todas as metas e Carnaval inclui margens individuais', () => {
  const stepBuffers = Object.fromEntries(STEP_IDS.map(id => [id, 5]))
  for (const type of ['ordinaria', 'extraordinaria']) {
    const date = earliestSessionDate('2026-12-24', type, { stepBuffers, carnival: true, now: new Date('2026-12-24T18:00:00Z') })
    const model = calculate(date, type, { stepBuffers, carnival: true })
    assert.ok(model.dates.every(item => item.date >= '2026-12-24'))
    assert.ok(model.callDispatch.date > '2026-12-24')
    assert.ok(model.callInWindow)
  }
  assert.equal(carnivalAffects('2026-02-28', 'extraordinaria', { stepBuffers: { handoff: 0 } }), false)
  assert.equal(carnivalAffects('2026-02-28', 'ordinaria', { stepBuffers: { handoff: 0, activity: 5 } }), true)
})

test('URL restaura margens por etapa, mantém links antigos e ignora conclusões', () => {
  const stepBuffers = Object.fromEntries(STEP_IDS.map((id, index) => [id, index % 6]))
  const url = urlForState('https://example.org/?ref=abc#fontes', { date: '2026-11-25', type: 'ordinaria', stepBuffers })
  assert.deepEqual(readUrlState(url.search).stepBuffers, stepBuffers)
  assert.equal(url.hash, '#fontes')
  assert.equal(url.searchParams.get('ref'), 'abc')
  assert.equal(readUrlState('?buffer=5').stepBuffers.handoff, 5)
  for (const value of ['-1', '6', '2.5', '05', 'abc', '']) {
    assert.equal(readUrlState(`?buffer-documents=${value}`).stepBuffers.documents, 0)
  }
  assert.equal(readUrlState('?done-convocation=2026-10-02').progress, undefined)
  assert.deepEqual(readUrlState('').stepBuffers, DEFAULT_BUFFERS)
})

test('registos são locais e isolados por sessão; datas inválidas, desconhecidas e futuras são ignoradas', () => {
  const local = storage()
  const key = progressKey('2026-10-07', 'extraordinaria')
  assert.ok(saveProgress(local, key, { convocation: '2026-10-02', receipt: '2026-10-03' }))
  assert.deepEqual(readProgress(local, key, '2026-10-02').progress, { convocation: '2026-10-02' })
  assert.deepEqual(readProgress(local, progressKey('2026-10-07', 'ordinaria'), '2026-10-04').progress, {})
  assert.deepEqual(readProgress(local, progressKey('2026-10-08', 'extraordinaria'), '2026-10-04').progress, {})
  assert.deepEqual(normalizeProgress({ convocation: '2026-02-30', handoff: '<script>', unknown: '2026-01-01', documents: '2026-10-05' }, '2026-10-04'), {})
  local.setItem(key, 'broken json')
  assert.deepEqual(readProgress(local, key, '2026-10-02').progress, {})
  local.setItem(key, JSON.stringify({ version: 99, completed: { handoff: '2026-10-01' } }))
  assert.deepEqual(readProgress(local, key, '2026-10-02').progress, {})
  assert.equal(saveProgress(null, key, {}), false)
  assert.equal(readProgress(null, key, '2026-10-02').available, false)
  assert.ok(saveProgress(local, key, {}))
  assert.deepEqual(readProgress(local, key, '2026-10-02').progress, {})
})

test('conclusão de expedição retira aviso das 17h sem concluir receção', () => {
  const model = calculate('2026-10-07', 'extraordinaria', { bufferDays: 0 })
  const now = new Date('2026-10-02T16:00:00Z')
  assert.ok(planningWarnings(model, now).some(text => text.includes('protocolo')))
  const completed = { convocation: '2026-10-02' }
  assert.ok(!planningWarnings(model, now, completed).some(text => text.includes('protocolo')))
  assert.equal(completed.receipt, undefined)
  assert.match(deadlineMarkup(model.dates, { model, progress: completed, today: '2026-10-02' }), /id="done-receipt"[^>]*type="checkbox" \/>/)
})

test('estado avança para próximo ato pendente mas nunca apaga conclusões tardias', () => {
  const model = calculate('2026-11-25', 'ordinaria')
  const completed = { handoff: '2026-11-13', convocation: '2026-11-17', edict: '2026-11-17' }
  const status = sessionStatus(model.sessionDate, '2026-11-18', model, completed)
  assert.equal(status.tone, 'soon')
  assert.match(status.detail, /Entregar informação/)
  assert.doesNotMatch(status.detail, /Próxima ação pendente: Expedir/)
  completed.convocation = '2026-11-18'
  assert.equal(sessionStatus(model.sessionDate, '2026-11-18', model, completed).tone, 'late')
  assert.match(sessionStatus(model.sessionDate, '2026-11-18', model, completed).detail, /depois do limite legal/)
})

test('metas internas ultrapassadas não são atraso legal e completá-las retira lembretes', () => {
  const model = calculate('2026-11-25', 'ordinaria', { stepBuffers: { documents: 5 } })
  assert.notEqual(sessionStatus(model.sessionDate, '2026-11-16', model).tone, 'late')
  assert.ok(planningWarnings(model, new Date('2026-11-16T10:00:00Z')).some(text => text.includes('Preparação e logística')))
  assert.ok(!planningWarnings(model, new Date('2026-11-16T10:00:00Z'), { handoff: '2026-11-13' }).some(text => text.includes('Preparação e logística')))
})

test('conclusões respeitam limites reais e janela, não confundem margem com lei', () => {
  const model = calculate('2026-10-07', 'extraordinaria', { stepBuffers: { convocation: 5 } })
  assert.deepEqual(completionIssues(byId(model, 'convocation'), '2026-10-02', model), [])
  assert.ok(completionIssues(byId(model, 'convocation'), '2026-09-26', model).some(text => text.includes('10 dias')))
  assert.ok(completionIssues(byId(model, 'convocation'), '2026-10-03', model).some(text => text.includes('limite legal')))
  assert.ok(completionIssues(byId(model, 'receipt'), '2026-10-01', model, { convocation: '2026-10-02' }).some(text => text.includes('antes da expedição')))
  assert.ok(completionIssues(byId(model, 'receipt'), '2026-10-01', model, {}).some(text => text.includes('sem data de expedição')))
  const initiated = calculate('2026-10-07', 'extraordinaria', { initiativeDate: '2026-09-25' })
  assert.ok(completionIssues(byId(initiated, 'convocation'), '2026-10-02', initiated).some(text => text.includes('iniciativa')))
  const weekend = calculate('2026-11-05', 'ordinaria')
  assert.equal(byId(weekend, 'activity').date, '2026-10-30')
  assert.equal(byId(weekend, 'activity').legalDate, '2026-10-31')
  assert.deepEqual(completionIssues(byId(weekend, 'activity'), '2026-10-31', weekend), [])
})

test('todas as obrigações registadas mantém próximas etapas internas; todas concluídas não certifica legalidade', () => {
  const model = calculate('2026-10-07', 'extraordinaria')
  const completed = Object.fromEntries(model.dates.filter(item => item.id !== 'receipt').map(item => [item.id, item.date]))
  const receiptPending = sessionStatus(model.sessionDate, '2026-10-07', model, completed)
  assert.equal(receiptPending.tone, 'good')
  assert.match(receiptPending.detail, /Confirmar a receção/)
  completed.receipt = '2026-10-06'
  assert.match(sessionStatus(model.sessionDate, '2026-10-07', model, completed).detail, /não certificam a validade/)
  delete completed.convocation
  assert.equal(sessionStatus(model.sessionDate, '2026-10-07', model, completed).tone, 'late')
})
