const pad = (value: number) => String(value).padStart(2, '0')

/** Local calendar day, the shape the API speaks — never `toISOString`, which shifts it into UTC. */
export const isoDay = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const parse = (iso: string) => {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const addDays = (iso: string, days: number) => {
  const date = parse(iso)
  date.setDate(date.getDate() + days)
  return isoDay(date)
}

export const today = () => isoDay(new Date())

/** Seeds are written as offsets from today, so the board is never an empty calendar. */
export const dayFromToday = (days: number) => addDays(today(), days)

export const isWeekend = (iso: string) => [0, 6].includes(parse(iso).getDay())

/**
 * The nth work day from today (negative: back), weekends stepped over. Today stands for 0 on a
 * work day, else the next Monday — a plant's "today" is never a Sunday.
 */
export const workDay = (offset: number) => {
  let day = today()
  const step = offset < 0 ? -1 : 1
  while (isWeekend(day)) day = addDays(day, 1)
  for (let left = Math.abs(offset); left > 0; left -= 1) {
    day = addDays(day, step)
    while (isWeekend(day)) day = addDays(day, step)
  }
  return day
}

/** A timestamp `daysAgo` days back at the given hour, for notes, completions and batches. */
export const stamp = (daysAgo: number, hour = 9, minute = 0) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

export const now = () => new Date().toISOString()
