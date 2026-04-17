/**
 * feeService.ts
 *
 * Fee routing for QF DappStore transactions.
 *
 * Deployed DappProxy (0x301b9ADE737B921c00A1481C97A233633c9dEa03):
 *   function execute(address to, uint256 dappId) external payable
 *   event TxExecuted(address indexed from, address indexed to, uint256 amount, uint256 indexed dappId)
 *
 * The proxy records the transaction on-chain (event log).
 * Fee split (platform fee + builder revenue share) is tracked off-chain
 * by the backend which indexes TxExecuted events.
 */

import { BrowserProvider, JsonRpcSigner, Contract, formatEther } from 'ethers'
import { getWalletClient } from '@wagmi/core'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { FeeConfirmationModal } from '../components/FeeConfirmationModal'
import { wagmiConfig } from './wagmiConfig'

// ─── DappProxy ABI (deployed minimal contract) ───────────────────────────────

const DAPP_PROXY_ADDRESS = process.env.NEXT_PUBLIC_DAPP_PROXY_ADDRESS as string | undefined

const DAPP_PROXY_ABI = [
  'function execute(address to, uint256 dappId) external payable',
  'event TxExecuted(address indexed from, address indexed to, uint256 amount, uint256 indexed dappId)',
] as const

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TxParams {
  to:    string
  value?: string
  data?:  string
  gas?:   string
  from?:  string
}

export interface FeeInfo {
  originalAmount:          bigint
  platformFee:             bigint
  revenueShare:            bigint
  totalFee:                bigint
  builderAmount:           bigint
  originalAmountFormatted: string
  platformFeeFormatted:    string
  revenueShareFormatted:   string
  totalFeeFormatted:       string
  builderAmountFormatted:  string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getEthersSigner(): Promise<JsonRpcSigner> {
  const walletClient = await getWalletClient(wagmiConfig)
  if (!walletClient) throw new Error('No wallet connected')
  const { account, chain, transport } = walletClient
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const provider = new BrowserProvider(transport as any, { chainId: chain.id, name: chain.name })
  return new JsonRpcSigner(provider, account.address)
}

async function getProxyContract(): Promise<Contract> {
  if (!DAPP_PROXY_ADDRESS) {
    throw new Error('DappProxy contract not configured — set NEXT_PUBLIC_DAPP_PROXY_ADDRESS')
  }
  const signer = await getEthersSigner()
  return new Contract(DAPP_PROXY_ADDRESS, DAPP_PROXY_ABI, signer)
}

// ─── Fee calculation (synchronous, <1ms) ─────────────────────────────────────

/**
 * Calculates the fee breakdown for display purposes.
 * Actual fee split is tracked off-chain by the backend.
 */
export function calculateFeesSync(valueHex: string): FeeInfo {
  const value = BigInt(valueHex || '0x0')

  const platformFee   = (value * BigInt(85))   / BigInt(10000)
  const remaining     = value - platformFee
  const revenueShare  = (remaining * BigInt(1000)) / BigInt(10000)
  const totalFee      = platformFee + revenueShare
  const builderAmount = value - totalFee

  return {
    originalAmount:          value,
    platformFee,
    revenueShare,
    totalFee,
    builderAmount,
    originalAmountFormatted: formatEther(value),
    platformFeeFormatted:    formatEther(platformFee),
    revenueShareFormatted:   formatEther(revenueShare),
    totalFeeFormatted:       formatEther(totalFee),
    builderAmountFormatted:  formatEther(builderAmount),
  }
}

export const calculateFees = calculateFeesSync

// ─── Fee confirmation modal ───────────────────────────────────────────────────

export function showFeeConfirmation(
  feeInfo: FeeInfo,
  extra:   { destination: string; dappName?: string },
): Promise<boolean> {
  return new Promise((resolve) => {
    const container = document.createElement('div')
    container.id = 'qf-fee-portal'
    document.body.appendChild(container)
    const root = createRoot(container)

    const cleanup = () => { root.unmount(); container.remove() }

    root.render(
      createElement(FeeConfirmationModal, {
        isOpen:        true,
        amount:        feeInfo.originalAmountFormatted,
        fee:           feeInfo.totalFeeFormatted,
        builderAmount: feeInfo.builderAmountFormatted,
        destination:   extra.destination,
        onApprove: () => { cleanup(); resolve(true)  },
        onReject:  () => { cleanup(); resolve(false) },
      })
    )
  })
}

// ─── Main: handleTransactionWithFees ─────────────────────────────────────────

/**
 * Routes a transaction through the DappProxy:
 *   1. Calculates fee breakdown for display.
 *   2. Shows the QF fee confirmation modal.
 *   3. Calls DappProxy.execute(destination, dappId) with the full value.
 *      The on-chain event logs the transaction for backend fee accounting.
 *
 * @param txParams  Raw transaction parameters from eth_sendTransaction.
 * @param dappId    Numeric ID of the dApp in DappStoreRegistry.
 * @param dappName  Display name shown in the fee modal.
 * @returns         Transaction hash string.
 */
export async function handleTransactionWithFees(
  txParams:  TxParams,
  dappId:    number,
  dappName?: string,
): Promise<string> {
  if (typeof window === 'undefined') throw new Error('No wallet detected')

  const t0 = performance.now()

  const originalTo    = txParams.to
  const originalValue = txParams.value ?? '0x0'

  // Instant fee calculation for display
  const feeInfo = calculateFeesSync(originalValue)
  console.log('[QF] Fee calc:', (performance.now() - t0).toFixed(1), 'ms')

  // Show fee modal
  const confirmed = await showFeeConfirmation(feeInfo, { destination: originalTo, dappName })
  if (!confirmed) throw new Error('User cancelled transaction')
  console.log('[QF] User confirmed:', (performance.now() - t0).toFixed(1), 'ms')

  // Route through DappProxy — full value sent, backend tracks the split
  const proxy = await getProxyContract()
  const tx = await proxy.execute(originalTo, BigInt(dappId), { value: feeInfo.originalAmount })
  console.log('[QF] Sent to wallet:', (performance.now() - t0).toFixed(1), 'ms | hash:', tx.hash)

  await tx.wait()
  console.log('[QF] Confirmed:', (performance.now() - t0).toFixed(1), 'ms')

  return tx.hash
}

export { type FeeInfo as FeeInfoType }
