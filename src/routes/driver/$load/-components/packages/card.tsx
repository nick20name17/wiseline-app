import { RiArrowDownSLine, RiBox3Fill, RiBox3Line } from '@remixicon/react'

import { ConfirmScanDialog } from './confirm-scan'
import type { Package } from '@/api/packages/schema'
import type { Skids } from '@/api/skids/schema'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { StickerValue } from '@/routes/_production/-components/sticker/types'
import PackageCardStatus from '@/routes/driver/-components/deliveries/status-badge'

interface PackageCardProps {
  pack: Package | Skids
}

const getCustomerName = (pack: Package | Skids) => {
  const isPackage = 'package_items' in pack

  if (isPackage) {
    return pack.package_items?.[0]?.origin_item?.customer
  }

  return pack.packages?.[0]?.package_items?.[0]?.origin_item?.customer
}

export const PackageCard = ({ pack }: PackageCardProps) => {
  const isPackage = 'package_items' in pack

  const name: StickerValue = isPackage ? `PCKG ${pack.id}` : `SKD ${pack.id}`

  const customerName = getCustomerName(pack)

  return (
    <Collapsible className='bg-background border-b'>
      <div className='flex h-13 items-center gap-2 px-2.5'>
        <div className='bg-muted flex size-8 items-center justify-center rounded-sm'>
          {isPackage ? (
            <RiBox3Line className='text-muted-foreground size-4' />
          ) : (
            <RiBox3Fill className='text-muted-foreground size-4' />
          )}
        </div>
        <span className='font-medium'>{name}</span>
        <div className='ml-auto flex items-center gap-1'>
          <ConfirmScanDialog
            pack={pack}
            key={pack.files.length}
          />
          <PackageCardStatus
            key={pack.is_shipped ? 'shipped' : 'not-shipped'}
            pack={pack}
          />
          <CollapsibleTrigger asChild>
            <Button
              size='icon-sm'
              variant='ghost'
              aria-label='Toggle package details'
            >
              <RiArrowDownSLine className='text-muted-foreground size-4' />
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent className='text-muted-foreground px-2.5 pb-2'>
        <div>
          <span>Customer:</span> <span className='text-foreground'>{customerName ?? '-'}</span>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
