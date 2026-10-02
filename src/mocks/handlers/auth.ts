import { http, HttpResponse } from 'msw'
import { api } from '../url'

// The client reads only the `user_id` claim, so the token is a JWT in shape and nothing more.
const token = (userId: number) => {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '')
  return `${encode({ alg: 'none' })}.${encode({ user_id: userId })}.mock`
}

/** The admin, signed in before the review opens. */
export const reviewSession = { accessToken: token(1), refreshToken: token(1) }

export const authHandlers = [
  // Every address signs in as the admin: a reviewer is looking at screens, not at credentials.
  http.post(api('token/'), () => HttpResponse.json({ access: token(1), refresh: token(1) })),
  http.post(api('token/refresh/'), () =>
    HttpResponse.json({ access: token(1), refresh: token(1) })
  ),
  http.post(api('users/password-reset/'), () => new HttpResponse(null, { status: 202 })),
  http.post(api('users/password-reset-confirm/:uid64/:token/'), () => HttpResponse.json({}))
]
