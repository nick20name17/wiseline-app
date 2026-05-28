import { RiCheckboxCircleLine, RiCloseCircleLine, RiRestartFill } from '@remixicon/react'
import { useStore } from '@tanstack/react-form'
import { type HtmlHTMLAttributes, type PropsWithChildren, useState } from 'react'
import * as z from 'zod/mini'

import type { OriginItem } from '@/api/origin-items/schema'
import { useUpsertRemanufacturing } from '@/api/remanufacturing/query'
import { RemanufacturingQtySchema } from '@/api/remanufacturing/schema'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { useAppForm } from '@/hooks/app-form'
import { cn } from '@/lib/utils'

export const RemanufactureButton = (props: HtmlHTMLAttributes<HTMLButtonElement>) => (
  <Button
    variant='ghost'
    size='sm'
    className={cn('bg-background', props.className)}
    {...props}
  >
    <RiRestartFill className='text-yellow' />
    <span>Remanufacture</span>
  </Button>
)

interface RemanufactoredDialogProps extends PropsWithChildren {
  open?: boolean
  setOpen?: (open: boolean) => void
  originItem: OriginItem
}

export const RemanufactoredDialog = ({
  open: externalOpen,
  setOpen: externalSetOpen,
  children,
  originItem
}: RemanufactoredDialogProps) => {
  const [step, setStep] = useState('form')
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = externalOpen !== undefined
  const open = isControlled ? externalOpen : internalOpen
  const setOpen = isControlled ? externalSetOpen : setInternalOpen

  const QtySchema = z.extend(RemanufacturingQtySchema, {
    pull_from_stock_qty: RemanufacturingQtySchema.shape.pull_from_stock_qty.check(
      z.maximum(originItem.on_hand ?? 0, { error: 'Must be <= stock' })
    ),
    remanufacturing_qty: RemanufacturingQtySchema.shape.remanufacturing_qty.check(
      z.maximum(originItem.quantity ?? 0, { error: 'Must be <= ordered quantity' })
    )
  })

  const form = useAppForm({
    defaultValues: {
      remanufacturing_qty:
        originItem.remanufacturing_qty > 0 ? originItem.remanufacturing_qty : undefined,
      pull_from_stock_qty:
        originItem.remanufacturing_from_stock_qty > 0
          ? originItem.remanufacturing_from_stock_qty
          : undefined
    },
    validators: {
      onChange: QtySchema,
      onSubmit: QtySchema
    },
    onSubmit: () => setStep('confirm')
  })

  const handleClose = () => setOpen?.(false)

  const { handleUpsertRemanufacturing, isPending } = useUpsertRemanufacturing({
    onSuccess: handleClose,
    originItem
  })

  const formValues = useStore(form.store, (s) => s.values)

  const handleFinal = () => {
    const parsed = QtySchema.parse(formValues)

    handleUpsertRemanufacturing({
      autoid: originItem.id,
      status: originItem?.item?.status ?? null,
      payload: {
        order: originItem.order,
        origin_item: originItem.id,
        status: originItem?.item?.status ?? null,
        ...parsed
      }
    })
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={setOpen}
    >
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>

      <AlertDialogContent
        className={cn(
          'transition-[width] will-change-[width]',
          step === 'form' ? 'sm:max-w-80' : 'sm:max-w-90'
        )}
        onAnimationEnd={() => {
          if (!open) setStep('form')
        }}
      >
        {step === 'form' ? (
          <RemanufacturedFormContent
            originItem={originItem}
            // @ts-expect-error - TODO: fix later
            form={form}
            onCancel={handleClose}
          />
        ) : (
          <RemanufacturedConfirmContent
            onCancel={handleClose}
            onContinue={handleFinal}
            isPending={isPending}
            onBack={() => setStep('form')}
          />
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface RemanufactoredFormContentProps {
  onCancel: () => void
  originItem: OriginItem
  form: ReturnType<typeof useAppForm>
}

const RemanufacturedFormContent = ({
  originItem,
  onCancel,
  form
}: RemanufactoredFormContentProps) => {
  const isValid = useStore(form.store, (s) => s.isValid)

  const readonly = originItem.item?.status === 'wrapped' || originItem.item?.status === 'shipped'

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className='flex items-center gap-1.5'>
          <RiRestartFill className='text-yellow size-4.5' />
          <span>Remanufacture</span>
        </AlertDialogTitle>
      </AlertDialogHeader>

      <div className='space-y-1.5 divide-y text-sm'>
        <div className='flex items-center justify-between pb-1.5'>
          <span>ID:</span>
          <span>{originItem.id_inven}</span>
        </div>
        <div className='flex items-center justify-between pb-1.5'>
          <span>Ordered:</span>
          <span>{originItem.quantity}</span>
        </div>
        <div className='flex items-center justify-between pb-1.5'>
          <span>Available in Stock:</span>
          <span>{originItem.on_hand ?? 0}</span>
        </div>
        {/* <div className='flex items-center justify-between pb-1.5'>
          <span>In Production:</span>
          <span>???</span>
        </div> */}
      </div>

      <form
        className='bg-muted space-y-3 rounded-3xl border p-3.5'
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.AppField
            name='remanufacturing_qty'
            children={(field) => {
              return (
                <field.NumberField
                  readonly={readonly}
                  max={originItem.quantity}
                  label='Remanufacture in Production'
                />
              )
            }}
          />

          <form.AppField
            name='pull_from_stock_qty'
            children={(field) => {
              return (
                <field.NumberField
                  readonly={readonly}
                  label='Pull from Stock for Remanufacture'
                  max={originItem?.item?.pull_from_stock ?? 0}
                />
              )
            }}
          />
        </FieldGroup>
      </form>

      <AlertDialogFooter className='sm:justify-start'>
        <Button
          disabled={!isValid || readonly}
          onClick={(e) => {
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          Remanufacture
        </Button>
        <AlertDialogCancel
          onClick={(e) => {
            e.stopPropagation()
            onCancel()
          }}
        >
          Cancel
        </AlertDialogCancel>
      </AlertDialogFooter>
    </>
  )
}

interface RemanufactoredConfirmContentProps {
  onBack: () => void
  onCancel: () => void
  onContinue: () => void
  isPending: boolean
}

const RemanufacturedConfirmContent = ({
  onCancel,
  onContinue,
  isPending
}: RemanufactoredConfirmContentProps) => (
  <>
    <AlertDialogHeader>
      <div className='bg-yellow/20 flex size-10 items-center justify-center rounded-lg'>
        <RiRestartFill className='text-yellow size-6' />
      </div>
      <AlertDialogTitle>
        Warning: This item includes quantities that must be remanufactured
      </AlertDialogTitle>
      <AlertDialogDescription>
        By setting status as <span className='font-bold'>Done</span> you confirm items are
        remanufactured during Production
      </AlertDialogDescription>
    </AlertDialogHeader>

    <AlertDialogFooter className='[&>button]:flex-1'>
      <Button
        onClick={onContinue}
        disabled={isPending}
        isLoading={isPending}
      >
        <RiCheckboxCircleLine />
        <span>Confirm</span>
      </Button>

      <AlertDialogCancel onClick={onCancel}>
        <RiCloseCircleLine />
        <span>Cancel</span>
      </AlertDialogCancel>
    </AlertDialogFooter>
  </>
)
