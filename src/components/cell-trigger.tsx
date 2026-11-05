import { Menu } from '@base-ui/react/menu'
import { CELL_TRIGGER } from './cell-trigger-class'
import { cn } from 'cn'
import type { ComponentProps } from 'react'

/** A dropdown menu's trigger that is its table cell. */
export const CellMenuTrigger = ({ className, ...props }: ComponentProps<typeof Menu.Trigger>) => (
  <Menu.Trigger data-fills-cell className={cn(CELL_TRIGGER, 'truncate', className)} {...props} />
)
