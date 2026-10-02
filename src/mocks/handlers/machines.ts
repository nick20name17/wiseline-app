import { http, HttpResponse } from 'msw'
import { nextId } from '../lib/http'
import { categories, coilSuppliers, machines, type SeedMachine } from '../seed/machines'
import { api } from '../url'
import { departments } from './departments'

type Form = Omit<SeedMachine, 'id' | 'position' | 'description'>

// A profile can belong to one machine per department; the server names the clash.
const profileClash = (form: Partial<Form>, department: number | undefined, selfId?: number) => {
  for (const name of form.ebms_profile_names ?? []) {
    const owner = machines.find(
      row =>
        row.id !== selfId && row.department === department && row.ebms_profile_names.includes(name)
    )
    if (owner) return `Profile "${name}" is already on ${owner.name}.`
  }
  return null
}

export const machinesHandlers = [
  http.get(api('flows/all/'), () => HttpResponse.json(machines)),
  http.get(api('ebms/categories/all/'), () => HttpResponse.json(categories)),
  http.post(api('flows/'), async ({ request }) => {
    const form = (await request.json()) as Form
    const clash = profileClash(form, form.department)
    if (clash) return HttpResponse.json({ detail: clash }, { status: 409 })
    const id = nextId(machines)
    const machine = { description: null, ...form, id, position: id }
    machines.push(machine)
    return HttpResponse.json(machine, { status: 201 })
  }),
  http.patch(api('flows/:id/'), async ({ params, request }) => {
    const machine = machines.find(row => row.id === Number(params.id))
    if (!machine) return new HttpResponse(null, { status: 404 })
    const form = (await request.json()) as Partial<Form>
    const clash = profileClash(form, form.department ?? machine.department, machine.id)
    if (clash) return HttpResponse.json({ detail: clash }, { status: 409 })
    Object.assign(machine, form)
    return HttpResponse.json(machine)
  }),
  http.delete(api('flows/:id/'), ({ params }) => {
    const at = machines.findIndex(row => row.id === Number(params.id))
    if (at !== -1) machines.splice(at, 1)
    return new HttpResponse(null, { status: 204 })
  }),
  // The page edits a department's package ceiling next to its machines.
  http.patch(api('departments/:id/'), async ({ params, request }) => {
    const department = departments.find(row => row.id === Number(params.id))
    if (!department) return new HttpResponse(null, { status: 404 })
    Object.assign(department, await request.json())
    return HttpResponse.json(department)
  }),
  http.get(api('coil-suppliers/'), ({ request }) => {
    const params = new URL(request.url).searchParams
    const search = params.get('search')?.toLowerCase()
    const offset = Number(params.get('offset') ?? 0)
    const limit = Number(params.get('limit') ?? 50)
    const matched = coilSuppliers.filter(
      row => !search || `${row.supplier} ${row.name ?? ''}`.toLowerCase().includes(search)
    )
    return HttpResponse.json({
      count: matched.length,
      results: matched.slice(offset, offset + limit)
    })
  })
]
