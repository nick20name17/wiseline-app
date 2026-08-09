import { Check, CircleAlert, Info, TriangleAlert } from 'lucide-react'

import type { ToastType } from './use-toast'

/**
 * The page's one toast slot, a sibling of the app shell.
 *
 * It is always in the document and always laid out — the prototype shows and hides it by adding and
 * removing `.show`, not by mounting it. Rendering it conditionally would make it appear and disappear
 * from the page's structure, which is exactly the kind of change a comment anchored to it cannot
 * survive.
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
    className={`toast${type ? ` t-${type}` : ''}${shown ? ' show' : ''}`}
    id='toast'
    data-comment='toast'
  >
    <span className='toast-ico' id='toast-ico' data-comment='toast-ico'>
      {/* the icon only exists once something has been said: the prototype writes it in with the message */}
      {shown ? <ToastIcon type={type} /> : null}
    </span>
    <span id='toast-text' data-comment='toast-text'>
      {message}
    </span>
  </div>
)
