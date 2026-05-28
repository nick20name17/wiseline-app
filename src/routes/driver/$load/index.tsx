import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { BackButton } from '../-components/back-button'
import { DeliveryStatusBadge } from '../-components/deliveries/status-badge'

import { PackagesList } from './-components/packages/list'
import { DeliverySkeleton } from './-components/skeleton'
import { getLoadQueryOptions } from '@/api/loads/query'
import type { SingleLoad } from '@/api/loads/schema'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useWebsocketSubscription } from '@/hooks/use-websocket'
import { CreateRouteDialog } from '@/routes/_shipping/shipping/-components/dialogs/create-route'

const OrderPage = () => {
  const { load: loadId } = Route.useParams()

  const { data: load, isLoading } = useQuery(getLoadQueryOptions(+loadId))

  const queryClient = useQueryClient()

  useWebsocketSubscription({
    route: '/loads/',
    onMessage: (data) => {
      queryClient.setQueryData(getLoadQueryOptions(+loadId).queryKey, data as SingleLoad)
    }
  })

  if (isLoading) {
    return <DeliverySkeleton />
  }

  return (
    <div className='-mx-4 flex h-screen flex-col'>
      <OrderTop load={load!} />
      <Address load={load!} />

      <div className='container mt-3 min-h-0 flex-1'>
        <ScrollArea>
          <PackagesList
            isLoading={isLoading}
            load={load!}
          />
        </ScrollArea>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/driver/$load/')({
  component: OrderPage
})

interface OrderTop {
  load: SingleLoad
}

const OrderTop = ({ load }: OrderTop) => {
  return (
    <div className='flex h-13 items-center gap-2 border-b bg-[#FAFAFA] px-3.5'>
      <BackButton />

      <span className='font-medium'>Load ID: {load.id}</span>

      <div className='ml-auto flex items-center gap-2'>
        <DeliveryStatusBadge load={load} />
      </div>
    </div>
  )
}

const Address = ({ load }: OrderTop) => {
  return (
    <div className='flex h-13 items-center justify-between gap-2 border-b bg-[#FAFAFA] px-3.5'>
      <div className='text-muted-foreground'>Address:</div>
      {/* <div className='flex items-center gap-2'>
        <div className='font-medium'>432 Hill St. London</div>
        <Button size='icon'>
          <RiMap2Line />
        </Button>
      </div> */}

      <CreateRouteDialog
        loadId={load.id}
        readonly
      />
    </div>
  )
}
