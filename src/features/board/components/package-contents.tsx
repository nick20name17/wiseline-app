import type { Package } from '../api'
import { formatWidth } from '../lib/format'
import { packageGroups } from '../lib/wrapping'

type PackageContentsProps = {
  contents: Package['contents']
  rows: Parameters<typeof packageGroups>[1]
}

/** A package's contents in a table cell: a product per line, its lengths wrapping under the cell. */
export const PackageContents = ({ contents, rows }: PackageContentsProps) => {
  const groups = packageGroups(contents, rows)
  if (!groups.length) return <span className='text-muted-foreground'>—</span>
  return (
    <div className='flex flex-col gap-1 py-1 whitespace-normal'>
      {groups.map(group => (
        <div key={group.product} className='flex flex-wrap items-center gap-1'>
          <span className='mr-1 font-mono'>{group.product}</span>
          <span className='mr-1 text-xs text-muted-foreground'>{group.total} pcs</span>
          {/* A product with no lengths, Trim's, is said in full by its count. */}
          {(group.pieces.some(piece => piece.length !== null) ? group.pieces : []).map(piece => (
            <span
              key={piece.length ?? 'none'}
              className='rounded-sm bg-muted px-1.5 font-mono text-xs leading-5 text-muted-foreground'
            >
              {/* One length is all of the pieces, already counted: «8 pcs × 120"», not «8 pcs 8 × 120"». */}
              {group.pieces.length > 1 ? `${piece.quantity} ` : null}×{' '}
              <span className='text-foreground'>
                {piece.length === null ? '—' : `${formatWidth(piece.length)}"`}
              </span>
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
