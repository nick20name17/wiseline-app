import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Machine } from '../api'
import type { MachineTab } from '../lib/machines'

type MachineStripProps = {
  machines: Machine[]
  value: MachineTab
  /** Unscheduled and Scheduled also hold the lines no machine takes; the machine's own tabs do not. */
  withNone: boolean
  onChange: (tab: MachineTab) => void
}

/** The second row of Rollforming's tabs: a tab per machine p2 (542,280). */
export const MachineStrip = ({ machines, value, withNone, onChange }: MachineStripProps) => (
  <div className='scrollport overflow-x-auto'>
    <Tabs
      value={String(value)}
      onValueChange={next => onChange(next === 'none' ? 'none' : Number(next))}
    >
      <TabsList variant='line'>
        {machines.map(machine => (
          <TabsTrigger key={machine.id} value={String(machine.id)}>
            {machine.name?.trim() || `Machine ${machine.id}`}
          </TabsTrigger>
        ))}
        {withNone ? <TabsTrigger value='none'>No machine</TabsTrigger> : null}
      </TabsList>
    </Tabs>
  </div>
)
