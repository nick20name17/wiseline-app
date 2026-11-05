import { cn } from 'cn'

type DescriptionProps = { text: string | null | undefined; className?: string }

/**
 * A line's description from EBMS, broken into the lines it was typed in: the office puts the colour,
 * a pitch or a custom length on lines of their own. Most end in a break, which would only add an
 * empty line.
 */
export const Description = ({ text, className }: DescriptionProps) => {
  const shown = text?.trimEnd()
  // Nothing at all, not an empty span: a cell with no content is `:empty`, which the mobile cards hide.
  if (!shown) return null
  return <span className={cn('block whitespace-pre-line', className)}>{shown}</span>
}
