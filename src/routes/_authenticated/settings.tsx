import { createFileRoute } from '@tanstack/react-router'

import { viewingAsLabel } from '@/session/nav-visibility'
import { usePage } from '@/session/use-page'
import { useViewer } from '@/session/use-viewer'
import { useStore } from '@/store/create-store'

import { Sidebar } from '@/components/shell/chrome'
import { Toast } from '@/components/shell/toast'

import { AreaTable, MachinesArea, WorkDaysArea } from '@/features/settings/areas'
import { AREAS } from '@/features/settings/config'
import { setArea, settingsStore } from '@/features/settings/store'

import '@/styles/settings.css'

export const Route = createFileRoute('/_authenticated/settings')({
  component: Settings
})

/**
 * Everything the departments are configured by, one area at a time.
 *
 * Two of the eight areas are not tables and are rendered on their own, exactly as the prototype
 * returns early for them: machines are grouped by department around their capacities, and work days
 * are a calendar rather than a list of records.
 */
function Settings() {
  usePage('settings')

  const state = useStore(settingsStore, current => current)
  const viewer = useViewer()

  const area = AREAS.find(entry => entry.key === state.activeArea)

  return (
    <>
      <div className='app' data-comment='app-shell'>
        <Sidebar
          current='/settings'
          role={viewer?.role ?? 'admin'}
          department={viewer?.department ?? 'all'}
          roleLabel={viewingAsLabel(viewer?.role ?? 'admin', viewer?.department ?? 'all')}
        />

        <div className='main' data-comment='main'>
          <header className='topbar' data-comment='topbar'>
            <div className='crumb' data-comment='topbar-crumb'>
              <strong data-comment='topbar-crumb-root'>Settings</strong>
              <span className='crumb-sep' data-comment='topbar-crumb-sep'>
                /
              </span>
              <span data-comment='topbar-crumb-area' id='crumb-area'>
                {area?.label ?? ''}
              </span>
            </div>
            <div className='topbar-right' data-comment='topbar-right'>
              <div className='avatar' data-comment='topbar-avatar' title='John Enns'>
                JE
              </div>
            </div>
          </header>

          <div className='dept-bar' data-comment='dept-bar'>
            <div className='dept-title-row' data-comment='dept-title-row'>
              <h1 className='dept-title' data-comment='dept-title'>
                Settings
              </h1>
              <span className='dept-chip mono' data-comment='dept-chip'>
                admin
              </span>
            </div>
            <nav className='tabs' data-comment='area-tabs' id='area-tabs'>
              {AREAS.map(entry => (
                <button
                  className={`tab ${state.activeArea === entry.key ? 'active' : ''}`}
                  data-comment={`area-tab-${entry.key}`}
                  onClick={() => setArea(entry.key)}
                  key={entry.key}
                >
                  {entry.label}
                </button>
              ))}
            </nav>
          </div>

          <main className='content' data-comment='content'>
            <section id='view-area' className='view active' data-comment='view-area'>
              {state.activeArea === 'machines' ? (
                <MachinesArea state={state} />
              ) : state.activeArea === 'workdays' ? (
                <WorkDaysArea state={state} />
              ) : (
                <AreaTable state={state} area={state.activeArea} />
              )}
            </section>
          </main>
        </div>
      </div>
      <Toast />
    </>
  )
}
