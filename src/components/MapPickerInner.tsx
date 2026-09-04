'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { CAMPUS_CENTER, CAMPUS_ZOOM } from '@/lib/constants'

/**
 * Click-to-drop pin picker. Kept separate from {@link MapPicker} because
 * Leaflet must be behind a `ssr: false` dynamic import.
 */
export default function MapPickerInner({
  lat,
  lng,
  onPick,
}: {
  lat: number | null
  lng: number | null
  onPick: (lat: number, lng: number) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const marker = useRef<L.Marker | null>(null)
  // Keep the latest callback reachable without re-running the setup effect.
  const pick = useRef(onPick)
  pick.current = onPick

  useEffect(() => {
    if (!container.current || map.current) return

    const instance = L.map(container.current, {
      center: [lat ?? CAMPUS_CENTER.lat, lng ?? CAMPUS_CENTER.lng],
      zoom: lat === null ? CAMPUS_ZOOM : 16,
      scrollWheelZoom: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(instance)

    instance.on('click', (e: L.LeafletMouseEvent) => {
      pick.current(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)))
    })
    instance.on('click', () => instance.scrollWheelZoom.enable())
    instance.on('mouseout', () => instance.scrollWheelZoom.disable())

    map.current = instance
    return () => {
      instance.remove()
      map.current = null
      marker.current = null
    }
    // Initial centre only — later coordinate changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Move (or create) the marker whenever the chosen point changes.
  useEffect(() => {
    const instance = map.current
    if (!instance) return

    if (lat === null || lng === null) {
      marker.current?.remove()
      marker.current = null
      return
    }

    const point: L.LatLngExpression = [lat, lng]
    if (marker.current) {
      marker.current.setLatLng(point)
    } else {
      marker.current = L.marker(point, {
        icon: L.divIcon({
          className: 'gig-pin tier-gold',
          html: '<i></i>',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
        draggable: true,
      })
        .on('dragend', (e) => {
          const p = (e.target as L.Marker).getLatLng()
          pick.current(Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6)))
        })
        .addTo(instance)
    }

    if (!instance.getBounds().contains(point)) instance.panTo(point)
  }, [lat, lng])

  return (
    <div
      ref={container}
      className="h-64 w-full overflow-hidden rounded-xl border border-line"
      role="application"
      aria-label="Click the map to set the gig location"
    />
  )
}
