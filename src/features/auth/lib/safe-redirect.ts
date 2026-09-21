// Browsers treat `//host` and `/\host` as protocol-relative, i.e. an open redirect.
const SAFE_REDIRECT_PATH = /^\/(?![/\\])/

export const DEFAULT_AFTER_LOGIN = '/profile'

export const isSafeRedirectPath = (value: unknown): value is string =>
  typeof value === 'string' && SAFE_REDIRECT_PATH.test(value)

export const safeRedirectPath = (value: unknown, fallback = DEFAULT_AFTER_LOGIN) =>
  isSafeRedirectPath(value) ? value : fallback
