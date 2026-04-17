'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import DappRunner from '../../../../components/DappRunner'
import { getDappById } from '../../../../lib/api'

interface Dapp {
  id:            string | number
  dappId?:       number
  name:          string
  dappUrl?:      string
  builder?:      string
  ownerWallet?:  string
  launchMode?:   'iframe' | 'popup'
  listingStatus?: 'pending' | 'live'
}

export default function RunPage() {
  const params              = useParams<{ id: string }>()
  const [dapp, setDapp]     = useState<Dapp | null>(null)
  const [error, setError]   = useState(false)
  const [opened, setOpened] = useState(false)

  useEffect(() => {
    getDappById(params.id)
      .then((data: Dapp) => {
        const resolved = (data as { dapp?: Dapp }).dapp ?? data
        if (!resolved.dappUrl) { setError(true); return }
        setDapp(resolved)
      })
      .catch(() => setError(true))
  }, [params.id])

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-red-400 font-semibold">dApp not available</p>
          <p className="text-gray-500 text-sm">This dApp has no launch URL configured.</p>
        </div>
      </div>
    )
  }

  if (!dapp) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    )
  }

  // Popup-mode dApps (backend dApps with SDK) open in a new window
  if (dapp.launchMode === 'popup') {
    const launch = () => {
      window.open(dapp.dappUrl, '_blank', 'noopener,noreferrer')
      setOpened(true)
    }

    return (
      <div className="min-h-screen bg-[#0a0e1a] text-white flex items-center justify-center">
        <div className="text-center space-y-5 max-w-md px-6">
          <div className="text-4xl">🚀</div>
          <h2 className="text-xl font-bold">{dapp.name}</h2>
          <p className="text-gray-400 text-sm">
            This dApp runs outside the DappStore iframe. Fees are collected via the QF DappStore SDK installed in the dApp.
          </p>
          <button
            onClick={launch}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-[#0a0e1a] px-8 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
          >
            Launch {dapp.name}
          </button>
          {opened && (
            <p className="text-green-400 text-sm">Opened in a new tab.</p>
          )}
          <button
            onClick={() => window.history.back()}
            className="block text-cyan-400 hover:text-cyan-300 text-sm mx-auto"
          >
            ← Back to DappStore
          </button>
        </div>
      </div>
    )
  }

  // iframe mode (default) — route fees through DappProxy
  const onChainDappId = dapp.dappId ?? Number(params.id)

  return (
    <DappRunner
      dappId={onChainDappId}
      dappUrl={dapp.dappUrl!}
      dappName={dapp.name}
    />
  )
}
