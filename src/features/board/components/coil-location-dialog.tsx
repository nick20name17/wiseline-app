import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/dialog'
import { useRetained } from '@/lib/use-retained'
import { useQuery } from '@tanstack/react-query'
import { coilLocationsQuery, departmentsQuery, type CoilLot } from '../api'
import { coilName } from '../lib/coils'
import { LocationButton, LocationGrid } from './location-grid'

/** A coil about to be put somewhere in a department: Trim or Rollforming, by its code. */
export type CoilPlacing = { lot: CoilLot; department: 'trim' | 'rollforming' }

type CoilLocationDialogProps = {
  /** The coil and the department whose inventory locations are offered; `null` when closed. */
  placing: CoilPlacing | null
  onOpenChange: (open: boolean) => void
  onPick: (placing: CoilPlacing, locationId: number) => void
}

/**
 * Where a coil goes in a department, picked from that department's inventory locations in the same
 * grid as Select Location. A coil is in Trim or Rollforming only on a location there, so ticking
 * either asks this first (Kevin's notes of 2026-11-02, N12).
 */
export const CoilLocationDialog = ({ placing, onOpenChange, onPick }: CoilLocationDialogProps) => {
  const [shown, release] = useRetained(placing)
  const { data: departments } = useQuery(departmentsQuery)
  const department = departments?.find(entry => entry.code === shown?.department)
  const { data: slots, isPending } = useQuery(coilLocationsQuery(department?.id, !!placing))

  return (
    <Dialog open={!!placing} onOpenChange={onOpenChange} onOpenChangeComplete={release}>
      <DialogContent sizeKey='board:coil-location-dialog' className='sm:max-w-3xl lg:max-w-5xl'>
        <DialogHeader>
          <DialogTitle>Select location · Coil {shown ? coilName(shown.lot) : ''}</DialogTitle>
          <DialogDescription>
            {department?.name ?? 'The department'}’s inventory locations — the coil is checked in
            once one is picked.
          </DialogDescription>
        </DialogHeader>

        <LocationGrid
          key={department?.id}
          slots={slots}
          isPending={isPending}
          departmentDefault={department?.default_warehouse ?? null}
          renderSlot={slot => {
            const current = slot.location_id === shown?.lot.location_id
            return (
              <LocationButton
                key={slot.location_id}
                code={slot.name ?? slot.location_id}
                detail={current ? 'here now' : null}
                className={current ? 'border-primary/40 bg-primary/10 text-primary' : undefined}
                onClick={() => {
                  if (!shown) return
                  onOpenChange(false)
                  onPick(shown, slot.location_id)
                }}
              />
            )
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
