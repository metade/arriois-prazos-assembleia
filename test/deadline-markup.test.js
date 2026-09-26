import test from 'node:test'
import assert from 'node:assert/strict'
import { deadlineMarkup } from '../src/deadline-markup.js'
import { calculate } from '../src/rules.js'

test('obrigações com a mesma data aparecem em cartões separados', () => {
  const html = deadlineMarkup(calculate('2026-10-07', 'extraordinaria').dates)
  const day = html.match(/<section class="deadline-day"[^>]*>\s*<div class="day-heading"><time datetime="2026-10-02">[\s\S]*?<\/section>/)?.[0]
  assert.ok(day)
  assert.equal((day.match(/<article class="deadline">/g) || []).length, 4)
  for (const title of ['Expedir a convocatória', 'Enviar a ordem do dia e a documentação', 'Afixar o edital', 'Divulgar a sessão']) {
    assert.match(day, new RegExp(`<h3>${title}</h3>`))
  }
  assert.doesNotMatch(day, /<h3>Expedir a convocatória e enviar/)
})
