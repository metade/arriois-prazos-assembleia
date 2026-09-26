import { formatDate, parseDate, parts } from './dates.js'

// Código do Trabalho, art. 234.º: feriados nacionais obrigatórios. Lisboa observa
// também 13 de junho (Santo António). Carnaval é facultativo (art. 235.º).
// A Páscoa gregoriana usa o algoritmo de Meeus/Jones/Butcher.
export function easter(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k + 7 * 7) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function holidays(year, carnival = false) {
  const fixed = {
    '01-01': 'Ano Novo', '04-25': 'Dia da Liberdade', '05-01': 'Dia do Trabalhador',
    '06-10': 'Dia de Portugal', '06-13': 'Santo António · feriado municipal de Lisboa',
    '08-15': 'Assunção de Nossa Senhora', '10-05': 'Implantação da República',
    '11-01': 'Dia de Todos os Santos', '12-01': 'Restauração da Independência',
    '12-08': 'Imaculada Conceição', '12-25': 'Natal'
  }
  const result = new Map(Object.entries(fixed).map(([date, name]) => [`${year}-${date}`, name]))
  const sunday = parseDate(easter(year))
  result.set(formatDate(sunday - 2), 'Sexta-feira Santa')
  result.set(formatDate(sunday), 'Domingo de Páscoa')
  result.set(formatDate(sunday + 60), 'Corpo de Deus')
  if (carnival) result.set(formatDate(sunday - 47), 'Terça-feira de Carnaval · facultativo')
  return result
}

export function latestWorkingDate(value, carnival = false) {
  let cursor = parseDate(value)
  const crossed = []
  while (true) {
    const date = formatDate(cursor)
    const { year, weekday } = parts(cursor)
    const holiday = holidays(year, carnival).get(date)
    if (weekday !== 0 && weekday !== 6 && !holiday) return { date, holidays: crossed }
    if (holiday && weekday !== 0 && weekday !== 6) crossed.push({ date, name: holiday })
    cursor--
  }
}

export function workingDaysBefore(value, amount, carnival = false) {
  let cursor = parseDate(value)
  const crossed = []
  const cache = new Map()
  while (amount > 0) {
    cursor--
    const date = formatDate(cursor)
    const { year, weekday } = parts(cursor)
    if (!cache.has(year)) cache.set(year, holidays(year, carnival))
    const holiday = cache.get(year).get(date)
    if (holiday && weekday !== 0 && weekday !== 6) crossed.push({ date, name: holiday })
    if (weekday !== 0 && weekday !== 6 && !holiday) amount--
  }
  return { date: formatDate(cursor), holidays: crossed }
}
