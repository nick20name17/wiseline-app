/**
 * The page's one toast slot, a sibling of the app shell.
 *
 * It is always in the document and always laid out — the prototype shows and hides it by adding and
 * removing `.show`, not by mounting it. Rendering it conditionally would make it appear and disappear
 * from the page's structure, which is exactly the kind of change a comment anchored to it cannot
 * survive.
 */
export const Toast = ({
  message,
  type,
  shown
}: {
  message?: string
  type?: 'success' | 'error' | 'warning' | 'info'
  shown?: boolean
}) => (
  <div
    className={`toast${type ? ` t-${type}` : ''}${shown ? ' show' : ''}`}
    id='toast'
    data-comment='toast'
  >
    <span className='toast-ico' id='toast-ico' data-comment='toast-ico' />
    <span id='toast-text' data-comment='toast-text'>
      {message}
    </span>
  </div>
)
