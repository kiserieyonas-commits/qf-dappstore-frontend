'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { connectUser } from '../lib/api'

// ─── Context ─────────────────────────────────────────────────────────────────

const UserContext = createContext({
  user:          null,
  isRegistering: false,
  error:         null,
  refetch:       async () => {},
})

// ─── Provider ─────────────────────────────────────────────────────────────────

export function UserProvider({ children }) {
  const { address, isConnected } = useAccount()

  const [user,          setUser]          = useState(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [error,         setError]         = useState(null)

  const register = useCallback(async (walletAddress) => {
    setIsRegistering(true)
    setError(null)
    try {
      const data = await connectUser(walletAddress)
      setUser(data.user)
    } catch (err) {
      // Log the error but do NOT block the wallet connection flow
      console.warn('[UserContext] backend registration failed:', err.message)
      setError(err.message)
    } finally {
      setIsRegistering(false)
    }
  }, [])

  useEffect(() => {
    if (isConnected && address) {
      register(address)
    } else {
      // Wallet disconnected — clear local user state
      setUser(null)
      setError(null)
    }
  }, [isConnected, address, register])

  return (
    <UserContext.Provider value={{ user, isRegistering, error, refetch: () => register(address) }}>
      {children}
    </UserContext.Provider>
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export function useUser() {
  return useContext(UserContext)
}
