import { forwardRef } from 'react'
import Barcode from 'react-barcode'

import type { StickerDefinition } from '../../types'

import { formatWeight } from '@/utils/format'

interface Props<T> {
  entity: T
  order: {
    invoice: string
    customer: string
  }
  definition: StickerDefinition<T>
}

const StickerTemplateInner = <T,>(
  { entity, order, definition }: Props<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) => {
  const meta = definition.getMeta(entity, order)
  const barcodeValue = definition.getBarcodeValue(entity)

  return (
    <div
      id='sticker'
      ref={ref}
      className='border-foreground rounded-md border p-3.5'
    >
      <div className='flex items-center justify-between [&_h3]:text-3xl [&_h3]:leading-none [&_h3]:font-semibold [&_h3]:uppercase'>
        <h3>{definition.getName(entity)}</h3>
        {/* <h3>{definition.kind}</h3> */}
      </div>

      <div className='border-foreground mt-5 flex h-13.5 items-center border [&_span]:leading-none'>
        <div className='border-r-foreground flex h-full basis-1/4 flex-col justify-between border-r px-4 py-1.5'>
          <span className='text-sm'>Invoice:</span>
          <span className='font-bold'>{meta.invoice}</span>
        </div>
        <div className='border-r-foreground flex h-full basis-1/4 flex-col justify-between border-r px-4 py-1.5'>
          <span className='text-sm'>Weight:</span>
          <span className='font-bold'>{formatWeight(meta.weight)}</span>
        </div>
        <div className='flex h-full basis-1/2 flex-col justify-between px-4 py-1.5'>
          <span className='text-sm'>Customer:</span>
          <span className='font-bold'>{meta.customer}</span>
        </div>
      </div>

      <div className='border-b-foreground mt-1 divide-y border-b'>
        {definition.renderItems(entity)}
      </div>

      <div className='mt-4 flex flex-col items-center justify-center'>
        <Barcode
          value={barcodeValue}
          margin={0}
          height={80}
          format='CODE128'
          displayValue={false}
        />
        <div className='mt-3 leading-none'>{barcodeValue}</div>
      </div>
    </div>
  )
}

export const StickerTemplate = forwardRef(StickerTemplateInner) as <T>(
  props: Props<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement
