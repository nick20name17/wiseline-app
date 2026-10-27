import * as React from 'react'
import { cn } from 'cn'

// `sm`: a box that starts as one line, as tall as the buttons and inputs in a table row beside it.
function Textarea({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<'textarea'> & { size?: 'default' | 'sm' }) {
  return (
    <textarea
      data-slot='textarea'
      data-size={size}
      className={cn(
        'flex field-sizing-content min-h-16 w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=sm]:min-h-8 data-[size=sm]:py-1.25 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
