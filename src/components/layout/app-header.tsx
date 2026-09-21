import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useMatches } from '@tanstack/react-router'
import { Fragment, type ReactNode } from 'react'

type AppHeaderProps = {
  /** Rendered at the trailing edge — the user menu in this app. */
  actions?: ReactNode
}

export const AppHeader = ({ actions }: AppHeaderProps) => {
  const crumbs = useMatches({
    select: matches => matches.map(match => match.staticData.crumb).filter(crumb => !!crumb)
  })

  return (
    <header className='sticky top-0 z-10 flex h-13 shrink-0 items-center gap-3.5 border-b border-border bg-background px-4.5'>
      {/* The prototype has no collapse control; the sidebar there is fixed. This one only opens
          the sheet on small screens, where the sidebar is off-canvas. */}
      <SidebarTrigger className='-ml-2 md:hidden' />

      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, index) => (
            <Fragment key={crumb}>
              {index > 0 && <BreadcrumbSeparator>/</BreadcrumbSeparator>}
              <BreadcrumbItem>
                {/* The root segment carries the weight and the leaf stays muted — the reverse of
                    the shadcn default, and what the prototype's `.crumb strong` does. */}
                {index === 0 ? (
                  <strong className='font-semibold text-foreground'>{crumb}</strong>
                ) : (
                  <span aria-current={index === crumbs.length - 1 ? 'page' : undefined}>
                    {crumb}
                  </span>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className='ml-auto flex items-center gap-2.5'>{actions}</div>
    </header>
  )
}
