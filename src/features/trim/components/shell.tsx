import { History } from 'lucide-react'

/**
 * Trim's own department bar: its title, its code chip, and its tab strip.
 *
 * The navigation rail and top bar above it are shared (`@/components/shell/chrome`) because both ported
 * departments spell them identically. This is the part that does not generalise — Rollforming's bar has
 * a spacer, a `tabs-row` and its own `data-comment` names, so it keeps its own copy.
 */

/**
 * Which tabs a role may see (Permissions.md): a Manager works the board from Unscheduled down, a Worker
 * only from Production down — plus Coils, which N-106 gives both.
 */
const ROLE_VIEWS: Record<string, string[]> = {
  manager: ['home', 'scheduled', 'production', 'coils', 'calendar', 'completed'],
  worker: ['production', 'coils']
}

export const canAccess = (view: string, role: string) => !!ROLE_VIEWS[role]?.includes(view)

export const defaultView = (role: string) => ROLE_VIEWS[role]?.[0] ?? 'home'

export type Tab = { view: string; comment: string; label: string; count?: number }

export const DeptBar = ({
  title,
  code,
  tabs,
  activeView,
  role,
  onNavigate
}: {
  title: string
  code: string
  tabs: Tab[]
  activeView: string
  role: string
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
          // hidden, not disabled: a tab a role has no business with is not there at all
          className={`${tab.view === activeView ? 'tab active' : 'tab'}${canAccess(tab.view, role) ? '' : ' is-hidden'}`}
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
