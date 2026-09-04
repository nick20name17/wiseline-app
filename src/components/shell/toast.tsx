import { Check, CircleAlert, Info, TriangleAlert } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { ToastType } from './use-toast'

/**
 * The page's one toast slot, a sibling of the app shell.
 *
 * It is always in the document and always laid out — the prototype shows and hides it by adding and
 * removing `.show`, not by mounting it. Rendering it conditionally would make it appear and disappear
 * from the page's structure, which is exactly the kind of change a comment anchored to it cannot
 * survive.
 *
 * It carries both the prototype's class names and Tailwind utilities while the screens are being moved
 * over one at a time: on a screen still dressed by its prototype stylesheet the unlayered `.toast` rules
 * win over the utilities, on a rewritten screen only the utilities apply.
 */
export const ToastIcon = ({ type }: { type?: ToastType }) => {
  if (type === 'error') return <CircleAlert />
  if (type === 'warning') return <TriangleAlert />
  if (type === 'info') return <Info />
  return <Check />
}

export const Toast = ({
  message,
  type,
  shown
}: {
  message?: string
  type?: ToastType
  shown?: boolean
}) => (
  <div
    className={cn(
      'toast bg-foreground shadow-float pointer-events-none fixed bottom-[22px] left-1/2 z-100 flex -translate-x-1/2 items-center gap-[9px] rounded-[12px] px-[18px] py-[11px] text-[13px] font-medium text-white opacity-0 transition-opacity duration-200 ease-[ease] motion-reduce:transition-none [&_svg]:size-3.5 [&_svg]:text-white',
      type && `t-${type}`,
      type === 'success' && 'bg-success',
      type === 'error' && 'bg-destructive',
      type === 'warning' && 'bg-warn',
      type === 'info' && 'bg-primary',
      shown && 'show opacity-100'
    )}
    id='toast'
    data-comment='toast'
  >
    <span className='toast-ico size-3.5 flex-none' id='toast-ico' data-comment='toast-ico'>
      {/* the icon only exists once something has been said: the prototype writes it in with the message */}
      {shown ? <ToastIcon type={type} /> : null}
    </span>
    <span id='toast-text' data-comment='toast-text'>
      {message}
    </span>
  </div>
)
