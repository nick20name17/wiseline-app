/**
 * Accessories' department bar: a title, its department number, and a flat tab strip whose counts are
 * always on — every tab here has one, unlike Shipping's.
 */
export type Tab = { view: string; label: string; count: number }

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
        Accessories
      </h1>
      <span className='dept-chip mono' data-comment='dept-chip'>
        dept · 03
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
          {/* the prototype writes a real space between the label and its count; JSX would drop it */}
          {tab.label}{' '}
          <span className='tab-count' data-comment={`tab-${tab.view}-count`}>
            {tab.count}
          </span>
        </button>
      ))}
    </nav>
  </div>
)
