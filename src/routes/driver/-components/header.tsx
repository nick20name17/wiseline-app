import { RiQrScan2Line } from '@remixicon/react'
import { Link, useParams } from '@tanstack/react-router'

import { NavUser } from '@/components/layout/header/nav-user'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const Logo = () => {
  return (
    <Link
      className='flex items-center gap-2'
      to='/driver'
    >
      <div className='bg-foreground flex size-6 items-center justify-center rounded-sm'>
        <svg
          width='16'
          height='16'
          viewBox='0 0 16 16'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
          xmlnsXlink='http://www.w3.org/1999/xlink'
        >
          <rect
            width='16'
            height='16'
            fill='url(#pattern0_3965_42584)'
          />
          <defs>
            <pattern
              id='pattern0_3965_42584'
              patternContentUnits='objectBoundingBox'
              width='1'
              height='1'
            >
              <use
                xlinkHref='#image0_3965_42584'
                transform='scale(0.0416667)'
              />
            </pattern>
            <image
              id='image0_3965_42584'
              width='24'
              height='24'
              preserveAspectRatio='none'
              xlinkHref='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAGKADAAQAAAABAAAAGAAAAADiNXWtAAAAfklEQVRIDe1UQQrAMAhzY+/x/+/wQxsbRCSr9ORBsBdTqzUqKtL9HEjAzG7gKFXVbaIeeOd3wrBKXvwxGIMZJNvxnf3wXp6B1zdjCmZgxHLnV54BE5KXUcbqZxwUmV95BhMgdGENp0TrugRt/0mebfrtrtBTh9jC5XPgEduCBwS/ROU6Jsf0AAAAAElFTkSuQmCC'
            />
          </defs>
        </svg>
      </div>
      <span className='leading-none font-medium'>Wiseline</span>
      <Badge variant='outline'>Driver</Badge>
    </Link>
  )
}

export const DriverHeader = () => {
  const { load } = useParams({ strict: false })
  return (
    <header className='container flex h-16 items-center justify-between gap-3.5 border-b py-4'>
      <Logo />

      {/* <Link to='/driver/notifications'>
        <Button
          variant='ghost'
          size='icon'
        >
          <RiNotificationLine />
        </Button>
      </Link> */}
      <div className='flex items-center gap-2.5'>
        {load ? (
          <Button
            variant='ghost'
            size='icon'
            asChild
          >
            <Link
              to='/driver/$load/scanner'
              params={{ load }}
            >
              <RiQrScan2Line />
            </Link>
          </Button>
        ) : null}
        <NavUser />
      </div>
    </header>
  )
}
