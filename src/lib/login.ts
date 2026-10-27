import * as z from 'zod/mini'

// The API's rule for a worker who signs in without an email: it keeps the word in the email column.
const LOGIN_WORD = /^[a-z0-9][a-z0-9._-]{1,63}$/i
const EMAIL = z.email()

/** An email address, or a login word of letters, digits, '.', '_' and '-' (2–64 characters). */
export const isLogin = (value: string) =>
  value.includes('@') ? EMAIL.safeParse(value).success : LOGIN_WORD.test(value)

export const LOGIN_RULE = "Enter an email, or a login of letters, digits, '.', '_' or '-'"
