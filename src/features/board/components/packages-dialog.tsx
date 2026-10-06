import { Button } from '@/components/ui/button'
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
import { toast } from '@/components/ui/toast'
import { useQuery } from '@tanstack/react-query'
import { Package as PackageIcon, Printer, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { orderPackagesQuery, useDeletePackage, useReprintPackage, type Package } from '../api'
import { useBoard, useViewOnly } from '../lib/board-context'
import { lineName, packageContents } from '../lib/wrapping'
import { ConfirmDialog } from './confirm-dialog'

type PackagesDialogProps = {
  order: string
  number: string
  /** The order's lines on this board, which name a package's contents and say which are its own. */
  rows: { origin_item: string; product_id: string | null }[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * See Packages: what has been packed for the order so far, so one packed wrong can be taken apart
 * and a lost label printed again (p1 (911,486), p2 (1040,492), p3 (1263,337)). Its pieces go back to Left To Wrap and the line drops back from Wrapped (p1 (808,536)); Accessories'
 * to Left To Package p3 (1199,368).
 */
export const PackagesDialog = ({
  order,
  number,
  rows,
  open,
  onOpenChange
}: PackagesDialogProps) => {
  const { pack } = useBoard()
  const { data: all, isPending } = useQuery(orderPackagesQuery(order, open))
  const [deleting, setDeleting] = useState<Package | null>(null)
  const remove = useDeletePackage()
  const reprint = useReprintPackage()
  const viewOnly = useViewOnly()
  const names = new Map(rows.map(row => [row.origin_item, lineName(row)]))
  // The order's packages across every department come back; the bench deletes only its own.
  const packages = all?.filter(parcel =>
    parcel.contents.every(line => line.origin_item !== null && names.has(line.origin_item))
  )
  const back = `Left To ${pack.verb}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>Packages · Order {number}</DialogTitle>
          <DialogDescription>
            Reprint a package's label, or delete one that was packed wrong; its pieces go back to{' '}
            {back}.
          </DialogDescription>
        </DialogHeader>

        <div className='scrollport max-h-96 min-h-40 overflow-y-auto'>
          {isPending ? (
            <Skeleton className='h-40' />
          ) : packages?.length ? (
            <div className='overflow-hidden rounded-lg border border-border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package</TableHead>
                    <TableHead>Contents</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>
                      <span className='sr-only'>Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map(parcel => (
                    <TableRow key={parcel.package_id}>
                      <TableCell>
                        <span className='font-mono'>{parcel.name ?? parcel.package_id}</span>
                      </TableCell>
                      <TableCell>
                        <span className='text-muted-foreground'>
                          {packageContents(parcel.contents, names)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className='font-mono'>
                          {parcel.weight === null ? '—' : `${parcel.weight} lb`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className='font-mono'>{parcel.location ?? '—'}</span>
                      </TableCell>
                      <TableCell>
                        {viewOnly ? null : (
                          <span className='flex justify-end gap-1'>
                            <Button
                              variant='ghost'
                              size='icon-sm'
                              aria-label={`Reprint label ${parcel.name ?? parcel.package_id}`}
                              title='Reprint label'
                              disabled={reprint.isPending}
                              onClick={() =>
                                reprint.mutate(parcel.package_id, {
                                  onSuccess: () =>
                                    toast.add({
                                      type: 'success',
                                      title: `Reprinted label ${parcel.name ?? parcel.package_id}`
                                    })
                                })
                              }
                            >
                              <Printer />
                            </Button>
                            {/* A package already on a truck has left the bench. */}
                            <Button
                              variant='ghost'
                              size='icon-sm'
                              aria-label={`Delete package ${parcel.name ?? parcel.package_id}`}
                              title={parcel.is_loaded ? 'Already loaded onto a truck' : 'Delete'}
                              disabled={parcel.is_loaded}
                              onClick={() => setDeleting(parcel)}
                            >
                              <Trash2 />
                            </Button>
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Empty className='min-h-40'>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <PackageIcon />
                </EmptyMedia>
                <EmptyTitle>No packages yet</EmptyTitle>
                <EmptyDescription>Create &amp; print makes the first one.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>

        <ConfirmDialog
          open={!!deleting}
          onOpenChange={next => !next && setDeleting(null)}
          title='Delete this package?'
          description={`${deleting?.name ?? 'The package'} is taken apart and its pieces go back to ${back}. Scanning its label will say it was deleted.`}
          confirmLabel='Yes, Delete Package'
          destructive
          cancelLabel='No'
          isPending={remove.isPending}
          onConfirm={() =>
            deleting &&
            remove.mutate(deleting.package_id, {
              onSuccess: () => {
                toast.add({ type: 'success', title: `Deleted ${deleting.name ?? 'the package'}` })
                setDeleting(null)
              }
            })
          }
        />
      </DialogContent>
    </Dialog>
  )
}
