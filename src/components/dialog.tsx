import {
  Dialog as CenteredDialog,
  DialogClose,
  DialogContent as CenteredDialogContent,
  DialogDescription,
  DialogFooter as CenteredDialogFooter,
  DialogHeader as CenteredDialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader } from '@/components/ui/drawer'
import { useDrawer } from '@/hooks/use-mobile'
import type { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { cn } from 'cn'
import { XIcon } from 'lucide-react'
import { createContext, use, useState, type ComponentProps } from 'react'

/*
 * The app's dialog: centred on a tablet or a desk, a bottom drawer on a phone, where a thumb reaches
 * the bottom of the screen and a swipe down puts it away. One API for both, so a feature never asks
 * which it is in. Base UI's drawer is its dialog with gestures — Title, Description, Close and Trigger
 * are the same parts — so only the root and the frame change.
 */

const InDrawer = createContext(false)

function Dialog({ open, defaultOpen = false, onOpenChange, ...props }: DialogPrimitive.Root.Props) {
  // A dialog opened by its own trigger keeps its state inside, so its openness is followed here.
  const [opened, setOpened] = useState(defaultOpen)
  const drawer = useDrawer(open ?? opened)
  const root = {
    ...props,
    open,
    defaultOpen,
    onOpenChange: (
      ...args: Parameters<NonNullable<DialogPrimitive.Root.Props['onOpenChange']>>
    ) => {
      setOpened(args[0])
      onOpenChange?.(...args)
    }
  }
  return (
    <InDrawer value={drawer}>
      {drawer ? (
        <Drawer showSwipeHandle {...(root as ComponentProps<typeof Drawer>)} />
      ) : (
        <CenteredDialog {...root} />
      )}
    </InDrawer>
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: ComponentProps<typeof CenteredDialogContent>) {
  // A centred dialog keeps a margin of the page around it and scrolls within it, on a tablet held
  // sideways as much as in a short desk window.
  if (!use(InDrawer))
    return (
      <CenteredDialogContent
        className={cn('max-h-11/12 overflow-y-auto overscroll-contain', className)}
        showCloseButton={showCloseButton}
        {...props}
      >
        {children}
      </CenteredDialogContent>
    )

  return (
    <DrawerContent {...(props as ComponentProps<typeof DrawerContent>)}>
      {/* One scrolling body for the header, the fields and the footer, as a centred dialog lays them
          out. The caller's layout classes land here, where the centred one has them; its width caps
          give way to the screen's width. The sides clear a phone held sideways of its notch. The one
          column is the screen's width, so a wide field wraps rather than widens the sheet. */}
      <div
        className={cn(
          'grid min-h-0 flex-1 grid-cols-1 content-start gap-4 overflow-y-auto overscroll-contain px-safe-4 pb-safe-4',
          className,
          'max-w-none sm:max-w-none'
        )}
      >
        {children}
      </div>
      {showCloseButton && (
        <DialogClose
          render={<Button variant='ghost' className='absolute top-3 right-3' size='icon-sm' />}
        >
          <XIcon />
          <span className='sr-only'>Close</span>
        </DialogClose>
      )}
    </DrawerContent>
  )
}

function DialogHeader(props: ComponentProps<typeof CenteredDialogHeader>) {
  // The drawer's header is centred under the handle; its margins keep a long title clear of the
  // close button on both sides, so it stays centred.
  return use(InDrawer) ? (
    <DrawerHeader className='mx-3' {...props} />
  ) : (
    <CenteredDialogHeader {...props} />
  )
}

function DialogFooter({
  showCloseButton,
  bare = false,
  className,
  ...props
}: ComponentProps<typeof CenteredDialogFooter> & {
  /** A form's own answer row on a desk — right-aligned under the fields, without the shaded band. */
  bare?: boolean
}) {
  if (!use(InDrawer))
    return bare ? (
      <div className={cn('flex justify-end gap-2', className)} {...props} />
    ) : (
      <CenteredDialogFooter showCloseButton={showCloseButton} className={className} {...props} />
    )

  return (
    // Pinned to the drawer's bottom edge, so the answer stays in reach while a long form scrolls
    // under it; it takes over the body's bottom padding, home indicator included. The answers stack
    // full width, the primary one on top, as a phone's own sheets have them.
    // A sticky box stops at the body's padding edge, so it is let into that padding, or it would ride
    // up over the last field. Its rule sets it apart, so a desk's margin above it is not wanted; inside a
    // form it takes the step the body's gap gives it elsewhere.
    <div className='sticky -bottom-safe-4 z-10 -mx-4 -mb-safe-4 border-t bg-popover pt-4 pb-safe-0 in-[form]:mt-4'>
      <DrawerFooter {...props} className={cn('flex-col-reverse items-stretch', className, 'm-0')}>
        {props.children}
        {showCloseButton && <DialogClose render={<Button variant='outline' />}>Close</DialogClose>}
      </DrawerFooter>
    </div>
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
}
