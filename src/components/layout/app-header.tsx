import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { usePageHeaderValue } from '@/components/layout/page-header-context'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useMatches } from '@tanstack/react-router'
import { cn } from 'cn'
import { Search } from 'lucide-react'
import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

export const AppHeader = () => {
  const routeCrumbs = useMatches({
    select: matches => matches.map(match => match.staticData.crumb).filter(crumb => !!crumb)
  })
  // A page can add to its own breadcrumb and hand up a search box — a department board's tab and its
  // order search both live here, next to the trail they belong to.
  const { trail, search } = usePageHeaderValue()
  const crumbs = [...routeCrumbs, ...(trail ?? [])]

  // A phone has no room for the box beside the trail, so it opens over the header from a button. The
  // box stays mounted while it is shut: it holds the term being typed, and a term still applied is
  // marked on the button.
  const [searchOpened, setSearching] = useState(false)
  // Only while there is a box to show: a page without one, reached from an open search, would
  // otherwise keep the header's controls hidden behind it.
  const searching = searchOpened && !!search
  const [hasTerm, setHasTerm] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  // A page opened on a search, or another page's box, starts from what that box holds.
  useLayoutEffect(() => {
    setHasTerm(!!searchRef.current?.querySelector('input')?.value)
  }, [search])
  const openSearch = () => {
    // Synchronously, inside the tap: iOS raises the keyboard only for a focus the tap itself made.
    flushSync(() => setSearching(true))
    searchRef.current?.querySelector('input')?.focus()
  }

  return (
    <header className='sticky top-0 z-10 flex h-13 shrink-0 items-center gap-3.5 border-b border-border bg-background px-safe-3 sm:px-safe-4.5'>
      {/* The prototype has no collapse control; the sidebar there is fixed. This one opens the sheet
          on a phone and the rail's labels on a tablet. */}
      <SidebarTrigger className={cn('-ml-1 xl:hidden', searching && 'max-md:hidden')} />

      <Breadcrumb className={cn('min-w-0', searching && 'max-md:hidden')}>
        <BreadcrumbList className='flex-nowrap'>
          {crumbs.map((crumb, index) => (
            <Fragment key={crumb}>
              {index > 0 && <BreadcrumbSeparator>/</BreadcrumbSeparator>}
              <BreadcrumbItem className='min-w-0'>
                {/* The root segment carries the weight and the leaf stays muted — the reverse of
                    the shadcn default, and what the prototype's `.crumb strong` does. */}
                {index === 0 ? (
                  <strong className='truncate font-semibold text-foreground'>{crumb}</strong>
                ) : (
                  <span
                    className='truncate'
                    aria-current={index === crumbs.length - 1 ? 'page' : undefined}
                  >
                    {crumb}
                  </span>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {search ? (
        <div
          ref={searchRef}
          className={cn(
            'w-full max-w-104 md:ml-4',
            searching ? 'max-md:max-w-none max-md:flex-1' : 'max-md:hidden'
          )}
          onInput={event => setHasTerm(!!(event.target as HTMLInputElement).value)}
        >
          {search}
        </div>
      ) : null}

      <div className='ml-auto flex shrink-0 items-center gap-2.5'>
        {searching ? (
          <Button variant='ghost' className='md:hidden' onClick={() => setSearching(false)}>
            Done
          </Button>
        ) : search ? (
          <Button
            variant='ghost'
            size='icon'
            className='relative md:hidden'
            aria-label={hasTerm ? 'Search (filtered)' : 'Search'}
            onClick={openSearch}
          >
            <Search />
            {hasTerm ? (
              <span className='absolute top-1 right-1 size-2 rounded-full bg-primary' />
            ) : null}
          </Button>
        ) : null}
      </div>
    </header>
  )
}
