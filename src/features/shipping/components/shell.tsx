/**
 * Shipping's own department bar: a title, a `dispatch` chip in place of a number, and a flat tab strip.
 *
 * No history link and no `tabs-row` — Shipping reaches its completed orders from a toolbar button
 * inside Unscheduled instead, and has no actor bar to sit beside the tabs.
 */
export type Tab = { view: string; label: string; count?: number }

export const DeptBar = ({
  tabs,
  activeView,
  onNavigate
}: {
  tabs: Tab[]
  activeView: string
  onNavigate: (view: string) => void
}) => (
  <div className='dept-bar' data-comment='dept-bar'>
    <div className='dept-title-row' data-comment='dept-title-row'>
      <h1 className='dept-title' data-comment='dept-title'>
        Shipping
      </h1>
      <span className='dept-chip mono' data-comment='dept-chip'>
        dispatch
      </span>
    </div>
    <nav className='tabs' data-comment='tabs'>
      {tabs.map(tab => (
        <button
          key={tab.view}
          className={`tab${tab.view === activeView ? ' active' : ''}`}
          data-comment={`tab-${tab.view}`}
          onClick={() => onNavigate(tab.view)}
        >
          {tab.label}
          {tab.count === undefined ? null : (
            <span className='tab-count' data-comment={`tab-${tab.view}-count`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </nav>
  </div>
)
