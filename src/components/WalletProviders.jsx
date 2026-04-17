'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { hardhat } from 'wagmi/chains'
import { wagmiConfig, qfNetwork, chains } from '../lib/wagmiConfig'
import { UserProvider } from '../context/UserContext'

const queryClient = new QueryClient()

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''
const isDev = process.env.NODE_ENV === 'development'

let web3ModalInitialized = false
if (typeof window !== 'undefined' && projectId && !web3ModalInitialized) {
  web3ModalInitialized = true
  createWeb3Modal({
    wagmiConfig,
    projectId,
    chains,
    defaultChain: isDev ? hardhat : qfNetwork,
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#06b6d4',
      '--w3m-border-radius-master': '10px',
    },
    includeWalletIds: [
      'c57ca95b47569778a828d19178114f4db188b89b7928a9f57a39f3c5a0f7d4de', // MetaMask
      '9ce87712b99b3eb57396cc8621db8900ac983c712236f48fb70ad28760be3f6a', // SubWallet
      'e0c2e199712878ed272e2c170b585baa0ff0eb50b07521ca586ebf7aeeffc598', // Talisman
    ],
  })
}

export default function WalletProviders({ children, initialState }) {
  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          {children}
        </UserProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
