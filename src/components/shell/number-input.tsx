import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput
} from '@/components/reui/number-field'

/**
 * Every number a person types in this app, with a stepper attached.
 *
 * A bare `<input type="number">` gives you the browser's own spinner — invisible until hover, tiny,
 * and absent on touch, which is most of where this runs. The field underneath keeps the prototype's
 * `input mono` class so it still cascades from the page's own stylesheet, and keeps `data-comment` so
 * the review anchors land where they did.
 *
 * `value` is a string because the forms it serves hold drafts, and an empty field is a real state
 * that `0` would quietly overwrite.
 */
export const NumberInput = ({
  value,
  onValueChange,
  comment,
  className = 'input mono',
  min,
  max,
  step,
  placeholder,
  disabled,
  ariaLabel
}: {
  value: string
  onValueChange: (value: string) => void
  comment?: string
  className?: string
  min?: number
  max?: number
  step?: number
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
}) => (
  <NumberField
    locale='en-US'
    format={{ useGrouping: false, maximumFractionDigits: 6 }}
    value={value === '' ? null : Number(value)}
    onValueChange={next => onValueChange(next == null ? '' : String(next))}
    min={min}
    max={max}
    step={step}
    disabled={disabled}
  >
    {/* the frame belongs to the group, so the input inside it drops its own border */}
    <NumberFieldGroup className={`wl-numfield ${className}`} style={{ padding: 0 }}>
      <NumberFieldDecrement />
      <NumberFieldInput
        className='wl-numfield-input mono'
        data-comment={comment}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      <NumberFieldIncrement />
    </NumberFieldGroup>
  </NumberField>
)
