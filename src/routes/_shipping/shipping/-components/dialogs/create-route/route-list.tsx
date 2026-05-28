import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { RouteItem } from './route-item'
import type { Route } from './types'

interface RoutesListProps {
  routes: Route[]
  setRoutes: React.Dispatch<React.SetStateAction<Route[]>>
  readonly?: boolean
}

export const RoutesList = ({ routes, setRoutes, readonly }: RoutesListProps) => {
  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    setRoutes((items) =>
      arrayMove(
        items,
        items.findIndex((i) => i.id === active.id),
        items.findIndex((i) => i.id === over.id)
      )
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
    >
      <SortableContext
        items={routes.map((r) => r.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className='relative space-y-2.5 sm:space-y-4.5'>
          <div className='border-muted-foreground/40 pointer-events-none absolute top-1/2 left-[9.5px] h-[87%] w-px -translate-y-1/2 border-l border-dashed' />
          {routes.map((route, index) => (
            <RouteItem
              key={route.id}
              index={index}
              route={route}
              setRoutes={setRoutes}
              readonly={readonly}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
