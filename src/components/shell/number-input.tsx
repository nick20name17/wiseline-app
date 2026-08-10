/**
 * A number field, which in this app is exactly what the prototype writes: `<input type="number">`.
 *
 * It used to be a stepper — a shadcn `NumberField` with its own increment and decrement buttons, on the
 * reasoning that the browser's spinner is invisible until hover and absent on touch, which is most of
 * where this runs. The reasoning still holds and the field was nicer. It was also three elements and a
 * wrapper where the prototype has one, and the first capture that opened a modal said so: `7 children
 * became 9` in the Coil Filter, once in every window that asks for a number. The prototype is the
 * specification, so the spinner goes back to being the browser's.
 *
 * `value` is a string because the forms it serves hold drafts, and an empty field is a real state that
 * `0` would quietly overwrite.
 */
export const NumberInput = ({
  value,
  onValueChange,
  comment,
  /** `compact` is the inline field a filter row wants, and it is the class the prototype gives it. */
  variant = 'default',
  min,
  max,
  step,
  placeholder,
  disabled,
  ariaLabel,
  id
}: {
  value: string
  onValueChange: (value: string) => void
  comment?: string
  variant?: 'default' | 'compact'
  min?: number
  max?: number
  step?: number
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
  id?: string
}) => (
  <input
    type='number'
    className={variant === 'compact' ? 'cf-input mono' : 'input mono'}
    id={id}
    data-comment={comment}
    min={min}
    max={max}
    step={step}
    placeholder={placeholder}
    disabled={disabled}
    aria-label={ariaLabel}
    value={value}
    onChange={event => onValueChange(event.target.value)}
  />
)
