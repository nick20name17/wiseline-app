import { Button } from '@/components/ui/button'
import { cn } from 'cn'
import { Check, ChevronRight, Database, Package } from 'lucide-react'
import { useState } from 'react'
import {
  useFinishCutlist,
  type Cutlist,
  type Machine,
  type Remanufacturing,
  type WrappingRow
} from '../api'
import type { CutlistGroup } from '../lib/cutlists'
import { today } from '../lib/format'
import { toggleExpanded, useProductionView } from '../lib/production-view'
import { ConfirmDialog } from './confirm-dialog'
import { CutlistRows } from './cutlist-rows'
import { PriorityPill } from './priority-pill'
import { RemakePill } from './reman-badge'

const stamp = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : ''

type CutlistCardProps = {
  cutlist: Cutlist
  /** The request a remake list came from, when this is one. */
  remake: Remanufacturing | null
  /** The bending machines, which are the Slinet cutlist's columns. */
  machines: Machine[]
  isSlinet: boolean
  /** The Slinet has started cutting the release this bendlist came from. */
  slinetStarted: boolean
  lines: ReadonlyMap<string, WrappingRow>
  onOpenTotal: (group: CutlistGroup) => void
  onOpenCoils: (cutlist: Cutlist) => void
  onRemanufacture: (line: WrappingRow) => void
}

/**
 * One cutlist or bendlist. The head says what it is and what is holding it up; the rows underneath are
 * the work itself, and stay folded away until somebody is standing at the machine.
 */
export const CutlistCard = ({
  cutlist,
  remake,
  machines,
  isSlinet,
  slinetStarted,
  lines,
  onOpenTotal,
  onOpenCoils,
  onRemanufacture
}: CutlistCardProps) => {
  const expanded = useProductionView().expanded.has(cutlist.id)
  const [finishing, setFinishing] = useState(false)
  const finish = useFinishCutlist()

  const done = !!cutlist.completed_at
  // "If it is Thursday and there are bendlists from Wednesday that are not complete yet, then we need
  // those highlighted as overdue." A finished list is not late.
  const overdue = !done && !!cutlist.production_date && cutlist.production_date < today()
  const word = isSlinet ? 'cutlist' : 'bendlist'
  const hasStock = cutlist.rows.some(row => row.sources.some(source => source.is_stock))

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-card shadow-xs',
        // The paint is the warning; a hard red edge on top of it turns a late list into an error.
        overdue && 'bg-destructive/5'
      )}
    >
      <div className='flex flex-wrap items-center gap-3 px-3 py-2'>
        <Button
          variant='ghost'
          size='icon'
          aria-label={expanded ? 'Hide rows' : 'Show rows'}
          onClick={() => toggleExpanded(cutlist.id)}
        >
          <ChevronRight className={cn('transition-transform', expanded && 'rotate-90')} />
        </Button>

        {/* No title and no date: the day divider above the card says both. */}
        <span className='font-medium'>{cutlist.gauge_color || 'No gauge or colour'}</span>

        {/* A list carries the priority it was released under and nothing sets it here, so an
            unprioritised one shows nothing rather than an invitation. */}
        {cutlist.priority && !done ? <PriorityPill priority={cutlist.priority} /> : null}

        {/* A remake list is extra work on top of the day's, so it says so before anything else —
            orange until the Slinet has recut it, green after (p1 (686,514)). */}
        {cutlist.is_remanufacture ? (
          <RemakePill done={!!remake?.is_cut}>
            Remake{remake?.remanufacturing_qty ? ` · ${remake.remanufacturing_qty}` : ''}
          </RemakePill>
        ) : null}

        {/* p1 (585,288): a list carrying stock-order lines is marked. */}
        {hasStock ? (
          <span title='Carries stock-order lines' className='text-muted-foreground'>
            <Package className='size-4' aria-label='Stock order' />
          </span>
        ) : null}

        {/* The material is being cut: the machine's own work has not started, but it is coming. */}
        {slinetStarted && !done ? (
          <span className='inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium tracking-wider text-warning uppercase'>
            <span aria-hidden className='size-1.5 rounded-full bg-current' />
            In progress
          </span>
        ) : null}

        {overdue ? (
          <span className='rounded-md border border-destructive px-1.5 py-0.5 text-xs font-semibold tracking-wider text-destructive uppercase'>
            Overdue
          </span>
        ) : null}

        <span className='ml-auto flex items-center gap-3'>
          {isSlinet && !done ? (
            <Button variant='outline' onClick={() => onOpenCoils(cutlist)}>
              <Database data-icon='inline-start' />
              Cutlist Coils
            </Button>
          ) : null}

          {done ? (
            <>
              <span className='inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium tracking-wider text-success uppercase'>
                <Check className='size-3.5' />
                Done
              </span>
              <span className='font-mono text-xs text-muted-foreground'>
                {stamp(cutlist.completed_at)}
              </span>
            </>
          ) : (
            <Button
              disabled={!cutlist.is_complete}
              title={cutlist.is_complete ? undefined : 'Available once every row is Complete'}
              onClick={() => setFinishing(true)}
            >
              Done
            </Button>
          )}
        </span>
      </div>

      {expanded ? (
        <div className='border-t border-border'>
          <CutlistRows
            rows={cutlist.rows}
            isSlinet={isSlinet}
            remake={remake}
            machines={machines}
            // A bendlist is Not Started until the Slinet cuts into its release; from then on a row
            // can be signed off before its own piece is cut, and Bent overrides Cut (p1 (686,329)).
            waiting={!isSlinet && !slinetStarted}
            lines={lines}
            onOpenTotal={onOpenTotal}
            onRemanufacture={onRemanufacture}
          />
        </div>
      ) : null}

      <ConfirmDialog
        open={finishing}
        onOpenChange={setFinishing}
        title={`Mark this ${word} done?`}
        description={
          isSlinet
            ? 'Confirm that you have made all the necessary coil adjustments and that you are done with this cutlist.'
            : 'Confirm that you are done with this bendlist.'
        }
        confirmLabel='Confirm'
        cancelLabel='Cancel'
        isPending={finish.isPending}
        onConfirm={() => finish.mutate(cutlist.id, { onSuccess: () => setFinishing(false) })}
      />
    </div>
  )
}
