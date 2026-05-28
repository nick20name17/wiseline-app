import {
  type RemixiconComponentType,
  RiArrowRightSLine,
  RiBox3Line,
  RiCircleLine,
  RiFlowChart,
  RiHome6Line,
  RiMapPinLine,
  RiMenuFill,
  RiQrScan2Line,
  RiSettings3Line,
  RiTimeLine,
  RiTruckLine,
  RiUserLine
} from '@remixicon/react'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import type { User } from '@/api/users/schema'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { canAccessPage } from '@/config/permissions/pages'
import { useAuth } from '@/providers/auth'
import type { RouteNames } from '@/types/routes'

type NavigationItem = {
  name: string
  icon: RemixiconComponentType
} & (
  | {
      type: 'page'
      href: RouteNames
      children?: never
    }
  | {
      type: 'category'
      children: NavigationItem[]
    }
)

const navigationMenu: NavigationItem[] = [
  {
    name: 'Production',
    icon: RiSettings3Line,
    type: 'page',
    href: '/'
  },
  {
    name: 'Dispatch',
    icon: RiBox3Line,
    type: 'page',
    href: '/dispatch'
  },
  {
    name: 'Shipping Dispatch',
    icon: RiBox3Line,
    type: 'page',
    href: '/shipping'
  },
  {
    name: 'Loading',
    icon: RiTruckLine,
    type: 'page',
    href: '/loading'
  },
  {
    name: 'Scanner',
    icon: RiQrScan2Line,
    type: 'page',
    href: '/scanner'
  },
  {
    name: 'Settings',
    icon: RiSettings3Line,
    type: 'category',
    children: [
      {
        name: 'Users',
        icon: RiUserLine,
        type: 'page',
        href: '/users'
      },
      {
        name: 'Machines',
        icon: RiFlowChart,
        type: 'page',
        href: '/flows'
      },
      {
        name: 'Locations',
        icon: RiMapPinLine,
        type: 'page',
        href: '/locations'
      },
      {
        name: 'Warehouses',
        icon: RiHome6Line,
        type: 'page',
        href: '/warehouses'
      },
      {
        name: 'Trucks',
        icon: RiTruckLine,
        type: 'page',
        href: '/trucks'
      },
      {
        name: 'Priorities',
        icon: RiTimeLine,
        type: 'page',
        href: '/priorities'
      }
    ]
  }
]

interface NavigationMenuProps {
  level: number
  item: NavigationItem
  onClick: () => void
}

const filterNavigation = (items: NavigationItem[], user: User | null): NavigationItem[] => {
  return items
    .map((item) => {
      if (item.type === 'page') {
        return canAccessPage(user, item.href) ? item : null
      }

      const children = filterNavigation(item.children, user)

      if (children.length === 0) return null

      return { ...item, children }
    })
    .filter(Boolean) as NavigationItem[]
}

const NavigationMenu = ({ item, level, onClick }: NavigationMenuProps) => {
  // const pathname = useLocation({
  //   select: ({ pathname }) => pathname as RouteNames
  // })

  // const isSomeActive = item.children?.some((page) =>
  //   page.type === 'page' ? page.href === pathname : false
  // )

  if (item.type === 'page') {
    return (
      <Link
        onClick={onClick}
        className='focus-visible:ring-ring/50 hover:bg-muted [&.active]:bg-muted flex items-center gap-2 rounded-md p-1 transition-colors outline-none focus-visible:ring-[3px]'
        to={item.href}
        style={{ paddingLeft: `${level === 0 ? 0.25 : 1.75}rem` }}
      >
        <item.icon className='size-4 shrink-0' />

        <span className='text-sm'>{item.name}</span>
      </Link>
    )
  }

  return (
    <Collapsible
      defaultOpen
      className='flex flex-col gap-1.5'
      style={{ paddingLeft: `${level === 0 ? 0 : 1.5}rem` }}
    >
      <CollapsibleTrigger className='focus-visible:ring-ring/50 flex items-center gap-2 rounded-md p-1 outline-none focus-visible:ring-[3px]'>
        {level === 0 ? (
          <item.icon className='size-4 shrink-0' />
        ) : (
          <RiCircleLine className='size-4 shrink-0' />
        )}
        <span className='flex-1 text-start text-sm'>{item.name}</span>
        <RiArrowRightSLine className='size-4 shrink-0 transition-transform [[data-state="open"]>&]:rotate-90' />
      </CollapsibleTrigger>
      <CollapsibleContent className='data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down flex flex-col gap-1.5 overflow-hidden transition-all'>
        {item.children.map((item) => (
          <NavigationMenu
            onClick={onClick}
            key={item.name}
            item={item}
            level={level + 1}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

export const NavMenu = () => {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()

  const filteredNavigation = filterNavigation(navigationMenu, user)

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
    >
      <SheetTrigger asChild>
        <Button variant='secondary'>
          <RiMenuFill />
        </Button>
      </SheetTrigger>

      <SheetContent
        side='left'
        className='w-75'
      >
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>

        <div className='flex flex-col gap-2.5 p-4 pt-0'>
          {filteredNavigation.map((item) => (
            <NavigationMenu
              onClick={() => setOpen(false)}
              key={item.name}
              item={item}
              level={0}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
