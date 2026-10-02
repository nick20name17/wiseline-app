import { http, HttpResponse } from 'msw'
import { nextId } from '../lib/http'
import { holidays, type SeedHoliday } from '../seed/holidays'
import { api } from '../url'

export const holidaysHandlers = [
  http.get(api('holidays/'), ({ request }) => {
    const year = new URL(request.url).searchParams.get('year')
    return HttpResponse.json(
      holidays
        .filter(holiday => !year || holiday.date.startsWith(`${year}-`))
        .sort((a, b) => a.date.localeCompare(b.date))
    )
  }),
  http.post(api('holidays/'), async ({ request }) => {
    const holiday = {
      ...((await request.json()) as Omit<SeedHoliday, 'id'>),
      id: nextId(holidays)
    }
    holidays.push(holiday)
    return HttpResponse.json(holiday, { status: 201 })
  }),
  http.patch(api('holidays/:id/'), async ({ params, request }) => {
    const holiday = holidays.find(row => row.id === Number(params.id))
    if (!holiday) return new HttpResponse(null, { status: 404 })
    Object.assign(holiday, await request.json())
    return HttpResponse.json(holiday)
  }),
  http.delete(api('holidays/:id/'), ({ params }) => {
    const at = holidays.findIndex(row => row.id === Number(params.id))
    if (at !== -1) holidays.splice(at, 1)
    return new HttpResponse(null, { status: 204 })
  })
]
