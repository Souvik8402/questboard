'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { CAMPUS_CENTER } from '@/lib/constants'
import { IconMapPin, IconX } from '@/components/ui/Icons'

const MapPickerInner = dynamic(() => import('./MapPickerInner'), {
  ssr: false,
  loading: () => (
    <div className="grid h-64 w-full place-items-center rounded-xl border border-line bg-white/80 text-[14px] text-dim">
      Loading map…
    </div>
  ),
})

/**
 * Optional location picker for the post-a-gig form.
 *
 * Coordinates are mirrored into hidden inputs so the surrounding
 * `<form action={serverAction}>` picks them up with no extra wiring. Leaving
 * the pin unset is valid — plenty of gigs are remote or address-only.
 */
export function MapPicker({
  defaultLat = null,
  defaultLng = null,
  latName = 'lat',
  lngName = 'lng',
}: {
  defaultLat?: number | null
  defaultLng?: number | null
  latName?: string
  lngName?: string
}) {
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(
    defaultLat !== null && defaultLng !== null ? { lat: defaultLat, lng: defaultLng } : null,
  )
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setGeoError('This browser will not share a location.')
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPoint({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        })
        setLocating(false)
      },
      () => {
        setGeoError('Location permission denied — drop the pin by hand instead.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  return (
    <div className="space-y-2">
      {point && (
        <>
          <input type="hidden" name={latName} value={point.lat} />
          <input type="hidden" name={lngName} value={point.lng} />
        </>
      )}

      <MapPickerInner
        lat={point?.lat ?? null}
        lng={point?.lng ?? null}
        onPick={(lat, lng) => {
          setPoint({ lat, lng })
          setGeoError(null)
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-black/[0.03] px-2.5 py-1.5 text-[13px] font-medium text-mist transition-colors hover:border-cyan/35 hover:text-chalk disabled:opacity-50"
        >
          {locating ? (
            <span className="size-3 animate-spin rounded-full border-2 border-cyan/30 border-t-cyan" />
          ) : (
            <IconMapPin className="size-3.5" />
          )}
          Use my location
        </button>

        {point ? (
          <>
            <span className="hud text-[12.5px] text-cyan">
              {point.lat.toFixed(4)}°N, {point.lng.toFixed(4)}°E
            </span>
            <button
              type="button"
              onClick={() => setPoint(null)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] text-dim transition-colors hover:text-rose"
            >
              <IconX className="size-3" />
              Clear pin
            </button>
          </>
        ) : (
          <span className="text-[12.5px] text-dim">
            Click the map to drop a pin — optional, but gigs with one show up in the map view.
          </span>
        )}

        <span className="ml-auto hud text-[11.5px] text-dimmer">
          centre {CAMPUS_CENTER.lat}°N {CAMPUS_CENTER.lng}°E
        </span>
      </div>

      {geoError && <p className="text-xs text-amber">{geoError}</p>}
    </div>
  )
}
