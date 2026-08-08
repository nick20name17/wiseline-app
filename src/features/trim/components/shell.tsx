import { Link } from '@tanstack/react-router'
import {
  ChevronsUpDown,
  Database,
  Grid2x2,
  History,
  Layers,
  LayoutDashboard,
  PackageCheck,
  QrCode,
  Search,
  Settings,
  Truck,
  Warehouse,
  Waypoints
} from 'lucide-react'

import { Fragment, type ReactNode } from 'react'

import { canSeeNav } from '@/session/nav-visibility'

import type { Department, Role } from '@/session/viewer'

/**
 * The chrome around a department page: the navigation rail, the top bar and the tab strip.
 *
 * It lives under `features/trim` and not in a shared layout on purpose. Every department page in the
 * prototype has its own copy of this markup with its own department name, tabs and counts, and its own
 * stylesheet — deciding what is common from the first example is how the common thing ends up shaped
 * like Trim. It is lifted once a second department has been ported and the differences are visible.
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
        comment: 'nav-warehouse',
        to: '/warehouse',
        label: 'Warehouse',
        icon: <Warehouse className='nav-ico' />
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

    <div className='wl-role-fab' data-comment='sidebar-foot'>
      <span className='wl-role-fab-label' data-comment='role-switch-label'>
        Viewing as
      </span>
      <button className='role-switch-btn' data-comment='role-switch-btn'>
        <span id='wl-role-current' data-comment='role-switch-current'>
          {roleLabel}
        </span>
        <ChevronsUpDown className='role-switch-caret' />
      </button>
    </div>
  </aside>
)

export const Topbar = ({
  department,
  tab,
  search,
  onSearch
}: {
  department: string
  tab: string
  search: string
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
        placeholder='Search orders, customers, product IDs…'
        data-comment='topbar-search-input'
        aria-label='Search orders, customers, product IDs'
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

export type Tab = { view: string; comment: string; label: string; count?: number }

export const DeptBar = ({
  title,
  code,
  tabs,
  activeView,
  onNavigate
}: {
  title: string
  code: string
  tabs: Tab[]
  activeView: string
  onNavigate: (view: string) => void
}) => (
  <div className='dept-bar' data-comment='dept-bar'>
    <div className='dept-title-row' data-comment='dept-title-row'>
      <h1 className='dept-title' data-comment='dept-title'>
        {title}
      </h1>
      <span className='dept-chip mono' data-comment='dept-chip'>
        dept · {code}
      </span>
      <button
        className='btn dept-history-btn'
        data-comment='dept-completed-90'
        onClick={() => onNavigate('completed')}
      >
        <History style={{ width: '14px', height: '14px' }} />
        Completed orders · past 90 days
      </button>
    </div>
    <nav className='tabs' data-comment='tabs'>
      {tabs.map(tab => (
        <button
          key={tab.comment}
          className={tab.view === activeView ? 'tab active' : 'tab'}
          data-comment={tab.comment}
          onClick={() => onNavigate(tab.view)}
        >
          {tab.label}
          {tab.count === undefined ? null : (
            <span className='tab-count' data-comment={`${tab.comment}-count`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </nav>
  </div>
)
