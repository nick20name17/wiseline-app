import { RiAddCircleLine } from '@remixicon/react'
import { useStore } from '@tanstack/react-form'
import { useState } from 'react'

import { useUpsertFlow } from '@/api/flows/query'
import { CreateFlowSchema, type Flow } from '@/api/flows/schema'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { useAppForm } from '@/hooks/app-form'
import type { ModalState } from '@/types/modal'

interface UpsertFlowsFormProps {
  onSuccess: () => void
  flow?: Flow
  categoryId: string
}

export const UpsertFlowsForm = ({ flow, onSuccess, categoryId }: UpsertFlowsFormProps) => {
  const isEdit = !!flow

  const { handleUpsertFlow, isPending } = useUpsertFlow({
    onSuccess: () => {
      onSuccess()
      if (!isEdit) form.reset()
    }
  })

  const form = useAppForm({
    defaultValues: {
      name: flow?.name ?? '',
      ...(flow?.description ? { description: flow?.description } : {})
    },
    validators: {
      onSubmit: CreateFlowSchema
    },
    onSubmit: async ({ value }) => {
      const payload = CreateFlowSchema.parse(value)
      handleUpsertFlow({ id: flow?.id, payload: { ...payload, category: categoryId } })
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
            placeholder='Silent'
          />
        )}
      />

      <form.AppField
        name='description'
        children={(field) => (
          <field.TextAreaField
            label='Description'
            placeholder='Enter flow description'
          />
        )}
      />

      <Button
        type='submit'
        className='w-24'
        isLoading={isPending}
        disabled={isPending || isPristine}
      >
        {isEdit ? 'Update' : 'Create'}
      </Button>
    </form>
  )
}

export const CreateFlowModal = ({
  className,
  categoryId
}: {
  className?: string
  categoryId: string
}) => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        <Button className={className}>
          <RiAddCircleLine />
          <span>Create Flow</span>
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Flow</DialogTitle>
        </DialogHeader>

        <UpsertFlowsForm
          onSuccess={() => setOpen(false)}
          categoryId={categoryId}
        />
      </DialogContent>
    </Dialog>
  )
}

interface UpdateFlowModalProps extends ModalState {
  flow?: Flow
  categoryId: string
}

export const UpdateFlowModal = ({ flow, open, setOpen, categoryId }: UpdateFlowModalProps) => {
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Flow</DialogTitle>
        </DialogHeader>

        <UpsertFlowsForm
          categoryId={categoryId}
          flow={flow}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
