import { RiMap2Line } from '@remixicon/react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

type MapLinkProps = {
  lat: number
  lng: number
}

export const MapLink = ({ lat, lng }: MapLinkProps) => {
  const query = `${lat},${lng}`

  const mapLinks = {
    google: `https://www.google.com/maps/search/?api=1&query=${query}`,
    apple: `https://maps.apple.com/?q=${lat},${lng}`
  }

  const openMap = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className='size-10'
          variant='outline'
          size='icon'
        >
          <RiMap2Line />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={() => openMap(mapLinks.google)}>
          <span className='flex items-center gap-2'>
            <GoogleMapIcon />
            Google Maps
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => openMap(mapLinks.apple)}>
          <span className='flex items-center gap-2'>
            <AppleMapIcon />
            Apple Maps
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const GoogleMapIcon = () => {
  return (
    <svg
      className='size-4'
      viewBox='0 0 93 133'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <g clipPath='url(#clip0_68_10)'>
        <path
          d='M60.1998 2.2C55.7998 0.8 50.9998 0 46.0998 0C31.9998 0 19.2998 6.4 10.7998 16.5L32.5998 34.8L60.1998 2.2Z'
          fill='#1A73E8'
        />
        <path
          d='M10.8 16.5C4.1 24.5 0 34.9 0 46.1C0 54.8 1.7 61.8 4.6 68.1L32.6 34.8L10.8 16.5Z'
          fill='#EA4335'
        />
        <path
          d='M46.2001 28.5C56.0001 28.5 63.9001 36.4 63.9001 46.2C63.9001 50.5 62.3001 54.4999 59.7001 57.5999C59.7001 57.5999 73.6001 41 87.2001 24.9C81.6001 14.0999 71.9001 5.89995 60.2001 2.19995L32.6001 34.7999C35.9001 30.9999 40.7001 28.5 46.2001 28.5Z'
          fill='#4285F4'
        />
        <path
          d='M46.2001 63.8C36.4001 63.8 28.5001 55.9 28.5001 46.1C28.5001 41.8 30.0001 37.8 32.6001 34.8L4.6001 68.1C9.4001 78.7 17.4001 87.3 25.6001 98L59.7001 57.5C56.4001 61.4 51.6001 63.8 46.2001 63.8Z'
          fill='#FBBC04'
        />
        <path
          d='M59.1001 109.2C74.5001 85.1 92.4001 74.2 92.4001 46.2C92.4001 38.5 90.5001 31.3 87.2001 24.9L25.6001 98C28.2001 101.4 30.9001 105.3 33.5001 109.3C42.9001 123.8 40.3001 132.4 46.3001 132.4C52.3001 132.4 49.7001 123.7 59.1001 109.2Z'
          fill='#34A853'
        />
      </g>
      <defs>
        <clipPath id='clip0_68_10'>
          <rect
            width='92.3'
            height='132.3'
            fill='white'
          />
        </clipPath>
      </defs>
    </svg>
  )
}

const AppleMapIcon = () => {
  return (
    <svg
      className='size-4'
      viewBox='0 0 24 24'
      fill='none'
    >
      <path
        d='M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z'
        fill='currentColor'
      />
    </svg>
  )
}
