import '../globals.css'
import { cookies } from 'next/headers'
import { cookieToInitialState } from 'wagmi'
import { wagmiConfig } from '../lib/wagmiConfig'
import WalletProviders from '../components/WalletProviders'

export const metadata = {
  title: 'QF DappStore',
  description: 'Discover dApps on QF Network',
}

export default async function RootLayout({ children }) {
  const cookieStore = await cookies()
  const initialState = cookieToInitialState(wagmiConfig, cookieStore.get('wagmi.store')?.value)

  return (
    <html lang="en">
      <body>
        <WalletProviders initialState={initialState}>{children}</WalletProviders>
      </body>
    </html>
  )
}
