import { calculate } from './rules.js'
import { parseDate } from './dates.js'
import { workingDaysBefore } from './holidays.js'

// Reuse the calendar's existing limits and dependencies for the date control.
// Several requested buffers can map to one date when a window limits the target.
export function targetOptions(model, id) {
  const options = new Map()
  for (let bufferDays = 0; bufferDays <= 5; bufferDays++) {
    const calendar = calculate(model.sessionDate, model.type, {
      carnival: model.carnival, initiativeDate: model.initiative?.date || '',
      stepBuffers: { ...model.stepBuffers, [id]: bufferDays }
    })
    const item = calendar.dates.find(item => item.id === id)
    if (item && !options.has(item.date)) options.set(item.date, { date: item.date, bufferDays })
  }
  return [...options.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function effectiveBufferDays(item, carnival) {
  // Display the margin actually obtained, including any window restriction.
  for (let days = 0; days <= 5; days++) {
    if (workingDaysBefore(item.baseDate, days, carnival).date === item.date) return days
  }
  return Math.max(0, parseDate(item.baseDate) - parseDate(item.date))
}
