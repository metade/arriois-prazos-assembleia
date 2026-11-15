import { normalizeStepBuffers, STEP_IDS } from './rules.js'
import { parseDate } from './dates.js'

function validDate(value) {
  if (!value) return ''
  try { parseDate(value); return value } catch { return '' }
}

export function readUrlState(search) {
  const params = new URLSearchParams(search)
  const bufferDays = /^[0-5]$/.test(params.get('buffer') ?? '') ? Number(params.get('buffer')) : 2
  const stepBuffers = normalizeStepBuffers(Object.fromEntries(STEP_IDS.filter(id => id !== 'handoff').map(id => {
    const value = params.get(`buffer-${id}`)
    return [id, /^[0-5]$/.test(value ?? '') ? Number(value) : 0]
  })), bufferDays)
  return {
    date: validDate(params.get('date')),
    type: params.get('type') === 'ordinaria' ? 'ordinaria' : 'extraordinaria',
    bufferDays, stepBuffers,
    carnival: params.get('carnival') === '1',
    initiativeDate: validDate(params.get('initiative'))
  }
}

export function urlForState(href, state) {
  const url = new URL(href)
  if (state.date) url.searchParams.set('date', state.date)
  else url.searchParams.delete('date')
  url.searchParams.set('type', state.type)
  const buffers = normalizeStepBuffers(state.stepBuffers, state.bufferDays)
  url.searchParams.set('buffer', buffers.handoff)
  for (const id of STEP_IDS.filter(id => id !== 'handoff')) {
    if (buffers[id]) url.searchParams.set(`buffer-${id}`, buffers[id])
    else url.searchParams.delete(`buffer-${id}`)
  }
  if (state.carnival) url.searchParams.set('carnival', '1')
  else url.searchParams.delete('carnival')
  if (state.initiativeDate) url.searchParams.set('initiative', state.initiativeDate)
  else url.searchParams.delete('initiative')
  return url
}
