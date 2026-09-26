import './style.css'
import { calculate, earliestSessionDate, REVIEWED_ON, SOURCES } from './rules.js'
import { daysBefore, longDate, parseDate, parts, shortMonth, todayInLisbon } from './dates.js'

const app = document.querySelector('#app')
app.innerHTML = `
  <header class="site-header"><div class="shell header-inner"><div class="brand"><span class="seal" aria-hidden="true">A</span><span>Assembleia de Arroios <small>Calendário de preparação</small></span></div><a href="#fontes">Fontes e regras</a></div></header>
  <main class="shell">
    <div class="intro"><p class="eyebrow">Ferramenta de preparação de sessões</p><h1>Os prazos, antes da assembleia.</h1><p class="lead">Escolha a data e veja o que a Junta, a Mesa e os membros precisam de preparar.</p></div>
    <form class="controls" id="controls">
      <div class="field"><label for="session-date">Data da sessão</label><input id="session-date" type="date" required aria-describedby="planning-note" /></div>
      <fieldset class="field"><legend>Tipo de sessão</legend><div class="segment"><label><input type="radio" name="type" value="ordinaria" /><span>Ordinária</span></label><label><input type="radio" name="type" value="extraordinaria" checked /><span>Extraordinária</span></label></div></fieldset>
      <div class="control-foot"><p id="planning-note"></p><label class="check"><input id="carnival" type="checkbox" /><span>Contar Carnaval como feriado facultativo</span></label></div>
    </form>
    <section class="calendar" aria-labelledby="calendar-title"><div class="section-heading"><div><p class="eyebrow">Da preparação ao PAOD</p><h2 id="calendar-title">O calendário da sessão</h2></div><p id="session-summary"></p></div><div id="results" aria-live="polite"></div></section>
    <details class="other" id="other"><summary><span><strong>Outros prazos</strong><small>Pedido individual para a ordem do dia formal e condições de sessões extraordinárias</small></span><span aria-hidden="true">⌄</span></summary><div id="other-content"></div></details>
    <section class="method" id="fontes"><h2>Fontes e método</h2><p>Este calendário ajuda a planear. Não conclui se uma sessão é legalmente válida: é necessário verificar a convocatória, a receção, a publicidade e o acesso real aos anexos.</p><div class="source-grid"><div><h3>Lei nacional</h3><p><a href="${SOURCES.law}" target="_blank" rel="noopener noreferrer">Lei n.º 75/2013, texto consolidado ↗</a></p><p>Regras de convocação, publicidade, PAOD e ordem do dia.</p></div><div><h3>Regimento local</h3><p><a href="${SOURCES.reg}" target="_blank" rel="noopener noreferrer">Regimento da Assembleia de Arroios ↗</a></p><p>PDF identificado como “dezembro 2021”; o texto declara aprovação em <strong>30 de junho de 2014</strong> e entrada em vigor em 1 de julho de 2014.</p></div><div><h3>Feriados</h3><p><a href="${SOURCES.labour}" target="_blank" rel="noopener noreferrer">Código do Trabalho, arts. 234.º e 235.º ↗</a></p><p>Feriados nacionais, 13 de junho em Lisboa e opção de Carnaval. Dias úteis excluem fins de semana.</p></div></div><p class="review">Regras verificadas em <strong>${REVIEWED_ON}</strong>. Antes de usar noutra data, confirme se as fontes foram alteradas. As sugestões internas são identificadas no calendário.</p></section>
  </main><footer class="site-footer"><div class="shell">Prazos da Assembleia de Arroios <span>·</span> Ferramenta de apoio ao planeamento</div></footer>`

const dateInput = document.querySelector('#session-date')
const carnivalInput = document.querySelector('#carnival')
const results = document.querySelector('#results')
const other = document.querySelector('#other-content')
let automaticDate = true
dateInput.value = earliestSessionDate(todayInLisbon(), 'extraordinaria')

function sourceMarkup(source) {
  const sources = Array.isArray(source) ? source : [source]
  return sources.map(item => item.url ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.label}</a>` : `<span>${item.label}</span>`).join(' <span aria-hidden="true">·</span> ')
}

function holidayMarkup(holidays = []) {
  if (!holidays.length) return ''
  const unique = [...new Map(holidays.map(item => [item.date, item])).values()]
  return `<p class="holiday">Na contagem: ${unique.map(item => `${item.name} (${longDate(item.date)})`).join('; ')}.</p>`
}

function render() {
  if (!dateInput.value) { results.innerHTML = '<p class="error">Escolha uma data para ver os prazos.</p>'; other.innerHTML = ''; return }
  try { parseDate(dateInput.value) } catch { results.innerHTML = '<p class="error">Introduza uma data válida.</p>'; other.innerHTML = ''; return }
  const type = document.querySelector('input[name="type"]:checked').value
  const initiativeInput = document.querySelector('#initiative-date')
  const initiativeDate = initiativeInput?.value || ''
  const model = calculate(dateInput.value, type, { carnival: carnivalInput.checked, initiativeDate })
  document.querySelector('#planning-note').textContent = automaticDate
    ? `Primeira data calculada desde hoje (${longDate(todayInLisbon())}), com afixação e expedição em dia útil. Confirme a expedição, a receção e o acesso aos anexos.`
    : 'Data escolhida por si. Confirme os prazos e as formalidades de expedição e receção.'
  document.querySelector('#session-summary').textContent = `${type === 'ordinaria' ? 'Sessão ordinária' : 'Sessão extraordinária'} · ${longDate(dateInput.value)}`
  results.innerHTML = model.dates.map(item => `<article class="deadline"><div class="date-mark"><time datetime="${item.date}"><span>${String(parts(parseDate(item.date)).day).padStart(2, '0')}</span><small>${shortMonth(item.date)} ${parts(parseDate(item.date)).year}</small></time></div><div class="deadline-body"><h3>${item.title}</h3><p class="route">${item.route}</p><p>${item.detail}</p>${holidayMarkup(item.holidays)}<p class="source">${sourceMarkup(item.source)}</p></div><span class="badge ${item.nature === 'Obrigatório' ? '' : 'soft'}">${item.nature}</span></article>`).join('')

  const request = model.memberRequest
  other.innerHTML = `<section class="other-block"><h3>Pedido de membro para a ordem do dia formal</h3><p>Um membro pode pedir, por escrito, a inclusão de um assunto da competência da Assembleia. É um direito distinto das recomendações, moções e votos apresentados no PAOD.</p><div class="conflict"><div><span>Lei nacional · ${type === 'ordinaria' ? '5' : '8'} dias úteis</span><strong>${longDate(request.national.date)}</strong><small>${sourceMarkup(request.nationalSource)}</small>${holidayMarkup(request.national.holidays)}</div><div><span>Regimento de Arroios · ${type === 'ordinaria' ? '8' : '5'} dias úteis</span><strong>${longDate(request.local.date)}</strong><small>${sourceMarkup(request.localSource)}</small>${holidayMarkup(request.local.holidays)}</div></div><p class="caution"><strong>Divergência:</strong> os prazos não coincidem. Para planeamento cauteloso, considere o mais cedo: <strong>${longDate(request.cautious)}</strong>. A aplicação jurídica da divergência exige apreciação própria.</p></section>${type === 'extraordinaria' ? `<section class="other-block"><h3>Iniciativa ou requerimento de sessão extraordinária</h3><p>A lei exige convocação nos <strong>5 dias seguintes</strong> à iniciativa da Mesa ou receção do requerimento, e realização da sessão <strong>3 a 10 dias depois</strong> da convocação. O regimento exige ainda pelo menos <strong>5 dias de calendário</strong> entre convocação e sessão. Para esta sessão, a janela conjunta de convocação é de <strong>${longDate(daysBefore(dateInput.value, 10))}</strong> a <strong>${longDate(model.callDate)}</strong>, sujeita também ao prazo contado da iniciativa.</p><label for="initiative-date">Data da iniciativa ou receção do requerimento <span class="optional">opcional</span></label><input id="initiative-date" type="date" value="${initiativeDate}" /><div id="initiative-result">${model.initiative ? `<p>Convocação até <strong>${longDate(model.initiative.latestCall)}</strong> pelo prazo de 5 dias após a iniciativa/requerimento. ${model.initiative.latestCall < daysBefore(dateInput.value, 10) || model.initiative.date > model.callDate ? 'As datas introduzidas não cabem na janela calculada para esta sessão; confirme os factos e os prazos.' : 'Compare esta data com a janela acima.'}</p>` : '<p>Introduza a data para calcular o limite ligado à iniciativa ou ao requerimento. Sem ela, esse limite não pode ser determinado.</p>'}</div><p class="source">${sourceMarkup({ label: 'Lei n.º 75/2013, art. 12.º, n.os 2 e 3', url: SOURCES.law })} · ${sourceMarkup({ label: 'Regimento, art. 24.º', url: SOURCES.reg })}</p></section>` : `<section class="other-block"><h3>Sessões ordinárias</h3><p>A lei prevê quatro sessões anuais, em abril, junho, setembro e novembro ou dezembro. O PAOD tem previsão legal para estas sessões; o regimento de Arroios também o prevê nas extraordinárias.</p><p class="source">${sourceMarkup([{ label: 'Lei n.º 75/2013, arts. 11.º e 52.º', url: SOURCES.law }, { label: 'Regimento, arts. 23.º e 33.º', url: SOURCES.reg }])}</p></section>`}`
  document.querySelector('#initiative-date')?.addEventListener('change', render)
}

function updateFromControl(event) {
  if (event.target === dateInput) automaticDate = false
  if (automaticDate && event.target !== dateInput) {
    const type = document.querySelector('input[name="type"]:checked').value
    dateInput.value = earliestSessionDate(todayInLisbon(), type, { carnival: carnivalInput.checked })
  }
  render()
}

document.querySelector('#controls').addEventListener('input', updateFromControl)
document.querySelector('#controls').addEventListener('change', updateFromControl)
render()
