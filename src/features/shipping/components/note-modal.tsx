import { useState } from 'react'
import { Check, CheckCheck, SendHorizontal } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { addOrderNote, shippingStore, toggleOrderNote } from '../store'

const initials = (author: string) =>
  author
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2)

/** The order's thread, shared with the Shipping team. Every view reaches it from the notes button. */
export const NoteModal = ({
  orderId,
  onClose
}: {
  orderId: number | null
  onClose: () => void
}) => {
  const [draft, setDraft] = useState('')
  // read through the subscription, not `get()`: marking a note dealt with has to redraw this list
  const orders = useStore(shippingStore, state => state.orders)
  const order = orders.find(entry => entry.id === orderId)
  const notes = order?.notes ?? []

  const add = () => {
    const body = draft.trim()
    if (!body || !order) return
    addOrderNote(order.id, body)
    setDraft('')
  }

  return (
    <Overlay id='overlay-notes' comment='overlay-notes' open={!!order} onClose={onClose}>
      <div className='modal' data-comment='notes-modal' data-component='dialog'>
        <ModalHead
          comment='notes-head'
          titleComment='notes-title'
          descComment='notes-desc'
          title={`Order notes${order ? ` · ${order.order}` : ''}`}
          desc='Shared with the Shipping team.'
          onClose={onClose}
        />
        <div
          className='modal-body'
          id='notes-body'
          data-comment='notes-body'
          style={{ paddingBottom: '8px' }}
        >
          {!notes.length ? (
            <div className='empty' data-comment='notes-empty' style={{ padding: '36px 12px' }}>
              <p data-comment='notes-empty-text'>No notes yet.</p>
            </div>
          ) : (
            notes.map((note, index) => (
              <div className='note-item' data-comment={`notes-item-${index}`} key={note.id}>
                <div className='note-avatar' data-comment={`notes-avatar-${index}`}>
                  {initials(note.author)}
                </div>
                <div className='note-main' data-comment={`notes-main-${index}`}>
                  <div className='note-headrow' data-comment={`notes-headrow-${index}`}>
                    {note.dealt ? null : (
                      <span className='note-unread' data-comment={`notes-unread-${index}`} />
                    )}
                    <span className='note-author' data-comment={`notes-author-${index}`}>
                      {note.author}
                    </span>
                    <span className='note-meta' data-comment={`notes-meta-${index}`}>
                      {note.email} · {note.ts}
                    </span>
                    <button
                      className={`note-ack ${note.dealt ? 'is-dealt' : ''}`}
                      data-comment={`notes-ack-${index}`}
                      title={note.dealt ? 'Dealt with — click to reopen' : 'Mark dealt with'}
                      onClick={() => order && toggleOrderNote(order.id, note.id)}
                    >
                      {note.dealt ? <CheckCheck /> : <Check />}
                      {note.dealt ? 'Dealt with' : 'Mark done'}
                    </button>
                  </div>
                  <div className='note-body' data-comment={`notes-text-${index}`}>
                    {note.body}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className='note-foot' data-comment='notes-foot'>
          <textarea
            id='notes-input'
            className='note-input'
            data-comment='notes-input'
            rows={2}
            placeholder='Add a note…'
            value={draft}
            onChange={event => setDraft(event.target.value)}
          />
          <button className='btn btn-primary' data-comment='notes-add' onClick={add}>
            <SendHorizontal style={{ width: '14px', height: '14px' }} />
            Add note
          </button>
        </div>
      </div>
    </Overlay>
  )
}
