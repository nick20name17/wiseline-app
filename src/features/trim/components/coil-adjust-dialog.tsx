import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useState } from 'react'
import {
  useApplyCoilAdjustment,
  useConfirmCoilAdjustment,
  useDepleteCoil,
  useUpdateCoilLot,
  type CoilApply,
  type CoilLot
} from '../api'
import { ConfirmDialog } from './confirm-dialog'

const DEPLETE = 'deplete_and_delete'

type Measure = { key: 'coil_thickness' | 'linear_feet' | 'weight'; label: string; unit: string }

// Enter any one of these and the other two follow from the Material Thickness and Core OD.
const MEASURES: Measure[] = [
  { key: 'coil_thickness', label: 'Coil Thickness', unit: 'inches' },
  { key: 'linear_feet', label: 'Linear Feet', unit: 'feet' },
  { key: 'weight', label: 'Weight', unit: 'lbs' }
]

const number = (value: string) => (value.trim() === '' ? undefined : Number(value))

type CoilAdjustDialogProps = {
  lot: CoilLot | null
  onOpenChange: (open: boolean) => void
}

/**
 * The Coil Adjustment window. The floor measures whichever of the three is easiest to measure; the
 * server works the other two out, and nothing reaches EBMS until the answer has been confirmed.
 */
export const CoilAdjustDialog = ({ lot, onOpenChange }: CoilAdjustDialogProps) => {
  const [entered, setEntered] = useState<Partial<Record<Measure['key'], string>>>({})
  const [build, setBuild] = useState({ material_thickness: '', core_od: '' })
  const [error, setError] = useState('')
  const [asking, setAsking] = useState<CoilApply | null>(null)

  const close = () => {
    setEntered({})
    setBuild({ material_thickness: '', core_od: '' })
    setError('')
    setAsking(null)
    onOpenChange(false)
  }

  const saveBuild = useUpdateCoilLot()
  const apply = useApplyCoilAdjustment()
  const confirm = useConfirmCoilAdjustment(close)
  const deplete = useDepleteCoil(close)

  // Only one of the three may be sent; the field that was typed into is the one that counts.
  const typed = MEASURES.filter(measure => number(entered[measure.key] ?? '') !== undefined)
  const values = typed[0] ? { [typed[0].key]: number(entered[typed[0].key] ?? '') } : {}

  const onApply = () => {
    if (!lot) return
    if (typed.length !== 1)
      return setError('Enter exactly one of Coil Thickness, Linear Feet or Weight.')
    setError('')
    apply.mutate(
      { lotId: lot.id, values },
      {
        onSuccess: setAsking,
        onError: () =>
          toast.add({
            type: 'error',
            title: 'This coil cannot be adjusted yet',
            description: 'Material Thickness and Core OD have to be filled in first.'
          })
      }
    )
  }

  return (
    <Dialog open={!!lot} onOpenChange={next => (next ? onOpenChange(true) : close())}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Coil adjustment</DialogTitle>
          <DialogDescription>
            Enter Coil Thickness, Linear Feet or Weight — the other two follow from the Material
            Thickness and Core OD.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-3 sm:grid-cols-2'>
          {MEASURES.map(measure => (
            <div key={measure.key} className='flex items-center gap-3'>
              <Label className='w-32' htmlFor={`coil-${measure.key}`}>
                {measure.label}
              </Label>
              <Input
                id={`coil-${measure.key}`}
                type='number'
                inputMode='decimal'
                placeholder={String(lot?.[measure.key] ?? '')}
                value={entered[measure.key] ?? ''}
                onChange={event =>
                  // Typing into one clears the others: the server takes exactly one figure.
                  setEntered({ [measure.key]: event.target.value })
                }
              />
              <span className='w-12 text-sm text-muted-foreground'>{measure.unit}</span>
            </div>
          ))}
        </div>

        {/* The two the coil is built from. Without them nothing can be worked out, which is what
            `can_adjust` says. */}
        <div className='grid gap-3 border-t border-border pt-3 sm:grid-cols-2'>
          <div className='flex items-center gap-3'>
            <Label className='w-32' htmlFor='coil-material'>
              Material Thickness
            </Label>
            <Input
              id='coil-material'
              type='number'
              inputMode='decimal'
              placeholder={String(lot?.material_thickness ?? '')}
              value={build.material_thickness}
              onChange={event =>
                setBuild(current => ({ ...current, material_thickness: event.target.value }))
              }
            />
            <span className='w-12 text-sm text-muted-foreground'>inches</span>
          </div>
          <div className='flex items-center gap-3'>
            <Label className='w-32' htmlFor='coil-core'>
              Core OD
            </Label>
            <Input
              id='coil-core'
              type='number'
              inputMode='decimal'
              placeholder={String(lot?.core_od ?? '')}
              value={build.core_od}
              onChange={event => setBuild(current => ({ ...current, core_od: event.target.value }))}
            />
            <span className='w-12 text-sm text-muted-foreground'>inches</span>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm'>
          <span>
            Product ID: <span className='font-mono'>{lot?.product_id ?? '—'}</span>
          </span>
          <span>
            Coil #: <span className='font-mono'>{lot?.lot_number ?? '—'}</span>
          </span>
          {lot?.can_adjust ? null : (
            <span className='text-warning'>
              Material Thickness and Core OD have to be saved before Apply can work.
            </span>
          )}
        </div>

        {error ? <FieldError>{error}</FieldError> : null}

        <DialogFooter>
          <Button variant='outline' onClick={close}>
            Cancel
          </Button>
          <Button
            variant='outline'
            disabled={
              saveBuild.isPending || (!build.material_thickness.trim() && !build.core_od.trim())
            }
            onClick={() =>
              lot &&
              saveBuild.mutate({
                lotId: lot.id,
                edit: {
                  ...(number(build.material_thickness) === undefined
                    ? {}
                    : { material_thickness: number(build.material_thickness)! }),
                  ...(number(build.core_od) === undefined
                    ? {}
                    : { core_od: number(build.core_od)! })
                }
              })
            }
          >
            {saveBuild.isPending ? <Spinner data-icon='inline-start' /> : null}
            Save build
          </Button>
          <Button disabled={apply.isPending} onClick={onApply}>
            {apply.isPending ? <Spinner data-icon='inline-start' /> : null}
            Apply
          </Button>
        </DialogFooter>

        {/* Apply asks one of two questions, and the answer is what reaches EBMS. */}
        <ConfirmDialog
          open={!!asking}
          onOpenChange={open => !open && setAsking(null)}
          title={asking?.action === DEPLETE ? 'Deplete and delete this coil?' : 'Make adjustment?'}
          description={
            asking?.action === DEPLETE
              ? (asking.detail ??
                'The coil is used up. Confirming zeroes it out in EBMS and removes it from the app.')
              : `Linear Feet ${asking?.linear_feet ?? '—'}, weight ${asking?.weight ?? '—'} lbs. Confirming pushes the new Linear Feet to EBMS.`
          }
          confirmLabel={asking?.action === DEPLETE ? 'Yes, deplete' : 'Yes, adjust'}
          cancelLabel='Cancel'
          isPending={confirm.isPending || deplete.isPending}
          onConfirm={() => {
            if (!lot) return
            if (asking?.action === DEPLETE) deplete.mutate(lot.id)
            else confirm.mutate({ lotId: lot.id, values })
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
