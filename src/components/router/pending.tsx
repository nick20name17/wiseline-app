import { LoaderCircle } from 'lucide-react'

export const RoutePending = () => {
  // Fills the page's pane and sits in its middle, where the eye already is, not in a corner.
  return (
    <output className='flex flex-1 items-center justify-center gap-2 p-6 text-muted-foreground'>
      <LoaderCircle className='size-4 animate-spin' />
      <span className='text-xs tracking-widest uppercase'>Loading</span>
    </output>
  )
}
