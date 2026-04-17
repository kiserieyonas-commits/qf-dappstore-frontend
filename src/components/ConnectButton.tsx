'use client'

import { useState, useEffect } from 'react'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useAccount, useDisconnect } from 'wagmi'
import UsernameModal from './UsernameModal'
import { useCurrentUserUsername } from '../hooks/useUsername'

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function ConnectButton() {
  const { open }       = useWeb3Modal()
  const { address, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()

  const [modalOpen,      setModalOpen]      = useState(false)
  const [modalTriggered, setModalTriggered] = useState(false)

  const {
    username,
    isRegistered,
    canChange,
    cooldownSecs,
    invalidate: invalidateUsername,
  } = useCurrentUserUsername()

  // Reset username prompt trigger when wallet disconnects
  useEffect(() => {
    if (!isConnected) setModalTriggered(false)
  }, [isConnected])

  // Auto-prompt for username on first connect
  useEffect(() => {
    if (address && isConnected && !isRegistered && !modalTriggered && username === null) {
      const timer = setTimeout(() => {
        setModalOpen(true)
        setModalTriggered(true)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [address, isConnected, isRegistered, modalTriggered, username])

  const handleUsernameSuccess = (newUsername: string) => {
    invalidateUsername()
    setModalOpen(false)
    window.dispatchEvent(new CustomEvent('usernameRegistered', { detail: { username: newUsername } }))
  }

  const expectedChainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? '31337', 10)
  const isOnCorrectNetwork = chain?.id === expectedChainId

  if (isConnected && address) {
    return (
      <>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 14px',
            borderRadius: '12px',
            background: 'rgba(6, 182, 212, 0.08)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 0 16px rgba(6, 182, 212, 0.12)',
          }}
        >
          {/* Network indicator — click to switch */}
          <span
            onClick={() => open({ view: 'Networks' })}
            title={isOnCorrectNetwork ? chain?.name ?? 'Connected' : 'Wrong network — click to switch'}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isOnCorrectNetwork ? '#06b6d4' : '#f59e0b',
              boxShadow: isOnCorrectNetwork ? '0 0 6px #06b6d4' : '0 0 6px #f59e0b',
              flexShrink: 0,
              cursor: 'pointer',
            }}
          />

          {/* Username or address */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {username ? (
              <span
                style={{
                  color: '#06b6d4',
                  fontWeight: 700,
                  fontSize: '13px',
                  letterSpacing: '0.02em',
                }}
              >
                @{username}
              </span>
            ) : null}
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: username ? '11px' : '13px',
                color: username ? '#64748b' : '#e2e8f0',
                letterSpacing: '0.03em',
              }}
            >
              {shortenAddress(address)}
            </span>
          </div>

          {/* Set/Edit username */}
          <button
            onClick={() => setModalOpen(true)}
            title={username ? 'Edit username' : 'Set username'}
            style={{
              padding: '3px 8px',
              borderRadius: '7px',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              background: 'rgba(6, 182, 212, 0.08)',
              color: '#67e8f9',
              fontSize: '11px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(6, 182, 212, 0.2)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(6, 182, 212, 0.08)' }}
          >
            {username ? '✎ Edit' : '@ Set'}
          </button>

          {/* Disconnect */}
          <button
            onClick={() => disconnect()}
            style={{
              padding: '3px 10px',
              borderRadius: '7px',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#fca5a5',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.7)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)'
            }}
          >
            Disconnect
          </button>
        </div>

        <UsernameModal
          isOpen={modalOpen}
          currentUsername={username}
          canChange={canChange}
          cooldownSecs={cooldownSecs}
          onSuccess={handleUsernameSuccess}
          onClose={() => setModalOpen(false)}
        />
      </>
    )
  }

  return (
    <button
      onClick={() => open()}
      style={{
        padding: '9px 20px',
        borderRadius: '10px',
        border: 'none',
        background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
        color: '#fff',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        letterSpacing: '0.02em',
        transition: 'all 0.2s ease',
        boxShadow: '0 0 20px rgba(6, 182, 212, 0.35)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 0 30px rgba(6, 182, 212, 0.6)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 0 20px rgba(6, 182, 212, 0.35)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      Connect Wallet
    </button>
  )
}
