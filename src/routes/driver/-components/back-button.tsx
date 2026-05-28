import { RiArrowLeftSLine } from '@remixicon/react'
import { useRouter } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'

export const BackButton = () => {
  const router = useRouter()

  return (
    <Button
      onClick={() => router.history.go(-1)}
      variant='outline'
      size='icon'
    >
      <RiArrowLeftSLine />
    </Button>
  )
}
