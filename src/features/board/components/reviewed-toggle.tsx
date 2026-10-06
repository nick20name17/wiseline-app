import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useState } from 'react'
import { formatDate } from '@/lib/days'
import { useSetReviewed, type BoardOrder } from '../api'
import { useViewOnly } from '../lib/board-context'

type ReviewedToggleProps = {
  order: BoardOrder
  /** The part's production day — what the toggle reviews. */
  day: string
  departmentId: number | undefined
  reviewed: boolean
  released: boolean
  /** Every line that still has to be made carries a machine — the gate the board puts on this. */
  machinesAssigned: boolean
}

/**
 * Reviewed: the Manager has been through the order and it is ready to go out.
 *
 * Turning it on is silent. Turning it back off asks first, because it takes the order off the release
 * list somebody may already have been building.
 */
export const ReviewedToggle = ({
  order,
  day,
  departmentId,
  reviewed,
  released,
  machinesAssigned
}: ReviewedToggleProps) => {
  const [confirming, setConfirming] = useState(false)
  const mutation = useSetReviewed()
  const viewOnly = useViewOnly()

  // Once an order is out on the floor the toggle is a record, not a control, and reads as one.
  if (released)
    return (
      <span className='inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium tracking-wider text-muted-foreground uppercase'>
        Reviewed
      </span>
    )

  const set = (next: boolean) =>
    departmentId && mutation.mutate({ order, departmentId, day, reviewed: next })

  return (
    <>
      <span className='flex items-center gap-2'>
        <Switch
          aria-label={`Reviewed ${order.invoice}`}
          checked={reviewed}
          disabled={viewOnly || !machinesAssigned || mutation.isPending}
          onCheckedChange={next => (next ? set(true) : setConfirming(true))}
        />
        {/* The hint says which gate is holding the order rather than leaving a dead control. */}
        {machinesAssigned ? null : (
          <span className='text-xs text-muted-foreground'>assign machines</span>
        )}
      </span>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn off Reviewed?</AlertDialogTitle>
            <AlertDialogDescription>
              Order {order.invoice} on {formatDate(day)} will no longer be selectable for release.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant='outline' />}>Cancel</AlertDialogCancel>
            <Button
              disabled={mutation.isPending}
              onClick={() => {
                set(false)
                setConfirming(false)
              }}
            >
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
