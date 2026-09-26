import { parseDate } from './dates.js'

function validDate(value) {
  if (!value) return ''
  try { parseDate(value); return value } catch { return '' }
}

export function readUrlState(search) {
  const params = new URLSearchParams(search)
  return {
    date: validDate(params.get('date')),
    type: params.get('type') === 'ordinaria' ? 'ordinaria' : 'extraordinaria',
    carnival: params.get('carnival') === '1',
    initiativeDate: validDate(params.get('initiative'))
  }
}

export function urlForState(href, state) {
  const url = new URL(href)
  if (state.date) url.searchParams.set('date', state.date)
  else url.searchParams.delete('date')
  url.searchParams.set('type', state.type)
  if (state.carnival) url.searchParams.set('carnival', '1')
  else url.searchParams.delete('carnival')
  if (state.initiativeDate) url.searchParams.set('initiative', state.initiativeDate)
  else url.searchParams.delete('initiative')
  return url
}
