import type { CSSProperties } from 'react'

/** The height of the rows a virtualised table does not render, laid out like any other row. */
export const SpacerRows = ({ height }: { height: number }) =>
  height > 0 ? (
    <tbody aria-hidden>
      {/* A row with no cells still takes the height it is given. */}
      <tr className='h-(--gap)' style={{ '--gap': `${height}px` } as CSSProperties} />
    </tbody>
  ) : null
