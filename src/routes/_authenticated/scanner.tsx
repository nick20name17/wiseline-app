import { createFileRoute } from '@tanstack/react-router'
import { Check, CircleAlert, ScanLine, X } from 'lucide-react'

import { useState } from 'react'

import { viewingAsLabel } from '@/session/nav-visibility'
import { usePage } from '@/session/use-page'
import { useViewer } from '@/session/use-viewer'
import { useStore } from '@/store/create-store'

import { Sidebar, ToolsTopbar } from '@/components/shell/chrome'

import { DEPTS, doScan, scannerStore } from '@/features/scanner/store'

import type { LogEntry, Package } from '@/features/scanner/store'

import '@/styles/scanner.css'

export const Route = createFileRoute('/_authenticated/scanner')({
  component: Scanner
})

const STATUS_MAP: Record<string, [string, string]> = {
  wrapped: ['st-wrapped', 'Wrapped'],
  loaded: ['st-loaded', 'Loaded'],
  delivered: ['st-delivered', 'Delivered']
}

const StatusPill = ({ status }: { status: string }) => {
  const [cls, label] = STATUS_MAP[status] ?? ['st-wrapped', status]

  return (
    <span className={`status ${cls}`}>
      <span className='st-dot' />
      {label}
    </span>
  )
}

const Kv = ({ k, v, mono }: { k: string; v: string | number; mono?: boolean }) => (
  <div className='kv'>
    <span className='kv-k'>{k}</span>
    <span className={`kv-v${mono ? ' mono' : ''}`}>{v}</span>
  </div>
)

const ValidResult = ({ pkg }: { pkg: Package }) => (
  <div className='result r-ok' data-comment='result-card-ok'>
    <div className='result-head' data-comment='result-head-ok'>
      <div className='result-ico' data-comment='result-ico-ok'>
        <Check style={{ width: '14px', height: '14px' }} />
      </div>
      <div>
        <div className='result-title' data-comment='result-title-ok'>
          Valid package
        </div>
        <div className='result-sub mono' data-comment='result-sub-ok'>
          {pkg.label}
        </div>
      </div>
    </div>
    <div className='result-body' data-comment='result-body-ok'>
      <Kv k='Department' v={`${DEPTS[pkg.dept]} (${pkg.dept})`} />
      <Kv k='Order #' v={pkg.order} mono />
      <Kv k='Package #' v={pkg.seq} mono />
      <Kv k='Customer' v={pkg.customer} />
      <Kv k='Contents' v={pkg.contents} />
      <Kv k='Weight' v={`${pkg.weight} lb`} mono />
      <Kv k='Location' v={pkg.location} mono />
      <div className='kv' data-comment='result-status'>
        <span className='kv-k'>Status</span>
        <span className='kv-v'>
          <StatusPill status={pkg.status} />
        </span>
      </div>
    </div>
  </div>
)

/**
 * The package scanner: a label goes in, and what comes back is one of three answers — valid, deleted,
 * or unknown. The deleted one is the point of the screen: a tombstoned label still scans, and is
 * rejected rather than quietly missing.
 */
function Scanner() {
  usePage('scanner')

  const packages = useStore(scannerStore, state => state.packages)
  const log = useStore(scannerStore, state => state.log)
  const viewer = useViewer()
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState<LogEntry | null>(null)

  const scan = (raw: string) => {
    doScan(raw)
    setResult(scannerStore.get().log[0] ?? null)
    setTyped('')
  }

  return (
    <div className='app' data-comment='app-shell'>
      <Sidebar
        current='/scanner'
        role={viewer?.role ?? 'admin'}
        department={viewer?.department ?? 'all'}
        roleLabel={viewingAsLabel(viewer?.role ?? 'admin', viewer?.department ?? 'all')}
      />

      <div className='main' data-comment='main'>
        <ToolsTopbar page='Package scanner' />

        <main className='content' data-comment='content'>
          <div className='scan-wrap' data-comment='scan-wrap'>
            <h1 className='scan-title' data-comment='scan-title'>
              Package scanner
            </h1>
            <p className='scan-sub' data-comment='scan-sub'>
              Scan or type a package label. Every scan is validated server-side — deleted packages
              are rejected.
            </p>

            <div className='scan-box' data-comment='scan-box'>
              <input
                className='scan-input mono'
                id='scan-input'
                data-comment='scan-input'
                aria-label='Package barcode'
                placeholder='01-330618-01'
                // the prototype autofocuses it: a scanner gun types into whatever holds focus, and the
                // focus ring is visible in the capture, so this is a pixel difference as well as a real one
                autoFocus
                value={typed}
                onChange={event => setTyped(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') scan(typed)
                }}
              />
              <button
                className='btn btn-primary'
                data-comment='scan-btn'
                onClick={() => scan(typed)}
              >
                <ScanLine style={{ width: '14px', height: '14px' }} />
                Scan
              </button>
            </div>

            <div className='quick' data-comment='scan-quick'>
              <span className='quick-label' data-comment='scan-quick-label'>
                Simulate a scan (no camera connected)
              </span>
              {packages.map((pkg, index) => (
                <button
                  className='btn btn-sm'
                  data-comment={`scan-quick-${index}`}
                  onClick={() => scan(pkg.label)}
                  key={pkg.label}
                >
                  {pkg.label}
                  {pkg.deleted ? ' ⚠' : ''}
                </button>
              ))}
              <button
                className='btn btn-sm'
                data-comment='scan-quick-unknown'
                onClick={() => scan('01-999999-09')}
              >
                01-999999-09 (unknown)
              </button>
            </div>

            <div id='scan-result' data-comment='scan-result'>
              {result?.kind === 'ok' && result.pkg ? <ValidResult pkg={result.pkg} /> : null}

              {result?.kind === 'deleted' ? (
                <div className='result r-deleted' data-comment='result-card-deleted'>
                  <div className='result-head' data-comment='result-head-deleted'>
                    <div className='result-ico' data-comment='result-ico-deleted'>
                      <X style={{ width: '14px', height: '14px' }} />
                    </div>
                    <div>
                      <div className='result-title' data-comment='result-title-deleted'>
                        This package has been deleted
                      </div>
                      <div className='result-sub mono' data-comment='result-sub-deleted'>
                        {result.label} — rejected server-side (tombstoned)
                      </div>
                    </div>
                  </div>
                  <div className='result-body' data-comment='result-body-deleted'>
                    <div className='kv'>
                      <span className='kv-k'>What to do</span>
                      <span className='kv-v'>
                        Do not load or ship. Re-print from the department if the package still
                        exists physically.
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {result?.kind === 'unknown' ? (
                <div className='result r-unknown' data-comment='result-card-unknown'>
                  <div className='result-head' data-comment='result-head-unknown'>
                    <div className='result-ico' data-comment='result-ico-unknown'>
                      <CircleAlert style={{ width: '14px', height: '14px' }} />
                    </div>
                    <div>
                      <div className='result-title' data-comment='result-title-unknown'>
                        Unknown label
                      </div>
                      <div className='result-sub mono' data-comment='result-sub-unknown'>
                        {result.label} — no matching package
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className='log' data-comment='scan-log'>
              <div className='log-head' data-comment='scan-log-head'>
                Recent scans
              </div>
              <div id='scan-log-body' data-comment='scan-log-body'>
                {!log.length ? (
                  <div className='empty' data-comment='scan-log-empty'>
                    No scans yet — scan a label above.
                  </div>
                ) : (
                  log.map((entry, index) => (
                    <div className='log-row' data-comment={`scan-logrow-${index}`} key={index}>
                      <span
                        className={`log-dot ld-${entry.kind}`}
                        data-comment={`scan-logdot-${index}`}
                      />
                      <span className='log-label' data-comment={`scan-loglabel-${index}`}>
                        {entry.label}
                      </span>
                      <span
                        className='subtle mono'
                        style={{ color: 'var(--text-subtle)', fontSize: '11px' }}
                      >
                        {entry.ts}
                      </span>
                      <span className='log-msg' data-comment={`scan-logmsg-${index}`}>
                        {entry.kind === 'ok'
                          ? 'Valid'
                          : entry.kind === 'deleted'
                            ? 'Deleted — rejected'
                            : 'Unknown'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
