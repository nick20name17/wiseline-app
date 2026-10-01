import { useColumnOrder } from '@/components/table/column-order'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { getErrorMessage } from '@/lib/errors'
import { useRetained } from '@/lib/use-retained'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { Database } from 'lucide-react'
import { useState } from 'react'
import {
  cutlistCoilsQuery,
  useConfirmCoilAdjustment,
  useDepleteCoil,
  useUpdateCoilLot,
  type CoilLot,
  type Cutlist
} from '../api'
import { CUTLIST_COILS_TABLE } from '../lib/columns'
import { coilName, figure, figuresAtThickness } from '../lib/coils'
import { ConfirmDialog } from './confirm-dialog'
import { KeypadDialog } from './keypad-dialog'
import { NoteInput } from './note-input'

type Question = 'deplete' | 'adjust'

type CutlistCoilsDialogProps = {
  cutlist: Cutlist | null
  onOpenChange: (open: boolean) => void
}

/**
 * The coils the cutter can reach for: those checked into the Slinet whose colour matches this list.
 * Gauge and width deliberately do not narrow it — the colour is what has to match.
 *
 * Coil Thickness is the one figure the cutter changes here. Apply stays dark until one has moved,
 * because pushing an unchanged number to EBMS is noise in someone else's inventory; a thickness of
 * zero means the coil is spent, and that confirm says so rather than talking about feet.
 */
export const CutlistCoilsDialog = ({ cutlist: current, onOpenChange }: CutlistCoilsDialogProps) => {
  const [cutlist, release] = useRetained(current)
  const { data: coils, isPending } = useQuery(cutlistCoilsQuery(cutlist?.id ?? null))
  const [thickness, setThickness] = useState<Record<string, string>>({})
  const [keying, setKeying] = useState<CoilLot | null>(null)
  const columns = useColumnOrder(CUTLIST_COILS_TABLE)
  const [question, setQuestion] = useState<Question | null>(null)
  const [asking, releaseAsking] = useRetained(question)

  const update = useUpdateCoilLot()
  const adjust = useConfirmCoilAdjustment()
  const deplete = useDepleteCoil()

  const settle = (open: boolean) => {
    if (open) return
    setThickness({})
    release(open)
  }

  const entered = (coils ?? []).flatMap(coil => {
    const value = thickness[coil.id]?.trim()
    if (!value) return []
    const next = Number(value)
    return Number.isFinite(next) && next !== coil.coil_thickness ? [{ coil, next }] : []
  })
  const depleting = entered.filter(entry => entry.next === 0)
  const adjusting = entered.filter(entry => entry.next > 0)

  const forget = (ids: Set<string>) =>
    setThickness(current =>
      Object.fromEntries(Object.entries(current).filter(([id]) => !ids.has(id)))
    )

  const onConfirm = () => {
    // A spent coil is its own question; the other changes wait for the next Apply.
    const batch = asking === 'deplete' ? depleting : adjusting
    void Promise.all(
      batch.map(({ coil, next }) =>
        asking === 'deplete'
          ? deplete.mutateAsync(coil.id)
          : adjust.mutateAsync({ lotId: coil.id, values: { coil_thickness: next } })
      )
    ).then(
      () => {
        toast.add({
          type: 'success',
          title:
            asking === 'deplete'
              ? `Depleted & deleted ${batch.length} coil(s) — zeroed out in EBMS`
              : 'Coil adjustment pushed to EBMS (linear feet updated)'
        })
        forget(new Set(batch.map(({ coil }) => coil.id)))
        setQuestion(null)
      },
      // The entries stay, so Apply can be tried again once whatever refused them is fixed.
      (error: unknown) => {
        toast.add({
          type: 'error',
          title: 'EBMS was not updated',
          description: getErrorMessage(error)
        })
        setQuestion(null)
      }
    )
  }

  return (
    <Dialog open={!!current} onOpenChange={onOpenChange} onOpenChangeComplete={settle}>
      <DialogContent className='sm:max-w-5xl'>
        <DialogHeader>
          <DialogTitle>Cutlist coils</DialogTitle>
          <DialogDescription>
            Coils in the Slinet matching {cutlist?.color ?? 'this colour'}. Gauge and width do not
            narrow the list. Change a thickness, then Apply to push it to EBMS.
          </DialogDescription>
        </DialogHeader>

        <div className='scrollport max-h-96 min-h-56 overflow-y-auto'>
          {isPending ? (
            <Skeleton className='h-56' />
          ) : coils?.length ? (
            <div className='overflow-hidden rounded-lg border border-border'>
              <Table>
                <TableHeader>
                  <TableRow>{columns.headers}</TableRow>
                </TableHeader>
                <TableBody>
                  {coils.map(coil => {
                    // The figures follow the thickness as it is typed p1 (471,427); Apply saves them.
                    const typed = Number.parseFloat(thickness[coil.id] ?? '')
                    // An unchanged thickness keeps the figures on record, not the formula's rounding.
                    const preview =
                      typed !== coil.coil_thickness ? figuresAtThickness(coil, typed) : null

                    return (
                      <TableRow key={coil.id}>
                        {columns.cells({
                          num: (
                            <TableCell>
                              <span className='font-mono'>{coil.lot_number ?? '—'}</span>
                            </TableCell>
                          ),
                          pid: (
                            <TableCell>
                              <span className='font-mono'>{coil.product_id ?? '—'}</span>
                            </TableCell>
                          ),
                          width: (
                            <TableCell>
                              <span className='font-mono'>{coil.width ?? '—'}</span>
                            </TableCell>
                          ),
                          gauge: (
                            <TableCell>
                              <span className='font-mono'>{coil.gauge ?? '—'}</span>
                            </TableCell>
                          ),
                          color: <TableCell>{coil.color ?? '—'}</TableCell>,
                          thick: (
                            <TableCell>
                              <Button
                                variant='outline'
                                className='w-24 justify-start'
                                aria-label={`Thickness in inches, coil ${coilName(coil)}`}
                                onClick={() => setKeying(coil)}
                              >
                                <span
                                  className={cn(
                                    'font-mono',
                                    thickness[coil.id] === undefined && 'text-muted-foreground'
                                  )}
                                >
                                  {thickness[coil.id] ?? coil.coil_thickness ?? '—'}
                                </span>
                              </Button>
                            </TableCell>
                          ),
                          lf: (
                            <TableCell>
                              <span className='font-mono'>
                                {figure(preview?.feet ?? coil.linear_feet)}
                              </span>
                            </TableCell>
                          ),
                          weight: (
                            <TableCell>
                              <span className='font-mono'>
                                {figure(preview?.weight ?? coil.weight)}
                              </span>
                            </TableCell>
                          ),
                          note: (
                            <TableCell>
                              <NoteInput
                                aria-label={`Note, coil ${coilName(coil)}`}
                                placeholder='Add note…'
                                saved={coil.note ?? ''}
                                onSave={note => update.mutate({ lotId: coil.id, edit: { note } })}
                              />
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Empty className='min-h-56'>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <Database />
                </EmptyMedia>
                <EmptyTitle>No coils in the Slinet</EmptyTitle>
                <EmptyDescription>
                  Check a coil of this colour into the Slinet from the Coils tab.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!entered.length}
            title={entered.length ? undefined : 'Enter a new Coil Thickness first'}
            onClick={() => setQuestion(depleting.length ? 'deplete' : 'adjust')}
          >
            Apply
          </Button>
        </DialogFooter>

        {/* A bench screen is often touch only; the keypad is how a figure is typed there. */}
        <KeypadDialog
          decimal
          unit='in.'
          target={
            keying
              ? {
                  title: `Coil Thickness, ${coilName(keying)}`,
                  current: keying.coil_thickness ?? 0
                }
              : null
          }
          onOpenChange={open => !open && setKeying(null)}
          onEnter={value => {
            if (keying) setThickness(current => ({ ...current, [keying.id]: String(value) }))
            setKeying(null)
          }}
        />

        <ConfirmDialog
          open={!!question}
          onOpenChange={open => !open && setQuestion(null)}
          onOpenChangeComplete={releaseAsking}
          title={asking === 'deplete' ? 'Deplete & delete coil?' : 'Push adjustment to EBMS?'}
          description={
            asking === 'deplete'
              ? 'You entered the coil size as 0 — this fully depletes the coil and deletes it. Continue?'
              : 'Push the new linear feet amount back to EBMS for the coils in the Slinet?'
          }
          confirmLabel={
            asking === 'deplete' ? 'Yes, Deplete & Delete Coil' : 'Yes, Make Adjustment'
          }
          cancelLabel='No'
          destructive={asking === 'deplete'}
          isPending={adjust.isPending || deplete.isPending}
          onConfirm={onConfirm}
        />
      </DialogContent>
    </Dialog>
  )
}
