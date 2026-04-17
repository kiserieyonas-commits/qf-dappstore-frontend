import { createConfig, http, createStorage, cookieStorage } from 'wagmi'
import { mainnet, hardhat } from 'wagmi/chains'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

export const qfNetwork = {
  id: 3426,
  name: 'QF Network',
  nativeCurrency: { name: 'QF', symbol: 'QF', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://archive.mainnet.qfnode.net/eth'] },
  },
  blockExplorers: {
    default: { name: 'QF Explorer', url: 'https://portal.qfnetwork.xyz' },
  },
}

const isDev = process.env.NODE_ENV === 'development'

export const chains = isDev ? [hardhat, qfNetwork, mainnet] : [qfNetwork, mainnet]

export const wagmiConfig = createConfig({
  chains,
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  pollingInterval: 30_000,
  connectors: [
    injected(),
    walletConnect({ projectId }),
    coinbaseWallet({ appName: 'QF DappStore' }),
  ],
  transports: {
    [hardhat.id]:    http('http://127.0.0.1:8545'),
    [qfNetwork.id]:  http('https://archive.mainnet.qfnode.net/eth', { retryCount: 3, retryDelay: 1_000 }),
    [mainnet.id]:    http(),
  },
})
