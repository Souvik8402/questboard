import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { INSTITUTE_SHORT, TAGLINE } from '@/lib/constants'
import { siteUrl } from '@/lib/config'
import { DemoBanner } from '@/components/DemoBanner'
import { Footer } from '@/components/Footer'
import { Nav } from '@/components/Nav'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  weight: ['400', '500', '600'],
})

const title = `GigNest — ${TAGLINE}`
const description = `Post paid work around Varanasi and get it done — anyone can apply. Verified ${INSTITUTE_SHORT} students pay no fee. One-off errands to month-long projects, searchable by skill.`

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: title, template: '%s · GigNest' },
  description,
  keywords: [
    'IIT BHU',
    'part-time jobs',
    'student freelance',
    'Varanasi',
    'campus gigs',
    'GigNest',
  ],
  openGraph: {
    title,
    description,
    type: 'website',
    siteName: 'GigNest',
    locale: 'en_IN',
  },
  twitter: { card: 'summary_large_image', title, description },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#f2f0ef',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body>
        {/* Ambient light wash, fixed behind everything */}
        <div className="aurora" aria-hidden />

        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-lg focus:bg-cyan focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>

        <DemoBanner />
        <Nav />
        <main id="main" className="min-h-[60dvh]">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
