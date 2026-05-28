import L from 'leaflet'
import 'leaflet-routing-machine'
import { useEffect } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'

import { cn } from '@/lib/utils'

import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'
import 'leaflet/dist/leaflet.css'

type Stop = {
  point: L.LatLng
  name: string
}

const getMarkerSVG = (isStart: boolean) => {
  const color = isStart ? '#1FBD68' : '#4E4E4F'

  return `
    <svg width="42" height="53" viewBox="0 0 42 53" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20.91" cy="48.44" r="3.38" fill="${color}"/>
      <g clip-path="url(#clip0)">
        <circle cx="20.9" cy="18.59" r="8.45" fill="white"/>
        <path d="M31.66 29.34L20.9 40.1L10.15 29.34C4.21 23.4 4.21 13.77 10.15 7.83C16.09 1.89 25.72 1.89 31.66 7.83C37.6 13.77 37.6 23.4 31.66 29.34ZM20.9 25.35C24.63 25.35 27.66 22.32 27.66 18.59C27.66 14.85 24.63 11.83 20.9 11.83C17.17 11.83 14.14 14.85 14.14 18.59C14.14 22.32 17.17 25.35 20.9 25.35Z" fill="${color}"/>
      </g>
      <defs>
        <clipPath id="clip0">
          <rect width="40.56" height="40.56" fill="white" transform="translate(0.63)"/>
        </clipPath>
      </defs>
    </svg>
  `
}

const getMarkerHTML = (isStart: boolean, badgeNumber: string, name: string) => `
  <div class="relative">
    <div class="absolute bottom-full mb-2 flex w-65 items-start gap-1.5 left-1/2 -translate-x-1/2 bg-background border p-2 rounded-md shadow">
      <div class="size-5 flex items-center justify-center rounded-sm bg-gray-200 text-muted-foreground text-xs font-semibold">
        ${badgeNumber}
      </div>
      <div class="text-bas font-medium w-full">${name}</div>
    </div>
    ${getMarkerSVG(isStart)}
  </div>
`

const RoutingMachine = ({ stops }: { stops: Stop[] }) => {
  const map = useMap()

  useEffect(() => {
    if (!map || stops.length === 0) return

    if (stops.length === 1) {
      const stop = stops[0]

      const marker = L.marker(stop?.point, {
        icon: L.divIcon({
          html: getMarkerHTML(true, '1', stop?.name),
          className: 'custom-route-marker',
          iconSize: [40, 60],
          iconAnchor: [20, 50]
        })
      }).addTo(map)

      map.setView(stop?.point, 14)

      return () => {
        map.removeLayer(marker)
      }
    }

    const routingControl = L.Routing.control({
      waypoints: stops.map((s) => s.point),
      routeWhileDragging: false,
      showAlternatives: false,
      addWaypoints: false,
      collapsible: false,

      // @ts-expect-error - types is correct, error is in leaflet-routing-machine types lib
      draggableWaypoints: false,
      // fitSelectedRoutes: 'smart',

      show: false,
      lineOptions: {
        styles: [{ color: '#B9BAC1', weight: 6, opacity: 1 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      },
      createMarker: (index: number, waypoint: { latLng: L.LatLng }) => {
        const stop = stops[index]
        if (!stop) return null

        const isStart = index === 0
        const badgeNumber = `${index + 1}`

        return L.marker(waypoint.latLng, {
          icon: L.divIcon({
            html: getMarkerHTML(isStart, badgeNumber, stop.name),
            className: 'custom-route-marker',
            iconSize: [40, 60],
            iconAnchor: [20, 50]
          })
        })
      }
    }).addTo(map)

    return () => {
      map.removeControl(routingControl)
    }
  }, [map, stops])

  return null
}

interface RoutesMapProps {
  stops: Stop[]
  className?: string
}

export const RoutesMap = ({ stops, className }: RoutesMapProps) => {
  return (
    <MapContainer
      scrollWheelZoom
      className={cn('size-full [&_.leaflet-control-attribution]:hidden', className)}
      zoomControl={false}
      center={stops[0]?.point}
      zoom={6}
    >
      <TileLayer
        url='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        maxZoom={20}
      />

      <RoutingMachine stops={stops} />
    </MapContainer>
  )
}

export default RoutesMap
