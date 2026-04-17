'use client'

/**
 * UserDisplay.tsx
 *
 * Reusable component to display a user as @username or shortened address.
 * Fetches username lazily, shows tooltip with full address on hover.
 */

import { useState } from 'react'
import { useUsername } from '../hooks/useUsername'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserDisplayProps {
  address:      string
  showAddress?: boolean   // always show address below username
  size?:        'sm' | 'md' | 'lg'
  clickable?:   boolean   // wraps in an <a> to /profile/[address]
  className?:   string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

const SIZES = {
  sm: { font: '12px', badge: '10px', gap: '4px' },
  md: { font: '14px', badge: '11px', gap: '5px' },
  lg: { font: '17px', badge: '13px', gap: '6px' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UserDisplay({
  address,
  showAddress = false,
  size        = 'md',
  clickable   = false,
}: UserDisplayProps) {
  const { username, loading } = useUsername(address)
  const [hovered, setHovered] = useState(false)
  const sz = SIZES[size]

  const inner = (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:    'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap:        '1px',
        position:   'relative',
        cursor:     clickable ? 'pointer' : 'default',
      }}
    >
      {/* Main display */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: sz.gap }}>
        {loading ? (
          <span style={{
            color:      '#475569',
            fontSize:   sz.font,
            fontFamily: 'monospace',
            opacity:    0.6,
          }}>
            {shortAddr(address)}
          </span>
        ) : username ? (
          <>
            <span style={{
              color:      '#06b6d4',
              fontWeight: 700,
              fontSize:   sz.font,
            }}>
              @{username}
            </span>
            {/* Verified badge */}
            <span
              title="Registered username"
              style={{
                display:      'inline-flex',
                alignItems:   'center',
                justifyContent: 'center',
                width:        sz.badge,
                height:       sz.badge,
                borderRadius: '50%',
                background:   'rgba(6,182,212,0.2)',
                border:       '1px solid rgba(6,182,212,0.5)',
                color:        '#06b6d4',
                fontSize:     `calc(${sz.badge} - 2px)`,
                flexShrink:   0,
              }}
            >
              ✓
            </span>
          </>
        ) : (
          <span style={{
            color:      '#94a3b8',
            fontSize:   sz.font,
            fontFamily: 'monospace',
          }}>
            {shortAddr(address)}
          </span>
        )}
      </span>

      {/* Secondary address line */}
      {showAddress && username && (
        <span style={{
          color:      '#475569',
          fontSize:   `calc(${sz.font} - 2px)`,
          fontFamily: 'monospace',
        }}>
          {shortAddr(address)}
        </span>
      )}

      {/* Hover tooltip: full address */}
      {hovered && (
        <span style={{
          position:     'absolute',
          bottom:       'calc(100% + 6px)',
          left:         '50%',
          transform:    'translateX(-50%)',
          background:   'rgba(15,23,42,0.95)',
          border:       '1px solid rgba(6,182,212,0.2)',
          borderRadius: '8px',
          padding:      '5px 10px',
          fontSize:     '11px',
          fontFamily:   'monospace',
          color:        '#94a3b8',
          whiteSpace:   'nowrap',
          zIndex:       50,
          pointerEvents:'none',
          boxShadow:    '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          {address}
        </span>
      )}
    </span>
  )

  if (clickable) {
    return (
      <a
        href={`/profile/${address}`}
        style={{ textDecoration: 'none' }}
      >
        {inner}
      </a>
    )
  }

  return inner
}
