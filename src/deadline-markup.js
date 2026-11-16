import { longDate } from './dates.js'
import { effectiveBufferDays, targetOptions } from './target-options.js'
import { completionIssues, normalizeProgress } from './progress.js'

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

function plannedDue(item) {
  return `<p class="planned-due"><span>Meta planeada · até</span><time datetime="${item.date}">${longDate(item.date)}</time></p>`
}

function stepControls(item, completedOn, today, model) {
  const options = targetOptions(model, item.id)
  const index = options.findIndex(option => option.date === item.date)
  const earlier = options[index - 1]
  const later = options[index + 1]
  const days = effectiveBufferDays(item, model.carnival)
  return `<div class="step-footer">${plannedDue(item)}<div class="step-controls${completedOn ? ' step-controls--done' : ''}">
    <div class="step-target"><label class="${completedOn ? '' : 'sr-only'}" for="target-${item.id}">${completedOn ? 'Concluído em' : 'Meta planeada'}</label><div class="target-date-control">
      <button id="earlier-${item.id}" type="button" data-target-step="${item.id}" data-target-buffer="${earlier?.bufferDays ?? ''}" aria-label="Antecipar a meta: ${item.title}" title="Antecipar a meta"${earlier && !completedOn ? '' : ' disabled'}${completedOn ? ' aria-hidden="true"' : ''}>‹</button>
      <input id="target-${item.id}" ${completedOn ? `data-completed="${item.id}"` : `data-target="${item.id}"`} type="date" value="${completedOn || item.date}" ${completedOn ? `max="${today}"` : `min="${options[0].date}" max="${options.at(-1).date}"`} aria-describedby="target-note-${item.id}" />
      <button id="later-${item.id}" type="button" data-target-step="${item.id}" data-target-buffer="${later?.bufferDays ?? ''}" aria-label="Adiar a meta: ${item.title}" title="Adiar a meta"${later && !completedOn ? '' : ' disabled'}${completedOn ? ' aria-hidden="true"' : ''}>›</button>
    </div><small id="target-note-${item.id}">${completedOn ? `Meta planeada: ${longDate(item.date)}.` : `${days} ${days === 1 ? 'dia útil' : 'dias úteis'} de margem${['convocation', 'edict', 'documents', 'publicity'].includes(item.id) ? ' adicional' : ''}${item.id === 'handoff' ? ' antes da expedição ou afixação' : ''}.`}</small></div>
    <div class="step-completion"><label class="check" for="done-${item.id}"><input id="done-${item.id}" data-done="${item.id}" type="checkbox"${completedOn ? ' checked' : ''} /><span>Concluído</span></label></div>
  </div>${item.countingNote ? `<p class="counting-note">${item.countingNote}</p>` : ''}</div>`

}

export function deadlineMarkup(items, { progress = {}, today = '', model = null } = {}) {
  progress = normalizeProgress(progress, today)
  const order = ['handoff', 'activity', 'convocation', 'edict', 'documents', 'publicity', 'receipt', 'paod']
  const ordered = [...items].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
  return `<div class="deadline-list">${ordered.map(item => {
        const done = progress[item.id]
        const issues = model ? completionIssues(item, done, model, progress) : []
        return `<article class="deadline${done ? ' deadline--done' : ''}" data-step="${item.id}" aria-labelledby="step-title-${item.id}">
        <div class="deadline-heading">${item.phase ? `<span class="phase-number" aria-label="Etapa ${item.phase}">${item.phase}</span>` : ''}<div class="deadline-title"><h3 id="step-title-${item.id}">${item.title}</h3></div></div>
        <div class="requirement"><p class="route">${item.route}</p><p>${item.detail}</p><p class="step-limit">${item.legalDate ? `<strong>Limite legal: ${longDate(item.legalDate)}.</strong> ` : item.preferenceDate ? `Preferência regimental: ${longDate(item.preferenceDate)}, à hora da sessão. ` : 'Planeamento interno · sem prazo legal. '}${item.id !== 'handoff' ? `Referência para a margem: ${longDate(item.baseDate)}.` : `Referência: primeira meta de expedição ou afixação em ${longDate(item.baseDate)}.`}</p>${item.bufferNote ? `<p class="holiday">${item.bufferNote}</p>` : ''}${done && done > item.date ? '<p class="completion-record">Concluído depois da meta planeada.</p>' : ''}${issues.map(issue => `<p class="completion-issue">${issue}</p>`).join('')}${item.tasks ? `<ul class="preparation-tasks">${item.tasks.map(task => `<li><strong>${task.route}:</strong> ${task.detail}</li>`).join('')}</ul>` : ''}${item.cutoff ? `<p class="postal-cutoff"><strong>${item.cutoff}</strong> · hora de Lisboa; limite de planeamento.</p>` : ''}<p class="source">${sourceMarkup(item.source)}</p>${holidayMarkup(item.holidays)}${today && model ? stepControls(item, done, today, model) : `<div class="step-footer">${plannedDue(item)}${item.countingNote ? `<p class="counting-note">${item.countingNote}</p>` : ''}</div>`}</div>
        <span class="badge ${item.nature === 'Obrigatório' ? '' : 'soft'}">${item.nature}</span>
      </article>`}).join('')}</div>`
}
