'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { CAMPUS_CENTER, CAMPUS_ZOOM, rewardTier } from '@/lib/constants'
import { formatRupees } from '@/lib/format'
import type { GigWithRelations } from '@/lib/types'

/*
 * Raw Leaflet rather than react-leaflet: one fewer dependency to keep aligned
 * with React 19, and the imperative API is a better fit for "draw pins once,
 * update when the list changes".
 *
 * Loaded only through next/dynamic with ssr: false — Leaflet touches `window`
 * at import time.
 */

const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

function pinIcon(tier: string): L.DivIcon {
  return L.divIcon({
    className: `gig-pin tier-${tier}`,
    html: '<i></i>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  })
}

function popupHtml(gig: GigWithRelations): string {
  const escape = (s: string) =>
    s.replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
    )

  const skills = gig.skills
    .slice(0, 3)
    .map(
      (s) =>
        `<span style="border:1px solid #222a3d;border-radius:5px;padding:1px 5px;font-size:10px;color:#8e97ad">${escape(
          s.name,
        )}</span>`,
    )
    .join(' ')

  return `
    <div style="min-width:190px;max-width:230px">
      <div style="font-family:ui-monospace,monospace;font-size:14px;font-weight:600;color:#e9edf7">
        ${escape(formatRupees(gig.reward_amount))}
      </div>
      <a href="/gigs/${gig.id}"
         style="display:block;margin-top:3px;font-size:12.5px;font-weight:600;color:#22d3ee;text-decoration:none;line-height:1.35">
        ${escape(gig.title)}
      </a>
      <div style="margin-top:4px;font-size:11px;color:#5d6674">
        ${escape(gig.location_label ?? 'Location on request')}
      </div>
      ${skills ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:3px">${skills}</div>` : ''}
    </div>
  `
}

export default function GigMap({
  gigs,
  height = 'min(70dvh, 620px)',
  focusId,
}: {
  gigs: GigWithRelations[]
  height?: string
  focusId?: string
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)

  // Create the map once.
  useEffect(() => {
    if (!container.current || map.current) return

    const instance = L.map(container.current, {
      center: [CAMPUS_CENTER.lat, CAMPUS_CENTER.lng],
      zoom: CAMPUS_ZOOM,
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer(OSM_TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(instance)
    layer.current = L.layerGroup().addTo(instance)
    map.current = instance

    // Scroll-zoom only once the map has focus, so the page still scrolls past it.
    instance.on('click', () => instance.scrollWheelZoom.enable())
    instance.on('mouseout', () => instance.scrollWheelZoom.disable())

    return () => {
      instance.remove()
      map.current = null
      layer.current = null
    }
  }, [])

  // Redraw pins whenever the gig list changes.
  useEffect(() => {
    const instance = map.current
    const group = layer.current
    if (!instance || !group) return

    group.clearLayers()

    const points: L.LatLngTuple[] = []
    for (const gig of gigs) {
      if (gig.lat === null || gig.lng === null) continue
      const point: L.LatLngTuple = [gig.lat, gig.lng]
      points.push(point)

      const marker = L.marker(point, {
        icon: pinIcon(rewardTier(gig.reward_amount)),
        title: gig.title,
        riseOnHover: true,
      }).bindPopup(popupHtml(gig), { closeButton: true, maxWidth: 260 })

      marker.addTo(group)
      if (focusId && gig.id === focusId) marker.openPopup()
    }

    if (points.length === 1) {
      instance.setView(points[0], 15)
    } else if (points.length > 1) {
      instance.fitBounds(L.latLngBounds(points).pad(0.18), { maxZoom: 15 })
    } else {
      instance.setView([CAMPUS_CENTER.lat, CAMPUS_CENTER.lng], CAMPUS_ZOOM)
    }
  }, [gigs, focusId])

  return (
    <div
      ref={container}
      style={{ height }}
      className="w-full overflow-hidden rounded-[var(--radius-card)] border border-line"
      role="application"
      aria-label="Map of open gigs"
    />
  )
}
