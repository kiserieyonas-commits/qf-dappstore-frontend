'use client'

/**
 * useUsername.ts
 *
 * React hooks for username management.
 * Mirrors the pattern of existing hooks in this project.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getUsername,
  canChangeUsername,
  cooldownRemaining,
  invalidateCache,
  nextChangeDate,
} from '../lib/usernameService'

// ─── useUsername ──────────────────────────────────────────────────────────────

interface UseUsernameResult {
  username:  string | null
  loading:   boolean
  error:     string | null
  refresh:   () => void
}

/**
 * Fetch and cache the username for any wallet address.
 */
export function useUsername(address?: string | null): UseUsernameResult {
  const [username, setUsername] = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // track the address the last fetch was for to avoid stale sets
  const fetchedFor = useRef<string | null>(null)

  const fetch = useCallback(async () => {
    if (!address) {
      setUsername(null)
      setLoading(false)
      setError(null)
      return
    }

    const key = address.toLowerCase()
    fetchedFor.current = key
    setLoading(true)
    setError(null)

    try {
      const result = await getUsername(address)
      // Only update state if this is still the address we care about
      if (fetchedFor.current === key) {
        setUsername(result)
      }
    } catch (err) {
      if (fetchedFor.current === key) {
        setError(err instanceof Error ? err.message : 'Failed to fetch username')
      }
    } finally {
      if (fetchedFor.current === key) {
        setLoading(false)
      }
    }
  }, [address])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { username, loading, error, refresh: fetch }
}

// ─── useCurrentUserUsername ───────────────────────────────────────────────────

interface UseCurrentUserUsernameResult {
  username:       string | null
  loading:        boolean
  error:          string | null
  isRegistered:   boolean
  canChange:      boolean
  cooldownSecs:   number
  nextChangeOn:   string        // "now" or "Mar 15, 2026"
  refresh:        () => void
  invalidate:     () => void
}

/**
 * Gets username and change-eligibility for the currently connected wallet.
 * Reads address from window.ethereum.
 */
export function useCurrentUserUsername(): UseCurrentUserUsernameResult {
  const [address,      setAddress]      = useState<string | null>(null)
  const [username,     setUsername]     = useState<string | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [canChange,    setCanChange]    = useState(true)
  const [cooldownSecs, setCooldownSecs] = useState(0)

  // Detect connected wallet
  useEffect(() => {
    const eth = (window as Window & { ethereum?: { request: (a: { method: string }) => Promise<unknown>; on: (e: string, cb: (...a: unknown[]) => void) => void; removeListener: (e: string, cb: (...a: unknown[]) => void) => void } }).ethereum
    if (!eth) return

    const handleAccounts = (accounts: unknown) => {
      const accs = accounts as string[]
      setAddress(accs.length > 0 ? accs[0].toLowerCase() : null)
    }

    eth.request({ method: 'eth_accounts' })
      .then(handleAccounts)
      .catch(() => {})

    eth.on('accountsChanged', handleAccounts)
    return () => eth.removeListener('accountsChanged', handleAccounts)
  }, [])

  const load = useCallback(async () => {
    if (!address) {
      setUsername(null)
      setCanChange(true)
      setCooldownSecs(0)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [uname, canChg, secs] = await Promise.all([
        getUsername(address),
        canChangeUsername(address),
        cooldownRemaining(address),
      ])
      setUsername(uname)
      setCanChange(canChg)
      setCooldownSecs(Number(secs))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load username')
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    load()
  }, [load])

  const invalidate = useCallback(() => {
    if (address) invalidateCache(address)
    load()
  }, [address, load])

  return {
    username,
    loading,
    error,
    isRegistered: username !== null,
    canChange,
    cooldownSecs,
    nextChangeOn: nextChangeDate(cooldownSecs),
    refresh: load,
    invalidate,
  }
}
