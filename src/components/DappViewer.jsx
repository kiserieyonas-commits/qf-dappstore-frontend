'use client'

/**
 * DappViewer.jsx
 *
 * Renders an external dApp inside a sandboxed iframe and injects the QF
 * DappStore wallet provider.  All eth_sendTransaction calls made by the dApp
 * are intercepted here, fees are calculated, and — after user confirmation —
 * the transaction is routed through DappProxy.forwardAndCall() on-chain.
 *
 * Message flow:
 *   iframe (provider bridge) ──WALLET_REQUEST──► DappViewer
 *   DappViewer ─────────────────WALLET_RESPONSE──► iframe
 *
 * Fee split (mirrors DappProxy.sol):
 *   Platform fee : 0.85%  of msg.value  → treasury
 *   Revenue share: 10%    of remainder  → treasury
 *   Builder gets : ~89.235%             → destination
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { formatEther, encodeFunctionData } from 'viem'
import FeeConfirmationModal from './FeeConfirmationModal'

// ─── DappProxy contract config ────────────────────────────────────────────────
// Set NEXT_PUBLIC_DAPP_PROXY_ADDRESS in .env.local after deploying DappProxy.sol
const DAPP_PROXY_ADDRESS = process.env.NEXT_PUBLIC_DAPP_PROXY_ADDRESS || null

const DAPP_PROXY_ABI = [
  {
    // executeWithFees(address destination, uint256 dappId, bytes data)
    name: 'executeWithFees',
    type: 'function',
    inputs: [
      { name: 'destination', type: 'address' },
      { name: 'dappId',      type: 'uint256' },
      { name: 'data',        type: 'bytes'   },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'payable',
  },
  {
    // sendWithFees(address payable recipient, uint256 dappId)
    name: 'sendWithFees',
    type: 'function',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'dappId',    type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'payable',
  },
]

// ─── Chain config ─────────────────────────────────────────────────────────────
const CHAIN_ID     = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? '42', 10)
const CHAIN_ID_HEX = '0x' + CHAIN_ID.toString(16)

// ─── Fee constants (must match DappProxy.sol) ─────────────────────────────────
const PLATFORM_FEE_BPS  = 85n
const REVENUE_SHARE_BPS = 1000n
const BPS_DENOMINATOR   = 10000n

function calcFees(valueWei) {
  const v            = BigInt(valueWei)
  const platformFee  = (v * PLATFORM_FEE_BPS)  / BPS_DENOMINATOR
  const afterPlatform = v - platformFee
  const revenueShare = (afterPlatform * REVENUE_SHARE_BPS) / BPS_DENOMINATOR
  const totalFee     = platformFee + revenueShare
  const builderAmount = v - totalFee
  return { platformFee, revenueShare, totalFee, builderAmount }
}

// ─── Read-only RPC methods forwarded directly to the public client ─────────────
const READ_METHODS = new Set([
  'eth_call',
  'eth_getBalance',
  'eth_getCode',
  'eth_getStorageAt',
  'eth_getTransactionCount',
  'eth_getTransactionByHash',
  'eth_getTransactionReceipt',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_maxPriorityFeePerGas',
  'eth_feeHistory',
  'eth_blockNumber',
  'eth_getBlockByNumber',
  'eth_getBlockByHash',
  'eth_getLogs',
  'eth_syncing',
  'net_version',
  'web3_clientVersion',
])

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @param {object}  props
 * @param {object}  props.dapp         - dApp data object from App.jsx
 * @param {string}  props.dapp.id      - numeric dApp ID
 * @param {string}  props.dapp.name    - display name
 * @param {string}  props.dapp.dappUrl - URL of the external dApp
 * @param {string}  [props.dapp.ownerWallet] - builder/owner wallet address
 */
export default function DappViewer({ dapp }) {
  const iframeRef   = useRef(null)
  const [loading,    setLoading]    = useState(true)
  const [loadError,  setLoadError]  = useState(false)
  const [pendingTx,  setPendingTx]  = useState(null)  // awaiting user confirmation
  const [txStatus,   setTxStatus]   = useState(null)  // 'signing' | 'pending' | 'confirmed' | 'failed'
  const [txHash,     setTxHash]     = useState(null)

  const { address }  = useAccount()
  const publicClient = usePublicClient()

  // ── Helper: post a message back into the iframe ──
  const replyToIframe = useCallback((msg) => {
    iframeRef.current?.contentWindow?.postMessage(msg, '*')
  }, [])

  // ── Handle incoming messages from the iframe provider bridge ──
  useEffect(() => {
    const handle = async (event) => {
      const d = event.data
      if (!d || d.type !== 'WALLET_REQUEST') return

      const { requestId, method, params } = d
      const dappId = d.dappId || String(dapp.id)

      try {
        let result

        // ── Identity / chain info ──
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
          result = address ? [address.toLowerCase()] : []

        } else if (method === 'eth_chainId') {
          result = CHAIN_ID_HEX

        } else if (method === 'net_version') {
          result = String(CHAIN_ID)

        } else if (method === 'eth_coinbase') {
          result = address || '0x0000000000000000000000000000000000000000'

        // ── INTERCEPT: transaction ──
        } else if (method === 'eth_sendTransaction') {
          const txParams = params?.[0] || {}
          const valueWei = txParams.value ? BigInt(txParams.value) : 0n

          if (valueWei === 0n) {
            // Zero-value tx: forward as-is (no fee to collect)
            result = await window.ethereum.request({
              method: 'eth_sendTransaction',
              params: [{
                from: address,
                to:   txParams.to,
                data: txParams.data || '0x',
                ...(txParams.gas ? { gas: '0x' + BigInt(txParams.gas).toString(16) } : {}),
              }],
            })
          } else {
            // Value-bearing tx: intercept and show fee confirmation
            const fees = calcFees(valueWei)
            setPendingTx({ requestId, txParams, dappId, valueWei, ...fees })
            return // response sent later via confirmTransaction / rejectTransaction
          }

        // ── Read-only: forward to RPC ──
        } else if (READ_METHODS.has(method)) {
          result = await publicClient.request({ method, params: params || [] })

        } else {
          // Unknown or wallet-specific method
          throw new Error(`[QF DappStore] Unsupported method: ${method}`)
        }

        replyToIframe({ type: 'WALLET_RESPONSE', requestId, result })

      } catch (err) {
        replyToIframe({ type: 'WALLET_RESPONSE', requestId, error: err.message })
      }
    }

    window.addEventListener('message', handle)
    return () => window.removeEventListener('message', handle)
  }, [address, publicClient, dapp.id, replyToIframe])

  // ── Sync wallet address into iframe provider ──
  useEffect(() => {
    if (!iframeRef.current) return
    replyToIframe({ type: 'WALLET_EVENT', event: 'accountsChanged', data: address ? [address] : [] })
  }, [address, replyToIframe])

  // ── Confirm: route through DappProxy ──
  const confirmTransaction = useCallback(async () => {
    if (!pendingTx) return

    try {
      setTxStatus('signing')

      if (!DAPP_PROXY_ADDRESS) {
        throw new Error('DappProxy not configured — set NEXT_PUBLIC_DAPP_PROXY_ADDRESS')
      }

      const { requestId, txParams, dappId, valueWei } = pendingTx
      const hasCalldata = txParams.data && txParams.data !== '0x'

      // Encode calldata — bypasses wagmi gas estimation, MetaMask pops up in <300ms
      const calldata = hasCalldata
        ? encodeFunctionData({
            abi:          DAPP_PROXY_ABI,
            functionName: 'executeWithFees',
            args:         [txParams.to, BigInt(dappId), txParams.data || '0x'],
          })
        : encodeFunctionData({
            abi:          DAPP_PROXY_ABI,
            functionName: 'sendWithFees',
            args:         [txParams.to, BigInt(dappId)],
          })

      // Estimate gas ourselves — MetaMask falls back to 21M when estimation fails
      let gasEstimate
      try {
        gasEstimate = await publicClient.estimateGas({
          account: address,
          to:      DAPP_PROXY_ADDRESS,
          value:   valueWei,
          data:    calldata,
        })
        // Add 20% buffer, cap at 1_000_000
        gasEstimate = gasEstimate * 12n / 10n
        if (gasEstimate > 1_000_000n) gasEstimate = 1_000_000n
      } catch {
        gasEstimate = hasCalldata ? 300_000n : 120_000n
      }

      const hash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from:  address,
          to:    DAPP_PROXY_ADDRESS,
          value: '0x' + valueWei.toString(16),
          data:  calldata,
          gas:   '0x' + gasEstimate.toString(16),
        }],
      })

      setTxHash(hash)
      setTxStatus('pending')

      await publicClient.waitForTransactionReceipt({ hash })
      setTxStatus('confirmed')

      replyToIframe({ type: 'WALLET_RESPONSE', requestId, result: hash })

      setTimeout(() => {
        setPendingTx(null)
        setTxStatus(null)
        setTxHash(null)
      }, 3000)

    } catch (err) {
      setTxStatus('failed')
      // MUST use 'WALLET_RESPONSE' — walletInjector.js only listens for this type
      replyToIframe({
        type:      'WALLET_RESPONSE',
        requestId: pendingTx.requestId,
        error:     err.shortMessage || err.message,
      })
    }
  }, [pendingTx, publicClient, address, replyToIframe])

  // ── Reject: user declined ──
  const rejectTransaction = useCallback(() => {
    if (!pendingTx) return
    // MUST use 'WALLET_RESPONSE' — walletInjector.js only listens for this type
    replyToIframe({
      type:      'WALLET_RESPONSE',
      requestId: pendingTx.requestId,
      error:     'MetaMask Tx Signature: User denied transaction signature.',
    })
    setPendingTx(null)
    setTxStatus(null)
  }, [pendingTx, replyToIframe])

  // ── Proxy URL ──
  const proxyUrl = `/api/dapp-proxy?url=${encodeURIComponent(dapp.dappUrl)}&dappId=${encodeURIComponent(dapp.id)}`

  // ── Dismiss after failure ──
  const dismissFailed = () => { setPendingTx(null); setTxStatus(null); setTxHash(null) }

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-cyan-500/20" style={{ height: 'calc(100vh - 130px)', minHeight: 480 }}>

      {/* ── Loading overlay ── */}
      {loading && !loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0e1a] z-10 gap-4">
          <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-white font-semibold">{dapp.name}</p>
            <p className="text-gray-400 text-sm mt-1">Loading dApp — injecting wallet…</p>
          </div>
          <div className="flex items-center gap-2 mt-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs text-cyan-400">QF DappStore wallet active</span>
          </div>
        </div>
      )}

      {/* ── Error overlay ── */}
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0e1a] z-10 gap-4 px-6 text-center">
          <div className="text-4xl">⚠️</div>
          <p className="text-white font-semibold">Could not load {dapp.name}</p>
          <p className="text-gray-400 text-sm max-w-sm">
            The dApp could not be proxied. It may block external embedding or require direct access.
          </p>
          <a
            href={dapp.dappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-4 py-2 rounded-lg text-sm hover:bg-cyan-500/20 transition-all"
          >
            Open directly ↗
          </a>
        </div>
      )}

      {/* ── dApp iframe ── */}
      <iframe
        ref={iframeRef}
        src={proxyUrl}
        title={dapp.name}
        className="w-full h-full border-0 bg-[#0a0e1a]"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock"
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setLoadError(true) }}
      />

      {/* ── Fee confirmation modal (awaiting user approval) ── */}
      <FeeConfirmationModal
        isOpen={pendingTx !== null && txStatus === null}
        amount={pendingTx ? formatEther(pendingTx.valueWei) : '0'}
        fee={pendingTx ? formatEther(pendingTx.totalFee) : '0'}
        builderAmount={pendingTx ? formatEther(pendingTx.builderAmount) : '0'}
        destination={pendingTx?.txParams?.to ?? ''}
        onApprove={confirmTransaction}
        onReject={rejectTransaction}
      />

      {/* ── Transaction status overlay (after approval) ── */}
      {txStatus !== null && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#0f1729] border border-cyan-500/30 rounded-2xl p-8 text-center w-full max-w-xs mx-4 shadow-2xl">

            {txStatus === 'signing' && (
              <p className="text-yellow-400 text-sm animate-pulse">Waiting for wallet signature…</p>
            )}

            {txStatus === 'pending' && (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                <p className="text-cyan-400 text-sm">Broadcasting transaction…</p>
              </div>
            )}

            {txStatus === 'confirmed' && (
              <div className="space-y-2">
                <p className="text-green-400 font-semibold">✓ Transaction confirmed</p>
                {txHash && (
                  <a
                    href={`https://portal.qfnetwork.xyz/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-500 hover:text-cyan-400 transition-colors block"
                  >
                    View on explorer ↗
                  </a>
                )}
              </div>
            )}

            {txStatus === 'failed' && (
              <div className="space-y-3">
                <p className="text-red-400 text-sm">Transaction failed</p>
                <button
                  onClick={dismissFailed}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
