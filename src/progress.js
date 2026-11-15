import { longDate, parseDate } from './dates.js'
import { STEP_IDS } from './rules.js'

export function progressKey(sessionDate, type) {
  parseDate(sessionDate)
  if (!['ordinaria', 'extraordinaria'].includes(type)) throw new Error('Tipo de sessão inválido')
  return `arroios:progress:v1:${type}:${sessionDate}`
}

export function normalizeProgress(value, today) {
  const progress = {}
  for (const id of STEP_IDS) {
    const date = value?.[id]
    try {
      parseDate(date)
      if (date <= today) progress[id] = date
    } catch { /* Invalid or future completion dates are never treated as done. */ }
  }
  return progress
}

export function readProgress(storage, key, today) {
  try {
    const raw = storage.getItem(key)
    if (!raw) return { progress: {}, available: true }
    const saved = JSON.parse(raw)
    return { progress: saved?.version === 1 ? normalizeProgress(saved.completed, today) : {}, available: true }
  } catch {
    return { progress: {}, available: false }
  }
}

export function saveProgress(storage, key, progress) {
  try {
    storage.setItem(key, JSON.stringify({ version: 1, completed: progress }))
    return true
  } catch { return false }
}

// Dates are self-reported. These checks flag timing for review, not legal validity.
export function completionIssues(item, completedOn, model, progress = {}) {
  if (!completedOn) return []
  const issues = []
  if (item.legalDate && completedOn > item.legalDate) issues.push(`Conclusão registada depois do limite legal de ${longDate(item.legalDate)}; confirmar os factos e os prazos.`)
  if (['convocation', 'edict'].includes(item.id) && model.type === 'extraordinaria' &&
    parseDate(model.sessionDate) - parseDate(completedOn) > 10) {
    issues.push('Conclusão registada mais de 10 dias antes da sessão extraordinária; rever a janela de convocação.')
  }
  if (['convocation', 'edict'].includes(item.id) && model.initiative &&
    (completedOn < model.initiative.date || completedOn > model.initiative.latestCall)) {
    issues.push('Data de convocação fora do intervalo contado da iniciativa ou receção do requerimento; confirmar os factos.')
  }
  if (item.id === 'receipt') {
    if (!progress.convocation) issues.push('Receção registada sem data de expedição; confirme também esse registo.')
    else if (completedOn < progress.convocation) issues.push('Receção registada antes da expedição; reveja as datas.')
    if (completedOn > model.sessionDate) issues.push('Receção registada depois da sessão; confirmar os factos e a antecedência.')
  }
  return issues
}
