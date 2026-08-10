import { useEffect, useRef } from 'react'
import { Camera, Flag, Image, MapPin, Navigation, Phone, X } from 'lucide-react'
import L from 'leaflet'

import { useStore } from '@/store/create-store'

import { Overlay } from '@/components/shell/modal'

import { coordsOf, orderMapCat, WAREHOUSE_COORD } from '../map-data'
import { orderById } from '../selectors'
import { shippingStore } from '../store'
import { showToast } from '../ui'

/**
 * One stop, on its own map.
 *
 * The left half is a draft the board left unfilled — a street-view placeholder and three empty
 * thumbnails — and it is ported as the placeholder it is rather than invented into something.
 *
 * The map is built once and then re-centred, and it is invalidated twice after opening because Leaflet
 * measures its container on creation: inside an overlay that was `display: none` a moment ago, the
 * first measurement is zero and the tiles come out as a sliver.
 */
export const MapDetail = ({
  orderId,
  onClose
}: {
  orderId: number | null
  onClose: () => void
}) => {
  const orders = useStore(shippingStore, state => state.orders)
  const order = orderById(orderId, orders)

  const host = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const marker = useRef<L.Layer | null>(null)

  useEffect(() => {
    if (!order || !host.current) return

    const coords = coordsOf(order) ?? WAREHOUSE_COORD

    if (!map.current) {
      map.current = L.map(host.current, { zoomControl: true, attributionControl: false })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(
        map.current
      )
    }

    map.current.setView(coords, 13)
    if (marker.current) map.current.removeLayer(marker.current)
    marker.current = L.marker(coords, {
      icon: L.divIcon({
        className: '',
        html: `<div class="mappin cat-${orderMapCat(order)}"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 18]
      })
    }).addTo(map.current)

    const first = setTimeout(() => map.current?.invalidateSize(), 60)
    const second = setTimeout(() => {
      map.current?.invalidateSize()
      map.current?.setView(coords, 13)
    }, 280)

    return () => {
      clearTimeout(first)
      clearTimeout(second)
    }
  }, [order])

  useEffect(
    () => () => {
      map.current?.remove()
      map.current = null
      marker.current = null
    },
    []
  )

  const centre = () => {
    if (order && map.current) map.current.setView(coordsOf(order) ?? WAREHOUSE_COORD, 14)
    showToast(`Centered on ${order ? order.address : '—'}`)
  }

  return (
    <Overlay id='overlay-mapdetail' comment='overlay-mapdetail' open={!!order} onClose={onClose}>
      <div className='modal wide' data-comment='mapdetail-modal' data-component='dialog'>
        {/* written out rather than using ModalHead: this is the one modal with no description line */}
        <div className='modal-head' data-comment='mapdetail-head'>
          <div data-comment='mapdetail-head-text'>
            <div className='modal-title' id='mapd-title' data-comment='mapdetail-title'>
              Order #: {order?.order ?? '—'} &nbsp;&nbsp;Customer Name: {order?.customer ?? '—'}
            </div>
          </div>
          <button
            className='modal-x'
            aria-label='Close'
            data-comment='mapdetail-x'
            onClick={onClose}
          >
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
        <div className='mapmodal-body' data-comment='mapdetail-body'>
          <div className='mapd-left' data-comment='mapdetail-left'>
            <div className='mapd-photo' data-comment='mapdetail-photo'>
              <Image style={{ width: '14px', height: '14px' }} />
              Update Image — street view
            </div>
            <div className='exp-label' data-comment='mapdetail-addr-label'>
              Address
            </div>
            <div className='strow-val' id='mapd-addr' data-comment='mapdetail-addr'>
              {order ? `${order.address}, ${order.city}` : '—'}
            </div>
            <div className='mapd-icons' data-comment='mapdetail-icons'>
              <span className='mapd-icon' data-comment='mapdetail-icon-call' title='Call'>
                <Phone style={{ width: '14px', height: '14px' }} />
              </span>
              <span
                className='mapd-icon'
                data-comment='mapdetail-icon-directions'
                title='Directions'
              >
                <Navigation style={{ width: '14px', height: '14px' }} />
              </span>
              <span className='mapd-icon' data-comment='mapdetail-icon-photos' title='Photos'>
                <Camera style={{ width: '14px', height: '14px' }} />
              </span>
              <span className='mapd-icon' data-comment='mapdetail-icon-flag' title='Flag issue'>
                <Flag style={{ width: '14px', height: '14px' }} />
              </span>
            </div>
            <div className='mapd-thumbs' data-comment='mapdetail-thumbs'>
              <div className='mapd-thumb' data-comment='mapdetail-thumb-1' />
              <div className='mapd-thumb' data-comment='mapdetail-thumb-2' />
              <div className='mapd-thumb' data-comment='mapdetail-thumb-3' />
            </div>
          </div>
          <div className='mapd-right' data-comment='mapdetail-right'>
            <div className='mapd-mapbox' data-comment='mapdetail-mapbox'>
              <div id='mapd-leaflet' data-comment='mapdetail-leaflet' ref={host} />
              <button className='mapd-here' data-comment='mapdetail-here' onClick={centre}>
                <MapPin style={{ width: '14px', height: '14px' }} />
                Here
              </button>
            </div>
          </div>
        </div>
      </div>
    </Overlay>
  )
}
