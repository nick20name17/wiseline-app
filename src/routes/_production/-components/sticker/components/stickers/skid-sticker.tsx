import type { StickerDefinition } from '../../types'

import type { Skids } from '@/api/skids/schema'
import { formatWeight } from '@/utils/format'

export const skidSticker: StickerDefinition<Skids> = {
  kind: 'SKD',
  title: 'Print Skid Sticker',
  getName: (skid) => `SKD ${skid.id}`,

  getBarcodeValue: (skid) => `SKD ${skid.id}`,

  getMeta: (skid, order) => ({
    invoice: order.invoice,
    customer: order.customer,
    weight: skid.packages.reduce(
      (sum, p) =>
        sum + p.package_items.reduce((ps, i) => ps + i.origin_item.weight * i.quantity, 0),
      0
    )
  }),

  renderItems: (skid) =>
    skid.packages.map((pkg) => {
      const weight = pkg.package_items.reduce(
        (sum, i) => sum + i.origin_item.weight * i.quantity,
        0
      )

      return (
        <div
          key={pkg.id}
          className='flex items-center justify-between py-2'
        >
          <span>PCKG {pkg.id}</span>
          <span>{formatWeight(weight)}</span>
        </div>
      )
    })
}
