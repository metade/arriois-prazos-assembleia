import { daysBefore, formatDate, longDate, parseDate, parts, postalCutoffReached, todayInLisbon } from './dates.js'
import { latestWorkingDate, workingDaysBefore } from './holidays.js'

export const SOURCES = {
  law: 'https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2013-56366098',
  reg: 'https://jfarroios.pt/wp-content/uploads/2022/09/Regimento_Dez2021_pdf.pdf',
  labour: 'https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475'
}
export const REVIEWED_ON = '15 de novembro de 2026'

const law = (article) => ({ label: `Lei n.º 75/2013, art. ${article}`, url: SOURCES.law })
const reg = (article) => ({ label: `Regimento de Arroios, art. ${article}`, url: SOURCES.reg })

export function normalizeBufferDays(value) {
  return Number.isInteger(value) && value >= 0 && value <= 5 ? value : 2
}

export const STEP_IDS = ['handoff', 'activity', 'convocation', 'documents', 'edict', 'publicity', 'receipt', 'paod']
export const DEFAULT_BUFFERS = Object.freeze(Object.fromEntries(STEP_IDS.map(id => [id, id === 'handoff' ? 2 : 0])))

export function normalizeStepBuffers(values = {}, legacyBuffer = 2) {
  return Object.fromEntries(STEP_IDS.map(id => {
    const fallback = id === 'handoff' ? normalizeBufferDays(legacyBuffer) : 0
    const value = values?.[id]
    return [id, Number.isInteger(value) && value >= 0 && value <= 5 ? value : fallback]
  }))
}

export function earliestSessionDate(today, type, { carnival = false, bufferDays = 2, stepBuffers = {}, now = null } = {}) {
  parseDate(today)
  if (!['ordinaria', 'extraordinaria'].includes(type)) throw new Error('Tipo de sessão inválido')
  const ordinary = type === 'ordinaria'
  for (let offset = ordinary ? 8 : 5; offset < 380; offset++) {
    const candidate = formatDate(parseDate(today) + offset)
    if (ordinary && ![4, 6, 9, 11, 12].includes(parts(parseDate(candidate)).month)) continue
    const model = calculate(candidate, type, { carnival, bufferDays, stepBuffers })
    const postalAvailable = !now || today !== todayInLisbon(now) || !postalCutoffReached(now) || model.callDispatch.date > today
    if (model.callInWindow && postalAvailable && model.dates.every(item => item.date >= today)) return candidate
  }
  throw new Error('Não foi possível calcular a próxima data')
}

export function calculate(sessionDate, type, { carnival = false, initiativeDate = '', bufferDays = 2, stepBuffers = {} } = {}) {
  stepBuffers = normalizeStepBuffers(stepBuffers, bufferDays)
  bufferDays = stepBuffers.handoff
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
  const preparation = workingDaysBefore(callDispatch.date, bufferDays, carnival)
  const dates = [
    {
      id: 'handoff', date: preparation.date, title: 'Preparação e logística', phase: 1,
      route: 'Junta → Mesa, com apoio dos serviços', nature: 'Sugestão interna',
      detail: `Margem de ${bufferDays} ${bufferDays === 1 ? 'dia útil' : 'dias úteis'} antes da primeira meta de expedição ou afixação. A passagem Junta → Mesa pode exigir tempo adicional. A convocatória não tem de levar as propostas e os anexos.`,
      tasks: [
        { route: 'Junta → Mesa', detail: 'Assegurar a passagem Junta → Mesa e confirmar a receção pela Mesa.' },
        { route: 'Junta e proponentes → Mesa', detail: 'Reunir e conferir as propostas e os anexos.' },
        { route: 'Presidente da Mesa', detail: 'Obter a assinatura do edital antes de o enviar para afixação.' },
        { route: 'Mesa e serviços da Junta', detail: 'Reservar a sala e assegurar o apoio técnico.' },
        { route: 'Mesa e serviços da Junta', detail: 'Preparar a expedição e organizar o acompanhamento da receção.' }
      ], holidays: preparation.holidays,
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
      route: 'Presidente da Assembleia → cada membro e presidente da Junta', nature: 'Obrigatório',
      detail: `Convocar por carta registada com aviso de receção ou por protocolo, com pelo menos ${callDays} dias de calendário de antecedência.${callDispatch.date !== callDate ? ` O último dia de antecedência é ${longDate(callDate)}; a expedição foi antecipada para o dia útil indicado.` : ''}${!callInWindow ? ' Não há dia útil de expedição entre 3 e 10 dias antes desta sessão; reveja a data planeada.' : ''} Este ato é independente do envio posterior da ordem do dia e da documentação. Confirmar expedição e receção; um email posterior não substitui a convocação formal.`,
      cutoff: 'Expedição pelos CTT: antes das 17h00',
      source: [reg('24.º, n.os 2 e 3'), law(ordinary ? '11.º, n.º 1' : '12.º, n.º 2')], holidays: callDispatch.holidays
    },
    {
      id: 'documents', date: dispatch.date, title: 'Enviar a ordem do dia e a documentação', phase: 2,
      route: 'Presidente da Assembleia/Mesa → todos os membros', nature: 'Obrigatório',
      detail: 'Entregar a ordem do dia e enviar em simultâneo a respetiva documentação, com acesso efetivo para todos os membros, pelo menos dois dias úteis antes. O regimento prefere o correio eletrónico. Este prazo é independente da convocatória formal.',
      source: [law('53.º, n.º 2'), reg('25.º, n.º 2 e 35.º, n.º 2')], holidays: dispatch.holidays
    },
    {
      id: 'edict', date: callDispatch.date, title: 'Afixar o edital', phase: 3,
      route: 'Presidente da Assembleia → público (afixação com apoio da Junta)', nature: 'Obrigatório',
      detail: `Obter a assinatura do presidente da Mesa antes de enviar o edital para afixação. Afixar o edital de convocação nos locais habituais, com pelo menos ${callDays} dias de calendário de antecedência.${callDispatch.date !== callDate ? ` O último dia de antecedência é ${longDate(callDate)}; a afixação foi antecipada para o dia útil indicado.` : ''}`,
      source: [reg('21.º, n.º 1, al. i) e 24.º, n.os 2 a 4'), law(ordinary ? '11.º, n.º 1' : '12.º, n.º 2')], holidays: callDispatch.holidays
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
  dates.push({
    id: 'receipt', date: workingDaysBefore(sessionDate, 1, carnival).date,
    title: 'Confirmar a receção das convocatórias', route: 'Mesa → cada destinatário', nature: 'Sugestão interna',
    detail: 'Acompanhar os avisos de receção ou os comprovativos de protocolo de todos os destinatários. Só marcar como concluído depois de confirmar todas as receções. A expedição, por si só, não confirma a receção. A data indicada é uma meta de acompanhamento, sem prazo legal autónomo.',
    source: { label: 'Planeamento interno · sem prazo legal', url: null }
  })
  // Buffers change planning targets, never the statutory or preferential limits.
  for (const item of dates) {
    item.baseDate = item.date
    item.legalDate = ['convocation', 'edict'].includes(item.id) ? callDate
      : item.id === 'activity' ? activityDeadline
        : ['documents', 'publicity'].includes(item.id) ? dispatch.date : null
    item.preferenceDate = item.id === 'paod' ? item.date : null
    item.bufferDays = stepBuffers[item.id]
    if (item.id === 'handoff') continue
    const target = workingDaysBefore(item.baseDate, item.bufferDays, carnival)
    item.date = target.date
    item.holidays = [...(item.holidays || []), ...target.holidays]
    if (!ordinary && ['convocation', 'edict'].includes(item.id)) {
      const first = daysBefore(sessionDate, 10)
      if (item.date < first) {
        let available = first
        while (latestWorkingDate(available, carnival).date !== available) available = daysBefore(available, -1)
        item.date = available
        item.bufferNote = 'Margem limitada pela janela de convocação: não antecipar para mais de 10 dias antes da sessão.'
      }
    }
  }
  const plannedCall = dates.find(item => item.id === 'convocation')
  const handoff = dates.find(item => item.id === 'handoff')
  const plannedEdict = dates.find(item => item.id === 'edict')
  handoff.baseDate = plannedCall.date < plannedEdict.date ? plannedCall.date : plannedEdict.date
  const handoffTarget = workingDaysBefore(handoff.baseDate, bufferDays, carnival)
  handoff.date = handoffTarget.date
  handoff.holidays = handoffTarget.holidays
  const receipt = dates.find(item => item.id === 'receipt')
  if (receipt.date < plannedCall.date) {
    receipt.date = plannedCall.date
    receipt.bufferNote = 'Meta limitada pela expedição planeada: não é possível confirmar a receção antes de expedir.'
  }
  dates.sort((a, b) => a.date.localeCompare(b.date) || STEP_IDS.indexOf(a.id) - STEP_IDS.indexOf(b.id))

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
  return { sessionDate, type, carnival, bufferDays, stepBuffers, dates, memberRequest, initiative, callDate,
    callDispatch: { date: plannedCall.date, holidays: plannedCall.holidays },
    callInWindow: ordinary || plannedCall.date >= daysBefore(sessionDate, 10), callDays,
    dispatch: { date: dates.find(item => item.id === 'documents').date, holidays: dispatch.holidays } }
}

export function carnivalAffects(sessionDate, type, options = {}) {
  const without = calculate(sessionDate, type, { ...options, carnival: false })
  const withCarnival = calculate(sessionDate, type, { ...options, carnival: true })
  const datesWithCarnival = new Map(withCarnival.dates.map(item => [item.id, item.date]))
  return without.dates.some(item => item.date !== datesWithCarnival.get(item.id)) ||
    without.memberRequest.national.date !== withCarnival.memberRequest.national.date ||
    without.memberRequest.local.date !== withCarnival.memberRequest.local.date
}
