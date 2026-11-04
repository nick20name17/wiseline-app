import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { useState, type ReactNode } from 'react'
import { useResendEbmsWrite, type EbmsSync, type ResendTarget } from '../api'
import { useBoardRole } from '../lib/board-context'

const WAITING = 'EBMS is not answering; this goes to EBMS once it is back.'

type Resend = {
  target: ResendTarget
  /** What went to EBMS, for the question: «the manufacturing batch of order 5123». */
  what: string
}

type ResendEbmsButtonProps = Resend & {
  error: string | null
  /** The button's face; «Send again» unless it stands in for the mark. */
  children?: ReactNode
}

/**
 * Sends a write EBMS refused once more, after whatever it objected to is fixed there — an order
 * reopened, say. The server lets Managers only.
 */
export const ResendEbmsButton = ({
  target,
  what,
  error,
  children = 'Send again'
}: ResendEbmsButtonProps) => {
  const [asking, setAsking] = useState(false)
  const resend = useResendEbmsWrite()
  if (useBoardRole() !== 'manager') return null

  return (
    <>
      <Button variant='link' size='xs' title={error ?? undefined} onClick={() => setAsking(true)}>
        {children}
      </Button>
      <ConfirmDialog
        open={asking}
        onOpenChange={setAsking}
        title='Send to EBMS again?'
        description={`EBMS refused ${what}${error ? `: ${error}` : '.'} Send it again once that is fixed in EBMS.`}
        confirmLabel='Send again'
        cancelLabel='Cancel'
        isPending={resend.isPending}
        onConfirm={() =>
          resend.mutate(target, {
            onSuccess: write => {
              setAsking(false)
              toast.add(
                write.status === 'ok'
                  ? { type: 'success', title: 'Sent to EBMS' }
                  : write.status === 'queued'
                    ? { type: 'warning', title: 'Waiting for EBMS', description: WAITING }
                    : {
                        type: 'error',
                        title: 'EBMS refused it again',
                        description: write.last_error ?? undefined
                      }
              )
            }
          })
        }
      />
    </>
  )
}

type EbmsSyncMarkProps = {
  sync: EbmsSync
  error: string | null
  /** Offers a Manager to send a refused write again from the mark itself. */
  resend?: Resend
}

/**
 * Where the app's last write of an order or a coil stands in EBMS, when that is anywhere but sent:
 * the change went ahead here either way, so this is the only sign EBMS does not have it yet.
 */
export const EbmsSyncMark = ({ sync, error, resend }: EbmsSyncMarkProps) => {
  const manager = useBoardRole() === 'manager'
  if (sync === 'queued')
    return (
      <span className='text-xs whitespace-nowrap text-warning' title={WAITING}>
        EBMS pending
      </span>
    )
  if (sync !== 'failed') return null
  if (resend && manager)
    return (
      <ResendEbmsButton {...resend} error={error}>
        <span className='text-destructive'>Not in EBMS</span>
      </ResendEbmsButton>
    )
  return (
    <span className='text-xs text-destructive' title={error ?? undefined}>
      Not in EBMS
      {/* A touch screen has no hover for the title, and the why is the point. */}
      {error ? <span className='hidden pointer-coarse:inline'>: {error}</span> : null}
    </span>
  )
}
