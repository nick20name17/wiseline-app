import { History } from 'lucide-react'

/**
 * Trim's own department bar: its title, its code chip, and its tab strip.
 *
 * The navigation rail and top bar above it are shared (`@/components/shell/chrome`) because both ported
 * departments spell them identically. This is the part that does not generalise — Rollforming's bar has
 * a spacer, a `tabs-row` and its own `data-comment` names, so it keeps its own copy.
 */

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
