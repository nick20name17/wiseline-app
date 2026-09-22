import { Input } from '@/components/ui/input'
import { useState, type ComponentProps } from 'react'

type NoteInputProps = Omit<
  ComponentProps<typeof Input>,
  'value' | 'defaultValue' | 'onChange' | 'onBlur'
> & {
  /** What the server holds now. */
  saved: string
  onSave: (text: string) => void
}

/** A free-text note saved when the field is left rather than on every keystroke, and only if it moved. */
export const NoteInput = ({ saved, onSave, ...props }: NoteInputProps) => {
  const [draft, setDraft] = useState(saved)

  return (
    <Input
      {...props}
      value={draft}
      onChange={event => setDraft(event.target.value)}
      onBlur={() => draft !== saved && onSave(draft)}
    />
  )
}
