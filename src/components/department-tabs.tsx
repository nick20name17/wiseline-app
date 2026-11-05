import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Department = { id: number; name: string; code: string }

type DepartmentTabsProps = {
  departments: Department[]
  /** None only while the departments load. */
  active: Department | undefined
  onChange: (code: string) => void
}

/**
 * Which department's rows the page lists: a second row of tabs under the page's own, as a board's
 * machines are, rather than a set of chips of a look of their own.
 */
export const DepartmentTabs = ({ departments, active, onChange }: DepartmentTabsProps) => (
  <div className='scrollport overflow-x-auto max-md:scrollbar-none'>
    <Tabs
      value={active?.code ?? null}
      onValueChange={code => onChange(String(code))}
      aria-label='Department'
    >
      <TabsList variant='line'>
        {departments.map(department => (
          <TabsTrigger key={department.id} value={department.code}>
            {department.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  </div>
)
