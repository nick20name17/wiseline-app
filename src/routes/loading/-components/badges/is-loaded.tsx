import { RiCheckboxCircleFill, RiTimeLine } from '@remixicon/react'

import type { Package } from '@/api/packages/schema'
import type { Skids } from '@/api/skids/schema'
import { cn } from '@/lib/utils'

interface IsLoadedBadgeProps {
  skidOrPackage: Skids | Package
}

export const IsLoadedBadge = ({ skidOrPackage }: IsLoadedBadgeProps) => {
  const isLoaded =
    'package_items' in skidOrPackage
      ? skidOrPackage?.package_items.every((item) => item.is_loaded)
      : skidOrPackage?.is_loaded

  const styles = isLoaded ? 'border-[#15E274] bg-[#E0FFEF]' : 'border-muted-foreground/50 bg-muted'

  const Icon = isLoaded ? RiCheckboxCircleFill : RiTimeLine
  const label = isLoaded ? 'Loaded' : 'Not Loaded'

  return (
    <div
      className={cn(
        'flex h-6 items-center justify-center gap-1 rounded-full border text-sm',
        styles
      )}
    >
      <Icon className={cn(isLoaded ? 'text-primary' : 'text-muted-foreground', 'size-4')} />
      <span>{label}</span>
    </div>
  )
}
