export type StickerCode = 'PCKG' | 'SKD'
export type StickerValue = `${StickerCode} ${string}`

export interface StickerDefinition<T> {
  kind: StickerCode
  title: string
  getName(entity: T): string
  getBarcodeValue(entity: T): StickerValue
  getMeta(
    entity: T,
    order: { invoice: string; customer: string }
  ): {
    invoice: string
    customer: string
    weight: number
  }
  renderItems(entity: T): React.ReactNode
}
