import { createFileRoute } from '@tanstack/react-router'
import {
  CircleDot,
  Database,
  Disc,
  Inbox,
  LogIn,
  Pause,
  Play,
  Search,
  Send,
  Truck
} from 'lucide-react'

import { useEffect } from 'react'

import { useGoto } from '@/session/goto'
import { ROLE_LABELS, viewingAsLabel } from '@/session/nav-visibility'
import { usePage } from '@/session/use-page'
import { useViewer } from '@/session/use-viewer'
import { useStore } from '@/store/create-store'

import { Sidebar } from '@/components/shell/chrome'

import {
  activityStore,
  addLiveEvent,
  DEPT_HREF,
  DEPTS_FILTER,
  LIVE_INTERVAL_MS,
  matchesFilters,
  relLabel,
  setDeptFilter,
  setSearch,
  setTypeFilter,
  slug,
  togglePause,
  TYPE_CLASS,
  TYPES_FILTER
} from '@/features/activity/store'

import type { Event } from '@/features/activity/store'

import '@/styles/activity.css'

export const Route = createFileRoute('/_authenticated/activity')({
  component: Activity
})

const TypeIcon = ({ type }: { type: string }) => {
  if (type === 'Release') return <Send />
  if (type === 'EBMS') return <Database />
  if (type === 'Shipment') return <Truck />
  if (type === 'Coil') return <Disc />
  if (type === 'Login') return <LogIn />
  return <CircleDot />
}

const FeedRow = ({ event, flash }: { event: Event; flash: boolean }) => {
  const goto = useGoto()

  return (
    <div
      className={`feed-row${flash ? ' flash' : ''}`}
      data-comment={`activity-row-${event.id}`}
      style={{ cursor: 'pointer' }}
      onClick={() => goto(DEPT_HREF[event.dept] ?? '/dashboard')}
    >
      <span
        className={`feed-badge ${TYPE_CLASS[event.type]}`}
        data-comment={`activity-badge-${event.id}`}
      >
        <TypeIcon type={event.type} />
      </span>
      <div className='feed-main' data-comment={`activity-main-${event.id}`}>
        <div className='feed-line' data-comment={`activity-line-${event.id}`}>
          <b data-comment={`activity-actor-${event.id}`}>{event.actor}</b>{' '}
          <span data-comment={`activity-action-${event.id}`}>{event.action}</span>
        </div>
        <div className='feed-meta' data-comment={`activity-meta-${event.id}`}>
          <span className='feed-dept-chip' data-comment={`activity-dept-tag-${event.id}`}>
            {event.dept}
          </span>
          {event.targets.map((target, index) => (
            <span
              className='feed-pill mono'
              data-comment={`activity-pill-${event.id}-${index}`}
              key={target}
            >
              {target}
            </span>
          ))}
        </div>
      </div>
      <span className='feed-time mono' data-comment={`activity-time-${event.id}`}>
        {relLabel(event)}
      </span>
    </div>
  )
}

/**
 * Every production event, as it happens, across all four departments.
 *
 * The feed is live: a new event arrives every 4.5 seconds until it is paused, and it is generated, not
 * replayed — the rows after the sixteen seeded ones are random by design, so nothing past the first
 * tick is the same twice. Pause is what makes the screen readable, and what makes it comparable.
 */
function Activity() {
  usePage('activity')

  const state = useStore(activityStore, current => current)
  const viewer = useViewer()

  useEffect(() => {
    const timer = setInterval(addLiveEvent, LIVE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  const filtered = state.events.filter(event => matchesFilters(event, state))
  const todays = filtered.filter(event => event.day === 'today')
  const yesterdays = filtered.filter(event => event.day === 'yesterday')

  return (
    <div className='app' data-comment='app-shell'>
      <Sidebar
        current='/activity'
        role={viewer?.role ?? 'admin'}
        department={viewer?.department ?? 'all'}
        roleLabel={viewingAsLabel(viewer?.role ?? 'admin', viewer?.department ?? 'all')}
      />

      <div className='main' data-comment='main'>
        <header className='topbar' data-comment='topbar'>
          <div className='crumb' data-comment='topbar-crumb'>
            <strong data-comment='topbar-crumb-root'>Activity</strong>
          </div>
          <div className='topbar-right' data-comment='topbar-right'>
            {/* the prototype's role switcher rewrites this chip on load; it is the viewer, not a constant */}
            <span className='role-chip' data-comment='topbar-role'>
              {ROLE_LABELS[viewer?.role ?? 'admin']}
            </span>
            <div className='avatar' data-comment='topbar-avatar' title='John Enns'>
              JE
            </div>
          </div>
        </header>

        <div className='dept-bar' data-comment='dept-bar'>
          <div className='activity-head' data-comment='activity-head'>
            <div data-comment='activity-head-text'>
              <h1 className='dept-title' data-comment='activity-title'>
                Activity
              </h1>
              <p className='activity-subtitle' data-comment='activity-subtitle'>
                Live production events across all departments
              </p>
            </div>
            <div className='activity-head-actions' data-comment='activity-head-actions'>
              <div className='search' data-comment='activity-search'>
                <Search style={{ width: '14px', height: '14px' }} />
                <input
                  type='text'
                  placeholder='Search activity…'
                  data-comment='activity-search-input'
                  aria-label='Search activity'
                  value={state.search}
                  onChange={event => setSearch(event.target.value)}
                />
              </div>
              <div className='live-indicator' data-comment='activity-live'>
                <span
                  className={`live-dot${state.paused ? ' paused' : ''}`}
                  id='live-dot'
                  data-comment='activity-live-dot'
                />
                <span id='live-label' data-comment='activity-live-label'>
                  {state.paused ? 'Paused' : 'Live'}
                </span>
              </div>
              <button
                className='btn'
                id='pause-btn'
                data-comment='activity-pause-btn'
                onClick={togglePause}
              >
                {state.paused ? (
                  <Play style={{ width: '14px', height: '14px' }} />
                ) : (
                  <Pause style={{ width: '14px', height: '14px' }} />
                )}
                {state.paused ? 'Resume' : 'Pause'}
              </button>
            </div>
          </div>

          <div className='filter-rows' data-comment='activity-filter-rows'>
            <div className='filter-row' data-comment='activity-filter-dept-row'>
              <span className='filter-row-label' data-comment='activity-filter-dept-label'>
                Department
              </span>
              <div
                className='filter-row-chips'
                id='dept-chip-row'
                data-comment='activity-dept-chip-row'
              >
                {DEPTS_FILTER.map(dept => (
                  <button
                    className={`fchip${state.deptFilter === dept ? ' active' : ''}`}
                    data-comment={`activity-dept-chip-${slug(dept)}`}
                    onClick={() => setDeptFilter(dept)}
                    key={dept}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>
            <div className='filter-row' data-comment='activity-filter-type-row'>
              <span className='filter-row-label' data-comment='activity-filter-type-label'>
                Event type
              </span>
              <div
                className='filter-row-chips'
                id='type-chip-row'
                data-comment='activity-type-chip-row'
              >
                {TYPES_FILTER.map(type => (
                  <button
                    className={`fchip${state.typeFilter === type ? ' active' : ''}`}
                    data-comment={`activity-type-chip-${slug(type)}`}
                    onClick={() => setTypeFilter(type)}
                    key={type}
                  >
                    {TYPE_CLASS[type] ? (
                      <span className={`fchip-dot fchip-dot-${TYPE_CLASS[type]}`} />
                    ) : null}
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <main className='content' data-comment='content'>
          <div id='feed-container' data-comment='feed-container'>
            {!filtered.length ? (
              <div className='table-wrap' data-comment='activity-empty-wrap'>
                <div className='empty' data-comment='activity-empty'>
                  <Inbox className='empty-ico' data-comment='activity-empty-icon' />
                  <h3 data-comment='activity-empty-title'>No matching activity</h3>
                  <p data-comment='activity-empty-text'>
                    Try a different department, event type, or search term.
                  </p>
                </div>
              </div>
            ) : (
              <div className='feed-wrap' data-comment='activity-feed-wrap'>
                {todays.length ? (
                  <>
                    <div className='feed-day-head' data-comment='activity-day-today'>
                      Today
                    </div>
                    {todays.map(event => (
                      <FeedRow event={event} flash={state.flashId === event.id} key={event.id} />
                    ))}
                  </>
                ) : null}
                {yesterdays.length ? (
                  <>
                    <div className='feed-day-head' data-comment='activity-day-yesterday'>
                      Yesterday
                    </div>
                    {yesterdays.map(event => (
                      <FeedRow event={event} flash={state.flashId === event.id} key={event.id} />
                    ))}
                  </>
                ) : null}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
