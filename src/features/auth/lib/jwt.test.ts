import { describe, expect, it } from 'vitest'
import { userIdFromToken } from './jwt'

const token = (claims: object) =>
  `h.${btoa(JSON.stringify(claims)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.s`

describe('userIdFromToken', () => {
  it("reads this deployment's user_id before fastapi-users' sub", () => {
    expect(userIdFromToken(token({ user_id: 7, sub: '9' }))).toBe(7)
    expect(userIdFromToken(token({ sub: '9' }))).toBe(9)
    expect(userIdFromToken(token({ user_id: '12' }))).toBe(12)
  })

  it('reads a payload whose base64url has - and _ in it', () => {
    // «>>>» and «???» encode to base64 with + and /.
    expect(userIdFromToken(token({ user_id: 5, pad: '>>>???' }))).toBe(5)
  })

  it('gives no id for a token it cannot read', () => {
    expect(userIdFromToken('garbage')).toBeNull()
    expect(userIdFromToken('h.%%%.s')).toBeNull()
    expect(userIdFromToken(token({}))).toBeNull()
    expect(userIdFromToken(token({ user_id: 'abc' }))).toBeNull()
    expect(userIdFromToken(token({ user_id: { id: 1 } }))).toBeNull()
  })
})
