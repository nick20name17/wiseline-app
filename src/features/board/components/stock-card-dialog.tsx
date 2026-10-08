import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { ImageUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRetained } from '@/lib/use-retained'
import {
  stockCardProductQuery,
  useSaveStockCard,
  useUploadStockCardImage,
  type StockCard
} from '../api'
import { productFacts } from '../lib/format'

// The upload is refused for anything else, so the picker does not offer it, and a dropped or pasted
// file of another kind is turned away here.
const IMAGE_TYPES = '.jpg,.jpeg,.png,.gif'
const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/gif'])

type StockCardFormProps = {
  card: StockCard | null
  onClose: () => void
}

/**
 * Create enables once all five fields are filled (p1 (72,321)); Width is optional. On Create the
 * typed Product ID is looked up in EBMS for the description, colour and gauge p1 (71,307) — the
 * server still fills the description itself. The product is fixed once created.
 */
const StockCardForm = ({ card, onClose }: StockCardFormProps) => {
  const [productId, setProductId] = useState(card?.product_id ?? '')
  const [minimum, setMinimum] = useState(() => card?.stock_minimum?.toString() ?? '')
  const [orderQty, setOrderQty] = useState(() => card?.order_qty?.toString() ?? '')
  // `null` until the Manager touches the field: until then it shows the width past orders agree on,
  // and once touched — even cleared — it is his and no lookup overrides it.
  const [typedWidth, setTypedWidth] = useState<string | null>(() => card?.width?.toString() ?? null)
  const [image, setImage] = useState<{ id: number; preview: string | null } | null>(
    card?.image_id ? { id: card.image_id, preview: null } : null
  )
  const lookedUp = useDebouncedValue(card ? '' : productId.trim(), 400)
  const { data: product, isFetching: lookingUp } = useQuery(stockCardProductQuery(lookedUp))
  // A stale answer must not describe the ID now in the box while the next lookup is still waiting.
  const found = lookedUp === productId.trim() ? product : undefined
  const suggestedWidth = card ? card.width_from_orders : (found?.width_from_orders ?? null)
  // A new card starts from the suggestion; an existing one only offers it, so saving an unrelated
  // change does not quietly make the suggestion the card's own width.
  const width = typedWidth ?? (card ? '' : (suggestedWidth?.toString() ?? ''))
  const upload = useUploadStockCardImage()
  // A preview is a blob held in memory; it is let go once replaced or once the form closes.
  useEffect(() => {
    const preview = image?.preview
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [image?.preview])
  const save = useSaveStockCard(() => {
    toast.add({
      type: 'success',
      title: card ? `Saved ${card.product_id}` : `Stock card ${productId.trim()} created`
    })
    onClose()
  })

  const ready =
    productId.trim() !== '' &&
    // The server refuses both; there is no point letting Create try.
    found !== null &&
    !found?.has_card &&
    Number(minimum) >= 0 &&
    minimum !== '' &&
    Number(orderQty) > 0 &&
    (width === '' || Number(width) > 0) &&
    !!image
  const preview = image?.preview ?? (image && image.id === card?.image_id ? card.image_url : null)
  const [dragging, setDragging] = useState(false)

  // The sketch is usually a screenshot: picked, dropped on the box or pasted anywhere in the window.
  const take = (file: File | null | undefined) => {
    if (!file) return
    if (!IMAGE_MIME.has(file.type))
      return toast.add({ type: 'error', title: 'The image must be a JPG, PNG or GIF' })
    upload.mutate(file, {
      onSuccess: uploaded => setImage({ id: uploaded.id, preview: URL.createObjectURL(file) })
    })
  }

  return (
    <>
      <FieldGroup
        onPaste={event => {
          const file = [...event.clipboardData.files].find(pasted =>
            pasted.type.startsWith('image/')
          )
          if (!file) return
          event.preventDefault()
          take(file)
        }}
      >
        <Field>
          <FieldLabel htmlFor='card-pid'>Product ID</FieldLabel>
          <Input
            id='card-pid'
            placeholder='e.g. TSG8306'
            readOnly={!!card}
            value={productId}
            onChange={event => setProductId(event.target.value.toUpperCase())}
          />
          {card ? (
            <FieldDescription>
              {[card.description ?? '—', productFacts(card)].filter(Boolean).join(' — ')}
            </FieldDescription>
          ) : found === null ? (
            <FieldError>{productId.trim()} is not a product ID in EBMS.</FieldError>
          ) : found?.has_card ? (
            <FieldError>A stock card for {found.product_id} already exists.</FieldError>
          ) : found ? (
            <FieldDescription>
              {[found.description ?? '—', productFacts(found)].filter(Boolean).join(' — ')}
            </FieldDescription>
          ) : (
            <FieldDescription>
              <span className='flex items-center gap-2'>
                {lookingUp || lookedUp !== productId.trim() ? <Spinner /> : null}
                Must be an active EBMS ID; the description fills from it.
              </span>
            </FieldDescription>
          )}
        </Field>

        <div className='grid grid-cols-2 gap-3'>
          <Field>
            <FieldLabel htmlFor='card-min'>Stock minimum</FieldLabel>
            <Input
              id='card-min'
              type='number'
              min={0}
              inputMode='numeric'
              placeholder='e.g. 60'
              value={minimum}
              onChange={event => setMinimum(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor='card-qty'>Order qty</FieldLabel>
            <Input
              id='card-qty'
              type='number'
              min={1}
              inputMode='numeric'
              placeholder='e.g. 100'
              value={orderQty}
              onChange={event => setOrderQty(event.target.value)}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor='card-width'>Width</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='card-width'
              type='number'
              min={0}
              step='any'
              inputMode='decimal'
              placeholder={suggestedWidth === null ? 'e.g. 8' : String(suggestedWidth)}
              value={width}
              onChange={event => setTypedWidth(event.target.value)}
            />
            <InputGroupAddon align='inline-end'>in</InputGroupAddon>
          </InputGroup>
          <FieldDescription>
            {!width && card && suggestedWidth !== null
              ? `Past orders of this product agree on ${suggestedWidth}" — type it to put it on the card.`
              : typedWidth === null && suggestedWidth !== null
                ? 'Suggested from past orders of this product — change it if it is wrong.'
                : 'Printed on the card. Optional.'}
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor='card-image'>Image</FieldLabel>
          {/* A drop target for the mouse; the label under it is what keyboards and readers use. */}
          <div
            role='presentation'
            onDragOver={event => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={event => {
              // Passing over the box's own text and preview leaves the box only on paper.
              if (
                event.relatedTarget instanceof Node &&
                event.currentTarget.contains(event.relatedTarget)
              )
                return
              setDragging(false)
            }}
            onDrop={event => {
              event.preventDefault()
              setDragging(false)
              take(event.dataTransfer.files[0])
            }}
          >
            <label
              htmlFor='card-image'
              className={cn(
                'flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-border text-sm text-muted-foreground hover:border-input',
                dragging && 'border-primary bg-primary/5'
              )}
            >
              {upload.isPending ? (
                <Spinner />
              ) : preview ? (
                <img src={preview} alt='Profile sketch' className='h-full object-contain' />
              ) : (
                <span className='flex items-center gap-2'>
                  <ImageUp className='size-4' />
                  {image
                    ? 'Image uploaded — click, drop or paste to replace'
                    : 'Click, drop or paste the profile sketch'}
                </span>
              )}
            </label>
          </div>
          <input
            id='card-image'
            type='file'
            accept={IMAGE_TYPES}
            className='sr-only'
            onChange={event => take(event.target.files?.[0])}
          />
        </Field>
      </FieldGroup>

      <DialogFooter>
        <Button variant='outline' onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!ready || save.isPending || upload.isPending}
          onClick={() =>
            image &&
            save.mutate({
              id: card?.id,
              productId: productId.trim(),
              values: {
                stock_minimum: Number(minimum),
                order_qty: Number(orderQty),
                image_id: image.id,
                width: width === '' ? null : Number(width)
              }
            })
          }
        >
          {save.isPending ? <Spinner data-icon='inline-start' /> : null}
          {card ? 'Save' : 'Create'}
        </Button>
      </DialogFooter>
    </>
  )
}

type StockCardDialogProps = {
  /** `'new'` creates a card, a card edits it, `null` shuts the window. */
  target: StockCard | 'new' | null
  onOpenChange: (open: boolean) => void
}

export const StockCardDialog = ({ target: current, onOpenChange }: StockCardDialogProps) => {
  // Kept through the exit animation; the form itself remounts with the popup on each opening.
  const [target, release] = useRetained(current)
  const card = target === 'new' ? null : target

  return (
    <Dialog open={!!current} onOpenChange={onOpenChange} onOpenChangeComplete={release}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{card ? `Edit ${card.product_id}` : 'Create stock card'}</DialogTitle>
          <DialogDescription>
            Product ID, stock minimum, order qty and the profile sketch are all needed.
          </DialogDescription>
        </DialogHeader>
        {target ? <StockCardForm card={card} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}
