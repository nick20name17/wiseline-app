import { Button } from '@/components/ui/button'
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
import { ArrowLeft, MapPin, Package as PackageIcon } from 'lucide-react'
import { useState } from 'react'
import {
  orderLocationsQuery,
  orderPackagesQuery,
  useLocatePackage,
  type LocationSlot,
  type Package,
  type WrappingRow
} from '../api'
import { useViewOnly } from '../lib/board-context'
import { lineName, overWeight, packageContents } from '../lib/wrapping'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { LocationDialog } from './location-dialog'

type LocatePackagesProps = {
  departmentId: number | undefined
  /** Every line of this one order, as the Wrapping list holds them. */
  rows: WrappingRow[]
  onBack: () => void
}

/**
 * Wrapping in Rollforming: the packages the machine made for the order, each given a location here
 * p2 (1144,315), (1143,329). The last one located completes the order — the server stamps it and it
 * leaves this list for Completed Orders p2 (1144,383).
 */
export const LocatePackages = ({ departmentId, rows, onBack }: LocatePackagesProps) => {
  const order = rows[0]
  const { data: all, isPending } = useQuery(orderPackagesQuery(order?.order ?? null, !!order))
  const { data: locations } = useQuery(orderLocationsQuery(order?.order ?? null))
  const [locating, setLocating] = useState<Package | null>(null)
  // A location the package would push past its Max Weight asks first p1 (846,414).
  const [heavy, setHeavy] = useState<{ parcel: Package; slot: LocationSlot } | null>(null)
  const locate = useLocatePackage()
  const viewOnly = useViewOnly()

  if (!order) return null

  const number = order.order_number ?? order.order
  const names = new Map(rows.map(row => [row.origin_item, lineName(row)]))
  // The order's packages across every department come back; this bench locates only its own.
  const packages = all?.filter(
    parcel =>
      parcel.contents.length > 0 &&
      parcel.contents.every(line => line.origin_item !== null && names.has(line.origin_item))
  )
  const located = packages?.filter(parcel => parcel.location !== null).length ?? 0

  const send = (parcel: Package, slot: LocationSlot, override: boolean) =>
    locate.mutate(
      { packageId: parcel.package_id, locationId: slot.location_id, override },
      {
        onSuccess: () => {
          setHeavy(null)
          toast.add({
            type: 'success',
            title: `${parcel.name ?? 'The package'} → ${slot.name ?? slot.location_id}`
          })
        }
      }
    )

  return (
    <div className='flex min-w-0 flex-col gap-4'>
      <span className='flex items-center gap-3'>
        <Button variant='outline' onClick={onBack}>
          <ArrowLeft data-icon='inline-start' />
          Back to Wrapping
        </Button>
        <span className='font-mono font-medium'>{number}</span>
        <span className='ml-auto font-mono text-sm text-muted-foreground'>
          {located} / {packages?.length ?? 0} located
        </span>
      </span>

      {isPending ? (
        <Skeleton className='h-40' />
      ) : packages?.length ? (
        <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead>Contents</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Location</TableHead>
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
                    {parcel.location !== null ? (
                      <span className='font-mono'>{parcel.location}</span>
                    ) : viewOnly ? (
                      <span className='text-warning'>waiting...</span>
                    ) : (
                      <Button
                        variant='outline'
                        size='sm'
                        aria-label={`Select location for ${parcel.name ?? parcel.package_id}`}
                        disabled={locate.isPending}
                        onClick={() => setLocating(parcel)}
                      >
                        <MapPin data-icon='inline-start' />
                        Select location
                      </Button>
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
            <EmptyDescription>
              The packages appear here as the machine makes them on Production.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <LocationDialog
        departmentId={departmentId}
        order={order.order}
        orderNumber={number}
        orderLocations={locations ?? []}
        stagedWeight={locating?.weight ?? 0}
        open={!!locating}
        onOpenChange={open => !open && setLocating(null)}
        onPick={slot => {
          if (!locating) return
          if (overWeight(slot, locating.weight ?? 0)) setHeavy({ parcel: locating, slot })
          else send(locating, slot, false)
        }}
      />

      <ConfirmDialog
        open={!!heavy}
        onOpenChange={open => !open && setHeavy(null)}
        title='Location over weight limit'
        description='With this package the location will be over the weight limit, are you sure you want to continue?'
        confirmLabel='Yes, put it there'
        cancelLabel='No'
        isPending={locate.isPending}
        onConfirm={() => heavy && send(heavy.parcel, heavy.slot, true)}
      />
    </div>
  )
}
