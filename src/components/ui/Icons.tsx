import type { ComponentProps } from 'react'

/*
 * Inline SVG icons (Lucide-style geometry, hand-copied) so the project needs no
 * icon dependency. Every icon takes className through props.
 */

type P = ComponentProps<'svg'>

function Svg({ children, ...rest }: P) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-4"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
)

export const IconMapPin = (p: P) => (
  <Svg {...p}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="2.5" />
  </Svg>
)

export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </Svg>
)

export const IconWifi = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5a10 10 0 0 1 14 0" />
    <path d="M8.5 15.8a5.5 5.5 0 0 1 7 0" />
    <path d="M12 19h.01" />
  </Svg>
)

export const IconUsers = (p: P) => (
  <Svg {...p}>
    <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" />
    <circle cx="10" cy="8" r="3.5" />
    <path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 4.6a3.5 3.5 0 0 1 0 6.8" />
  </Svg>
)

export const IconBriefcase = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="7.5" width="18" height="12.5" rx="2" />
    <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3 12.5h18" />
  </Svg>
)

export const IconSparkles = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" />
    <path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
  </Svg>
)

export const IconShield = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l7 3v5.5c0 4.5-3 7.7-7 9.5-4-1.8-7-5-7-9.5V6l7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
)

export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="m5 13 4 4L19 7" />
  </Svg>
)

export const IconX = (p: P) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
)

export const IconArrowRight = (p: P) => (
  <Svg {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </Svg>
)

export const IconArrowLeft = (p: P) => (
  <Svg {...p}>
    <path d="M20 12H5M11 6l-6 6 6 6" />
  </Svg>
)

export const IconStar = (p: P) => (
  <Svg {...p}>
    <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8L12 3.5Z" />
  </Svg>
)

export const IconPhone = (p: P) => (
  <Svg {...p}>
    <path d="M5 3h3.2l1.6 4-2 1.4a12 12 0 0 0 5.8 5.8l1.4-2 4 1.6V19a2 2 0 0 1-2.2 2A16 16 0 0 1 3 5.2 2 2 0 0 1 5 3Z" />
  </Svg>
)

export const IconMail = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </Svg>
)

export const IconCoins = (p: P) => (
  <Svg {...p}>
    <ellipse cx="9" cy="7" rx="6" ry="3" />
    <path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7" />
    <path d="M15 11.5c2.9.3 6 1.5 6 3.5 0 1.7-2.7 3-6 3s-6-1.3-6-3v-1" />
  </Svg>
)

export const IconLayers = (p: P) => (
  <Svg {...p}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </Svg>
)

export const IconMenu = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
)

export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const IconLogout = (p: P) => (
  <Svg {...p}>
    <path d="M9 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3" />
    <path d="M16 8l4 4-4 4M20 12H9" />
  </Svg>
)

export const IconEye = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)

export const IconLock = (p: P) => (
  <Svg {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </Svg>
)

export const IconFlag = (p: P) => (
  <Svg {...p}>
    <path d="M5 21V4M5 4h11l-1.5 4L16 12H5" />
  </Svg>
)

export const IconTrash = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
  </Svg>
)

export const IconGoogle = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden className="size-4" {...p}>
    <path
      fill="#4285F4"
      d="M22.5 12.2c0-.8-.07-1.36-.2-2H12v3.85h5.9c-.12 1-.76 2.5-2.44 3.5l-.02.15 3.55 2.75.25.02c2.26-2.08 3.26-5.13 3.26-8.27Z"
    />
    <path
      fill="#34A853"
      d="M12 23.5c3.24 0 5.96-1.07 7.94-2.9l-3.78-2.92c-1.01.7-2.37 1.2-4.16 1.2a6.44 6.44 0 0 1-6.1-4.45l-.14.01-3.63 2.81-.05.13A12.02 12.02 0 0 0 12 23.5Z"
    />
    <path
      fill="#FBBC05"
      d="M5.9 14.43a6.6 6.6 0 0 1-.36-2.11c0-.74.13-1.45.35-2.11l-.01-.14L2.2 7.22l-.12.06A11.98 11.98 0 0 0 .8 12.32c0 1.86.45 3.62 1.28 5.04L5.9 14.43Z"
    />
    <path
      fill="#EA4335"
      d="M12 5.06c2.26 0 3.79.97 4.66 1.79l3.4-3.3C17.95 1.7 15.24.5 12 .5A12.02 12.02 0 0 0 2.08 7.28l3.8 2.93A6.47 6.47 0 0 1 12 5.06Z"
    />
  </svg>
)
