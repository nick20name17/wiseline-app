import { http, HttpResponse } from 'msw'
import { api } from '../url'

export const departments = [
  { id: 1, name: 'Trim', code: 'trim', position: 1, max_package_weight: 500 },
  {
    id: 2,
    name: 'Rollforming',
    code: 'rollforming',
    position: 2,
    max_package_weight: 2000
  },
  {
    id: 3,
    name: 'Accessories',
    code: 'accessories',
    position: 3,
    max_package_weight: null
  }
]

export const departmentHandlers = [
  http.get(api('departments/all/'), () => HttpResponse.json(departments)),
  http.get(api('departments/users/assignments/'), ({ request }) => {
    const params = new URL(request.url).searchParams
    return HttpResponse.json([
      {
        user: Number(params.get('user_id')),
        department: Number(params.get('department_id')),
        role: 'manager'
      }
    ])
  })
]
