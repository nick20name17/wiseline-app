import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useRetained } from '@/lib/use-retained'
import { useRef, useState, type RefObject } from 'react'
import {
  useApplyCoilAdjustment,
  useConfirmCoilAdjustment,
  useDepleteCoil,
  useUpdateCoilLot,
  type CoilAdjustment,
  type CoilApply,
  type CoilLot
} from '../api'
import {
  coilName,
  feetFromThickness,
  fieldText,
  poundsPerFoot,
  thicknessFromFeet
} from '../lib/coils'
import { ConfirmDialog } from './confirm-dialog'

const DEPLETE = 'deplete_and_delete'

export type CoilFigure = keyof CoilAdjustment

type Measure<Key> = { key: Key; label: string; unit: string; step: string }

const MEASURES: Measure<CoilFigure>[] = [
  { key: 'coil_thickness', label: 'Coil Thickness', unit: 'inches', step: '0.01' },
  { key: 'linear_feet', label: 'Linear Feet', unit: 'feet', step: '1' },
  { key: 'weight', label: 'Weight', unit: 'lbs', step: '1' }
]

type BuildField = 'material_thickness' | 'core_od'

// What the three figures are worked out from, typed in below them.
const BUILD: Measure<BuildField>[] = [
  { key: 'material_thickness', label: 'Material Thickness', unit: 'inches', step: '0.001' },
  { key: 'core_od', label: 'Core OD', unit: 'inches', step: '0.1' }
]

type Draft = Record<CoilFigure | BuildField, string>

const num = (value: string) => Number.parseFloat(value)

/** Both present and positive is what makes the annulus solvable — and what unlocks the form. */
const buildOf = (draft: Draft) => {
  const material = num(draft.material_thickness)
  const core = num(draft.core_od)
  return material > 0 && core > 0 ? { material, core } : null
}

/**
 * Typing one figure works the other two out. Weight needs the coil's pounds per foot, which the lot
 * can only give when it already has a weight and a length; without it, Weight is left as typed.
 */
const solve = (lot: CoilLot, current: Draft, field: CoilFigure, raw: string): Draft => {
  const next = { ...current, [field]: raw }
  const build = buildOf(next)
  const value = num(raw)
  if (!build || !(value >= 0)) return next

  const perFoot = poundsPerFoot(lot, build.material)
  if (field === 'weight' && !perFoot) return next

  const feet =
    field === 'coil_thickness'
      ? feetFromThickness(value, build.material, build.core)
      : field === 'weight'
        ? Math.round(value / perFoot!)
        : Math.round(value)

  if (field !== 'coil_thickness')
    next.coil_thickness = String(thicknessFromFeet(feet, build.material, build.core))
  if (field !== 'linear_feet') next.linear_feet = String(feet)
  if (field !== 'weight' && perFoot) next.weight = String(Math.round(feet * perFoot))
  return next
}

/** Which coil the window is adjusting, as the floor tells coils apart. */
const CoilFacts = ({ lot }: { lot: CoilLot }) => (
  <div className='flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm'>
    <span>
      <span className='font-medium'>Product ID:</span>{' '}
      <span className='font-mono'>{lot.product_id ?? '—'}</span>
    </span>
    <span>
      <span className='font-medium'>Colour:</span> {lot.color ?? '—'}
    </span>
    <span>
      <span className='font-medium'>Width:</span>{' '}
      <span className='font-mono'>{lot.width ?? '—'}</span>
    </span>
    <span>
      <span className='font-medium'>Coil #:</span>{' '}
      <span className='font-mono'>{lot.lot_number ?? '—'}</span>
    </span>
  </div>
)

type MeasureFieldProps = {
  measure: Measure<string>
  value: string
  disabled?: boolean
  inputRef?: RefObject<HTMLInputElement | null>
  onChange: (raw: string) => void
}

const MeasureField = ({ measure, value, disabled, inputRef, onChange }: MeasureFieldProps) => (
  <div className='flex flex-col gap-1.5'>
    <Label htmlFor={`coil-${measure.key}`}>{measure.label}</Label>
    <div className='flex items-center gap-2'>
      <Input
        id={`coil-${measure.key}`}
        type='number'
        inputMode='decimal'
        step={measure.step}
        ref={inputRef}
        disabled={disabled}
        value={value}
        onChange={event => onChange(event.target.value)}
      />
      <span className='w-12 text-sm text-muted-foreground'>{measure.unit}</span>
    </div>
  </div>
)

type AdjustFormProps = {
  lot: CoilLot
  focus: CoilFigure
  /** Handed to the popup as its initial focus, so the cursor lands in the figure that was clicked. */
  focusRef: RefObject<HTMLInputElement | null>
  onClose: () => void
}

/** The window's body, mounted with the popup so every opening starts from the coil as it stands. */
const AdjustForm = ({ lot, focus, focusRef, onClose }: AdjustFormProps) => {
  const [draft, setDraft] = useState<Draft>(() => ({
    coil_thickness: fieldText(lot.coil_thickness),
    linear_feet: fieldText(lot.linear_feet),
    weight: fieldText(lot.weight),
    material_thickness: fieldText(lot.material_thickness),
    core_od: fieldText(lot.core_od)
  }))
  // The server takes exactly one figure and works the other two out itself, so the one last typed
  // into is the one sent. Linear Feet is what reaches EBMS when none was.
  const driver = useRef<CoilFigure>('linear_feet')
  const [question, setQuestion] = useState<CoilApply | null>(null)
  const [asking, releaseAsking] = useRetained(question)

  const saveBuild = useUpdateCoilLot()
  const apply = useApplyCoilAdjustment()
  const confirm = useConfirmCoilAdjustment(onClose)
  const deplete = useDepleteCoil(onClose)

  const build = buildOf(draft)
  // A cleared field would otherwise reach EBMS as 0: a coil reported as spent that nobody depleted.
  const ready =
    !!build && MEASURES.every(measure => draft[measure.key] !== '' && num(draft[measure.key]) >= 0)
  // «The Apply button ONLY becomes available if the Coil Thickness number changes» p1 (464,436). A
  // Linear Feet or Weight typed in moves the thickness with it, so this covers all three figures.
  const changed = num(draft.coil_thickness) !== lot.coil_thickness
  // A 0 in any figure is a spent coil, and the server answers it with Deplete p1 (305,644).
  const values = (): CoilAdjustment => ({ [driver.current]: num(draft[driver.current]) })
  const name = coilName(lot)
  const depleting = asking?.action === DEPLETE

  const setFigure = (field: CoilFigure, raw: string) => {
    driver.current = field
    setDraft(current => solve(lot, current, field, raw))
  }

  const setBuild = (field: BuildField, raw: string) =>
    setDraft(current => {
      const next = { ...current, [field]: raw }
      // A coil EBMS has only just pushed in has Linear Feet but no thickness; the moment the build is
      // known that thickness can be worked out, so it is filled rather than left blank.
      return buildOf(next) && next.coil_thickness === '' && num(next.linear_feet) > 0
        ? solve(lot, next, 'linear_feet', next.linear_feet)
        : next
    })

  // Material Thickness and Core OD are saved first: the server works the figures out from the build
  // it has on record, not from the one in the window.
  const onApply = async () => {
    if (!build) return
    const edit = {
      ...(build.material === lot.material_thickness ? {} : { material_thickness: build.material }),
      ...(build.core === lot.core_od ? {} : { core_od: build.core })
    }
    try {
      if (Object.keys(edit).length) await saveBuild.mutateAsync({ lotId: lot.id, edit })
      setQuestion(await apply.mutateAsync({ lotId: lot.id, values: values() }))
    } catch {
      // The mutation cache has already said what went wrong; the window stays open to try again.
    }
  }

  return (
    <>
      <div className='grid gap-3 sm:grid-cols-3'>
        {MEASURES.map(measure => (
          <MeasureField
            key={measure.key}
            measure={measure}
            value={draft[measure.key]}
            disabled={!build}
            inputRef={measure.key === focus ? focusRef : undefined}
            onChange={raw => setFigure(measure.key, raw)}
          />
        ))}
      </div>

      <div className='grid gap-3 border-t border-border pt-3 sm:grid-cols-3'>
        {BUILD.map(measure => (
          <MeasureField
            key={measure.key}
            measure={measure}
            value={draft[measure.key]}
            onChange={raw => setBuild(measure.key, raw)}
          />
        ))}
      </div>

      {build ? null : (
        <p className='text-sm text-warning'>
          Enter Material Thickness and Core OD to unlock the three fields above and the Apply
          button.
        </p>
      )}

      <CoilFacts lot={lot} />

      <DialogFooter>
        <Button variant='outline' onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!ready || !changed || saveBuild.isPending || apply.isPending}
          onClick={onApply}
        >
          {saveBuild.isPending || apply.isPending ? <Spinner data-icon='inline-start' /> : null}
          Apply
        </Button>
      </DialogFooter>

      {/* Apply asks one of two questions, and the answer is what reaches EBMS. */}
      <ConfirmDialog
        open={!!question}
        onOpenChange={open => !open && setQuestion(null)}
        onOpenChangeComplete={releaseAsking}
        title={depleting ? 'Deplete & delete this coil?' : 'Make this adjustment?'}
        description={
          depleting
            ? `You have entered the coil size as 0 — this will completely deplete coil ${name} and delete it. Are you sure you want to continue?`
            : `By clicking Yes, the new Linear Feet amount (${(asking?.linear_feet ?? num(draft.linear_feet)).toLocaleString('en-US')} ft) gets pushed back into EBMS for coil ${name}.`
        }
        confirmLabel={depleting ? 'Yes, Deplete & Delete Coil' : 'Yes, Make Adjustment'}
        destructive={depleting}
        cancelLabel='No'
        isPending={confirm.isPending || deplete.isPending}
        onConfirm={() => {
          if (depleting)
            deplete.mutate(lot.id, {
              onSuccess: () =>
                toast.add({
                  type: 'success',
                  title: `Coil ${name} zeroed out in EBMS and deleted`
                }),
              onError: error =>
                toast.add({
                  type: 'error',
                  title: 'The coil was not depleted',
                  description: error.message
                })
            })
          else
            confirm.mutate(
              { lotId: lot.id, values: values() },
              {
                onSuccess: () =>
                  toast.add({
                    type: 'success',
                    title: 'Adjustment pushed to EBMS (linear feet updated)'
                  }),
                onError: error =>
                  toast.add({
                    type: 'error',
                    title: 'The adjustment did not reach EBMS',
                    description: error.message
                  })
              }
            )
        }}
      />
    </>
  )
}

type CoilAdjustDialogProps = {
  /** Read from the lots query on every render, so a refetch while the window is open shows through. */
  lot: CoilLot | null
  /** The figure that was clicked to open the window, which takes the cursor. */
  focus: CoilFigure
  onOpenChange: (open: boolean) => void
}

/**
 * The Coil Adjustment window. The floor measures whichever of the three is easiest to measure and the
 * other two follow; nothing reaches EBMS until the answer has been confirmed.
 */
export const CoilAdjustDialog = ({ lot: current, focus, onOpenChange }: CoilAdjustDialogProps) => {
  const [lot, release] = useRetained(current)
  const focusRef = useRef<HTMLInputElement>(null)

  return (
    <Dialog open={!!current} onOpenChange={onOpenChange} onOpenChangeComplete={release}>
      <DialogContent className='sm:max-w-2xl' initialFocus={focusRef}>
        <DialogHeader>
          <DialogTitle>Coil Adjustment</DialogTitle>
          <DialogDescription>
            Enter Coil Thickness, Linear Feet or Weight — the other two follow from the Material
            Thickness and Core OD.
          </DialogDescription>
        </DialogHeader>

        {lot ? (
          <AdjustForm
            lot={lot}
            focus={focus}
            focusRef={focusRef}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
