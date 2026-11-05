/**
 * The app's last write of something to EBMS: `queued` while EBMS does not answer (it goes once EBMS
 * is back), `ok`, or `failed` with EBMS's reason. `null` is no write yet.
 */
export type EbmsSync = 'queued' | 'ok' | 'failed' | null

export const EBMS_WAITING = 'EBMS is not answering; this goes to EBMS once it is back.'

type EbmsSyncNoteProps = {
  sync: EbmsSync
  error: string | null
}

/**
 * Where a write stands in EBMS, when that is anywhere but sent: the change went ahead in the app
 * either way, so this is the only sign EBMS does not have it yet.
 */
export const EbmsSyncNote = ({ sync, error }: EbmsSyncNoteProps) =>
  sync === 'queued' ? (
    <span className='text-xs whitespace-nowrap text-warning' title={EBMS_WAITING}>
      EBMS pending
    </span>
  ) : sync === 'failed' ? (
    <span className='text-xs text-destructive' title={error ?? undefined}>
      Not in EBMS
      {/* A touch screen has no hover for the title, and the why is the point. */}
      {error ? <span className='hidden pointer-coarse:inline'>: {error}</span> : null}
    </span>
  ) : null
