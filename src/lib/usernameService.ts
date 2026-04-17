/**
 * usernameService.ts
 *
 * Client-side service for the UsernameRegistryMini smart contract + backend API.
 *
 * Deployed contract (0xe20a5602cc82c15b2ef822a09243056ea199ce81):
 *   function registerUsername(bytes32 username) external
 *   function getUsername(address wallet) view returns (bytes32)
 *   function getAddress(bytes32 username) view returns (address)
 */

import { BrowserProvider, Contract, ethers } from 'ethers'

// ─── ABI (UsernameRegistryMini) ───────────────────────────────────────────────

const USERNAME_REGISTRY_ABI = [
  'function registerUsername(bytes32 username) external',
  'function releaseUsername() external',
  'function getUsername(address wallet) view returns (bytes32)',
  'function getAddress(bytes32 username) view returns (address)',
]

// ─── Config ───────────────────────────────────────────────────────────────────

const REGISTRY_ADDRESS =
  process.env.NEXT_PUBLIC_USERNAME_REGISTRY_ADDRESS ?? ''

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateFormat(username: string): ValidationResult {
  if (!username || username.trim() === '') {
    return { valid: false, error: 'Username is required' }
  }
  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' }
  }
  if (username.length > 20) {
    return { valid: false, error: 'Username must be 20 characters or fewer' }
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return {
      valid: false,
      error: 'Username may only contain letters, numbers, and underscores',
    }
  }
  return { valid: true }
}

// ─── Encoding ─────────────────────────────────────────────────────────────────

/** Converts a username string to right-padded bytes32. */
function usernameToBytes32(username: string): string {
  return ethers.encodeBytes32String(username.toLowerCase())
}

// ─── In-memory cache ──────────────────────────────────────────────────────────

const usernameCache = new Map<string, string | null>()  // address → username
const reverseCache  = new Map<string, string>()          // lowercase username → address

// ─── Contract helper ──────────────────────────────────────────────────────────

async function getWriteContract(): Promise<Contract> {
  if (!REGISTRY_ADDRESS) throw new Error('USERNAME_REGISTRY_ADDRESS not configured')
  const eth = (window as Window & { ethereum?: unknown }).ethereum
  if (!eth) throw new Error('No Ethereum provider found')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const provider = new BrowserProvider(eth as any)
  const signer   = await provider.getSigner()
  return new Contract(REGISTRY_ADDRESS, USERNAME_REGISTRY_ABI, signer)
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Get username for a wallet address.
 * Reads from cache → backend API.
 */
export async function getUsername(address: string): Promise<string | null> {
  const key = address.toLowerCase()

  if (usernameCache.has(key)) {
    return usernameCache.get(key) ?? null
  }

  try {
    const res = await fetch(`${API_BASE}/api/users/username/by-address/${key}`)
    if (res.ok) {
      const data = await res.json()
      const username = data.username ?? null
      usernameCache.set(key, username)
      if (username) reverseCache.set(username.toLowerCase(), key)
      return username
    }
  } catch { /* ignore */ }

  return null
}

/**
 * Check if a username is available — asks the backend.
 */
export async function checkAvailability(username: string): Promise<boolean> {
  const validation = validateFormat(username)
  if (!validation.valid) return false

  try {
    const res = await fetch(
      `${API_BASE}/api/users/username/${encodeURIComponent(username)}/available`
    )
    if (res.ok) {
      const data = await res.json()
      return data.available === true
    }
  } catch { /* ignore */ }

  return false
}

/**
 * Always returns true — no cooldown in the minimal deployed contract.
 */
export async function canChangeUsername(_address: string): Promise<boolean> {
  return true
}

/**
 * Always returns 0 — no cooldown in the minimal deployed contract.
 */
export async function cooldownRemaining(_address: string): Promise<number> {
  return 0
}

/**
 * Register a username on-chain and sync to backend.
 * Username is encoded as bytes32 (lowercase, right-padded).
 */
export async function registerUsername(username: string): Promise<string> {
  const validation = validateFormat(username)
  if (!validation.valid) throw new Error(validation.error)

  const contract = await getWriteContract()
  const nameBytes32 = usernameToBytes32(username)

  const tx = await contract.registerUsername(nameBytes32)
  const receipt = await tx.wait()
  const txHash: string = receipt.hash

  // Sync to backend
  try {
    const eth      = (window as Window & { ethereum?: unknown }).ethereum
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provider = new BrowserProvider(eth as any)
    const signer   = await provider.getSigner()
    const address  = (await signer.getAddress()).toLowerCase()

    await fetch(`${API_BASE}/api/users/username`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ address, username, txHash }),
    })

    usernameCache.set(address, username)
    reverseCache.set(username.toLowerCase(), address)
  } catch { /* best-effort */ }

  return txHash
}

/**
 * Purge cached entry for an address (call after username change).
 */
export function invalidateCache(address: string): void {
  const key = address.toLowerCase()
  const existing = usernameCache.get(key)
  if (existing) reverseCache.delete(existing.toLowerCase())
  usernameCache.delete(key)
}

/**
 * Format cooldown seconds into a human-readable string.
 */
export function formatCooldown(seconds: number): string {
  if (seconds <= 0) return 'now'
  const days    = Math.floor(seconds / 86400)
  const hours   = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (days    > 0) parts.push(`${days}d`)
  if (hours   > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  return parts.join(' ') || '< 1m'
}

export function nextChangeDate(seconds: number): string {
  if (seconds <= 0) return 'now'
  const d = new Date(Date.now() + seconds * 1000)
  return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}
