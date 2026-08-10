/**
 * Accessories' department bar: a title, its department number, and a flat tab strip whose counts are
 * always on — every tab here has one, unlike Shipping's.
 */
/**
 * Which tabs a role may see. A Worker's scope starts at Packaging — the board above it is the Manager's
 * planning and Completed is his reporting, the same split Trim and Rollforming make.
 */
const ROLE_VIEWS: Record<string, string[]> = {
  manager: ['unscheduled', 'scheduled', 'packaging', 'completed'],
  worker: ['packaging']
}

export const canAccess = (view: string, role: string) => !!ROLE_VIEWS[role]?.includes(view)

export const defaultView = (role: string) => ROLE_VIEWS[role]?.[0] ?? 'unscheduled'

export type Tab = { view: string; label: string; count: number }

export const DeptBar = ({
  tabs,
  activeView,
  role,
  onNavigate
}: {
  tabs: Tab[]
  activeView: string
  role: string
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
          /* An inline `display: none`, which is what the prototype writes here. This page has no
             `.is-hidden` rule to key on — Trim's and Rollforming's do — so a class styled nothing and
             left every tab on screen for a Worker who may only see one. */
          style={canAccess(tab.view, role) ? undefined : { display: 'none' }}
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
