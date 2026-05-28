import { RiAddCircleLine } from '@remixicon/react'
import { useStore } from '@tanstack/react-form'
import { useState } from 'react'

import { useUpsertPriority } from '@/api/priorities/query'
import { CreatePrioritySchema, type Priority } from '@/api/priorities/schema'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Field, FieldError } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useAppForm } from '@/hooks/app-form'
import { cn } from '@/lib/utils'
import type { ModalState } from '@/types/modal'

const DEFAULT_PRIORITY_COLORS = [
  { color: '#0090FF', label: 'Blue' },
  { color: '#09D8B5', label: 'Teal' },
  { color: '#222222', label: 'Gray' },
  { color: '#FFCA14', label: 'Yellow' },
  { color: '#EF5E01', label: 'Orange' },
  { color: '#3E9B4F', label: 'Green' },
  { color: '#CA244C', label: 'Pink' },
  { color: '#8145B5', label: 'Purple' },
  { color: '#CE2C31', label: 'Red' }
]

interface UpsertPriorityFormProps {
  onSuccess: () => void
  priority?: Priority
}

export const UpsertPriorityForm = ({ priority, onSuccess }: UpsertPriorityFormProps) => {
  const isEdit = !!priority

  const { handleUpsertPriority, isPending } = useUpsertPriority({
    onSuccess: () => {
      onSuccess()
      if (!isEdit) form.reset()
    }
  })

  const form = useAppForm({
    defaultValues: {
      name: priority?.name ?? '',
      color: priority?.color ?? ''
    },
    validators: {
      onSubmit: CreatePrioritySchema
    },
    onSubmit: async ({ value }) => {
      const payload = CreatePrioritySchema.parse(value)
      handleUpsertPriority({ id: priority?.id, payload })
    }
  })

  const isPristine = useStore(form.store, ({ isPristine }) => isPristine)

  return (
    <form
      className='space-y-4'
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.AppField
        name='name'
        children={(field) => (
          <field.TextField
            label='Name'
            placeholder='Now'
          />
        )}
      />

      <form.Field
        name='color'
        children={(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

          return (
            <Field data-invalid={isInvalid}>
              <Label>Color</Label>

              <RadioGroup
                value={field.state.value}
                onValueChange={field.handleChange}
                className='mt-3 flex'
              >
                {DEFAULT_PRIORITY_COLORS.map(({ color }) => (
                  <Label
                    key={color}
                    htmlFor={`color-${color}`}
                    style={{ backgroundColor: color }}
                    className={cn(
                      'flex size-5 cursor-pointer rounded-sm transition-all',
                      field.state.value === color ? 'ring-foreground ring-2 ring-offset-2' : ''
                    )}
                  >
                    <RadioGroupItem
                      value={color}
                      id={`color-${color}`}
                      className='sr-only'
                    />
                  </Label>
                ))}
              </RadioGroup>

              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      />

      <Button
        type='submit'
        className='w-24'
        disabled={isPending || isPristine}
        isLoading={isPending}
      >
        {isEdit ? 'Update' : 'Create'}
      </Button>
    </form>
  )
}

export const CreatePriorityModal = () => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        <Button>
          <RiAddCircleLine />
          <span>Create priority</span>
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create priority</DialogTitle>
        </DialogHeader>

        <UpsertPriorityForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

interface UpdatePriorityModalProps extends ModalState {
  priority?: Priority
}

export const UpdatePriorityModal = ({ priority, open, setOpen }: UpdatePriorityModalProps) => {
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update priority</DialogTitle>
        </DialogHeader>

        <UpsertPriorityForm
          priority={priority}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
