import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useActiveInView } from '@/hooks/use-active-in-view'
import type { Machine } from '../api'
import type { MachineTab } from '../lib/machines'

type StripTab = MachineTab | 'slit'

type MachineStripProps = {
  machines: Machine[]
  value: StripTab
  /** The lists of lines also hold those no machine takes; the machine's own tabs do not. */
  withNone: boolean
  /** The Slit Line closes the row p2 (1204,296). */
  withSlit: boolean
  onChange: (tab: StripTab) => void
}

/** The second row of Rollforming's tabs: a tab per machine p2 (542,280), and the Slit Line. */
export const MachineStrip = ({
  machines,
  value,
  withNone,
  withSlit,
  onChange
}: MachineStripProps) => {
  const scroller = useActiveInView<HTMLDivElement>(value)
  return (
    <div ref={scroller} className='scrollport overflow-x-auto max-md:scrollbar-none'>
      <Tabs
        value={String(value)}
        onValueChange={next => onChange(next === 'none' || next === 'slit' ? next : Number(next))}
      >
        <TabsList variant='line'>
          {machines.map(machine => (
            <TabsTrigger key={machine.id} value={String(machine.id)}>
              {machine.name?.trim() || `Machine ${machine.id}`}
            </TabsTrigger>
          ))}
          {withNone ? <TabsTrigger value='none'>No machine</TabsTrigger> : null}
          {withSlit ? <TabsTrigger value='slit'>Slit Line</TabsTrigger> : null}
        </TabsList>
      </Tabs>
    </div>
  )
}
