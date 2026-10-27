import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { LucideIcon } from 'lucide-react'
import { Ellipsis } from 'lucide-react'

export type OverflowAction = {
  label: string
  icon: LucideIcon
  onClick: () => void
  disabled?: boolean
  /** Why it is disabled, or what it does: hovered for with a pointer, tapped for with a finger. */
  title?: string
}

type OverflowActionsProps = {
  actions: OverflowAction[]
  /** What the menu holds, for a screen reader. */
  label?: string
}

/**
 * A toolbar's secondary actions: outline buttons where there is room, one «more» menu on a phone,
 * so the row keeps to one line and the primary action stays in sight.
 */
export const OverflowActions = ({ actions, label = 'More actions' }: OverflowActionsProps) => (
  <>
    {actions.map(action => (
      <Button
        key={action.label}
        variant='outline'
        className='max-md:hidden'
        disabled={action.disabled}
        title={action.title}
        onClick={action.onClick}
      >
        <action.icon data-icon='inline-start' />
        {action.label}
      </Button>
    ))}
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant='outline' size='icon' className='md:hidden' aria-label={label} />}
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='min-w-52'>
        {actions.map(action => (
          <DropdownMenuItem
            key={action.label}
            disabled={action.disabled}
            title={action.title}
            onClick={action.onClick}
          >
            <action.icon />
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  </>
)
