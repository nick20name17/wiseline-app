import { RiCheckboxCircleLine, RiCloseCircleLine, RiTruckLine } from '@remixicon/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useState } from 'react'
import { toast } from 'sonner'

import { PackagesTable } from '../tables/packages'

import { getLoadsQueryOptions } from '@/api/loads/query'
import { ORDERS_QUERY_KEYS } from '@/api/orders/query'
import { PACKAGES_ITEMS_QUERY_KEYS } from '@/api/packages-items/query'
import { PACKAGES_QUERY_KEYS } from '@/api/packages/query'
import type { Package } from '@/api/packages/schema'
import { packageService } from '@/api/packages/service'
import { getTruckQueryOptions, getTrucksQueryOptions } from '@/api/trucks/query'
import { DEFAULT_LIMIT } from '@/components/common/filters/pagination'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { DATE_FORMAT } from '@/constants/date'
import { cn } from '@/lib/utils'
import { LoadSelect } from '@/routes/_shipping/-components/selects/load-select'
import { TruckSelect } from '@/routes/_shipping/-components/selects/truck-select'
import { formatWeight, ordinal } from '@/utils/format'

interface AssignTruckDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  onAssign: () => void
  selectedItems: {
    packages: Package[]
  }
}

const DEFAULT_DATE = new Date()

export const AssignTruckDialog = ({
  open,
  setOpen,
  selectedItems,
  onAssign
}: AssignTruckDialogProps) => {
  const currentProductionDate =
    selectedItems.packages[0]?.package_items[0]?.origin_item?.item?.production_date

  const [date, setDate] = useState<Date | undefined>(
    currentProductionDate ? new Date(currentProductionDate) : DEFAULT_DATE
  )
  const [truck, setTruck] = useState('')
  const [load, setLoad] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const totalWeight = selectedItems.packages.reduce((acc, pack) => {
    return acc + (pack?.weight ?? 0)
  }, 0)

  const handleAssignClick = () => {
    setShowConfirm(true)
    setOpen(false)
  }

  const { data: truckData } = useQuery({
    ...getTruckQueryOptions(truck ? Number(truck) : -1),
    enabled: !!truck
  })

  const overWeight = truckData?.max_weight ? totalWeight > truckData.max_weight : false

  const isAssignAvailable = date && truck && load && !overWeight

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={setOpen}
      >
        <DialogTrigger asChild>
          <Button
            size='sm'
            variant='info'
            aria-label='Remove from truck'
          >
            <RiTruckLine aria-hidden='true' />
            <span>Assign Truck</span>
          </Button>
        </DialogTrigger>
        <DialogContent className='flex h-[calc(100vh-8rem)] flex-col gap-3.5 sm:max-w-300'>
          <DialogHeader>
            <DialogTitle>Assign to Truck</DialogTitle>
          </DialogHeader>

          <PackagesTable
            columnVisibility={{
              checkbox: false,
              load_checkbox: false,
              truck: true,
              load: true,
              view_skid: false
            }}
            className='flex-1'
            data={selectedItems.packages}
          />

          <DialogFooter className='gap-10 text-sm sm:justify-between'>
            <div className='flex items-center gap-2'>
              <div>{selectedItems.packages.length} items selected</div>
              <div className={cn(overWeight ? 'text-destructive' : 'text-primary')}>
                Weight: {formatWeight(totalWeight)}
              </div>
            </div>

            <div className='flex flex-1 items-center justify-center gap-2'>
              <DatePicker
                className='h-9 w-50'
                disabledDays={
                  currentProductionDate ? { before: new Date(currentProductionDate) } : undefined
                }
                date={date}
                setDate={setDate}
              />
              <TruckSelect
                className='w-50'
                onChange={setTruck}
                value={truck}
              />
              <LoadSelect
                filters={{
                  roadConfirmed: false
                }}
                date={date ? format(date, DATE_FORMAT.iso) : undefined}
                truckId={truck}
                className='w-50'
                onChange={setLoad}
                value={load}
              />
            </div>

            <div className='flex items-center gap-2'>
              <Button
                disabled={!isAssignAvailable}
                onClick={handleAssignClick}
              >
                <RiCheckboxCircleLine aria-hidden='true' />
                <span>Assign</span>
              </Button>
              <Button
                variant='outline'
                onClick={() => setOpen(false)}
              >
                <RiCloseCircleLine aria-hidden='true' />
                <span>Cancel</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmAssignDialog
        onAssign={() => {
          onAssign()
          setTruck('')
          setLoad('')
          setDate(DEFAULT_DATE)
          setShowConfirm(false)
        }}
        selectedItems={selectedItems}
        open={showConfirm}
        onOpenChange={setShowConfirm}
        truck={truck}
        load={load}
        date={date}
      />
    </>
  )
}

interface ConfirmAssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  truck: string
  load: string
  date: Date | undefined
  onAssign: () => void
  selectedItems: {
    packages: Package[]
  }
}

const ConfirmAssignDialog = ({
  open,
  onOpenChange,
  truck,
  load,
  date,
  selectedItems,
  onAssign
}: ConfirmAssignDialogProps) => {
  const packagesMultiupdateMutation = useMutation({
    mutationFn: packageService.multiupdate,
    onSuccess: (_, __, ___, context) => {
      toast.success('Packages assigned to truck')

      context.client.invalidateQueries({ queryKey: ORDERS_QUERY_KEYS.all() })
      context.client.invalidateQueries({ queryKey: PACKAGES_QUERY_KEYS.all() })
      context.client.invalidateQueries({ queryKey: PACKAGES_ITEMS_QUERY_KEYS.all() })

      onAssign()
    }
  })

  const { data: loads } = useQuery({
    ...getLoadsQueryOptions({
      limit: DEFAULT_LIMIT,
      load_date: date ? format(date, DATE_FORMAT.iso) : '',
      truck_id: +truck
    }),
    enabled: open
  })

  const currentLoadIndex = loads?.results?.findIndex((l) => l.id.toString() === load) ?? 0

  const handleAssignConfirm = async () => {
    const load_id = Number(load)

    const packageIds = selectedItems.packages.map((p) => p.id)

    packagesMultiupdateMutation.mutateAsync({
      ids: packageIds,
      loads: { load_id }
    })
  }

  const { data: selectedTruck } = useQuery({
    ...getTrucksQueryOptions({ limit: DEFAULT_LIMIT }),
    select: (data) => data.find((t) => t.id.toString() === truck)
  })

  const isAssigningToTruck = packagesMultiupdateMutation.isPending

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <AlertDialogContent className='sm:max-w-82'>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Do you want to assign {selectedItems.packages.length} packages to Truck{' '}
            <span>{selectedTruck?.name}</span> and Load <span>{ordinal(currentLoadIndex + 1)}</span>
            ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Schedule for delivery on {date ? format(date, DATE_FORMAT.dots) : '—'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className='**:flex-1'>
          <AlertDialogAction
            onClick={handleAssignConfirm}
            asChild
          >
            <Button
              isLoading={isAssigningToTruck}
              disabled={isAssigningToTruck}
            >
              Yes
            </Button>
          </AlertDialogAction>
          <AlertDialogCancel>No</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
