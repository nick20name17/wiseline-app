import type { StickerValue } from '@/routes/_production/-components/sticker/types'

type ParsedSticker = { type: 'PCKG'; id: number } | { type: 'SKD'; id: number } | null

export const parseSticker = (value: StickerValue): ParsedSticker => {
  const [type, rawId] = value.split(' ')
  const id = Number(rawId)

  if (!Number.isFinite(id)) return null
  if (type === 'PCKG' || type === 'SKD') {
    return { type, id }
  }

  return null
}
