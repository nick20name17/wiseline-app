import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useRetained } from '@/lib/use-retained'
import { useQuery } from '@tanstack/react-query'
import { Database } from 'lucide-react'
import { cutlistCoilsQuery, type Cutlist } from '../api'

type CutlistCoilsDialogProps = {
  cutlist: Cutlist | null
  onOpenChange: (open: boolean) => void
}

/**
 * The coils the cutter can reach for: those checked into the Slinet whose colour matches this list.
 * Gauge and width deliberately do not narrow it — the colour is what has to match.
 */
export const CutlistCoilsDialog = ({ cutlist: current, onOpenChange }: CutlistCoilsDialogProps) => {
  const [cutlist, release] = useRetained(current)
  const { data: coils, isPending } = useQuery(cutlistCoilsQuery(cutlist?.id ?? null))

  return (
    <Dialog open={!!current} onOpenChange={onOpenChange} onOpenChangeComplete={release}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Cutlist coils</DialogTitle>
          <DialogDescription>
            Coils in the Slinet matching {cutlist?.color ?? 'this colour'}. Gauge and width do not
            narrow the list.
          </DialogDescription>
        </DialogHeader>

        <div className='scrollport max-h-96 min-h-56 overflow-y-auto'>
          {isPending ? (
            <Skeleton className='h-56' />
          ) : coils?.length ? (
            <div className='overflow-hidden rounded-lg border border-border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coil #</TableHead>
                    <TableHead>Product ID</TableHead>
                    <TableHead>Thickness</TableHead>
                    <TableHead>Linear feet</TableHead>
                    <TableHead>Weight (lbs.)</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coils.map(coil => (
                    <TableRow key={coil.id}>
                      <TableCell>
                        <span className='font-mono'>{coil.lot_number ?? '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className='font-mono'>{coil.product_id ?? '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className='font-mono'>{coil.coil_thickness ?? '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className='font-mono'>{coil.linear_feet ?? '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className='font-mono'>{coil.weight ?? '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className='text-muted-foreground'>{coil.note ?? '—'}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Empty className='h-full'>
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
      </DialogContent>
    </Dialog>
  )
}
