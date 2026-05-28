import type { Priority } from '@/api/priorities/schema'

interface PriorityBadgeProps {
  priority: Priority | null
}

export const PriorityBadge = ({ priority }: PriorityBadgeProps) => {
  if (!priority) return '—'

  return (
    <div className='flex items-center gap-1.5'>
      <div
        className='size-3.5 rounded-sm'
        style={{ backgroundColor: priority.color }}
      />
      <span>{priority.name}</span>
    </div>
  )
}
