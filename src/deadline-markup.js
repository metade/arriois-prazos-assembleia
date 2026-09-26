import { longDate } from './dates.js'

function sourceMarkup(source) {
  const sources = Array.isArray(source) ? source : [source]
  return sources.map(item => item.url ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.label}</a>` : `<span>${item.label}</span>`).join(' <span aria-hidden="true">·</span> ')
}

function holidayMarkup(holidays = []) {
  if (!holidays.length) return ''
  const unique = [...new Map(holidays.map(item => [item.date, item])).values()]
  return `<p class="holiday">Na contagem: ${unique.map(item => `${item.name} (${longDate(item.date)})`).join('; ')}.</p>`
}

export { sourceMarkup, holidayMarkup }

export function deadlineMarkup(items) {
  const groups = new Map()
  for (const item of items) {
    if (!groups.has(item.date)) groups.set(item.date, [])
    groups.get(item.date).push(item)
  }
  return [...groups].map(([date, dayItems]) => {
    const holidays = dayItems.flatMap(item => item.holidays || [])
    const prefix = dayItems.every(item => item.nature === 'Sugestão interna') ? 'Meta interna · até'
      : dayItems.every(item => item.nature === 'Preferencial') ? 'Preferencialmente até' : 'Até'
    return `<section class="deadline-day" aria-label="${prefix} ${longDate(date)}">
      <div class="day-heading"><time datetime="${date}"><span>${prefix}</span> ${longDate(date)}</time></div>
      <div class="day-actions">${dayItems.map(item => `<article class="deadline">
        <div class="deadline-heading">${item.phase ? `<span class="phase-number" aria-label="Etapa ${item.phase}">${item.phase}</span>` : ''}<h3>${item.title}</h3></div>
        <div class="requirement"><p class="route">${item.route}</p><p>${item.detail}</p><p class="source">${sourceMarkup(item.source)}</p></div>
        <span class="badge ${item.nature === 'Obrigatório' ? '' : 'soft'}">${item.nature}</span>
      </article>`).join('')}</div>
      ${holidayMarkup(holidays)}
    </section>`
  }).join('')
}
