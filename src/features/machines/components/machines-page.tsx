import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Cog, Database, Gauge, Package, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { departmentsQuery, machinesQuery, type Machine } from '../api'
import { machineSections, type MachineSection } from '../lib/sections'
import { MachineActions } from './machine-actions'
import { CreateMachineDialog } from './machine-dialog'

// The cutter is where a department's work enters its machines, which is why it is tagged.
const GATEWAY_KIND = 'cutting'
const COIL_SUPPLIERS_DEPARTMENT = 'rollforming'

// Cards stand in for the departments until they arrive; a plant runs three or four.
const SKELETON_SECTIONS = 3

type PendingButtonProps = { icon: ReactNode; children: ReactNode }

/** A control the design has but the backend cannot serve yet (see TODO.md); shown, not usable. */
const PendingButton = ({ icon, children }: PendingButtonProps) => (
  <Tooltip>
    {/* A disabled button takes no pointer events, so the hover lands on a wrapper instead. */}
    <TooltipTrigger render={<span />}>
      <Button variant='outline' disabled>
        {icon}
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent>Waiting on the backend</TooltipContent>
  </Tooltip>
)

type MachineRowProps = { machine: Machine; unit: MachineSection['unit'] }

const MachineRow = ({ machine, unit }: MachineRowProps) => {
  const max = unit === 'bends' ? machine.daily_max_bends : machine.daily_max_pieces

  return (
    <li className='flex items-center gap-2.5 border-b border-border px-4 py-2.5 last:border-b-0'>
      <span className='font-medium'>{machine.name ?? '—'}</span>
      {machine.kind === GATEWAY_KIND ? <Badge variant='muted'>Gateway</Badge> : null}
      <span
        className='mr-3 ml-auto inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground'
        title='Daily capacity'
      >
        <Gauge className='size-3' />
        {max ?? '—'} {unit} / day
      </span>
      <MachineActions machine={machine} />
    </li>
  )
}

type MachineGroupProps = { section: MachineSection; onAdd: () => void }

const MachineGroup = ({ section, onAdd }: MachineGroupProps) => {
  const [open, setOpen] = useState(true)
  const Chevron = open ? ChevronDown : ChevronRight

  return (
    <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
      <div
        className='flex items-center gap-2 bg-muted/50 px-4 py-3 data-open:border-b data-open:border-border'
        data-open={open || undefined}
      >
        {/* The title spans the free width, so the header toggles from almost anywhere, as in the
            design, while the buttons beside it keep their own clicks. */}
        <button
          type='button'
          className='flex flex-1 cursor-pointer items-center gap-2.5 self-stretch rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span className='text-sm font-semibold'>{section.name}</span>
          <span className='font-mono text-xs text-muted-foreground'>{section.machines.length}</span>
        </button>

        <PendingButton icon={<Package data-icon='inline-start' />}>
          Max package · no limit
        </PendingButton>
        {section.code === COIL_SUPPLIERS_DEPARTMENT ? (
          <PendingButton icon={<Database data-icon='inline-start' />}>Coil suppliers</PendingButton>
        ) : null}
        <Button
          variant='ghost'
          size='icon-sm'
          aria-expanded={open}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${section.name}`}
          onClick={() => setOpen(!open)}
        >
          <Chevron />
        </Button>
      </div>

      {open ? (
        section.machines.length ? (
          <ul className='text-sm'>
            {section.machines.map(machine => (
              <MachineRow key={machine.id} machine={machine} unit={section.unit} />
            ))}
          </ul>
        ) : (
          <p className='px-4 py-3 text-sm text-muted-foreground'>
            No machines yet —{' '}
            <button
              type='button'
              className='cursor-pointer underline-offset-4 hover:text-foreground hover:underline'
              onClick={onAdd}
            >
              Add one
            </button>
          </p>
        )
      ) : null}
    </div>
  )
}

/**
 * The machines every department's board is built out of, one card per department: what each machine
 * can take in a day, and the department's own ceilings.
 */
export const MachinesPage = () => {
  const { data: machines, isPending: machinesPending } = useQuery(machinesQuery)
  const { data: departments, isPending: departmentsPending } = useQuery(departmentsQuery)
  // Without the departments every machine would read as having none, and land in the wrong card.
  const isPending = machinesPending || departmentsPending
  const [creating, setCreating] = useState(false)

  const sections = machineSections({ machines, departments })

  return (
    <section className='flex flex-1 flex-col gap-3'>
      <div className='flex items-center justify-between gap-3.5'>
        <p className='text-sm text-muted-foreground'>
          <b className='font-semibold text-foreground'>{machines?.length ?? 0}</b> machines across
          departments
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus data-icon='inline-start' />
          Add machine
        </Button>
      </div>

      {isPending ? (
        Array.from({ length: SKELETON_SECTIONS }, (_, section) => (
          <Skeleton key={section} className='h-14' />
        ))
      ) : sections.length ? (
        sections.map(section => (
          <MachineGroup key={section.key} section={section} onAdd={() => setCreating(true)} />
        ))
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Cog />
            </EmptyMedia>
            <EmptyTitle>No departments</EmptyTitle>
            <EmptyDescription>A machine needs a department to belong to.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <CreateMachineDialog open={creating} onOpenChange={setCreating} />
    </section>
  )
}
