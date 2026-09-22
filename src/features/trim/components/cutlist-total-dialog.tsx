import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import type { CutlistGroup } from '../lib/cutlists'

type CutlistTotalDialogProps = {
  group: CutlistGroup | null
  onOpenChange: (open: boolean) => void
}

/**
 * What a consolidated Total is made of. Identical sizes collapse into one row so the floor cuts them
 * together, which is right for cutting and useless for answering «whose is this» — this is that
 * answer, so it names the orders rather than repeating the size.
 */
export const CutlistTotalDialog = ({ group, onOpenChange }: CutlistTotalDialogProps) => (
  <Dialog open={!!group} onOpenChange={onOpenChange}>
    <DialogContent className='sm:max-w-2xl'>
      <DialogHeader>
        <DialogTitle>Orders using this size</DialogTitle>
        <DialogDescription>
          {group
            ? `${group.width?.toFixed(1) ?? '—'}" × ${group.length ?? '—'}" — the line items behind this total.`
            : ''}
        </DialogDescription>
      </DialogHeader>

      <div className='scrollport max-h-96 min-h-40 overflow-y-auto'>
        <div className='overflow-hidden rounded-lg border border-border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Line item</TableHead>
                <TableHead>Qty to manufacture</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group?.sources.map((source, index) => (
                <TableRow key={`${source.origin_item ?? index}`}>
                  <TableCell>
                    <span className='font-mono'>{source.order ?? '—'}</span>
                  </TableCell>
                  <TableCell>
                    <span className='font-mono text-muted-foreground'>
                      {source.origin_item ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className='font-mono'>{source.quantity}</span>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell>
                  <span className='font-semibold'>Total</span>
                </TableCell>
                <TableCell />
                <TableCell>
                  <span className='font-mono font-semibold'>{group?.quantity ?? 0}</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </DialogContent>
  </Dialog>
)
