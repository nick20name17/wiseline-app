import { createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Check, ChevronLeft, Map, MapPin, ScanLine, Truck } from 'lucide-react'

import { useRootClass } from '@/session/use-root-class'
import { useStore } from '@/store/create-store'

import { cn } from '@/lib/utils'

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

export const Route = createFileRoute('/_authenticated/driver')({
  component: Driver
})

const btn =
  'inline-flex h-[30px] flex-1 items-center justify-center gap-[5px] rounded-[12px] border border-input bg-card px-3 text-[13.5px] font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50'
const btnPrimary = `${btn} border-primary bg-primary text-white hover:bg-primary-hover`
const mono = 'font-medium tracking-[-0.01em] text-text-muted tabular-nums'

/**
 * The driver's phone: one truck, one load, and the stops on it in delivery order.
 *
 * It is the only screen with no sidebar and no top bar — it is used in a cab, one-handed, and the
 * prototype gives it a phone frame of its own rather than the desk chrome.
 */
function Driver() {
  useRootClass(
    'flex min-h-full justify-center bg-[#eef0f3] text-[14px] leading-[1.45] text-foreground antialiased'
  )

  const state = useStore(driverStore, current => current)
  const { started, stops } = state

  const done = deliveredCount(state)
  const total = stops.length
  const activeId = firstActiveId(state)
  const legMiles = computeLegMiles(stops)

  const { toast, show } = useToast()

  return (
    <>
      <div
        className='bg-card shadow-float flex min-h-screen w-full max-w-[430px] flex-col'
        data-comment='phone'
      >
        <div className='bg-foreground px-[18px] pt-4 pb-[18px] text-white' data-comment='top'>
          <a
            className='mb-3 inline-flex items-center gap-1.5 text-[12.5px] text-[#c7cdd6] no-underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
            data-comment='top-back'
            href='/shipping'
          >
            <ChevronLeft className='size-3.5' />
            Shipping
          </a>
          <div className='flex items-center gap-3' data-comment='top-row'>
            <div
              className='grid size-[42px] flex-none place-items-center rounded-xl bg-white/12'
              data-comment='truck-badge'
            >
              <Truck className='size-[22px]' />
            </div>
            <div data-comment='top-info'>
              <div className='text-[17px] font-semibold' data-comment='top-name'>
                Truck 104 · Load 1
              </div>
              <div className='text-[12px] text-[#aeb6c2]' data-comment='top-sub' id='top-sub'>
                Jul 16 · {total} stops
              </div>
            </div>
            <span
              className='ml-auto rounded-[20px] bg-white/14 px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.04em] uppercase'
              data-comment='route-status'
              id='route-status'
            >
              {routeStatus(state)}
            </span>
          </div>
        </div>

        <div className='border-border border-b px-[18px] py-3.5' data-comment='progress'>
          <div className='bg-muted h-2 overflow-hidden rounded-[8px]' data-comment='progress-bar'>
            <span
              className='bg-success block h-full transition-[width] duration-300 ease-[ease] motion-reduce:transition-none'
              id='progress-fill'
              style={{ width: `${Math.round((done / total) * 100)}%` }}
            />
          </div>
          <div
            className='text-text-muted [&_b]:text-foreground mt-2 flex justify-between text-[12px]'
            data-comment='progress-text'
          >
            <span>Delivered</span>
            <span>
              <b id='progress-done'>{done}</b> / <b id='progress-total'>{total}</b>
            </span>
          </div>
        </div>

        <div className='flex flex-1 flex-col gap-3 p-3.5' id='stops' data-comment='stops'>
          {done === total ? (
            <div
              className='border-input text-text-muted m-3.5 rounded-[16px] border border-dashed p-[18px] text-center'
              data-comment='done-banner'
            >
              <Check className='text-success mb-2 inline size-[34px]' />
              <h3 className='text-foreground mb-1 text-[15px] font-bold' data-comment='done-title'>
                Route complete
              </h3>
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
                  className={cn(
                    'border-border shadow-card overflow-hidden rounded-[16px] border',
                    delivered && 'opacity-70',
                    active && 'border-accent-border shadow-[0_0_0_2px_var(--color-accent)]'
                  )}
                  data-comment={`stop-${stop.id}`}
                  key={stop.id}
                >
                  <div
                    className='flex items-center gap-3 p-3.5'
                    data-comment={`stop-head-${stop.id}`}
                  >
                    <span
                      className={cn(
                        'grid size-[30px] flex-none place-items-center rounded-full text-[13px] font-semibold',
                        delivered ? 'bg-success-soft text-success' : 'bg-muted text-text-muted'
                      )}
                      data-comment={`stop-seq-${stop.id}`}
                    >
                      {delivered ? '✓' : index + 1}
                    </span>
                    <div>
                      <div
                        className='text-[14.5px] font-semibold'
                        data-comment={`stop-cust-${stop.id}`}
                      >
                        {stop.customer}
                      </div>
                      <div
                        className='text-muted-foreground text-[11.5px]'
                        data-comment={`stop-order-${stop.id}`}
                      >
                        {stop.order}
                      </div>
                    </div>
                  </div>
                  <div
                    className='text-text-muted flex items-center gap-[7px] pr-3.5 pb-3 pl-14 text-[13px]'
                    data-comment={`stop-addr-${stop.id}`}
                  >
                    <MapPin className='size-3.5' />
                    {stop.address}
                  </div>
                  <div
                    className='text-muted-foreground flex gap-3.5 pr-3.5 pb-3 pl-14 text-[12px]'
                    data-comment={`stop-meta-${stop.id}`}
                  >
                    <span className={mono}>{legMiles[index]} mi</span>
                    <span>
                      <span className={mono}>
                        {stop.deliveredPkgs} / {stop.pkgs}
                      </span>{' '}
                      package(s) scanned off
                    </span>
                  </div>

                  {delivered ? (
                    <div
                      className='border-border bg-success-soft text-success flex items-center justify-center gap-[7px] border-t p-3 text-[13px] font-semibold'
                      data-comment={`stop-delivered-${stop.id}`}
                    >
                      <Check className='size-3.5' />
                      Delivered
                    </div>
                  ) : (
                    <div
                      className='border-border bg-surface-2 flex gap-2 border-t px-3.5 py-3'
                      data-comment={`stop-actions-${stop.id}`}
                    >
                      <button className={btn} data-comment={`stop-nav-${stop.id}`}>
                        <Map className='size-3.5' />
                        Navigate
                      </button>
                      <button
                        className={btnPrimary}
                        data-comment={`stop-deliver-${stop.id}`}
                        disabled={!started}
                        onClick={() => deliverStop(stop.id, show)}
                      >
                        <ScanLine className='size-3.5' />
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

        <div
          className='border-border border-t px-[18px] pt-3.5 pb-[22px]'
          id='foot'
          data-comment='foot'
        >
          {done === total || started ? null : (
            <button
              className={cn(btnPrimary, 'w-full px-3.5')}
              data-comment='foot-start'
              onClick={() => startRoute(show)}
            >
              <ArrowRight className='size-3.5' />
              Start route — check off &amp; go
            </button>
          )}
        </div>
      </div>
      <Toast message={toast.message} type={toast.type} shown={toast.shown} />
    </>
  )
}
