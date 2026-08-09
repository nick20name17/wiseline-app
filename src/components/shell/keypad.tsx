import { Overlay } from './modal'

/**
 * The touch keypad every quantity on the floor is typed into.
 *
 * The plant runs these screens on tablets with gloves on, so a number is never a text field — it is a
 * grid of large keys over a display that shows the value as it is built. Each pad differs only in its
 * keys, its wording and what Enter does with the string, which is why the digits are a prop rather
 * than four near-identical modals.
 *
 * The head carries no close button: the prototype's pads are cancelled from the foot, and an X there
 * would be a second way to do the same thing in the one place where a mis-tap is most likely.
 */
export const Keypad = ({
  id,
  comment,
  keyComment,
  title,
  desc,
  keys,
  display,
  open,
  onPress,
  onEnter,
  onClose
}: {
  id: string
  comment: string
  keyComment: string
  title: string
  desc: string
  keys: string[]
  display: string
  open: boolean
  onPress: (key: string) => void
  onEnter: () => void
  onClose: () => void
}) => (
  <Overlay id={id} comment={id} open={open} onClose={onClose}>
    <div
      className='modal'
      style={{ maxWidth: '260px' }}
      data-comment={`${comment}-modal`}
      data-component='dialog'
    >
      <div className='modal-head' data-comment={`${comment}-head`}>
        <div data-comment={`${comment}-head-text`}>
          <div className='modal-title' data-comment={`${comment}-title`}>
            {title}
          </div>
          <div className='modal-desc' data-comment={`${comment}-desc`}>
            {desc}
          </div>
        </div>
      </div>
      <div className='modal-body' data-comment={`${comment}-body`}>
        <div
          className='keypad-display mono'
          id={`${comment}-display`}
          data-comment={`${comment}-display`}
        >
          {display}
        </div>
        <div className='keypad-grid' id={`${comment}-grid`} data-comment={`${comment}-grid`}>
          {keys.map((key, index) => (
            <button
              className='keypad-key'
              data-comment={`${keyComment}-${index}`}
              onClick={() => onPress(key)}
              key={key}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
      <div className='modal-foot' data-comment={`${comment}-foot`}>
        <button className='btn btn-ghost' data-comment={`${comment}-cancel`} onClick={onClose}>
          Cancel
        </button>
        <button className='btn btn-primary' data-comment={`${comment}-enter`} onClick={onEnter}>
          Enter
        </button>
      </div>
    </div>
  </Overlay>
)

export const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫']

/** A measurement rather than a count, so it takes a decimal point where a quantity does not. */
export const DIGITS_DOT = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']
