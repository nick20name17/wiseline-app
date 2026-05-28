import { RiCheckboxCircleFill, RiCloseCircleFill } from '@remixicon/react'
import { useForm, useStore } from '@tanstack/react-form'
import { useMemo, useState } from 'react'
import * as z from 'zod/mini'

import { Button } from '@/components/ui/button'
import { Field, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface BasicInputProps {
  className?: string
  placeholder?: string
  disabled?: boolean
}

type BasicNumberInputProps = BasicInputProps & {
  type: 'number'
  value: number | undefined
  setValue: (value: number | undefined) => void
  onSubmit?: ({ value }: { value: number }) => void
  min?: number
  max?: number
}

type BasicTextInputProps = BasicInputProps & {
  type: 'text'
  value: string | undefined
  setValue: (value: string | undefined) => void
  onSubmit?: ({ value }: { value: string }) => void
}

type BasicInputWithSubmitProps = BasicNumberInputProps | BasicTextInputProps

export const BasicInputWithSubmit = (props: BasicInputWithSubmitProps) => {
  const { className, placeholder = '', type, disabled = false, value, setValue, onSubmit } = props

  const min = type === 'number' ? (props.min ?? 0) : 0
  const max = type === 'number' ? (props.max ?? Infinity) : Infinity

  const schema = useMemo(() => {
    if (type === 'number') {
      return z.object({
        value: z.coerce.number<number>().check(z.minimum(min)).check(z.maximum(max))
      })
    }

    return z.object({
      value: z.string().check(z.minLength(1, { error: 'Value is required' }))
    })
  }, [type, min, max])

  const [focused, setFocused] = useState(false)

  const form = useForm({
    defaultValues: { value },
    validators: {
      onChange: schema as never,
      onSubmit: schema as never
    },
    onSubmit: ({ value: formValues }) => {
      const payload = schema.parse(formValues)

      if (type === 'number') {
        onSubmit?.({ value: payload.value as number })
      } else {
        onSubmit?.({ value: payload.value as string })
      }

      form.reset({ value: payload.value })
      setFocused(false)
    }
  })

  const { isPristine, isValid } = useStore(form.store, (s) => s)

  return (
    <form
      className={cn('relative w-full overflow-clip', className)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false)
      }}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      noValidate
    >
      <form.Field
        name='value'
        children={(field) => {
          const invalid = field.state.meta.isTouched && !field.state.meta.isValid

          return (
            <Field
              data-invalid={invalid}
              className='h-[inherit]'
            >
              <Input
                disabled={disabled}
                type={type}
                placeholder={placeholder}
                className={cn('h-[inherit] pr-7 focus-visible:ring-0')}
                {...(type === 'number' ? { min, max } : {})}
                value={field.state.value ?? ''}
                onBlur={field.handleBlur}
                onChange={(e) => {
                  const raw = e.target.value

                  if (type === 'number') {
                    const next = raw === '' ? undefined : Number(raw)
                    const safeNext = Number.isFinite(next as number) ? (next as number) : undefined
                    field.handleChange(safeNext)
                    setValue(safeNext)
                  } else {
                    const next = raw === '' ? undefined : raw
                    field.handleChange(next)
                    setValue(next)
                  }
                }}
              />
              {invalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      />

      <Button
        type='submit'
        variant='ghost'
        size='icon-sm'
        disabled={disabled || isPristine || !isValid}
        aria-label='Submit input'
        className={cn(
          'group text-primary absolute top-1/2 right-2.5 size-4 -translate-y-1/2 rounded-full bg-transparent p-1 transition-transform duration-200 ease-in-out hover:bg-transparent',
          focused ? 'translate-x-0' : 'translate-x-[200%]'
        )}
      >
        {isValid ? (
          <RiCheckboxCircleFill className='group-hover:text-primary/90' />
        ) : (
          <RiCloseCircleFill className='text-destructive' />
        )}
      </Button>
    </form>
  )
}
