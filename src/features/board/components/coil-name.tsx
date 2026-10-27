type CoilNameProps = { value: string | null; waiting: boolean }

/**
 * A line's Supplier or Coil Number, or what stands in for one not named: «waiting...» while the Slit
 * Line owes it, else Undefined — any coil will do p2 (541,431). Undefined is greyed like any empty
 * field, so the coils that are named stand out down a column of them.
 */
export const CoilName = ({ value, waiting }: CoilNameProps) =>
  value ?? (waiting ? 'waiting...' : <span className='text-muted-foreground'>Undefined</span>)
