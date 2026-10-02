import { http, HttpResponse } from 'msw'
import { nextId } from '../lib/http'
import {
  locations,
  locationTypes,
  type SeedLocation,
  type SeedLocationType
} from '../seed/locations'
import { api } from '../url'

const searchOf = (request: Request) =>
  new URL(request.url).searchParams.get('search')?.toLowerCase()

export const locationsHandlers = [
  http.get(api('location-types/all/'), () => HttpResponse.json(locationTypes)),
  http.get(api('location-types/'), ({ request }) => {
    const search = searchOf(request)
    const results = locationTypes.filter(
      row => !search || `${row.name} ${row.description ?? ''}`.toLowerCase().includes(search)
    )
    return HttpResponse.json({ count: results.length, results })
  }),
  http.post(api('location-types/'), async ({ request }) => {
    const type = {
      ...((await request.json()) as Omit<SeedLocationType, 'id' | 'position'>),
      id: nextId(locationTypes),
      position: nextId(locationTypes)
    }
    locationTypes.push(type)
    return HttpResponse.json(type, { status: 201 })
  }),
  http.patch(api('location-types/:id/'), async ({ params, request }) => {
    const type = locationTypes.find(row => row.id === Number(params.id))
    if (!type) return new HttpResponse(null, { status: 404 })
    Object.assign(type, await request.json())
    return HttpResponse.json(type)
  }),
  http.delete(api('location-types/:id/'), ({ params }) => {
    const id = Number(params.id)
    if (locations.some(row => row.location_type_id === id))
      return HttpResponse.json(
        {
          detail: 'This type is still used by locations. Reassign them first.'
        },
        { status: 409 }
      )
    const at = locationTypes.findIndex(row => row.id === id)
    if (at !== -1) locationTypes.splice(at, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(api('locations/'), ({ request }) => {
    const search = searchOf(request)
    const results = locations.filter(
      row => !search || `${row.code} ${row.description ?? ''}`.toLowerCase().includes(search)
    )
    return HttpResponse.json({ count: results.length, results })
  }),
  http.post(api('locations/'), async ({ request }) => {
    const location = {
      ...((await request.json()) as Omit<SeedLocation, 'id' | 'position'>),
      id: nextId(locations),
      position: nextId(locations)
    }
    locations.push(location)
    return HttpResponse.json(location, { status: 201 })
  }),
  http.patch(api('locations/:id/'), async ({ params, request }) => {
    const location = locations.find(row => row.id === Number(params.id))
    if (!location) return new HttpResponse(null, { status: 404 })
    Object.assign(location, await request.json())
    return HttpResponse.json(location)
  }),
  http.delete(api('locations/:id/'), ({ params }) => {
    const at = locations.findIndex(row => row.id === Number(params.id))
    if (at !== -1) locations.splice(at, 1)
    return new HttpResponse(null, { status: 204 })
  })
]
