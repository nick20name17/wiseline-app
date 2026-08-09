import { createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Check, ChevronLeft, Map, MapPin, ScanLine, Truck } from 'lucide-react'

import { usePage } from '@/session/use-page'
import { useStore } from '@/store/create-store'

import { Toast } from '@/components/shell/toast'
import { useToast } from '@/components/shell/use-toast'

import { deliverStop, startRoute } from '@/features/driver/actions'
import {
  computeLegMiles,
  deliveredCount,
  driverStore,
  firstActiveId,
  routeStatus
} from '@/features/driver/store'

import '@/styles/driver.css'

export const Route = createFileRoute('/_authenticated/driver')({
  component: Driver
})

/**
 * The driver's phone: one truck, one load, and the stops on it in delivery order.
 *
 * It is the only screen with no sidebar and no top bar — it is used in a cab, one-handed, and the
 * prototype gives it a phone frame of its own rather than the desk chrome.
 */
function Driver() {
  usePage('driver')

  const state = useStore(driverStore, current => current)
  const { started, stops } = state

  const done = deliveredCount(state)
  const total = stops.length
  const activeId = firstActiveId(state)
  const legMiles = computeLegMiles(stops)

  const { toast, show } = useToast()

  return (
    <>
      <div className='phone' data-comment='phone'>
        <div className='top' data-comment='top'>
          <a className='top-back' data-comment='top-back' href='/shipping'>
            <ChevronLeft style={{ width: '14px', height: '14px' }} />
            Shipping
          </a>
          <div className='top-row' data-comment='top-row'>
            <div className='truck-badge' data-comment='truck-badge'>
              <Truck style={{ width: '14px', height: '14px' }} />
            </div>
            <div data-comment='top-info'>
              <div className='top-name' data-comment='top-name'>
                Truck 104 · Load 1
              </div>
              <div className='top-sub' data-comment='top-sub' id='top-sub'>
                Jul 16 · {total} stops
              </div>
            </div>
            <span className='route-status' data-comment='route-status' id='route-status'>
              {routeStatus(state)}
            </span>
          </div>
        </div>

        <div className='progress' data-comment='progress'>
          <div className='progress-bar' data-comment='progress-bar'>
            <span id='progress-fill' style={{ width: `${Math.round((done / total) * 100)}%` }} />
          </div>
          <div className='progress-text' data-comment='progress-text'>
            <span>Delivered</span>
            <span>
              <b id='progress-done'>{done}</b> / <b id='progress-total'>{total}</b>
            </span>
          </div>
        </div>

        <div className='stops' id='stops' data-comment='stops'>
          {done === total ? (
            <div className='done-banner' data-comment='done-banner'>
              <Check style={{ width: '14px', height: '14px' }} />
              <h3 data-comment='done-title'>Route complete</h3>
              <p data-comment='done-text'>
                All stops delivered. Every package scanned off — orders marked Delivered.
              </p>
            </div>
          ) : (
            stops.map((stop, index) => {
              const delivered = stop.status === 'delivered'
              const active = stop.id === activeId

              return (
                <div
                  className={`stop ${delivered ? 'done' : ''}${active ? ' active' : ''}`}
                  data-comment={`stop-${stop.id}`}
                  key={stop.id}
                >
                  <div className='stop-head' data-comment={`stop-head-${stop.id}`}>
                    <span className='stop-seq' data-comment={`stop-seq-${stop.id}`}>
                      {delivered ? '✓' : index + 1}
                    </span>
                    <div>
                      <div className='stop-cust' data-comment={`stop-cust-${stop.id}`}>
                        {stop.customer}
                      </div>
                      <div className='stop-order' data-comment={`stop-order-${stop.id}`}>
                        {stop.order}
                      </div>
                    </div>
                  </div>
                  <div className='stop-addr' data-comment={`stop-addr-${stop.id}`}>
                    <MapPin style={{ width: '14px', height: '14px' }} />
                    {stop.address}
                  </div>
                  <div className='stop-meta' data-comment={`stop-meta-${stop.id}`}>
                    <span className='mono'>{legMiles[index]} mi</span>
                    <span>
                      <span className='mono'>
                        {stop.deliveredPkgs} / {stop.pkgs}
                      </span>{' '}
                      package(s) scanned off
                    </span>
                  </div>

                  {delivered ? (
                    <div className='stop-delivered' data-comment={`stop-delivered-${stop.id}`}>
                      <Check style={{ width: '14px', height: '14px' }} />
                      Delivered
                    </div>
                  ) : (
                    <div className='stop-actions' data-comment={`stop-actions-${stop.id}`}>
                      <button className='btn' data-comment={`stop-nav-${stop.id}`}>
                        <Map style={{ width: '14px', height: '14px' }} />
                        Navigate
                      </button>
                      <button
                        className='btn btn-primary'
                        data-comment={`stop-deliver-${stop.id}`}
                        disabled={!started}
                        onClick={() => deliverStop(stop.id, show)}
                      >
                        <ScanLine style={{ width: '14px', height: '14px' }} />
                        Scan package
                        {stop.deliveredPkgs > 0 ? ` (${stop.deliveredPkgs}/${stop.pkgs})` : ''}
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className='foot' id='foot' data-comment='foot'>
          {done === total || started ? null : (
            <button
              className='btn btn-primary'
              data-comment='foot-start'
              onClick={() => startRoute(show)}
            >
              <ArrowRight style={{ width: '14px', height: '14px' }} />
              Start route — check off &amp; go
            </button>
          )}
        </div>
      </div>
      <Toast message={toast.message} type={toast.type} shown={toast.shown} />
    </>
  )
}
