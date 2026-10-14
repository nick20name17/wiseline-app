import { LoaderCircle } from 'lucide-react'

export const RoutePending = () => {
  return (
    <output className='flex items-center gap-2 p-6 text-muted-foreground'>
      <LoaderCircle className='size-4 animate-spin' />
      <span className='text-xs tracking-widest uppercase'>Loading</span>
    </output>
  )
}
