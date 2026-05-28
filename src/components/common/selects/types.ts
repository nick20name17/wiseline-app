export type BasicSelectProps<T> = {
  className?: string
  onChange: (value: T) => void
  value: T | undefined
  disabled?: boolean
}
