import './style.css'
import { targetOptions } from './target-options.js'
import { progressKey, readProgress, saveProgress, normalizeProgress } from './progress.js'
import { planningWarnings } from './planning-warnings.js'
import { calculate, carnivalAffects, earliestSessionDate, normalizeStepBuffers, REVIEWED_ON, SOURCES } from './rules.js'
import { daysBefore, longDate, parseDate, todayInLisbon } from './dates.js'
import { sessionStatus } from './session-status.js'
import { readUrlState, urlForState } from './url-state.js'
import { deadlineMarkup, holidayMarkup, sourceMarkup } from './deadline-markup.js'

const app = document.querySelector('#app')
app.innerHTML = `
  <header class="site-header"><div class="shell header-inner"><div class="brand"><span class="seal" aria-hidden="true">A</span><span>Assembleia de Arroios <small>Prazos da sessão</small></span></div><a href="#fontes">Fontes e regras</a></div></header>
  <main class="shell">
    <div class="intro"><p class="eyebrow">Ferramenta de preparação de sessões da Assembleia de Freguesia de Arroios</p><h1>Os prazos, antes da assembleia.</h1><p class="lead">Escolha a data da sessão para saber até quando devem ser enviadas a convocatória, a ordem do dia, a documentação e as propostas para o PAOD.</p></div>
    <form class="controls" id="controls">
      <div class="field"><div class="date-field-heading"><label for="session-date">Data da sessão</label><button class="date-reset" id="reset-date" type="button" title="Calcular a primeira data que admite os prazos" hidden>↺ Data calculada</button></div><input id="session-date" type="date" required aria-describedby="planning-note" /></div>
      <fieldset class="field"><legend>Tipo de sessão</legend><div class="segment"><label><input type="radio" name="type" value="ordinaria" /><span>Ordinária</span></label><label><input type="radio" name="type" value="extraordinaria" checked /><span>Extraordinária</span></label></div></fieldset>
      <p class="step-planning-note">Ajuste a data de cada etapa com − e +, ou escolha uma data. A margem é calculada automaticamente; os limites legais mantêm-se.</p>
      <div class="control-foot" id="control-foot"><p id="planning-note"></p><label class="check" id="carnival-option"><input id="carnival" type="checkbox" /><span>Contar Carnaval como feriado facultativo</span></label></div>
    </form>
    <section class="session-status" id="session-status" aria-live="polite" hidden></section>
    <aside id="planning-warnings" class="planning-warnings" aria-live="polite" hidden></aside>
    <section class="calendar" aria-labelledby="calendar-title"><div class="section-heading"><div><p class="eyebrow">Da preparação ao PAOD</p><h2 id="calendar-title">O calendário da sessão</h2></div><p id="session-summary"></p></div><div class="progress-overview"><p id="progress-summary" aria-live="polite"></p><p id="storage-note">As conclusões ficam guardadas apenas neste navegador, por data e tipo de sessão. O link partilha o calendário e as margens, sem os registos de conclusão.</p><p id="progress-feedback" role="status"></p></div><div id="results"></div></section>
    <details class="other" id="other"><summary><span><strong>Outros prazos</strong><small>Pedido individual para a ordem do dia formal e condições de sessões extraordinárias</small></span><span aria-hidden="true">⌄</span></summary><div id="other-content"></div></details>
    <section class="method" id="fontes"><h2>Fontes e método</h2><p>Este calendário ajuda a planear. Não conclui se uma sessão é legalmente válida: é necessário verificar a convocatória, a receção, a publicidade e o acesso real aos anexos.</p><div class="source-grid"><div><h3>Lei nacional</h3><p><a href="${SOURCES.law}" target="_blank" rel="noopener noreferrer">Lei n.º 75/2013, texto consolidado ↗</a></p><p>Regras de convocação, publicidade, PAOD e ordem do dia.</p></div><div><h3>Regimento local</h3><p><a href="${SOURCES.reg}" target="_blank" rel="noopener noreferrer">Regimento da Assembleia de Arroios ↗</a></p><p>PDF identificado como “dezembro 2021”; o texto declara aprovação em <strong>30 de junho de 2014</strong> e entrada em vigor em 1 de julho de 2014.</p></div><div><h3>Feriados</h3><p><a href="${SOURCES.labour}" target="_blank" rel="noopener noreferrer">Código do Trabalho, arts. 234.º e 235.º ↗</a></p><p>Feriados nacionais, 13 de junho em Lisboa e opção de Carnaval. Dias úteis excluem fins de semana.</p></div></div><p class="review">Regras verificadas em <strong>${REVIEWED_ON}</strong>. Antes de usar noutra data, confirme se as fontes foram alteradas. As sugestões internas são identificadas no calendário.</p></section>
  </main><footer class="site-footer"><div class="shell">Prazos da Assembleia de Arroios <span>·</span> Ferramenta de apoio ao planeamento</div></footer>`

const dateInput = document.querySelector('#session-date')
const progressFeedback = document.querySelector('#progress-feedback')
const sessionRecords = new Map()
let stepBuffers = normalizeStepBuffers()
let currentModel = null
let storageAvailable = true
const carnivalInput = document.querySelector('#carnival')
const results = document.querySelector('#results')
const statusBanner = document.querySelector('#session-status')
const other = document.querySelector('#other-content')
let automaticDate = true
let initiativeDate = ''

function selectedType() {
  return document.querySelector('input[name="type"]:checked').value
}

function loadUrlState() {
  const state = readUrlState(window.location.search)
  document.querySelector(`input[name="type"][value="${state.type}"]`).checked = true
  carnivalInput.checked = state.carnival
  stepBuffers = state.stepBuffers
  initiativeDate = state.initiativeDate
  automaticDate = !state.date
  dateInput.value = state.date || suggestedDate()
  render()
}

function syncUrl() {
  const url = urlForState(window.location.href, {
    date: dateInput.value,
    type: selectedType(),
    carnival: carnivalInput.checked,
    stepBuffers,
    initiativeDate
  })
  window.history.replaceState(null, '', url)
}

function suggestedDate(now = new Date()) {
  return earliestSessionDate(todayInLisbon(now), selectedType(), {
    carnival: carnivalInput.checked, stepBuffers, now
  })
}

function browserStorage() {
  try { return window.localStorage } catch { return null }
}

function progressFor(model, today) {
  const key = progressKey(model.sessionDate, model.type)
  if (!sessionRecords.has(key)) {
    const stored = readProgress(browserStorage(), key, today)
    sessionRecords.set(key, stored.progress)
    storageAvailable = stored.available
  }
  const progress = normalizeProgress(sessionRecords.get(key), today)
  sessionRecords.set(key, progress)
  return progress
}

function render(now = new Date()) {
  const focusedId = results.contains(document.activeElement) ? document.activeElement.id : ''
  currentModel = null
  document.querySelector('#progress-summary').textContent = ''
  document.querySelector('#session-summary').textContent = ''
  document.querySelector('#planning-warnings').hidden = true
  statusBanner.hidden = true
  document.querySelector('#reset-date').hidden = automaticDate
  if (!dateInput.value) { results.innerHTML = '<p class="error">Escolha uma data para ver os prazos.</p>'; other.innerHTML = ''; return }
  try { parseDate(dateInput.value) } catch { results.innerHTML = '<p class="error">Introduza uma data válida.</p>'; other.innerHTML = ''; return }
  const type = selectedType()
  const model = calculate(dateInput.value, type, { carnival: carnivalInput.checked, initiativeDate, stepBuffers })
  currentModel = model
  const today = todayInLisbon(now)
  const progress = progressFor(model, today)
  const status = sessionStatus(dateInput.value, today, model, progress)
  statusBanner.className = `session-status session-status--${status.tone}`
  statusBanner.innerHTML = `<span class="session-status-label">${status.label}</span><strong>${status.title}</strong><p>${status.detail}</p>`
  statusBanner.hidden = false
  const planningNote = document.querySelector('#planning-note')
  const carnivalOption = document.querySelector('#carnival-option')
  planningNote.hidden = !automaticDate
  carnivalOption.hidden = !carnivalAffects(dateInput.value, type, { stepBuffers })
  document.querySelector('#control-foot').hidden = planningNote.hidden && carnivalOption.hidden
  planningNote.textContent = automaticDate
    ? `Primeira data em que os prazos calculados ainda podem ser cumpridos desde hoje (${longDate(todayInLisbon(now))}), incluindo as margens de cada etapa e expedição pelos CTT antes das 17h00 (Lisboa), em dia útil. A data não verifica a preparação dos documentos, a expedição, a receção nem o acesso efetivo.`
    : ''
  document.querySelector('#session-summary').textContent = `${type === 'ordinaria' ? 'Sessão ordinária' : 'Sessão extraordinária'} · ${longDate(dateInput.value)}`
  const warnings = planningWarnings(model, now, progress)
  const warningsBox = document.querySelector('#planning-warnings')
  warningsBox.hidden = !warnings.length
  warningsBox.innerHTML = warnings.map(warning => `<p>${warning}</p>`).join('')
  document.querySelector('#progress-summary').textContent = `${model.dates.filter(item => progress[item.id]).length} de ${model.dates.length} etapas concluídas`
  document.querySelector('#storage-note').textContent = storageAvailable
    ? 'As conclusões ficam guardadas apenas neste navegador, por data e tipo de sessão. O link partilha o calendário e as margens, sem os registos de conclusão.'
    : 'Não foi possível guardar neste navegador. Os registos ficam disponíveis apenas enquanto esta página estiver aberta; o link não inclui conclusões.'
  results.innerHTML = deadlineMarkup(model.dates, { model, progress, today })
  if (focusedId) document.getElementById(focusedId)?.focus({ preventScroll: true })

  const request = model.memberRequest
  other.innerHTML = `<section class="other-block"><h3>Pedido de membro para a ordem do dia formal</h3><p>Um membro pode pedir, por escrito, a inclusão de um assunto da competência da Assembleia. É um direito distinto das recomendações, moções e votos apresentados no PAOD.</p><div class="conflict"><div><span>Lei nacional · ${type === 'ordinaria' ? '5' : '8'} dias úteis</span><strong>${longDate(request.national.date)}</strong><small>${sourceMarkup(request.nationalSource)}</small>${holidayMarkup(request.national.holidays)}</div><div><span>Regimento de Arroios · ${type === 'ordinaria' ? '8' : '5'} dias úteis</span><strong>${longDate(request.local.date)}</strong><small>${sourceMarkup(request.localSource)}</small>${holidayMarkup(request.local.holidays)}</div></div><p class="caution"><strong>Divergência:</strong> os prazos não coincidem. Para planeamento cauteloso, considere o mais cedo: <strong>${longDate(request.cautious)}</strong>. A aplicação jurídica da divergência exige apreciação própria.</p></section>${type === 'extraordinaria' ? `<section class="other-block"><h3>Iniciativa ou requerimento de sessão extraordinária</h3><p>A lei exige convocação nos <strong>5 dias seguintes</strong> à iniciativa da Mesa ou receção do requerimento, e realização da sessão <strong>3 a 10 dias depois</strong> da convocação. O regimento exige ainda pelo menos <strong>5 dias de calendário</strong> entre convocação e sessão. Para esta sessão, a janela conjunta de convocação é de <strong>${longDate(daysBefore(dateInput.value, 10))}</strong> a <strong>${longDate(model.callDate)}</strong>, sujeita também ao prazo contado da iniciativa.</p><label for="initiative-date">Data da iniciativa ou receção do requerimento <span class="optional">opcional</span></label><input id="initiative-date" type="date" value="${initiativeDate}" /><div id="initiative-result">${model.initiative ? `<p>Convocação até <strong>${longDate(model.initiative.latestCall)}</strong> pelo prazo de 5 dias após a iniciativa/requerimento. ${model.initiative.latestCall < daysBefore(dateInput.value, 10) || model.initiative.date > model.callDate ? 'As datas introduzidas não cabem na janela calculada para esta sessão; confirme os factos e os prazos.' : 'Compare esta data com a janela acima.'}</p>` : '<p>Introduza a data para calcular o limite ligado à iniciativa ou ao requerimento. Sem ela, esse limite não pode ser determinado.</p>'}</div><p class="source">${sourceMarkup({ label: 'Lei n.º 75/2013, art. 12.º, n.os 2 e 3', url: SOURCES.law })} · ${sourceMarkup({ label: 'Regimento, art. 24.º', url: SOURCES.reg })}</p></section>` : `<section class="other-block"><h3>Sessões ordinárias</h3><p>A lei prevê quatro sessões anuais, em abril, junho, setembro e novembro ou dezembro. O PAOD tem previsão legal para estas sessões; o regimento de Arroios também o prevê nas extraordinárias.</p><p class="source">${sourceMarkup([{ label: 'Lei n.º 75/2013, arts. 11.º e 52.º', url: SOURCES.law }, { label: 'Regimento, arts. 23.º e 33.º', url: SOURCES.reg }])}</p></section>`}`
  document.querySelector('#initiative-date')?.addEventListener('change', event => {
    initiativeDate = event.target.value
    syncUrl()
    render()
  })
}

function updateFromControl(event) {
  progressFeedback.textContent = ''
  if (event.target === dateInput) automaticDate = false
  if (automaticDate && event.target !== dateInput) {
    dateInput.value = suggestedDate()
  }
  syncUrl()
  render()
}

document.querySelector('#controls').addEventListener('input', updateFromControl)
document.querySelector('#controls').addEventListener('change', updateFromControl)
document.querySelector('#reset-date').addEventListener('click', () => {
  automaticDate = true
  initiativeDate = ''
  dateInput.value = suggestedDate()
  syncUrl()
  render()
})
function updateTarget(id, bufferDays) {
  stepBuffers = normalizeStepBuffers({ ...stepBuffers, [id]: bufferDays })
  // An explicit target-date edit keeps the session date fixed.
  automaticDate = false
  syncUrl()
  render()
  const item = currentModel?.dates.find(item => item.id === id)
  progressFeedback.textContent = item ? `Meta atualizada: ${item.title}, ${longDate(item.date)}.` : ''
}

results.addEventListener('click', event => {
  const button = event.target.closest('[data-target-step]')
  if (!button || button.disabled) return
  updateTarget(button.dataset.targetStep, Number(button.dataset.targetBuffer))
})

results.addEventListener('change', event => {
  const targetId = event.target.dataset.target
  if (targetId && currentModel) {
    const target = targetOptions(currentModel, targetId).find(option => option.date === event.target.value)
    if (!target) {
      progressFeedback.textContent = 'Escolha uma das datas úteis disponíveis, com margem de 0 a 5 dias e dentro dos limites indicados. A meta anterior foi mantida.'
      render()
      return
    }
    updateTarget(targetId, target.bufferDays)
    return
  }
  const id = event.target.dataset.done || event.target.dataset.completed
  if (!id || !currentModel) return
  const today = todayInLisbon()
  const progress = { ...progressFor(currentModel, today) }
  let completedOn = event.target.dataset.done ? (event.target.checked ? progress[id] || today : '') : event.target.value
  if (completedOn) {
    try { parseDate(completedOn) } catch { completedOn = null }
    if (!completedOn || completedOn > today) {
      progressFeedback.textContent = 'Escolha uma data válida de conclusão, até hoje. O registo anterior foi mantido.'
      render()
      return
    }
    progress[id] = completedOn
  } else delete progress[id]
  const key = progressKey(currentModel.sessionDate, currentModel.type)
  sessionRecords.set(key, progress)
  storageAvailable = saveProgress(browserStorage(), key, progress)
  // Once tracking starts, keep this session fixed as time and settings change.
  automaticDate = false
  syncUrl()
  progressFeedback.textContent = storageAvailable ? 'Registo atualizado neste navegador.' : 'Registo atualizado nesta página; não foi possível guardá-lo no navegador.'
  render()
})

window.addEventListener('storage', event => {
  if (event.key === null) sessionRecords.clear()
  else sessionRecords.delete(event.key)
  if (currentModel && (event.key === null || event.key === progressKey(currentModel.sessionDate, currentModel.type))) render()
})
window.addEventListener('popstate', loadUrlState)
loadUrlState()
syncUrl()

function refreshTime() {
  const now = new Date()
  if (automaticDate) {
    dateInput.value = suggestedDate(now)
    syncUrl()
  }
  render(now)
}
setInterval(refreshTime, 60_000)
window.addEventListener('focus', refreshTime)
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshTime() })
