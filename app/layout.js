import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'FleetFlow',
  description: 'Fleet Management System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
