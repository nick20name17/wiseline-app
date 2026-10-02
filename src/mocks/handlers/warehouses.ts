import { http, HttpResponse } from 'msw'
import { nextId } from '../lib/http'
import { locations } from '../seed/locations'
import { warehouses, type SeedWarehouse } from '../seed/warehouses'
import { api } from '../url'

// The list nests each warehouse's locations; the page only counts them.
const withLocations = (warehouse: SeedWarehouse) => ({
  ...warehouse,
  locations: locations.filter(row => row.warehouse_id === warehouse.id).map(({ id }) => ({ id }))
})

// Marking one as the default clears the one before.
const keepOneDefault = (kept: SeedWarehouse) => {
  if (!kept.is_default) return
  for (const warehouse of warehouses) if (warehouse !== kept) warehouse.is_default = false
}

export const warehousesHandlers = [
  http.get(api('warehouses/'), ({ request }) => {
    const search = new URL(request.url).searchParams.get('search')?.toLowerCase()
    const results = warehouses
      .filter(row => !search || `${row.name} ${row.address}`.toLowerCase().includes(search))
      .map(withLocations)
    return HttpResponse.json({ count: results.length, results })
  }),
  http.post(api('warehouses/'), async ({ request }) => {
    const warehouse = {
      ...((await request.json()) as Omit<SeedWarehouse, 'id'>),
      id: nextId(warehouses)
    }
    warehouses.push(warehouse)
    keepOneDefault(warehouse)
    return HttpResponse.json(withLocations(warehouse), { status: 201 })
  }),
  http.patch(api('warehouses/:id/'), async ({ params, request }) => {
    const warehouse = warehouses.find(row => row.id === Number(params.id))
    if (!warehouse) return new HttpResponse(null, { status: 404 })
    Object.assign(warehouse, await request.json())
    keepOneDefault(warehouse)
    return HttpResponse.json(withLocations(warehouse))
  }),
  http.delete(api('warehouses/:id/'), ({ params }) => {
    const id = Number(params.id)
    if (locations.some(row => row.warehouse_id === id))
      return HttpResponse.json(
        {
          detail: 'This warehouse still holds locations. Move or delete them first.'
        },
        { status: 409 }
      )
    const at = warehouses.findIndex(row => row.id === id)
    if (at !== -1) warehouses.splice(at, 1)
    return new HttpResponse(null, { status: 204 })
  })
]
