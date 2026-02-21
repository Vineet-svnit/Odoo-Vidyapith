import './globals.css'
import { Providers } from './providers'
import { PageErrorBoundary } from '@/components'

export const metadata = {
  title: 'FleetFlow',
  description: 'Fleet Management System',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  themeColor: '#2196f3',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body>
        <PageErrorBoundary>
          <Providers>{children}</Providers>
        </PageErrorBoundary>
      </body>
    </html>
  )
}
