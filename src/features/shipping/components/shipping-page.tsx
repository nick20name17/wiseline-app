import { HeaderSearch } from '@/components/header-search'
import { usePageHeader } from '@/components/layout/page-header-context'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { today } from '@/lib/days'
import type { ShippingView } from '../lib/search'
import { ScheduledTab } from './scheduled-tab'
import type { ShipDates } from './ship-date-filter'
import { UnscheduledTab } from './unscheduled-tab'

type ShippingPageProps = {
  view: ShippingView
  search: string | undefined
  day: string | undefined
  shipDates: ShipDates
  onChange: (
    next: { view?: ShippingView; search?: string | undefined; day?: string } & ShipDates
  ) => void
}

/** Dispatch: the orders going out, their ship date and truck, and the Loads they go out on. */
export const ShippingPage = ({ view, search, day, shipDates, onChange }: ShippingPageProps) => {
  usePageHeader({
    trail: [view === 'scheduled' ? 'Scheduled' : 'Unscheduled'],
    search: (
      <HeaderSearch
        initial={search}
        placeholder='Search orders, customers, cities…'
        onSearchChange={next => onChange({ search: next })}
      />
    )
  })

  return (
    <section className='flex min-w-0 flex-1 flex-col gap-4'>
      <div className='border-b border-border'>
        <Tabs value={view} onValueChange={next => onChange({ view: next as ShippingView })}>
          <TabsList variant='line' className='h-9'>
            <TabsTrigger value='unscheduled'>Unscheduled</TabsTrigger>
            <TabsTrigger value='scheduled'>Scheduled</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === 'scheduled' ? (
        <ScheduledTab day={day ?? today()} onDayChange={next => onChange({ day: next })} />
      ) : (
        <UnscheduledTab
          search={search}
          shipDates={shipDates}
          onShipDatesChange={onChange}
          onScheduled={shipDate => onChange({ view: 'scheduled', day: shipDate })}
        />
      )}
    </section>
  )
}
