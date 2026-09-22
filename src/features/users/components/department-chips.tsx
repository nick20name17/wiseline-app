import { cn } from 'cn'
import { DEPARTMENTS, type Department } from '../lib/roles'

type DepartmentChipsProps = {
  value: Department[]
  onChange: (departments: Department[]) => void
}

export const DepartmentChips = ({ value, onChange }: DepartmentChipsProps) => {
  const picked = new Set<string>(value)

  const toggle = (department: Department) =>
    onChange(
      picked.has(department)
        ? value.filter(current => current !== department)
        : [...value, department]
    )

  return (
    <div className='flex flex-wrap gap-2'>
      {DEPARTMENTS.map(department => {
        const on = picked.has(department)

        return (
          <button
            key={department}
            type='button'
            aria-pressed={on}
            onClick={() => toggle(department)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              on
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-input text-foreground hover:bg-muted'
            )}
          >
            {department}
          </button>
        )
      })}
    </div>
  )
}
