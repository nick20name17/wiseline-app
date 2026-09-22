import { SelectItem } from '@/components/ui/select'
import { defaultWarehouseId } from '@/lib/default-warehouse'
import type { Warehouse } from '../api'

type WarehouseOptionsProps = { warehouses: Warehouse[] | undefined }

/**
 * A warehouse picker's items: several are named after the same site, so each carries its address,
 * and the default one is marked the way the Warehouses list marks it.
 */
export const WarehouseOptions = ({ warehouses }: WarehouseOptionsProps) => {
  const defaultId = warehouses ? defaultWarehouseId(warehouses) : undefined

  return warehouses?.map(warehouse => (
    <SelectItem
      key={warehouse.id}
      value={String(warehouse.id)}
      label={warehouse.name ?? `Warehouse ${warehouse.id}`}
    >
      <span className='flex min-w-0 flex-col'>
        <span className='flex items-center gap-1.5'>
          {warehouse.name ?? `Warehouse ${warehouse.id}`}
          {warehouse.id === defaultId ? (
            <>
              <span aria-hidden className='size-1.5 rounded-full bg-primary' />
              <span className='sr-only'>(default)</span>
            </>
          ) : null}
        </span>
        {warehouse.address ? (
          <span className='truncate text-xs text-muted-foreground'>{warehouse.address}</span>
        ) : null}
      </span>
    </SelectItem>
  ))
}
