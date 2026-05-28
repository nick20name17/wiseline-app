import { DispatchFilter } from '../../-components/filters/dispatch'

import { cn } from '@/lib/utils'

interface DispatchFiltersBarProps {
  className?: string
}
export const DispatchFiltersBar = ({ className }: DispatchFiltersBarProps) => {
  return (
    <div className={cn(className, 'space-y-3.5')}>
      <DispatchFilter without={['pack-skid']} />
    </div>
  )
}
