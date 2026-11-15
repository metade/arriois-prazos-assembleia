import { longDate, postalCutoffReached, todayInLisbon } from './dates.js'
import { normalizeProgress } from './progress.js'

export function planningWarnings(model, now, completed = {}) {
  const today = todayInLisbon(now)
  const progress = normalizeProgress(completed, today)
  const warnings = []
  if (!progress.handoff && model.bufferDays < 2) warnings.push('Margem reduzida na preparação: reserve tempo para a passagem Junta → Mesa, assinaturas, logística, expedição e receção. A passagem pode exigir tempo adicional; este aviso de planeamento não significa atraso legal.')
  if (!progress.convocation && (model.callDispatch.date === today || model.callDate === today) && postalCutoffReached(now)) {
    warnings.push('Já são 17h00 ou mais em Lisboa e a expedição está prevista para hoje ou atinge hoje o limite legal. Confirme se a convocatória já foi expedida antes das 17h00 e registe a data, ou avalie a alternativa por protocolo, confirmando os prazos e a receção.')
  }
  const missed = model.dates.filter(item => !progress[item.id] && item.date < today && (!item.legalDate || item.legalDate >= today))
  if (missed.length) warnings.push(`Há metas internas por concluir: ${missed.map(item => `${item.title} (${longDate(item.date)})`).join('; ')}. As metas internas não são prazos legais.`)
  return warnings
}
