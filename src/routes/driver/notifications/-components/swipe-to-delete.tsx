import { type RemixiconComponentType, RiDeleteBinLine } from '@remixicon/react'
import { motion } from 'motion/react'
import {
  type PropsWithChildren,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
  useEffect,
  useEffectEvent,
  useRef,
  useState
} from 'react'

import { cn } from '@/lib/utils'

interface SwipeToDeleteProps extends PropsWithChildren {
  onDelete: () => void
  deleteThreshold?: number
  deleteIcon?: RemixiconComponentType
}

export const SwipeToDelete = ({
  children,
  onDelete,
  deleteThreshold = 110,
  deleteIcon: DeleteIcon = RiDeleteBinLine
}: SwipeToDeleteProps) => {
  const [offset, setOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const handleStart = (clientX: number) => {
    setIsDragging(true)
    setStartX(clientX - offset)
  }

  const handleMove = (clientX: number) => {
    if (!isDragging) return
    const newOffset = clientX - startX
    if (newOffset <= 0) {
      setOffset(newOffset)
    }
  }

  const handleEnd = () => {
    setIsDragging(false)

    if (Math.abs(offset) >= deleteThreshold) {
      setOffset(-500)
      setTimeout(() => {
        onDelete()
      }, 100)
    } else {
      setOffset(0)
    }
  }

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    handleStart(e.clientX)
  }

  const handleMouseMove = useEffectEvent((e: MouseEvent) => {
    handleMove(e.clientX)
  })

  const handleMouseUp = useEffectEvent(() => {
    handleEnd()
  })

  const handleTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    handleStart(e.touches[0].clientX)
  }

  const handleTouchMove = (e: ReactTouchEvent<HTMLDivElement>) => {
    handleMove(e.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    handleEnd()
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging])

  const deleteOpacity = Math.min(Math.abs(offset) / deleteThreshold, 1)

  return (
    <motion.div
      ref={containerRef}
      layout
      transition={{ duration: 0.2 }}
      className='relative touch-pan-y select-none'
    >
      <div
        className='bg-destructive absolute inset-0 flex items-center justify-end rounded-lg px-6'
        style={{ opacity: deleteOpacity }}
      >
        <div className='flex items-center gap-1.5 text-sm text-white'>
          <DeleteIcon className='size-4' />
          <span>Delete</span>
        </div>
      </div>

      <div
        className={cn(
          'relative cursor-grab active:cursor-grabbing',
          isDragging ? '' : 'transition-transform'
        )}
        style={{
          transform: `translateX(${offset}px)`
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </motion.div>
  )
}
