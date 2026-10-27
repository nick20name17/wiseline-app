import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { dragAnnouncements, useDragSensors } from '@/components/table/drag'
import { closestCenter, DndContext, type DragEndEvent } from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { ChevronDown, ChevronRight, Cog, Gauge, GripVertical, Plus } from 'lucide-react'
import { useState } from 'react'
import { departmentsQuery, machinesQuery, useReorderMachines, type Machine } from '../api'
import { pinnedEnd, reorderMachines } from '../lib/order'
import { machineSections, type MachineSection } from '../lib/sections'
import { CoilSuppliersDialog } from './coil-suppliers-dialog'
import { DailyCapacityDialog } from './daily-capacity-dialog'
import { MachineActions } from './machine-actions'
import { CreateMachineDialog } from './machine-dialog'
import { MaxPackageDialog } from './max-package-dialog'

// The cutter is where a department's work enters its machines, which is why it is tagged.
const GATEWAY_KIND = 'cutting'
const COIL_SUPPLIERS_DEPARTMENT = 'rollforming'
// Accessories packs and makes nothing, so its day is held to a capacity of its own, not its machines'.
const DAILY_CAPACITY_DEPARTMENT = 'accessories'

// Cards stand in for the departments until they arrive; a plant runs three or four.
const SKELETON_SECTIONS = 3

type MachineRowProps = {
  machine: Machine
  unit: MachineSection['unit']
  /** Another move is saving: a second would number from a list about to change. */
  saving: boolean
}

const MachineRow = ({ machine, unit: sectionUnit, saving }: MachineRowProps) => {
  const pinned = pinnedEnd(machine)
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: machine.id, disabled: !!pinned || saving })
  // Every piece goes through the cutter, so it is held to a count of pieces, not its department's unit.
  const unit = machine.kind === GATEWAY_KIND ? 'pieces' : sectionUnit
  const max =
    unit === 'bends'
      ? machine.daily_max_bends
      : unit === 'feet'
        ? machine.daily_max_feet
        : machine.daily_max_pieces

  return (
    // A phone has no room for the capacity beside the name, so it takes a line under it; the name
    // keeps the width it needs rather than breaking letter by letter.
    <li
      ref={setNodeRef}
      // dnd-kit computes both every frame of a drag; no class can carry them.
      // oxlint-disable-next-line shadcn/no-inline-styles
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-border bg-card px-4 py-2.5 last:border-b-0',
        isDragging && 'relative z-10 bg-muted'
      )}
    >
      {/* The cutter and Wrapping hold the ends, so they have no grip; the space keeps names aligned. */}
      {pinned ? (
        <span
          className='size-3.5 shrink-0'
          title={pinned === 'first' ? 'Always first' : 'Always last'}
        />
      ) : (
        <button
          ref={setActivatorNodeRef}
          type='button'
          aria-label={`Move ${machine.name ?? 'machine'}`}
          className='flex shrink-0 cursor-grab items-center rounded-sm text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:-m-3 pointer-coarse:p-3'
          {...attributes}
          {...listeners}
        >
          <GripVertical className='size-3.5' />
        </button>
      )}
      <span className='flex min-w-0 flex-1 flex-wrap items-center gap-2.5'>
        <span className='font-medium break-words'>{machine.name ?? '—'}</span>
        {machine.kind === GATEWAY_KIND ? <Badge variant='muted'>Gateway</Badge> : null}
      </span>
      <span
        className='inline-flex shrink-0 items-center gap-1.5 font-mono text-xs whitespace-nowrap text-muted-foreground max-sm:order-last max-sm:basis-full sm:mr-3'
        title='Daily capacity'
      >
        <Gauge className='size-3' />
        {max ?? '—'} {unit} / day
      </span>
      <MachineActions machine={machine} />
    </li>
  )
}

type MachineGroupProps = { section: MachineSection }

const MachineGroup = ({ section }: MachineGroupProps) => {
  const [open, setOpen] = useState(true)
  const [creating, setCreating] = useState(false)
  const sensors = useDragSensors()
  const save = useReorderMachines()
  // The order a drop left, held until the save settles, so the rows do not flash back for a tick.
  const [dropped, setDropped] = useState<Machine[] | null>(null)
  const machines = dropped ?? section.machines

  const announcements = dragAnnouncements({
    name: id => machines.find(machine => machine.id === id)?.name ?? undefined,
    place: id => `${machines.findIndex(machine => machine.id === id) + 1} of ${machines.length}`,
    noun: 'machine',
    area: 'the list'
  })

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return
    const next = reorderMachines(machines, Number(active.id), Number(over.id))
    if (!next || !section.department) return
    setDropped(next)
    save.mutate(
      { department: section.department.id, machines: next },
      { onSettled: () => setDropped(null) }
    )
  }

  const Chevron = open ? ChevronDown : ChevronRight

  return (
    <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
      <div
        className='flex flex-wrap items-center gap-2 bg-muted/50 px-4 py-3 data-open:border-b data-open:border-border'
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

        {/* A phone has no room beside the title, so the department's settings drop to a line of
            their own under it. */}
        <div className='flex flex-wrap gap-2 empty:hidden max-md:order-last max-md:w-full'>
          {section.department ? <MaxPackageDialog department={section.department} /> : null}
          {section.code === COIL_SUPPLIERS_DEPARTMENT ? <CoilSuppliersDialog /> : null}
          {section.department?.code === DAILY_CAPACITY_DEPARTMENT ? (
            <DailyCapacityDialog department={section.department} />
          ) : null}
          {section.department ? (
            <Button variant='outline' onClick={() => setCreating(true)}>
              <Plus data-icon='inline-start' />
              Add machine
            </Button>
          ) : null}
        </div>
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            accessibility={{ announcements }}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={machines.map(machine => machine.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className='text-sm'>
                {machines.map(machine => (
                  <MachineRow
                    key={machine.id}
                    machine={machine}
                    unit={section.unit}
                    saving={save.isPending}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        ) : (
          <p className='px-4 py-3 text-sm text-muted-foreground'>
            No machines yet —{' '}
            <button
              type='button'
              className='cursor-pointer underline-offset-4 hover:text-foreground hover:underline'
              onClick={() => setCreating(true)}
            >
              Add one
            </button>
          </p>
        )
      ) : null}

      {section.department ? (
        <CreateMachineDialog
          department={section.department}
          open={creating}
          onOpenChange={setCreating}
        />
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

  const sections = machineSections({ machines, departments })

  return (
    <section className='flex flex-1 flex-col gap-3'>
      <p className='text-sm text-muted-foreground'>
        <b className='font-semibold text-foreground'>{machines?.length ?? 0}</b> machines across
        departments
      </p>

      {isPending ? (
        Array.from({ length: SKELETON_SECTIONS }, (_, section) => (
          <Skeleton key={section} className='h-14' />
        ))
      ) : sections.length ? (
        sections.map(section => <MachineGroup key={section.key} section={section} />)
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
    </section>
  )
}
