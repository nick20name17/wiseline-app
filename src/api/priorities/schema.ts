import * as z from 'zod/mini'

export const PrioritySchema = z.object({
  id: z.number(),
  name: z.string().check(z.minLength(1, 'Required')),
  color: z.string().check(z.minLength(1, 'Required')),
  position: z.optional(z.number())
})

export const CreatePrioritySchema = z.omit(PrioritySchema, { id: true })

export const UpdatePrioritySchema = z.object({
  id: z.optional(z.number()),
  payload: CreatePrioritySchema
})

export type Priority = z.infer<typeof PrioritySchema>
export type CreatePriorityPayload = z.infer<typeof CreatePrioritySchema>
export type UpdatePriorityPayload = z.infer<typeof UpdatePrioritySchema>

export type PrioritiesApiResponse = Priority[]
