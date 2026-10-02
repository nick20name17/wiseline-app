import { http, HttpResponse } from 'msw'
import {
  coilFilters,
  coilLots,
  coilsForDepartment,
  feetFromThickness,
  folderName,
  serializeCoil,
  thicknessFromFeet,
  type CoilFilterRow,
  type CoilLot
} from '../lib/coils'
import { bodyOf, nextId, notFound, paged, paramsOf, refuse } from '../lib/http'
import { folders } from '../seed/coils'
import { api } from '../url'

const lotById = (id: string) => coilLots.find(lot => lot.id === id)

const poundsPerFoot = (lot: CoilLot) => (lot.width * lot.material_thickness * 490) / 144

/** The other two figures follow from whichever one was entered, through thickness and core. */
const settle = (
  lot: CoilLot,
  values: { coil_thickness?: number; linear_feet?: number; weight?: number }
) => {
  const perFoot = poundsPerFoot(lot)
  const feet =
    values.linear_feet ??
    (values.weight !== undefined
      ? Math.round(values.weight / perFoot)
      : feetFromThickness(
          values.coil_thickness ?? lot.coil_thickness,
          lot.material_thickness,
          lot.core_od
        ))
  return {
    linear_feet: feet,
    coil_thickness: thicknessFromFeet(feet, lot.material_thickness, lot.core_od),
    weight: Math.round(feet * perFoot)
  }
}

const filterOf = (row: CoilFilterRow) => ({
  ...row,
  folder_name: row.folder_autoid ? folderName(row.folder_autoid) : null
})

const departmentOf = (request: Request) => {
  const value = paramsOf(request).get('department_id')
  return value === null ? null : Number(value)
}

export const boardCoilsHandlers = [
  http.get(api('coils/lots/'), ({ request }) => {
    const department = departmentOf(request)
    const lots = department === null ? coilLots : coilsForDepartment(department)
    return HttpResponse.json(paged(request, lots.map(serializeCoil)))
  }),

  http.patch(api('coils/lots/:id/'), async ({ params, request }) => {
    const lot = lotById(String(params.id))
    if (!lot) return notFound()
    const edit = await bodyOf<{ material_thickness?: number; core_od?: number; note?: string }>(
      request
    )
    Object.assign(lot, edit)
    lot.coil_thickness = thicknessFromFeet(lot.linear_feet, lot.material_thickness, lot.core_od)
    return HttpResponse.json(serializeCoil(lot))
  }),

  // A coil sits in the Slinet or the Rollformer, not both; Trim is its own rack.
  http.post(api('coils/lots/:id/location/'), async ({ params, request }) => {
    const lot = lotById(String(params.id))
    if (!lot) return notFound()
    const where = await bodyOf<{
      in_trim?: boolean
      in_rollforming?: boolean
      in_slinet?: boolean
    }>(request)
    if (where.in_slinet && lot.width > 48) return refuse('This coil is too wide for the Slinet.')
    Object.assign(lot, where)
    if (where.in_slinet) lot.in_rollforming = false
    if (where.in_rollforming) lot.in_slinet = false
    return HttpResponse.json(serializeCoil(lot))
  }),

  http.post(api('coils/lots/:id/apply/'), async ({ params, request }) => {
    const lot = lotById(String(params.id))
    if (!lot) return notFound()
    const values = await bodyOf<{ coil_thickness?: number; linear_feet?: number; weight?: number }>(
      request
    )
    if (values.coil_thickness === 0) {
      return HttpResponse.json({
        action: 'deplete_and_delete',
        lot_autoid: lot.id,
        detail: `Coil ${lot.lot_number} will be depleted in EBMS and removed.`,
        coil_thickness: 0,
        linear_feet: 0,
        weight: 0
      })
    }
    const settled = settle(lot, values)
    return HttpResponse.json({
      action: 'make_adjustment',
      lot_autoid: lot.id,
      detail: `Linear Feet ${lot.linear_feet} → ${settled.linear_feet} goes to EBMS.`,
      ...settled
    })
  }),

  http.post(api('coils/lots/:id/adjust/'), async ({ params, request }) => {
    const lot = lotById(String(params.id))
    if (!lot) return notFound()
    Object.assign(lot, settle(lot, await bodyOf(request)))
    return HttpResponse.json(serializeCoil(lot))
  }),

  http.post(api('coils/lots/:id/deplete/'), ({ params }) => {
    const at = coilLots.findIndex(lot => lot.id === String(params.id))
    if (at === -1) return notFound()
    coilLots.splice(at, 1)
    return HttpResponse.json({ deleted: String(params.id) })
  }),

  http.get(api('coils/filters/'), ({ request }) => {
    const department = departmentOf(request)
    return HttpResponse.json(coilFilters.filter(row => row.department === department).map(filterOf))
  }),

  http.post(api('coils/filters/'), async ({ request }) => {
    const body = await bodyOf<
      Omit<CoilFilterRow, 'id' | 'folder_autoid'> & { folder_autoid?: string }
    >(request)
    const folder = body.folder_autoid ?? null
    if (
      coilFilters.some(row => row.department === body.department && row.folder_autoid === folder)
    ) {
      return refuse('This department already has a coil filter.', 409)
    }
    const row = {
      ...body,
      folder_autoid: folder,
      id: nextId(coilFilters)
    }
    coilFilters.push(row)
    return HttpResponse.json(filterOf(row), { status: 201 })
  }),

  http.patch(api('coils/filters/:id/'), async ({ params, request }) => {
    const row = coilFilters.find(filter => filter.id === Number(params.id))
    if (!row) return notFound()
    Object.assign(row, await bodyOf(request))
    return HttpResponse.json(filterOf(row))
  }),

  http.delete(api('coils/filters/:id/'), ({ params }) => {
    const at = coilFilters.findIndex(filter => filter.id === Number(params.id))
    if (at !== -1) coilFilters.splice(at, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(api('coils/folders/'), ({ request }) => {
    const department = departmentOf(request) ?? 0
    const admitted = coilsForDepartment(department)
    return HttpResponse.json(
      folders.flatMap(folder => {
        const count = admitted.filter(lot => lot.folder_id === folder.folder_id).length
        return count ? [{ ...folder, coils: count }] : []
      })
    )
  })
]
