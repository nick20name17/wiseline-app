import * as z from 'zod'

import { persisted } from '@/store/persisted'

/**
 * The coil inventory, and the one thing two departments genuinely share.
 *
 * Department isolation is the prototype's founding rule — Trim's work must not touch Rollforming's —
 * and coils are its single deliberate exception (N-117): both departments read the same physical
 * stock. A coil's checked-in location is still exclusive, so a coil in Trim is not in Rollforming.
 *
 * The version is part of the contract, not decoration: the prototype refuses a stored payload whose
 * version it does not know rather than migrating it, because a half-understood coil is worse than a
 * re-seeded one. Bump it whenever the record's shape changes.
 */
export const COILS_VERSION = 4

export const CoilSchema = z.object({
  id: z.union([z.number(), z.string()]),
  productId: z.string().default(''),
  color: z.string().default(''),
  width: z.number().default(0),
  gauge: z.number().nullable().default(null),
  coilNumber: z.string().default(''),
  /** Radial wind, left blank on a coil EBMS has only just pushed in. */
  thickness: z.number().nullable().default(null),
  linearFeet: z.number().default(0),
  weight: z.number().default(0),
  /** Where it is checked in. Mutually exclusive — see N-117a. */
  locRollforming: z.boolean().default(false),
  locTrim: z.boolean().default(false),
  slinetIn: z.boolean().default(false),
  note: z.string().default(''),
  folder: z.string().default(''),
  grade: z.number().nullable().default(null),
  /** Both gate the Coil Adjustment window. */
  materialThickness: z.number().nullable().default(null),
  coreOD: z.number().nullable().default(null)
})

export type Coil = z.infer<typeof CoilSchema>

const StoredSchema = z.object({
  version: z.literal(COILS_VERSION),
  coils: z.array(CoilSchema),
  updatedAt: z.number().optional()
})

export const canonicalCoils = persisted<Coil[] | null, z.infer<typeof StoredSchema>>({
  key: 'wl_coils_v1',
  schema: StoredSchema,
  fallback: () => null,
  decode: stored => stored.coils,
  encode: coils => ({ version: COILS_VERSION, coils: coils ?? [], updatedAt: Date.now() })
})
