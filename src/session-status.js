import { longDate, parseDate } from './dates.js'

export function sessionStatus(sessionDate, today, model) {
  const daysUntilSession = parseDate(sessionDate) - parseDate(today)
  if (daysUntilSession < 0) return {
    tone: 'past', label: 'Calendário histórico', title: 'Esta sessão já passou',
    detail: 'Os prazos mostram quando os atos deveriam ter ocorrido. Não confirmam se foram cumpridos.'
  }

  const mandatory = model.dates.filter(item => item.nature === 'Obrigatório')
  const passed = mandatory.filter(item => item.date < today)
  if (passed.length || !model.callInWindow) {
    const proximity = daysUntilSession === 0 ? 'A sessão é hoje. '
      : daysUntilSession === 1 ? 'A sessão é amanhã. '
        : daysUntilSession === 2 ? 'A sessão é daqui a dois dias. ' : ''
    return {
      tone: 'late', label: 'Atenção aos prazos',
      title: daysUntilSession <= 2 ? 'Sessão muito próxima; há prazos por verificar' : 'Já passaram prazos de preparação',
      detail: `${proximity}${!model.callInWindow ? 'Não há dia útil de expedição dentro da janela calculada de convocação. ' : ''}${passed.length ? `O primeiro prazo obrigatório calculado era até ${longDate(passed[0].date)}. ` : ''}Se os atos já ocorreram, confirme-os; se ainda faltam, reveja a data da sessão.`
    }
  }

  const next = mandatory[0]
  const daysUntilDeadline = parseDate(next.date) - parseDate(today)
  if (daysUntilDeadline <= 2) return {
    tone: 'soon', label: 'Prazo próximo',
    title: daysUntilDeadline === 0 ? 'Há prazos obrigatórios que terminam hoje' :
      `O próximo prazo obrigatório é ${daysUntilDeadline === 1 ? 'amanhã' : 'daqui a dois dias'}`,
    detail: `A primeira data limite é ${longDate(next.date)}. Prepare a expedição, a documentação e a publicidade a tempo.`
  }

  return {
    tone: 'good', label: 'A tempo', title: 'Ainda há tempo para preparar esta sessão',
    detail: `O primeiro prazo obrigatório calculado é ${longDate(next.date)}. Confirme depois a expedição, a receção e o acesso aos documentos.`
  }
}
