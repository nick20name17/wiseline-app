import type { StickerDefinition } from '../../types'

import type { Package } from '@/api/packages/schema'
import { formatWeight } from '@/utils/format'

export const packageSticker: StickerDefinition<Package> = {
  kind: 'PCKG',
  title: 'Print Package Sticker',

  getName: (pack) => `PCKG ${pack.id}`,

  getBarcodeValue: (pack) => `PCKG ${pack.id}`,

  getMeta: (pack, order) => ({
    invoice: order.invoice,
    customer: order.customer,
    weight: pack.package_items.reduce((sum, i) => sum + i.origin_item.weight * i.quantity, 0)
  }),

  renderItems: (pack) =>
    pack.package_items.map((item) => (
      <div
        key={item.id}
        className='flex items-center justify-between gap-2 py-2 [&_span]:leading-none'
      >
        <span>
          {item.origin_item.category} ({item.origin_item.id_inven})
        </span>
        <div className='grid grid-cols-[150px_110px] gap-2'>
          <div>Weight: {formatWeight(item.origin_item.weight)}</div>
          <div className='text-right'>Quantity: {item.quantity}</div>
        </div>
      </div>
    ))
}
