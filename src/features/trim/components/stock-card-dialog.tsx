import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { ImageUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRetained } from '@/lib/use-retained'
import { useSaveStockCard, useUploadStockCardImage, type StockCard } from '../api'

// The upload is refused for anything else, so the picker does not offer it.
const IMAGE_TYPES = '.jpg,.jpeg,.png,.gif'

type StockCardFormProps = {
  card: StockCard | null
  onClose: () => void
}

/**
 * Create enables once all five fields are filled (p1 (72,321)); the description fills from EBMS on
 * the server, so it is shown here only once the card exists. The product is fixed once created.
 */
const StockCardForm = ({ card, onClose }: StockCardFormProps) => {
  const [productId, setProductId] = useState(card?.product_id ?? '')
  const [minimum, setMinimum] = useState(() => card?.stock_minimum?.toString() ?? '')
  const [orderQty, setOrderQty] = useState(() => card?.order_qty?.toString() ?? '')
  const [image, setImage] = useState<{ id: number; preview: string | null } | null>(
    card?.image_id ? { id: card.image_id, preview: null } : null
  )
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
    Number(minimum) >= 0 &&
    minimum !== '' &&
    Number(orderQty) > 0 &&
    !!image

  return (
    <>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor='card-pid'>Product ID</FieldLabel>
          <Input
            id='card-pid'
            placeholder='e.g. TSG8306'
            readOnly={!!card}
            value={productId}
            onChange={event => setProductId(event.target.value.toUpperCase())}
          />
          <FieldDescription>
            {card
              ? (card.description ?? '—')
              : 'Must be an active EBMS ID; the description fills from it.'}
          </FieldDescription>
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
          <FieldLabel htmlFor='card-image'>Image</FieldLabel>
          <label
            htmlFor='card-image'
            className='flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-border text-sm text-muted-foreground hover:border-input'
          >
            {upload.isPending ? (
              <Spinner />
            ) : image?.preview ? (
              <img src={image.preview} alt='Profile sketch' className='h-full object-contain' />
            ) : (
              <span className='flex items-center gap-2'>
                <ImageUp className='size-4' />
                {image ? 'Image uploaded — click to replace' : 'Upload the profile sketch'}
              </span>
            )}
          </label>
          <input
            id='card-image'
            type='file'
            accept={IMAGE_TYPES}
            className='sr-only'
            onChange={event => {
              const file = event.target.files?.[0]
              if (file)
                upload.mutate(file, {
                  onSuccess: uploaded =>
                    setImage({ id: uploaded.id, preview: URL.createObjectURL(file) })
                })
            }}
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
                image_id: image.id
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
