import { RequiredLabel } from '@/components/required-label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Field, FieldError } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText
} from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Package } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  maxPackageWeightFormSchema,
  useUpdateMaxPackageWeight,
  type Department,
  type MaxPackageWeightForm as MaxPackageWeightFormValues
} from '../api'

// `Field` and `aria-invalid` both want `true` or nothing, never `false`.
const invalid = (error: unknown) => (error ? true : undefined)

// An emptied box is left for the schema to name as missing, rather than read as 0.
const asNumber = (value: string) => (value.trim() === '' ? undefined : Number(value))

type MaxPackageFormProps = { department: Department; onSuccess: () => void }

const MaxPackageForm = ({ department, onSuccess }: MaxPackageFormProps) => {
  const form = useForm<MaxPackageWeightFormValues>({
    resolver: standardSchemaResolver(maxPackageWeightFormSchema),
    defaultValues: { max_package_weight: department.max_package_weight ?? undefined }
  })

  const mutation = useUpdateMaxPackageWeight(onSuccess)
  const { errors } = form.formState

  return (
    <form
      onSubmit={form.handleSubmit(values => mutation.mutate({ id: department.id, values }))}
      noValidate
    >
      <Field data-invalid={invalid(errors.max_package_weight)}>
        <RequiredLabel htmlFor='max-package-weight'>Max weight per package</RequiredLabel>
        <InputGroup>
          <InputGroupInput
            id='max-package-weight'
            type='number'
            min={0}
            step='any'
            inputMode='decimal'
            placeholder='e.g. 45'
            aria-invalid={invalid(errors.max_package_weight)}
            {...form.register('max_package_weight', { setValueAs: asNumber })}
          />
          <InputGroupAddon align='inline-end'>
            <InputGroupText>lb</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <FieldError errors={[errors.max_package_weight]} />
      </Field>

      <div className='mt-6 flex justify-end gap-2'>
        <DialogClose render={<Button variant='ghost' />}>Cancel</DialogClose>
        <Button type='submit' disabled={mutation.isPending || !form.formState.isDirty}>
          {mutation.isPending ? <Spinner data-icon='inline-start' /> : null}
          Save
        </Button>
      </div>
    </form>
  )
}

type MaxPackageDialogProps = { department: Department }

/**
 * The heaviest package the department ships p1 (912,358): one over it turns red on the board and
 * asks for an override.
 */
export const MaxPackageDialog = ({ department }: MaxPackageDialogProps) => {
  const [open, setOpen] = useState(false)
  const max = department.max_package_weight

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant='outline' />}>
        <Package data-icon='inline-start' />
        Max package · {max === null ? 'no limit' : `${max} lb`}
      </DialogTrigger>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Max package · {department.name}</DialogTitle>
          <DialogDescription>
            A package heavier than this turns red and asks for an override.
          </DialogDescription>
        </DialogHeader>
        {/* The popup unmounts once closed, so a cancelled draft is not there the next time it opens. */}
        <MaxPackageForm department={department} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
