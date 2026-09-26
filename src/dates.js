// Calendar dates are YYYY-MM-DD values. UTC arithmetic is used only as a stable
// Gregorian day counter; no timestamp is interpreted in the browser's timezone.
const DAY = 86400000

export function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Data inválida')
  const [year, month, day] = value.split('-').map(Number)
  const count = Math.floor(Date.UTC(year, month - 1, day) / DAY)
  if (formatDate(count) !== value) throw new Error('Data inválida')
  return count
}

export function formatDate(count) {
  return new Date(count * DAY).toISOString().slice(0, 10)
}

export function parts(count) {
  const date = new Date(count * DAY)
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), weekday: date.getUTCDay() }
}

export function daysBefore(value, amount) {
  return formatDate(parseDate(value) - amount)
}

export function todayInLisbon(now = new Date()) {
  // Only "today" needs a real instant. Convert it to Lisbon's calendar date
  // before doing any deadline arithmetic, including around midnight and DST.
  const fields = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now).map(({ type, value }) => [type, value]))
  return `${fields.year}-${fields.month}-${fields.day}`
}

export function longDate(value) {
  const { year, month, day } = parts(parseDate(value))
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  return `${day} de ${months[month - 1]} de ${year}`
}

export function shortMonth(value) {
  const { month } = parts(parseDate(value))
  return ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][month - 1]
}
