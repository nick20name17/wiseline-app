import { createFileRoute } from '@tanstack/react-router'
import { ScanLine, Truck } from 'lucide-react'

import { useRef, useState } from 'react'

import { viewingAsLabel } from '@/session/nav-visibility'
import { usePage } from '@/session/use-page'
import { useViewer } from '@/session/use-viewer'
import { useStore } from '@/store/create-store'

import { Sidebar, ToolsTopbar } from '@/components/shell/chrome'
import { ToastIcon } from '@/components/shell/toast'
import { useToast } from '@/components/shell/use-toast'

import { fmtDate } from '@/features/shipping/format'
import { doScan, loadingStore, simDeletedScan } from '@/features/loading/store'

import type { Load, LoadPackage } from '@/features/loading/store'

import '@/styles/loading.css'

export const Route = createFileRoute('/_authenticated/loading')({
  component: LoadingStation
})

const PackageRow = ({ pkg, prefix }: { pkg: LoadPackage; prefix: string }) => (
  <div className='pkg-row' data-comment={`${prefix}-row`}>
    <span className={`pkg-dot ${pkg.status}`} data-comment={`${prefix}-dot`} />
    <span className='pkg-label mono' data-comment={`${prefix}-label`}>
      {pkg.label}
    </span>
    <span className='pkg-order mono' data-comment={`${prefix}-order`}>
      {pkg.order}
    </span>
    <span className='pkg-customer' data-comment={`${prefix}-customer`} title={pkg.customer}>
      {pkg.customer}
    </span>
    <span className='pkg-weight mono' data-comment={`${prefix}-weight`}>
      {pkg.weight} lb
    </span>
  </div>
)

const LoadCard = ({ load }: { load: Load }) => {
  const total = load.packages.length
  const loaded = load.packages.filter(pkg => pkg.status === 'loaded').length
  const complete = total > 0 && loaded === total
  const prefix = `load-${load.id}`

  return (
    <div className='load-card' data-comment={`${prefix}-card`}>
      <div className='load-head' data-comment={`${prefix}-head`}>
        <div className='load-head-ico' data-comment={`${prefix}-ico`}>
          <Truck />
        </div>
        <div data-comment={`${prefix}-title-wrap`}>
          <div className='load-title' data-comment={`${prefix}-title`}>
            {load.unit} — {fmtDate(load.date)}
          </div>
          <div className='load-sub' data-comment={`${prefix}-sub`}>
            {total} package{total === 1 ? '' : 's'}
          </div>
        </div>
        <div className='load-progress' data-comment={`${prefix}-progress`}>
          <span
            className={`load-status-dot ${complete ? 'complete' : 'pending'}`}
            data-comment={`${prefix}-status-dot`}
          />
          {loaded} / {total} loaded
        </div>
      </div>

      {total === 0 ? (
        <div className='empty' data-comment={`${prefix}-empty`}>
          No packages assigned to this load yet.
        </div>
      ) : (
        <>
          <div className='pkg-row-head' data-comment={`${prefix}-colhead`}>
            <span />
            <span data-comment={`${prefix}-col-label`}>Package</span>
            <span data-comment={`${prefix}-col-order`}>Order #</span>
            <span data-comment={`${prefix}-col-customer`}>Customer</span>
            <span data-comment={`${prefix}-col-weight`}>Weight</span>
          </div>
          {load.packages.map((pkg, index) => (
            <PackageRow pkg={pkg} prefix={`${prefix}-pkg-${index}`} key={pkg.label} />
          ))}
        </>
      )}
    </div>
  )
}

/**
 * The warehouse's own scan tool: a label goes in, the package it belongs to turns loaded, and the
 * load's progress moves with it. The load-by-load overview a Manager reads is Shipping's Loading tab,
 * and the crosslink says so rather than duplicating it.
 */
function LoadingStation() {
  usePage('loading')

  const loads = useStore(loadingStore, state => state.loads)
  const viewer = useViewer()
  const [typed, setTyped] = useState('')

  const { toast, show } = useToast()

  const input = useRef<HTMLInputElement>(null)

  const scan = (raw: string) => {
    doScan(raw, show)
    setTyped('')
    // the prototype puts focus back on the input after every scan: the next label is coming from a gun,
    // and the focus ring is in the capture, so this is visible as well as functional
    input.current?.focus()
  }

  return (
    <>
      <div className='app' data-comment='app-shell'>
        <Sidebar
          current='/loading'
          role={viewer?.role ?? 'admin'}
          department={viewer?.department ?? 'all'}
          roleLabel={viewingAsLabel(viewer?.role ?? 'admin', viewer?.department ?? 'all')}
        />

        <div className='main' data-comment='main'>
          <ToolsTopbar page='Loading station' />

          <main className='content' data-comment='content'>
            <div className='loads-wrap' data-comment='loading-wrap'>
              <h1 className='loading-title' data-comment='loading-title'>
                Loading station
              </h1>
              <p className='loading-sub' data-comment='loading-sub'>
                Scan a package label to mark it loaded onto its truck.
              </p>
              <p className='loading-sub2' data-comment='loading-sub-crosslink'>
                Warehouse scan tool — for the load-by-load progress overview, see{' '}
                <a data-comment='loading-crosslink-shipping' href='/shipping?view=loading'>
                  Shipping → Loading
                </a>
                .
              </p>

              <div className='scan-box' data-comment='loading-scan-box'>
                <input
                  className='scan-input mono'
                  id='load-scan-input'
                  ref={input}
                  data-comment='loading-scan-input'
                  placeholder='01-330618-01'
                  autoFocus
                  value={typed}
                  onChange={event => setTyped(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') scan(typed)
                  }}
                />
                <button
                  className='btn btn-primary'
                  data-comment='loading-scan-btn'
                  onClick={() => scan(typed)}
                >
                  <ScanLine />
                  Scan
                </button>
              </div>

              <div className='quick' data-comment='loading-quick'>
                <span className='quick-label' data-comment='loading-quick-label'>
                  Simulate a scan (no camera connected)
                </span>
                {loads
                  .flatMap(load => load.packages.map(pkg => pkg.label))
                  .map((label, index) => (
                    <button
                      className='btn btn-sm'
                      data-comment={`loading-quick-${index}`}
                      onClick={() => scan(label)}
                      key={label}
                    >
                      {label}
                    </button>
                  ))}
                <button
                  className='btn btn-sm'
                  data-comment='loading-quick-unknown'
                  onClick={() => scan('01-999999-09')}
                >
                  01-999999-09 (unknown)
                </button>
                <button
                  className='btn btn-sm'
                  data-comment='loading-quick-deleted'
                  onClick={() => simDeletedScan(show)}
                >
                  01-330640-03 (deleted)
                </button>
              </div>

              <div id='loads-list' data-comment='loads-list'>
                {!loads.length ? (
                  <div className='empty' data-comment='loads-empty'>
                    No open loads right now.
                  </div>
                ) : (
                  loads.map(load => <LoadCard load={load} key={load.id} />)
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      {/* this page names its toast `loading-toast`, not `toast`, so it cannot use the shared one */}
      <div
        className={`toast t-${toast.type}${toast.shown ? ' show' : ''}`}
        id='toast'
        data-comment='loading-toast'
      >
        <span className='toast-ico' id='toast-ico' data-comment='toast-ico'>
          {toast.shown ? <ToastIcon type={toast.type} /> : null}
        </span>
        <span id='toast-msg' data-comment='loading-toast-msg'>
          {toast.message}
        </span>
      </div>
    </>
  )
}
