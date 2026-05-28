import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import * as z from 'zod/mini'

import type { StickerValue } from '../_production/-components/sticker/types'
import { LoadParamSchema } from '../_shipping/-components/filters/load'
import { TruckParamSchema } from '../_shipping/-components/filters/truck'

import { ScannerHeader } from './-components/header'
import { LoadScanner } from './-components/scanner'
import { loadsService } from '@/api/loads/service'
import { DateParamSchema } from '@/components/common/filters/date'
import { parseSticker } from '@/components/common/scanner/helpers'
import { getErrorMessage } from '@/helpers/error-message'

const ScannerPage = () => {
  const { load } = Route.useSearch()
  const [scanError, setScanError] = useState<string | null>(null)

  const isLoadedmultiupdateMutation = useMutation({
    mutationFn: loadsService.isLoadedMultiUpdate,
    meta: {
      successMessage: 'Successfully updated',
      showErrorMessage: false
    }
  })

  const handleIsLoaded = (value: StickerValue) => {
    if (!load) return

    const parsed = parseSticker(value)

    if (!parsed) {
      setScanError('Invalid barcode')
      return
    }
    setScanError(null)

    isLoadedmultiupdateMutation.mutate({
      id: Number(load),
      payload: {
        is_loaded: true,
        skids: parsed.type === 'SKD' ? [parsed.id] : [],
        packages: parsed.type === 'PCKG' ? [parsed.id] : []
      }
    })
  }

  return (
    <>
      <ScannerHeader />
      <main className='container flex flex-col gap-4 pb-4'>
        <LoadScanner
          onSuccess={({ text }) => handleIsLoaded(text as StickerValue)}
          error={
            scanError ||
            (isLoadedmultiupdateMutation.error &&
              getErrorMessage(isLoadedmultiupdateMutation.error))
          }
          isPending={isLoadedmultiupdateMutation.isPending}
        />
      </main>
    </>
  )
}
export const Route = createFileRoute('/scanner/')({
  component: ScannerPage,
  validateSearch: z.object({
    load: LoadParamSchema,
    truck: TruckParamSchema,
    date: DateParamSchema
  })
})
