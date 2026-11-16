import test from 'node:test'
import assert from 'node:assert/strict'
import { deadlineMarkup } from '../src/deadline-markup.js'
import { calculate } from '../src/rules.js'

const cardOrder = html => [...html.matchAll(/data-step="([^"]+)"/g)].map(match => match[1])

test('obrigações coincidentes continuam distintas e com meta visível em cada cartão', () => {
  const html = deadlineMarkup(calculate('2026-10-07', 'extraordinaria').dates)
  for (const id of ['convocation', 'documents', 'edict', 'publicity']) {
    const card = html.match(new RegExp(`<article[^>]+data-step="${id}"[\\s\\S]*?<\\/article>`))?.[0]
    assert.ok(card)
    assert.match(card, /<time datetime="2026-10-01">1 de outubro de 2026<\/time>/)
    assert.match(card, /Meta planeada · até/)
  }
  assert.doesNotMatch(html, /deadline-day|day-heading/)
})

test('cartões não mudam de posição ao antecipar datas e não alteram a ordenação do modelo', () => {
  const base = calculate('2026-11-25', 'ordinaria')
  const changed = calculate('2026-11-25', 'ordinaria', { stepBuffers: { documents: 5, publicity: 5, edict: 5 } })
  const before = changed.dates.map(item => item.id)
  const expected = ['handoff', 'activity', 'convocation', 'edict', 'documents', 'publicity', 'receipt', 'paod']
  assert.deepEqual(cardOrder(deadlineMarkup(base.dates)), expected)
  assert.deepEqual(cardOrder(deadlineMarkup(changed.dates)), expected)
  assert.deepEqual(changed.dates.map(item => item.id), before)
  assert.notEqual(base.dates.find(item => item.id === 'documents').date, changed.dates.find(item => item.id === 'documents').date)
})
