import { BackButton } from '@/routes/driver/-components/back-button'

export const ScannerTop = () => {
  return (
    <div className='bg-background flex h-13 items-center gap-2 border-b px-3.5'>
      <BackButton />
      <h1 className='text-lg font-medium'>Scanner</h1>
    </div>
  )
}
