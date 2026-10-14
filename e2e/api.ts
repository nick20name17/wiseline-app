import type { Page } from '@playwright/test'

// Unroutable on purpose: every call must hit a page.route mock, with no .env to supply.
export const API_URL = 'https://api.e2e.test'

export const user = {
  id: 1,
  email: 'emily@example.com',
  first_name: 'Emily',
  last_name: 'Johnson',
  role: 'manager',
  is_active: true
}

export const password = 'secret'

// `users/{id}` is reached through the id in the access token, so the mock has to be a real JWT shape.
const claims = btoa(JSON.stringify({ user_id: user.id })).replace(/=+$/, '')
const accessToken = `header.${claims}.signature`

export const mockAuthApi = async (page: Page) => {
  await page.route(`${API_URL}/token/`, route =>
    route.fulfill({ json: { access: accessToken, refresh: 'refresh' } })
  )
  await page.route(`${API_URL}/users/${user.id}/`, route => route.fulfill({ json: user }))
}
