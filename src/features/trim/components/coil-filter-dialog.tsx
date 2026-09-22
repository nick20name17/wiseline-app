import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { coilFiltersQuery, useCreateCoilFilter, type CoilFilter, type CoilFilterForm } from '../api'
import { departmentCoilFilter, fieldText } from '../lib/coils'

type Bound = { key: 'thickness' | 'width' | 'grade'; label: string; unit: string; step: string }

// "When the Thickness, Width and Grade ALL fall within the ranges set in the filter, then that coil
// will show up in the Coils tab."
const BOUNDS: Bound[] = [
  { key: 'thickness', label: 'Thickness', unit: 'in', step: '0.01' },
  { key: 'width', label: 'Width', unit: 'in', step: '1' },
  { key: 'grade', label: 'Grade', unit: 'ksi', step: '1' }
]

type Range = { min: string; max: string; all: boolean }

type Ranges = Record<Bound['key'], Range>

const BLANK: Range = { min: '', max: '', all: true }

const CLEARED: Ranges = { thickness: BLANK, width: BLANK, grade: BLANK }

/** The saved filter as the window draws it: a leg with no bound on either side is Apply All. */
const rangesOf = (filter: CoilFilter | null): Ranges => {
  if (!filter || filter.apply_all) return CLEARED
  const range = (min: number | null, max: number | null): Range => ({
    min: fieldText(min),
    max: fieldText(max),
    all: min === null && max === null
  })
  return {
    thickness: range(filter.thickness_min, filter.thickness_max),
    width: range(filter.width_min, filter.width_max),
    grade: range(filter.grade_min, filter.grade_max)
  }
}

const number = (value: string) => (value.trim() === '' ? null : Number(value))

type FilterFormProps = {
  departmentId: number | undefined
  current: CoilFilter | null
  onClose: () => void
}

/** Mounted with the popup, so each opening starts from what is saved rather than the last draft. */
const FilterForm = ({ departmentId, current, onClose }: FilterFormProps) => {
  const [ranges, setRanges] = useState<Ranges>(() => rangesOf(current))
  const create = useCreateCoilFilter(onClose)

  const edit = (key: Bound['key'], patch: Partial<Range>) =>
    setRanges(all => ({ ...all, [key]: { ...all[key], ...patch } }))

  const values = (): CoilFilterForm => ({
    thickness_min: ranges.thickness.all ? null : number(ranges.thickness.min),
    thickness_max: ranges.thickness.all ? null : number(ranges.thickness.max),
    width_min: ranges.width.all ? null : number(ranges.width.min),
    width_max: ranges.width.all ? null : number(ranges.width.max),
    grade_min: ranges.grade.all ? null : number(ranges.grade.min),
    grade_max: ranges.grade.all ? null : number(ranges.grade.max),
    apply_all: BOUNDS.every(bound => ranges[bound.key].all)
  })

  return (
    <>
      <div className='flex flex-col gap-3'>
        {BOUNDS.map(bound => (
          // One line each: the unit is given a box of its own so «ksi» does not push Apply All
          // onto a row by itself.
          <div key={bound.key} className='flex items-center gap-3'>
            <Label className='w-24' htmlFor={`coil-${bound.key}-min`}>
              {bound.label}
            </Label>
            <span className='text-sm text-muted-foreground'>Between</span>
            <Input
              id={`coil-${bound.key}-min`}
              className='w-24'
              type='number'
              inputMode='decimal'
              step={bound.step}
              placeholder='0'
              disabled={ranges[bound.key].all}
              value={ranges[bound.key].min}
              onChange={event => edit(bound.key, { min: event.target.value })}
            />
            <span className='text-sm text-muted-foreground'>&amp;</span>
            <Input
              className='w-24'
              type='number'
              inputMode='decimal'
              step={bound.step}
              aria-label={`${bound.label} upper bound`}
              placeholder='No limit'
              disabled={ranges[bound.key].all}
              value={ranges[bound.key].max}
              onChange={event => edit(bound.key, { max: event.target.value })}
            />
            <span className='w-8 text-sm text-muted-foreground'>{bound.unit}</span>
            <span className='ml-auto flex items-center gap-2 text-sm'>
              <Checkbox
                id={`coil-${bound.key}-all`}
                checked={ranges[bound.key].all}
                onCheckedChange={checked => edit(bound.key, { all: !!checked })}
              />
              <Label htmlFor={`coil-${bound.key}-all`}>Apply All</Label>
            </span>
          </div>
        ))}
      </div>

      {current ? (
        // The API can create a filter but not change one, so the window says so rather than offering
        // a write that would be refused.
        <p className='rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm'>
          This is the filter saved for this department. Changing it needs an endpoint the API does
          not have yet.
        </p>
      ) : null}

      <DialogFooter>
        <Button variant='outline' onClick={() => setRanges(CLEARED)}>
          Clear
        </Button>
        <Button
          disabled={!departmentId || !!current || create.isPending}
          onClick={() => {
            if (!departmentId) return
            const next = values()
            create.mutate(
              { departmentId, values: next },
              {
                onSuccess: () =>
                  toast.add({
                    type: 'success',
                    title: next.apply_all
                      ? 'Coil filter cleared — showing all folders'
                      : 'Coil filter applied'
                  })
              }
            )
          }}
        >
          {create.isPending ? <Spinner data-icon='inline-start' /> : null}
          Apply
        </Button>
      </DialogFooter>
    </>
  )
}

type CoilFilterDialogProps = {
  departmentId: number | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The Coil Filter window: the bounds a coil has to fall inside to show under Trim Coils, or Apply All
 * for no bounds at all.
 */
export const CoilFilterDialog = ({ departmentId, open, onOpenChange }: CoilFilterDialogProps) => {
  const { data: filters } = useQuery(coilFiltersQuery(departmentId))
  const current = departmentCoilFilter(filters)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>Coil Filter</DialogTitle>
          <DialogDescription>
            Coils whose Thickness, Width and Grade ALL fall in range show up under their EBMS
            folder. Apply All makes that range limitless.
          </DialogDescription>
        </DialogHeader>

        {/* Keyed on the saved row, so a filter that arrives after the window opened still fills it. */}
        <FilterForm
          key={current?.id ?? 'none'}
          departmentId={departmentId}
          current={current}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
