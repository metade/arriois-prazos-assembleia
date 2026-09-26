import { daysBefore, formatDate, longDate, parseDate, parts } from './dates.js'
import { latestWorkingDate, workingDaysBefore } from './holidays.js'

export const SOURCES = {
  law: 'https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2013-56366098',
  reg: 'https://jfarroios.pt/wp-content/uploads/2022/09/Regimento_Dez2021_pdf.pdf',
  labour: 'https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475'
}
export const REVIEWED_ON = '26 de setembro de 2026'

const law = (article) => ({ label: `Lei n.º 75/2013, art. ${article}`, url: SOURCES.law })
const reg = (article) => ({ label: `Regimento de Arroios, art. ${article}`, url: SOURCES.reg })

export function earliestSessionDate(today, type, { carnival = false } = {}) {
  parseDate(today)
  if (!['ordinaria', 'extraordinaria'].includes(type)) throw new Error('Tipo de sessão inválido')
  const ordinary = type === 'ordinaria'
  // Find the first date whose mandatory calendar deadlines can still be met
  // starting today. This says nothing about actual dispatch or receipt.
  for (let offset = ordinary ? 8 : 5; offset < 380; offset++) {
    const candidate = formatDate(parseDate(today) + offset)
    if (ordinary && ![4, 6, 9, 11, 12].includes(parts(parseDate(candidate)).month)) continue
    const legalConvocation = daysBefore(candidate, ordinary ? 8 : 5)
    const convocation = latestWorkingDate(legalConvocation, carnival).date
    const convocationWindow = ordinary || convocation >= daysBefore(candidate, 10)
    const documents = workingDaysBefore(candidate, 2, carnival).date
    const activity = ordinary ? latestWorkingDate(daysBefore(candidate, 5), carnival).date : candidate
    if (convocationWindow && [convocation, documents, activity].every(date => date >= today)) return candidate
  }
  throw new Error('Não foi possível calcular a próxima data')
}

export function calculate(sessionDate, type, { carnival = false, initiativeDate = '' } = {}) {
  parseDate(sessionDate)
  if (!['ordinaria', 'extraordinaria'].includes(type)) throw new Error('Tipo de sessão inválido')
  const ordinary = type === 'ordinaria'
  const callDays = ordinary ? 8 : 5
  const callDate = daysBefore(sessionDate, callDays)
  const callDispatch = latestWorkingDate(callDate, carnival)
  const callInWindow = ordinary || callDispatch.date >= daysBefore(sessionDate, 10)
  const dispatch = workingDaysBefore(sessionDate, 2, carnival)
  const activityDeadline = ordinary ? daysBefore(sessionDate, 5) : null
  const activityDispatch = ordinary ? latestWorkingDate(activityDeadline, carnival) : null
  const dates = [
    {
      id: 'handoff', date: workingDaysBefore(callDispatch.date, 2, carnival).date, title: 'Fechar a documentação', phase: 1,
      route: 'Junta → Mesa', nature: 'Sugestão interna',
      detail: 'Reunir as propostas e os anexos, confirmar que o conjunto está completo e obter as assinaturas necessárias antes da expedição. Meta operacional de dois dias úteis antes da convocatória, sem prazo legal próprio.',
      source: { label: 'Planeamento interno · sem prazo legal', url: null }
    },
    ...(ordinary ? [{
      id: 'activity', date: activityDispatch.date, title: 'Entregar informação de atividade e situação financeira',
      route: 'Presidente da Junta → presidente da Mesa', nature: 'Obrigatório',
      detail: `Exigência própria das sessões ordinárias; inclui a informação e os documentos de acompanhamento financeiro previstos no regimento.${activityDispatch.date !== activityDeadline ? ` O limite de cinco dias de calendário é ${longDate(activityDeadline)}; para entrega num dia útil, antecipar para a data indicada.` : ''}`,
      source: [law('9.º, n.º 2, al. e)'), reg('37.º')], holidays: activityDispatch.holidays
    }] : []),
    {
      id: 'convocation', date: callDispatch.date, title: 'Expedir a convocatória', phase: 2,
      route: 'Mesa → membros e presidente da Junta', nature: 'Obrigatório',
      detail: `Dirigir a cada membro e ao presidente da Junta por carta registada com aviso de receção ou por protocolo, com pelo menos ${callDays} dias de calendário de antecedência.${callDispatch.date !== callDate ? ` O último dia de antecedência é ${longDate(callDate)}; a expedição foi antecipada para o dia útil indicado.` : ''}${!callInWindow ? ' Não há dia útil de expedição entre 3 e 10 dias antes desta sessão; reveja a data planeada.' : ''} Confirmar expedição e receção; um email isolado não comprova estas formalidades.`,
      source: [reg('24.º, n.os 2 e 3'), law(ordinary ? '11.º, n.º 1' : '12.º, n.º 2')], holidays: callDispatch.holidays
    },
    {
      id: 'documents', date: dispatch.date, title: 'Enviar a ordem do dia e a documentação', phase: 2,
      route: 'Mesa → membros', nature: 'Obrigatório',
      detail: 'Enviar a ordem do dia e, em simultâneo, a documentação completa e acessível a todos os membros, pelo menos dois dias úteis antes.',
      source: [law('53.º, n.º 2'), reg('25.º, n.º 2 e 35.º, n.º 2')], holidays: dispatch.holidays
    },
    {
      id: 'edict', date: callDispatch.date, title: 'Afixar o edital', phase: 3,
      route: 'Assembleia → público', nature: 'Obrigatório',
      detail: `Afixar o edital de convocação nos locais habituais, com pelo menos ${callDays} dias de calendário de antecedência.${callDispatch.date !== callDate ? ` O último dia de antecedência é ${longDate(callDate)}; a afixação foi antecipada para o dia útil indicado.` : ''}`,
      source: [reg('24.º, n.os 2 a 4'), law(ordinary ? '11.º, n.º 1' : '12.º, n.º 2')], holidays: callDispatch.holidays
    },
    {
      id: 'publicity', date: dispatch.date, title: 'Divulgar a sessão', phase: 3,
      route: 'Assembleia → público', nature: 'Obrigatório',
      detail: 'Informar o público do dia, da hora e do local da sessão com pelo menos dois dias úteis de antecedência.',
      source: law('49.º, n.º 3'), holidays: dispatch.holidays
    },
    {
      id: 'paod', date: daysBefore(sessionDate, 1), title: 'Apresentar recomendações e moções para o PAOD',
      route: 'Membros → Mesa', nature: 'Preferencial',
      detail: `Preferencialmente 24 horas antes, à mesma hora da sessão. Meta interna de envio: ${parts(parseDate(sessionDate)).weekday === 6 ? '12h00' : '17h00'} na véspera${parts(parseDate(sessionDate)).weekday === 6 ? ' de sábado' : ''}; confirmar a hora marcada, pois esta meta só perfaz 24 horas se a sessão começar ${parts(parseDate(sessionDate)).weekday === 6 ? 'às 12h00 ou depois' : 'às 17h00 ou depois'}. Esta preferência não se aplica da mesma forma aos votos de louvor, congratulação, saudação, protesto ou pesar.`,
      source: reg('33.º, n.º 3, al. c)')
    }
  ]
  const order = ['handoff', 'activity', 'convocation', 'documents', 'edict', 'publicity', 'paod']
  dates.sort((a, b) => a.date.localeCompare(b.date) || order.indexOf(a.id) - order.indexOf(b.id))

  const national = workingDaysBefore(sessionDate, ordinary ? 5 : 8, carnival)
  const local = workingDaysBefore(sessionDate, ordinary ? 8 : 5, carnival)
  const memberRequest = {
    national, local,
    cautious: national.date < local.date ? national.date : local.date,
    nationalSource: law(`53.º, n.º 1, al. ${ordinary ? 'a' : 'b'})`),
    localSource: reg('25.º, n.º 1 e 35.º, n.º 1')
  }

  let initiative = null
  if (!ordinary && initiativeDate) {
    parseDate(initiativeDate)
    initiative = { date: initiativeDate, latestCall: daysBefore(initiativeDate, -5) }
  }
  return { dates, memberRequest, initiative, callDate, callDispatch, callInWindow, callDays, dispatch }
}

export function carnivalAffects(sessionDate, type) {
  const without = calculate(sessionDate, type)
  const withCarnival = calculate(sessionDate, type, { carnival: true })
  const datesWithCarnival = new Map(withCarnival.dates.map(item => [item.id, item.date]))
  return without.dates.some(item => item.date !== datesWithCarnival.get(item.id)) ||
    without.memberRequest.national.date !== withCarnival.memberRequest.national.date ||
    without.memberRequest.local.date !== withCarnival.memberRequest.local.date
}
