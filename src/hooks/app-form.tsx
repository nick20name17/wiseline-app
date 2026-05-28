import { createFormHook, createFormHookContexts } from '@tanstack/react-form'
import { useId } from 'react'

import { Field, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupTextarea
} from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'

interface NumberFieldProps {
  label: string
  placeholder?: string
  readonly?: boolean
  addon?: React.ReactNode
  min?: number
  max?: number
}

export const { fieldContext, formContext, useFieldContext } = createFormHookContexts()

const NumberField = ({
  label,
  placeholder,
  addon,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  readonly = false
}: NumberFieldProps) => {
  const id = useId()
  const field = useFieldContext<number | undefined>()

  const invalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <Field data-invalid={invalid}>
      <Label htmlFor={id}>{label}</Label>

      <InputGroup className='bg-background'>
        <InputGroupInput
          readOnly={readonly}
          id={id}
          type='number'
          min={min}
          max={max}
          value={field.state.value ?? ''}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value ? Number(e.target.value) : undefined)}
          placeholder={placeholder ?? '0'}
        />
        {addon && <InputGroupAddon align='inline-end'>{addon}</InputGroupAddon>}
      </InputGroup>

      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}

interface TextFieldProps {
  label: string
  placeholder?: string
  type?: 'text' | 'email'
}

const TextField = ({ label, placeholder, type = 'text' }: TextFieldProps) => {
  const id = useId()
  const field = useFieldContext<string>()

  const invalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <Field data-invalid={invalid}>
      <Label htmlFor={id}>{label}</Label>

      <Input
        id={id}
        value={field.state.value ?? ''}
        onBlur={field.handleBlur}
        type={type}
        onChange={(e) => field.handleChange(e.target.value)}
        placeholder={placeholder}
      />

      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}

const TextAreaField = ({ label, placeholder }: TextFieldProps) => {
  const id = useId()
  const field = useFieldContext<string>()

  const invalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <Field data-invalid={invalid}>
      <Label htmlFor={id}>{label}</Label>

      <InputGroup>
        <InputGroupTextarea
          id={id}
          value={field.state.value ?? ''}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          placeholder={placeholder}
        />
      </InputGroup>

      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    NumberField,
    TextField,
    TextAreaField
  },
  formComponents: {}
})
