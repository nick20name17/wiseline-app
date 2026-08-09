import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { viewingAsLabel } from '@/session/nav-visibility'
import { usePage } from '@/session/use-page'
import { useViewer } from '@/session/use-viewer'
import { useStore } from '@/store/create-store'

import { Sidebar } from '@/components/shell/chrome'
import { Toast } from '@/components/shell/toast'
import { useToast } from '@/components/shell/use-toast'

import { AreaTable, MachinesArea, WorkDaysArea } from '@/features/settings/areas'
import { AREAS, CONFIG } from '@/features/settings/config'
import { FormModal, PkgMaxModal, SuppliersModal } from '@/features/settings/modals'
import { deleteRow, setArea, settingsStore } from '@/features/settings/store'

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
  const { toast, show } = useToast(2400)

  const [form, setForm] = useState<{ area: string; id: number | null } | null>(null)
  const [pkgMaxDept, setPkgMaxDept] = useState<string | null>(null)
  const [suppliersOpen, setSuppliersOpen] = useState(false)

  // the prototype asks with the browser's own confirm here, and a delete is not undoable
  const remove = (area: string, id: number) => {
    const label = CONFIG[area]?.singular ?? 'record'
    if (!window.confirm(`Delete this ${label}? This can't be undone.`)) return

    deleteRow(area as Parameters<typeof deleteRow>[0], id)
    show('Deleted')
  }

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
                <MachinesArea
                  state={state}
                  onAdd={() => setForm({ area: 'machines', id: null })}
                  onEdit={id => setForm({ area: 'machines', id })}
                  onDelete={id => remove('machines', id)}
                  onPkgMax={setPkgMaxDept}
                  onSuppliers={() => setSuppliersOpen(true)}
                />
              ) : state.activeArea === 'workdays' ? (
                <WorkDaysArea state={state} onToast={show} />
              ) : (
                <AreaTable
                  state={state}
                  area={state.activeArea}
                  onAdd={() => setForm({ area: state.activeArea, id: null })}
                  onEdit={id => setForm({ area: state.activeArea, id })}
                  onDelete={id => remove(state.activeArea, id)}
                />
              )}
            </section>
          </main>
        </div>
      </div>

      <FormModal
        key={form ? `${form.area}-${form.id ?? 'new'}` : 'form-closed'}
        open={!!form}
        area={form?.area ?? state.activeArea}
        editingId={form?.id ?? null}
        state={state}
        onClose={() => setForm(null)}
        onSaved={show}
      />
      <SuppliersModal
        open={suppliersOpen}
        suppliers={state.coilSuppliers}
        onClose={() => setSuppliersOpen(false)}
      />
      <PkgMaxModal
        key={`pkgmax-${pkgMaxDept ?? 'none'}`}
        dept={pkgMaxDept}
        current={pkgMaxDept ? (state.pkgMax[pkgMaxDept] ?? 0) : 0}
        onClose={() => setPkgMaxDept(null)}
        onSaved={show}
      />
      <Toast message={toast.message} type={toast.type} shown={toast.shown} />
    </>
  )
}
