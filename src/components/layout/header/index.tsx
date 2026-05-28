import type { PropsWithChildren } from 'react'

import { NavMenu } from './nav-menu'
import { NavUser } from './nav-user'
import { SearchFilter } from '@/components/common/filters/search'

export const Header = ({ children }: PropsWithChildren) => {
  return (
    <header className='container flex h-(--header-height) items-center justify-between gap-3.5 py-(--header-y-offset)'>
      <div className='flex w-full items-center gap-3.5'>
        <NavMenu />
        {children}
      </div>

      <div className='flex items-center gap-3.5'>
        <SearchFilter className='w-56' />
        <NavUser />
      </div>
    </header>
  )
}
