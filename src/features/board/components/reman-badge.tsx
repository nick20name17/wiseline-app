import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '@/components/ui/popover'
import { cn } from 'cn'
import { RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Remanufacturing } from '../api'
import { remanOwed } from '../lib/wrapping'

type RemakePillProps = { done: boolean; title?: string; children: ReactNode }

/** The remake pill: orange while it is outstanding, green once the step it waits on is done. */
export const RemakePill = ({ done, title, children }: RemakePillProps) => (
  <span
    title={title}
    className={cn(
      'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-xs',
      done ? 'bg-success/10 text-success' : 'bg-caution/15 text-caution'
    )}
  >
    <RefreshCw className='size-3' />
    {children}
  </span>
)

/** A bypassed line never went through a machine, so there is nothing to remake it on (p1 (835,298)). */
export const RemanNotApplicable = () => (
  <span
    className='text-xs text-muted-foreground'
    title='Bypassed orders skip production — Remanufacture N/A'
  >
    N/A
  </span>
)

const SOURCES: Record<string, string> = { machine: 'Machine', wrapping: 'Wrapping' }

const remakeStep = (reman: Remanufacturing) =>
  reman.is_bent ? 'Bent' : reman.is_cut ? 'Cut' : 'Not started'

/**
 * A remake raised against a line item. Orange until the machine marks it Bent — the Slinet's recut
 * greens only the machine tab's copy, and the floor at Wrapping is still waiting on the pieces.
 *
 * It counts what is owed, or the latest remake once nothing is: a running total of every remake on
 * the line reads as pieces still to come at the bench. The full list opens from the badge.
 */
export const RemanBadge = ({ remans }: { remans: Remanufacturing[] }) => {
  if (!remans.length) return <span className='text-muted-foreground'>—</span>

  const owed = remanOwed(remans)
  // The server numbers records as they are asked for, so the highest id is the latest request.
  const history = remans.toSorted((a, b) => b.id - a.id)

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant='ghost' size='xs' />}
        aria-label={`Remanufacture history, ${owed ? `${owed} pcs. outstanding` : 'complete'}`}
      >
        <RemakePill done={!owed}>{owed || (history[0]?.remanufacturing_qty ?? 0)}</RemakePill>
      </PopoverTrigger>
      <PopoverContent align='start' className='w-96'>
        <PopoverHeader>
          <PopoverTitle>Remanufacture history</PopoverTitle>
        </PopoverHeader>
        <ol className='flex flex-col divide-y divide-border'>
          {history.map(reman => (
            <li key={reman.id} className='flex flex-col gap-0.5 py-1.5'>
              <span className='flex items-center justify-between gap-2'>
                <span>
                  <span className='font-mono'>{reman.remanufacturing_qty ?? 0} pcs.</span>
                  {reman.pull_from_stock_qty ? (
                    <span className='text-muted-foreground'>
                      {' '}
                      + <span className='font-mono'>{reman.pull_from_stock_qty}</span> from stock
                    </span>
                  ) : null}
                  {reman.source ? (
                    <span className='text-muted-foreground'>
                      {' '}
                      · {SOURCES[reman.source] ?? reman.source}
                    </span>
                  ) : null}
                </span>
                <RemakePill done={reman.is_bent}>{remakeStep(reman)}</RemakePill>
              </span>
              {reman.note ? <span className='text-muted-foreground'>{reman.note}</span> : null}
            </li>
          ))}
        </ol>
      </PopoverContent>
    </Popover>
  )
}
