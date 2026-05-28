import { create } from 'zustand'

import { BasicInputWithSubmit } from '../../inputs/basic-input-with-submit'

import type { OriginItem } from '@/api/origin-items/schema'
import { cn } from '@/lib/utils'

interface WrappedFromInputProps {
  className?: string
  originItem: OriginItem
}

type WrappedFromSlice = {
  wrapped: Record<
    string,
    {
      wrappedFromStock: number
      wrappedFromProduction: number
    }
  >
  setWrappedFromStock: (id: string, value: number) => void
  setWrappedFromProduction: (id: string, value: number) => void
  reset: () => void
}

export const getLeftToWrapQty = (originItem: OriginItem) => {
  const quantity = originItem?.quantity ?? 0
  const wrappedFromStock = originItem?.item?.wrapped_from_stock ?? 0
  const wrappedFromProduction = originItem?.item?.wrapped_from_production ?? 0

  return quantity - (wrappedFromStock + wrappedFromProduction)
}

export const useWrappedFromStore = create<WrappedFromSlice>((set) => ({
  wrapped: {},
  setWrappedFromStock: (id, value) =>
    set((state) => ({
      wrapped: {
        ...state.wrapped,
        [id]: {
          ...(state.wrapped[id] ?? {
            wrappedFromStock: 0,
            wrappedFromProduction: 0
          }),
          wrappedFromStock: value
        }
      }
    })),

  setWrappedFromProduction: (id, value) =>
    set((state) => ({
      wrapped: {
        ...state.wrapped,
        [id]: {
          ...(state.wrapped[id] ?? {
            wrappedFromStock: 0,
            wrappedFromProduction: 0
          }),
          wrappedFromProduction: value
        }
      }
    })),

  reset: () =>
    set(() => ({
      wrapped: {}
    }))
}))

export const WrappedFromInput = ({ className, originItem }: WrappedFromInputProps) => {
  const { item } = originItem
  const id = originItem.id

  const leftToWrap = getLeftToWrapQty(originItem)

  const { wrappedFromProduction, wrappedFromStock } = useWrappedFromStore((s) => s.wrapped[id]) || {
    wrappedFromProduction: 0,
    wrappedFromStock: 0
  }
  const { setWrappedFromProduction, setWrappedFromStock } = useWrappedFromStore()

  const maxStock = Math.min(item?.pull_from_stock || 0, leftToWrap - wrappedFromProduction)
  const maxProduction = leftToWrap - wrappedFromStock

  const disabled =
    leftToWrap === 0 || !originItem?.item?.status || originItem?.item?.status === 'wrapped'

  return (
    <div className='flex items-center gap-2'>
      <BasicInputWithSubmit
        setValue={() => {}}
        value={wrappedFromStock}
        type='number'
        disabled={!item?.pull_from_stock || disabled}
        className={cn(wrappedFromStock !== 0 && '[&_input]:border-primary!', className)}
        max={maxStock}
        onSubmit={({ value }) => setWrappedFromStock(id, value)}
      />

      <BasicInputWithSubmit
        setValue={() => {}}
        type='number'
        disabled={disabled || item?.status === 'stock'}
        value={wrappedFromProduction}
        className={cn(wrappedFromProduction !== 0 && '[&_input]:border-primary!', className)}
        max={maxProduction}
        onSubmit={({ value }) => setWrappedFromProduction(id, value)}
      />
    </div>
  )
}
