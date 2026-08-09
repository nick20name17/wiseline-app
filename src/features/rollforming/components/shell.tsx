import { History } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { rollformingStore, setActor } from '../store'

/**
 * Rollforming's own department bar. Trim's is a different shape — no spacer, no `tabs-row`, its own
 * `data-comment` names — so this is a second copy rather than a shared component with six props. The
 * sidebar and top bar *are* shared: those two are identical markup on both pages.
 */

/**
 * Which tabs a role may see. The specialised stations see one tab each: a Wrapping Worker only wraps,
 * and a Slit Line Worker only works the Queue.
 */
const ROLE_VIEWS: Record<string, string[]> = {
  manager: ['home', 'scheduled', 'production', 'queue', 'coils', 'wrapping', 'completed'],
  worker: ['production', 'queue', 'coils', 'wrapping'],
  ww: ['wrapping'],
  slw: ['queue']
}

const WORKER_ROLES = ['worker', 'ww', 'slw']

const RF_ACTORS = [
  { id: 'worker', label: 'Rollforming Worker' },
  { id: 'ww', label: 'Wrapping Worker' },
  { id: 'slw', label: 'Slit Line Worker' }
]

export const canAccess = (view: string, role: string) => !!ROLE_VIEWS[role]?.includes(view)

export const defaultView = (role: string) => ROLE_VIEWS[role]?.[0] ?? 'home'

/**
 * Which of the three worker stations is being worked as. It is a Rollforming-local switch, separate
 * from the cross-page "Viewing as": moving between the stations must not tell the other departments
 * that the role changed.
 */
const ActorBar = ({ role, onNavigate }: { role: string; onNavigate: (view: string) => void }) => {
  if (!WORKER_ROLES.includes(role))
    return <div className='rf-actorbar' data-comment='rf-actorbar' style={{ display: 'none' }} />

  return (
    <div className='rf-actorbar' data-comment='rf-actorbar'>
      <span className='actor-label' data-comment='actorbar-label'>
        Working as
      </span>
      {RF_ACTORS.map(actor => (
        <button
          key={actor.id}
          className={`actor-pill ${actor.id === role ? 'active' : ''}`}
          data-comment={`actor-${actor.id}`}
          onClick={() => {
            setActor(actor.id)
            onNavigate(defaultView(actor.id))
          }}
        >
          {actor.label}
        </button>
      ))}
    </div>
  )
}

export type Tab = { view: string; label: string; count: number }

export const DeptBar = ({
  tabs,
  activeView,
  onNavigate
}: {
  tabs: Tab[]
  activeView: string
  onNavigate: (view: string) => void
}) => {
  const role = useStore(rollformingStore, state => state.role)

  return (
    <div className='dept-bar' data-comment='dept-bar'>
      <div className='dept-title-row' data-comment='dept-title-row'>
        <h1 className='dept-title' data-comment='dept-title'>
          Rollforming
        </h1>
        <span className='dept-chip mono' data-comment='dept-chip'>
          dept · 02
        </span>
        <div className='dept-spacer' data-comment='dept-spacer' />
        <button
          className='ghost-link'
          data-comment='dept-completed-btn'
          onClick={() => onNavigate('completed')}
        >
          <History style={{ width: '14px', height: '14px' }} />
          Completed orders (90 days)
        </button>
      </div>
      <div className='tabs-row' data-comment='tabs-row'>
        <nav className='tabs' data-comment='tabs'>
          {tabs.map(tab => (
            <button
              key={tab.view}
              className={`tab${tab.view === activeView ? ' active' : ''}${
                canAccess(tab.view, role) ? '' : ' is-hidden'
              }`}
              data-comment={`tab-${tab.view}`}
              onClick={() => onNavigate(tab.view)}
            >
              {tab.label}{' '}
              <span className='tab-count' data-comment={`tab-${tab.view}-count`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
        <ActorBar role={role} onNavigate={onNavigate} />
      </div>
    </div>
  )
}
