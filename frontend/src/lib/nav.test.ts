import { describe, expect, it } from 'vitest'
import { displayName, homeFor, navFor, primaryRole, ROLE_LABELS } from './nav'
import type { AuthUser } from './types'

function user(overrides: Partial<AuthUser>): AuthUser {
  return {
    id: 'u1',
    email: 'x@y.com',
    firstName: 'Test',
    lastName: 'User',
    roles: ['teacher'],
    permissions: [],
    branchId: null,
    ...overrides,
  }
}

describe('ROLE_LABELS', () => {
  it('labels every tenant role', () => {
    expect(ROLE_LABELS['organization-owner']).toBe('Organization Owner')
    expect(ROLE_LABELS['transport-manager']).toBe('Transport Manager')
    expect(ROLE_LABELS['hostel-manager']).toBe('Hostel Manager')
    expect(ROLE_LABELS.accountant).toBe('Accountant')
  })
})

describe('primaryRole', () => {
  it('returns erp-superadmin for superadmins', () => {
    expect(primaryRole(user({ isSuperAdmin: true, roles: ['accountant'] }))).toBe('erp-superadmin')
  })

  it('returns the first role otherwise', () => {
    expect(primaryRole(user({ roles: ['hr', 'teacher'] }))).toBe('hr')
  })
})

describe('displayName', () => {
  it('joins first and last name', () => {
    expect(displayName(user({}))).toBe('Test User')
  })

  it('falls back to email', () => {
    expect(displayName(user({ firstName: '', lastName: '' }))).toBe('x@y.com')
  })
})

describe('homeFor', () => {
  const cases: Array<[Partial<AuthUser>, string]> = [
    [{ isSuperAdmin: true }, '/admin'],
    [{ roles: ['organization-owner'] }, '/owner'],
    [{ roles: ['principal'] }, '/principal'],
    [{ roles: ['teacher'] }, '/teacher'],
    [{ roles: ['student'] }, '/student'],
    [{ roles: ['parent'] }, '/parent'],
    [{ roles: ['accountant'] }, '/accountant'],
    [{ roles: ['hr'] }, '/hr'],
    [{ roles: ['reception'] }, '/reception'],
    [{ roles: ['librarian'] }, '/librarian'],
    [{ roles: ['transport-manager'] }, '/transport'],
    [{ roles: ['hostel-manager'] }, '/hostel'],
    [{ roles: ['unknown-role'] }, '/portal'],
  ]

  it.each(cases)('routes %o to the right home', (overrides, expected) => {
    expect(homeFor(user(overrides))).toBe(expected)
  })
})

describe('navFor', () => {
  it('uses the tenant nav for the primary role', () => {
    const nav = navFor(user({ roles: ['accountant'] }))
    expect(nav[0].to).toBe('/accountant')
    expect(nav.some((n) => n.label === 'Fees & Billing')).toBe(true)
  })

  it('uses super admin nav for superadmins', () => {
    const nav = navFor(user({ isSuperAdmin: true }))
    expect(nav.some((n) => n.to === '/tenants')).toBe(true)
    expect(nav.some((n) => n.to === '/audit')).toBe(true)
  })

  it('falls back to reception nav for unknown roles', () => {
    const nav = navFor(user({ roles: ['unknown'] }))
    expect(nav[0].to).toBe('/reception')
  })
})
