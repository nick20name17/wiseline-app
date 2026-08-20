import { Link } from '@tanstack/react-router'
import {
  ChevronsUpDown,
  Database,
  Grid2x2,
  Layers,
  LayoutDashboard,
  PackageCheck,
  QrCode,
  Search,
  Settings,
  Truck,
  Waypoints
} from 'lucide-react'

import { Fragment, type ReactNode } from 'react'

import { canSeeNav } from '@/session/nav-visibility'

import { useRoleMenu } from './role-menu'

import type { Department, Role } from '@/session/viewer'

/**
 * The two pieces of chrome every department page shares verbatim: the navigation rail and the top bar.
 *
 * They were Trim's until Rollforming needed them. The prototype repeats this markup on every page, so
 * the shared version is the intersection of two real pages rather than a guess made from one — the
 * department bar below them is *not* here, because those two genuinely differ in shape.
 */

type NavLink = { comment: string; to: string; label: string; icon: ReactNode }

const NAV_SECTIONS: { label: string; comment: string; links: NavLink[] }[] = [
  {
    label: 'Overview',
    comment: 'sidebar-label-overview',
    links: [
      {
        comment: 'nav-dashboard',
        to: '/dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard className='nav-ico' />
      }
    ]
  },
  {
    label: 'Departments',
    comment: 'sidebar-label-depts',
    links: [
      { comment: 'nav-trim', to: '/trim', label: 'Trim', icon: <Layers className='nav-ico' /> },
      {
        comment: 'nav-rollforming',
        to: '/rollforming',
        label: 'Rollforming',
        icon: <Waypoints className='nav-ico' />
      },
      {
        comment: 'nav-accessories',
        to: '/accessories',
        label: 'Accessories',
        icon: <Grid2x2 className='nav-ico' />
      },
      {
        comment: 'nav-shipping',
        to: '/shipping',
        label: 'Shipping',
        icon: <Truck className='nav-ico' />
      }
    ]
  },
  {
    label: 'Tools',
    comment: 'sidebar-label-tools',
    links: [
      {
        comment: 'nav-driver',
        to: '/driver',
        label: 'Driver',
        icon: <Truck className='nav-ico' />
      },
      {
        comment: 'nav-loading',
        to: '/loading',
        label: 'Loading',
        icon: <PackageCheck className='nav-ico' />
      }
    ]
  },
  {
    label: 'Manage',
    comment: 'sidebar-label-manage',
    links: [
      {
        comment: 'nav-coils',
        to: '/coils',
        label: 'Coils',
        icon: <Database className='nav-ico' />
      },
      {
        comment: 'nav-stockcards',
        to: '/stock-cards',
        label: 'Stock Cards',
        icon: <QrCode className='nav-ico' />
      },
      {
        comment: 'nav-settings',
        to: '/settings',
        label: 'Settings',
        icon: <Settings className='nav-ico' />
      }
    ]
  }
]

export const Sidebar = ({
  current,
  role,
  department,
  roleLabel
}: {
  current: string
  role: Role
  department: Department
  roleLabel: string
}) => (
  <aside className='sidebar' data-comment='sidebar'>
    <div className='brand' data-comment='sidebar-brand'>
      <div className='brand-mark' data-comment='sidebar-brand-mark'>
        <span />
      </div>
      <div data-comment='sidebar-brand-text'>
        <div className='brand-name' data-comment='sidebar-brand-name'>
          Wiseline
        </div>
        <div className='brand-sub' data-comment='sidebar-brand-sub'>
          Production
        </div>
      </div>
    </div>

    {NAV_SECTIONS.map(section => {
      const links = section.links.filter(link => canSeeNav(link.comment, role, department))
      // a section label disappears with the last item under it, rather than heading an empty gap
      if (!links.length) return null

      return (
        <Fragment key={section.comment}>
          <div className='nav-label' data-comment={section.comment}>
            {section.label}
          </div>
          {links.map(link => (
            <Link
              key={link.comment}
              className={link.to === current ? 'nav-item active' : 'nav-item'}
              data-comment={link.comment}
              to={link.to}
              aria-current={link.to === current ? 'page' : undefined}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </Fragment>
      )
    })}

    <RoleFab roleLabel={roleLabel} />
  </aside>
)

/** Its own component so the sidebar stays a plain render and the open menu is the only thing with state. */
const RoleFab = ({ roleLabel }: { roleLabel: string }) => {
  const { toggleRoleMenu, roleMenuNode } = useRoleMenu()

  return (
    <div className='wl-role-fab' data-comment='sidebar-foot'>
      <span className='wl-role-fab-label' data-comment='role-switch-label'>
        Viewing as
      </span>
      <button className='role-switch-btn' data-comment='role-switch-btn' onClick={toggleRoleMenu}>
        <span id='wl-role-current' data-comment='role-switch-current'>
          {roleLabel}
        </span>
        <ChevronsUpDown className='role-switch-caret' />
      </button>
      {roleMenuNode}
    </div>
  )
}

export const Topbar = ({
  department,
  tab,
  search,
  placeholder,
  onSearch
}: {
  department: string
  tab: string
  search: string
  /** The one thing the two pages word differently — Trim searches product IDs, Rollforming profiles. */
  placeholder: string
  onSearch: (value: string) => void
}) => (
  <header className='topbar' data-comment='topbar'>
    <div className='crumb' data-comment='topbar-crumb'>
      <strong data-comment='topbar-crumb-dept'>{department}</strong>
      <span className='crumb-sep' data-comment='topbar-crumb-sep'>
        /
      </span>
      <span data-comment='topbar-crumb-tab' id='crumb-tab'>
        {tab}
      </span>
    </div>
    <div className='search' data-comment='topbar-search'>
      <Search style={{ width: '14px', height: '14px' }} />
      <input
        type='text'
        placeholder={`${placeholder}…`}
        data-comment='topbar-search-input'
        aria-label={placeholder}
        value={search}
        onChange={event => onSearch(event.target.value)}
      />
    </div>
    <div className='topbar-right' data-comment='topbar-right'>
      <div className='avatar' data-comment='topbar-avatar' title='John Enns'>
        JE
      </div>
    </div>
  </header>
)

/**
 * The tools' own top bar: a two-part crumb and no search, because there is nothing on these pages to
 * search. Scanner and the Loading station spell it identically, down to the `data-comment` values, so
 * it lives here rather than twice.
 */
export const ToolsTopbar = ({ page }: { page: string }) => (
  <header className='topbar' data-comment='topbar'>
    <div className='crumb' data-comment='topbar-crumb'>
      <strong data-comment='topbar-crumb-root'>Tools</strong>
      <span className='crumb-sep' data-comment='topbar-crumb-sep'>
        /
      </span>
      <span data-comment='topbar-crumb-page'>{page}</span>
    </div>
    <div className='topbar-right' data-comment='topbar-right'>
      <div className='avatar' data-comment='topbar-avatar' title='John Enns'>
        JE
      </div>
    </div>
  </header>
)
