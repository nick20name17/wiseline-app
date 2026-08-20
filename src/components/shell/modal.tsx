import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import type { ReactNode } from 'react'

/**
 * The prototype's modal: an overlay that is always in the document and opens by gaining `.is-open`.
 *
 * It stays mounted rather than being rendered conditionally because that is how the prototype has it,
 * and a comment anchored to a modal's title has to find the same element whether or not the modal
 * happens to be open when the page is read.
 *
 * Clicking the backdrop and pressing Escape both close it, as they do there.
 *
 * It is portalled to `#root` — the port's stand-in for the prototype's `<body>` — because that is where
 * the prototype keeps every overlay: a sibling of the app, not a descendant of the view that opened it.
 * Rendered in place it still *looked* right, being `position: fixed`, and the gate said `body: 3 children
 * became 2` the first time a state opened one.
 *
 * `scope` overrides that target, and #123 is why it exists. A page's stylesheet is confined to its
 * `data-page`, so a screen hosted inside another page — Stock Cards inside Trim — has its overlays land
 * under the *host's* `data-page` and be dressed by the wrong sheet. The prototype does not have the
 * problem: there the hosted screen is an `<iframe>`, and its overlays are children of its own document.
 * Passing that screen's scoped element is this port's equivalent of that document.
 */
export const Overlay = ({
  id,
  comment,
  open,
  onClose,
  scope,
  children
}: {
  id: string
  comment: string
  open: boolean
  onClose: () => void
  /** Where to portal, when the opener is a screen hosted inside another page (#123). */
  scope?: HTMLElement | null
  children: ReactNode
}) => {
  useEffect(() => {
    if (!open) return

    const escaped = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', escaped)
    return () => document.removeEventListener('keydown', escaped)
  }, [open, onClose])

  const root = scope ?? document.getElementById('root')
  const overlay = (
    <div
      className={`overlay${open ? ' is-open' : ''}`}
      id={id}
      data-comment={comment}
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {children}
    </div>
  )

  return root ? createPortal(overlay, root) : overlay
}

export const ModalHead = ({
  comment,
  title,
  desc,
  onClose,
  titleComment,
  descComment
}: {
  comment: string
  title: ReactNode
  desc?: ReactNode
  onClose: () => void
  titleComment: string
  descComment: string
}) => (
  <div className='modal-head' data-comment={comment}>
    <div data-comment={`${comment}-text`}>
      <div className='modal-title' data-comment={titleComment}>
        {title}
      </div>
      <div className='modal-desc' data-comment={descComment}>
        {desc}
      </div>
    </div>
    <button
      className='modal-x'
      aria-label='Close'
      data-comment={`${comment.replace(/-head$/, '')}-x`}
      onClick={onClose}
    >
      <X style={{ width: '14px', height: '14px' }} />
    </button>
  </div>
)

export type Alert = { title: string; desc: string } | null

/**
 * A statement, not a question — one OK button and no way to say no.
 *
 * It is a separate modal from the confirm because it has a separate job: the confirm asks whether to
 * do something, this one reports that something cannot be done. Giving it a Cancel would offer a
 * choice that does not exist.
 */
export const AlertOverlay = ({ alert, onClose }: { alert: Alert; onClose: () => void }) => (
  <Overlay id='overlay-alert' comment='overlay-alert' open={!!alert} onClose={onClose}>
    <div
      className='modal'
      style={{ maxWidth: '400px' }}
      data-comment='alert-modal'
      data-component='dialog'
    >
      <div className='modal-head' data-comment='alert-head'>
        <div data-comment='alert-head-text'>
          <div className='modal-title' id='alert-title' data-comment='alert-title'>
            {alert?.title ?? 'Notice'}
          </div>
          <div className='modal-desc' id='alert-desc' data-comment='alert-desc'>
            {alert?.desc}
          </div>
        </div>
      </div>
      <div className='modal-foot' data-comment='alert-foot'>
        <button className='btn btn-primary' id='alert-ok' data-comment='alert-ok' onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  </Overlay>
)

export type Confirm = {
  title: string
  desc: string
  onOk: () => void
  /** A question whose answer is an action names it on the button — «Yes, Create Manufacturing Batch». */
  ok?: string
  cancel?: string
} | null

/**
 * The two-stage confirm every page shares: the same markup, a different question each time.
 *
 * The prototype keeps one overlay per page and rewrites its title, description and callback, so the
 * comments anchored to `confirm-title` and `confirm-ok` are about the pattern rather than any one
 * question. This keeps that.
 */
export const ConfirmOverlay = ({
  confirm,
  onClose,
  scope
}: {
  confirm: Confirm
  onClose: () => void
  scope?: HTMLElement | null
}) => (
  <Overlay
    id='overlay-confirm'
    comment='overlay-confirm'
    open={!!confirm}
    onClose={onClose}
    scope={scope}
  >
    <div
      className='modal'
      style={{ maxWidth: '380px' }}
      data-comment='confirm-modal'
      data-component='dialog'
    >
      <ModalHead
        comment='confirm-head'
        titleComment='confirm-title'
        descComment='confirm-desc'
        title={confirm?.title ?? 'Are you sure?'}
        desc={confirm?.desc}
        onClose={onClose}
      />
      <div className='modal-foot' data-comment='confirm-foot'>
        <button className='btn btn-ghost' data-comment='confirm-cancel' onClick={onClose}>
          {confirm?.cancel ?? 'Cancel'}
        </button>
        <button
          className='btn btn-primary'
          id='confirm-ok'
          data-comment='confirm-ok'
          onClick={() => confirm?.onOk()}
        >
          {confirm?.ok ?? 'Confirm'}
        </button>
      </div>
    </div>
  </Overlay>
)
