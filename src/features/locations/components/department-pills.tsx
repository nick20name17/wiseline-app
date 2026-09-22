import { cn } from 'cn'
import type { Department } from '../api'

type DepartmentPillsProps = {
  departments: Department[]
  /** None means every department, which is where the page opens. */
  active: Department | undefined
  onChange: (code: string | undefined) => void
}

const pill = cn(
  'cursor-pointer rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground transition-colors outline-none hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50',
  'aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary'
)

/** Which department's rows the page lists; each department keeps its own racks. */
export const DepartmentPills = ({ departments, active, onChange }: DepartmentPillsProps) => (
  <fieldset className='flex flex-wrap gap-1.5'>
    <legend className='sr-only'>Department</legend>
    <button
      type='button'
      aria-pressed={!active}
      className={pill}
      onClick={() => onChange(undefined)}
    >
      All
    </button>
    {departments.map(department => (
      <button
        key={department.id}
        type='button'
        aria-pressed={department.id === active?.id}
        className={pill}
        onClick={() => onChange(department.code)}
      >
        {department.name}
      </button>
    ))}
  </fieldset>
)
