import { useParams } from '@tanstack/react-router'

import { useUpdateShippedLoad } from '@/api/loads/query'
import { type ScanResult, Scanner } from '@/components/common/scanner'
import { parseSticker } from '@/components/common/scanner/helpers'
import type { StickerValue } from '@/routes/_production/-components/sticker/types'

export const DriverScanner = () => {
  const { load } = useParams({ from: '/driver/$load/scanner/' })

  const updateLoadMutation = useUpdateShippedLoad()

  const onSuccess = (result: ScanResult) => {
    if (!load) return

    const parsed = parseSticker(result.text as StickerValue)

    if (!parsed) return

    updateLoadMutation.mutate({
      id: Number(load),
      payload: {
        is_shipped: true,
        skids: parsed.type === 'SKD' ? [parsed.id] : [],
        packages: parsed.type === 'PCKG' ? [parsed.id] : []
      }
    })
  }

  return <Scanner onSuccess={onSuccess} />
}
