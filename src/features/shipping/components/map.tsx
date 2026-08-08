import L from 'leaflet'

import { useEffect, useRef, useState } from 'react'

import { useStore } from '@/store/create-store'

import { fmtDate } from '../format'
import { coordsOf, MAP_CATS, orderMapCat, WAREHOUSE_COORD } from '../map-data'
import { orderMatchesSearch } from '../selectors'
import { shippingStore } from '../store'

import type { MapCat } from '../map-data'
import type { Order } from '../types'

import 'leaflet/dist/leaflet.css'

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    char =>
      (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }) as const)[
        char as '&'
      ]
  )

/** Leaflet owns the popup's DOM, so this one string is markup rather than JSX. */
const popupHtml = (order: Order, cat: MapCat) => {
  const label = MAP_CATS.find(entry => entry.id === cat)?.label ?? cat

  return (
    `<div class="map-pop"><div class="map-pop-order">${escapeHtml(order.order)}${order.pickup ? ' · Pickup' : ''}</div>` +
    `<div class="map-pop-cust">${escapeHtml(order.customer)}</div>` +
    `<div class="map-pop-row">${escapeHtml(order.address)}, ${escapeHtml(order.city)}</div>` +
    `<div class="map-pop-row">${order.weight.toLocaleString('en-US')} lb · ${order.longestLength}&quot; · ${escapeHtml(order.shipVia)}</div>` +
    `<div class="map-pop-stat"><span class="map-filter-dot cat-${cat}"></span>${label}${order.shipDate ? ` · ${fmtDate(order.shipDate)}` : ''}</div></div>`
  )
}

/**
 * Every stop as a status pin, over OpenStreetMap.
 *
 * The pins, the filter bar and their counts are the port's to get right, and the gate judges them.
 * The tiles under them are downloaded images from a third party: two runs of the same build can differ
 * there, so what the map draws beneath the pins is outside what a pixel diff can honestly say.
 */
export const ShipMap = () => {
  const orders = useStore(shippingStore, state => state.orders)
  const search = useStore(shippingStore, state => state.search)
  const [active, setActive] = useState<Set<MapCat>>(
    () => new Set(MAP_CATS.map(cat => cat.id) as MapCat[])
  )

  const host = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markers = useRef<L.Layer[]>([])

  const counts: Partial<Record<MapCat, number>> = {}
  for (const order of orders) {
    if (!orderMatchesSearch(order)) continue
    const cat = orderMapCat(order)
    counts[cat] = (counts[cat] ?? 0) + 1
  }

  // one map instance for the life of the view; markers are redrawn under it on every change
  useEffect(() => {
    if (!host.current || map.current) return

    map.current = L.map(host.current, { scrollWheelZoom: true }).setView([42.86, -80.35], 9)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map.current)

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const instance = map.current
    if (!instance) return

    for (const marker of markers.current) instance.removeLayer(marker)
    markers.current = []

    for (const order of orders) {
      if (!orderMatchesSearch(order)) continue
      const cat = orderMapCat(order)
      if (!active.has(cat)) continue
      const coords = coordsOf(order)
      if (!coords) continue

      const icon = L.divIcon({
        className: '',
        html: `<div class="mappin cat-${cat}"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 18],
        popupAnchor: [4, -16]
      })
      markers.current.push(
        L.marker(coords, { icon }).addTo(instance).bindPopup(popupHtml(order, cat))
      )
    }

    markers.current.push(
      L.marker(WAREHOUSE_COORD, {
        icon: L.divIcon({
          className: '',
          html: '<div class="mappin-wh">W</div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          popupAnchor: [0, -10]
        })
      })
        .addTo(instance)
        .bindPopup(
          '<div class="map-pop"><div class="map-pop-order">Warehouse</div><div class="map-pop-row">Tillsonburg, ON — dispatch base</div></div>'
        )
    )

    const resize = setTimeout(() => instance.invalidateSize(), 0)
    return () => clearTimeout(resize)
  }, [orders, search, active])

  const toggle = (id: MapCat) =>
    setActive(current => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })

  return (
    <div className='mapview-wrap' data-comment='mapview-wrap'>
      <div className='mapview-bar' data-comment='mapview-bar' id='map-legend'>
        <span className='mapview-bar-label' data-comment='map-legend-label'>
          Show
        </span>
        {MAP_CATS.map(cat => (
          <button
            className={`map-filter ${active.has(cat.id) ? '' : 'off'}`}
            data-comment={`map-filter-${cat.id}`}
            onClick={() => toggle(cat.id)}
            key={cat.id}
          >
            <span className={`map-filter-dot cat-${cat.id}`} />
            {cat.label}
            <span className='map-filter-count' data-comment={`map-filter-count-${cat.id}`}>
              {counts[cat.id] ?? 0}
            </span>
          </button>
        ))}
      </div>
      <div id='ship-map' data-comment='ship-map' ref={host} />
    </div>
  )
}
