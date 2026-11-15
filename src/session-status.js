import { longDate, parseDate } from './dates.js'
import { completionIssues, normalizeProgress } from './progress.js'

export function sessionStatus(sessionDate, today, model, completed = {}) {
  const progress = normalizeProgress(completed, today)
  const daysUntilSession = parseDate(sessionDate) - parseDate(today)
  const recorded = model.dates.filter(item => progress[item.id])
  const pending = model.dates.filter(item => !progress[item.id])
  const nextAction = pending[0]
  const nextDetail = nextAction ? `Próxima ação pendente: ${nextAction.title}, com meta em ${longDate(nextAction.date)}.`
    : 'Todas as etapas têm conclusão registada. Confirme os comprovativos; os registos não certificam a validade da sessão.'
  const issues = recorded.flatMap(item => completionIssues(item, progress[item.id], model, progress))
  if (issues.length) return {
    tone: 'late', label: 'Rever datas registadas', title: 'Há conclusões com datas por verificar',
    detail: `${issues[0]} ${nextDetail}`
  }
  if (daysUntilSession < 0) return {
    tone: 'past', label: 'Calendário histórico', title: 'Esta sessão já passou',
    detail: `${recorded.length} de ${model.dates.length} etapas com conclusão registada. As datas e os registos não confirmam a validade da sessão.`
  }

  const mandatory = pending.filter(item => item.nature === 'Obrigatório').sort((a, b) => a.legalDate.localeCompare(b.legalDate))
  const passed = mandatory.filter(item => item.legalDate < today)
  if (passed.length || (!model.callInWindow && !progress.convocation)) {
    const proximity = daysUntilSession === 0 ? 'A sessão é hoje. '
      : daysUntilSession === 1 ? 'A sessão é amanhã. '
        : daysUntilSession === 2 ? 'A sessão é daqui a dois dias. ' : ''
    return {
      tone: 'late', label: 'Atenção aos prazos',
      title: daysUntilSession <= 2 ? 'Sessão muito próxima; há prazos por verificar' : 'Há prazos obrigatórios sem conclusão registada',
      detail: `${proximity}${!model.callInWindow && !progress.convocation ? 'Não há dia útil de expedição dentro da janela calculada de convocação. ' : ''}${passed.length ? `O primeiro limite legal por confirmar era ${longDate(passed[0].legalDate)}. ` : ''}Se os atos já ocorreram, registe a conclusão; se ainda faltam, reveja a data da sessão. ${nextDetail}`
    }
  }

  if (!mandatory.length) return {
    tone: 'good', label: 'Obrigações registadas', title: 'As etapas obrigatórias têm conclusão registada', detail: nextDetail
  }
  const next = mandatory[0]
  const daysUntilDeadline = parseDate(next.legalDate) - parseDate(today)
  if (daysUntilDeadline <= 2) return {
    tone: 'soon', label: 'Prazo próximo',
    title: daysUntilDeadline === 0 ? 'Há prazos obrigatórios que terminam hoje' :
      `O próximo prazo obrigatório é ${daysUntilDeadline === 1 ? 'amanhã' : 'daqui a dois dias'}`,
    detail: `O próximo limite legal por confirmar é ${longDate(next.legalDate)}. ${nextDetail}`
  }
  return {
    tone: 'good', label: 'A tempo', title: 'Ainda há tempo para preparar esta sessão',
    detail: `O próximo limite legal por confirmar é ${longDate(next.legalDate)}. ${nextDetail}`
  }
}
