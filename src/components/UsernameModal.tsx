'use client'

/**
 * UsernameModal.tsx
 *
 * Glass-morphism modal for registering or changing a username.
 * Shown automatically on first wallet connect (if no username),
 * or opened manually via the "Set Username" / "Edit Username" button.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  validateFormat,
  checkAvailability,
  registerUsername,
  formatCooldown,
  nextChangeDate,
} from '../lib/usernameService'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UsernameModalProps {
  isOpen:          boolean
  currentUsername: string | null   // null = first time
  canChange:       boolean
  cooldownSecs:    number
  onSuccess:       (username: string) => void
  onClose:         () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UsernameModal({
  isOpen,
  currentUsername,
  canChange,
  cooldownSecs,
  onSuccess,
  onClose,
}: UsernameModalProps) {
  const [value,       setValue]       = useState('')
  const [status,      setStatus]      = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [statusMsg,   setStatusMsg]   = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [txError,     setTxError]     = useState('')
  const [success,     setSuccess]     = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef    = useRef<HTMLInputElement>(null)

  const isChanging = currentUsername !== null
  const title      = isChanging ? 'Change Username' : 'Set Your Username'
  const submitLabel = isChanging ? 'Update Username' : 'Register Username'

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setValue('')
      setStatus('idle')
      setStatusMsg('')
      setTxError('')
      setSuccess(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Debounced availability check
  const checkInput = useCallback(async (input: string) => {
    if (!input) {
      setStatus('idle')
      setStatusMsg('')
      return
    }

    const validation = validateFormat(input)
    if (!validation.valid) {
      setStatus('invalid')
      setStatusMsg(validation.error ?? 'Invalid username')
      return
    }

    // Skip availability check if unchanged
    if (isChanging && input.toLowerCase() === currentUsername?.toLowerCase()) {
      setStatus('available')
      setStatusMsg('This is your current username')
      return
    }

    setStatus('checking')
    setStatusMsg('Checking availability…')

    try {
      const available = await checkAvailability(input)
      if (available) {
        setStatus('available')
        setStatusMsg('Available ✓')
      } else {
        setStatus('taken')
        setStatusMsg('This username is already taken')
      }
    } catch {
      setStatus('idle')
      setStatusMsg('')
    }
  }, [isChanging, currentUsername])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setValue(raw)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => checkInput(raw), 350)
  }

  const handleSubmit = async () => {
    if (status !== 'available') return
    if (submitting) return

    setSubmitting(true)
    setTxError('')

    try {
      await registerUsername(value)
      setSuccess(true)
      setTimeout(() => {
        onSuccess(value)
        onClose()
      }, 1800)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)

      if (msg.includes('cooldown')) {
        setTxError(`You can change your username again in ${formatCooldown(cooldownSecs)}`)
      } else if (msg.includes('already taken')) {
        setTxError('This username is already taken')
      } else if (msg.includes('rejected') || msg.includes('denied') || msg.includes('user rejected')) {
        setTxError('Transaction rejected. Please try again.')
      } else {
        setTxError('Failed to register username. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onClose()
  }

  if (!isOpen) return null
  if (typeof document === 'undefined') return null

  const canSubmit = status === 'available' && !submitting && (!isChanging || canChange)

  // Status indicator color / icon
  const statusColor =
    status === 'available' ? '#10b981' :
    status === 'taken'     ? '#ef4444' :
    status === 'invalid'   ? '#f59e0b' :
    status === 'checking'  ? '#94a3b8' :
    'transparent'

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:   'fixed',
          inset:      0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(6px)',
          zIndex:     1000,
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflowY:  'auto',
          padding:    '24px 16px',
        }}
      >
        {/* Modal */}
        <div
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
          style={{
            width:        '100%',
            maxWidth:     '440px',
            margin:       'auto',
            background:   'rgba(15, 23, 42, 0.92)',
            border:       '1px solid rgba(6, 182, 212, 0.25)',
            borderRadius: '20px',
            padding:      '32px',
            boxShadow:    '0 0 60px rgba(6, 182, 212, 0.15), 0 24px 48px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(20px)',
            position:     'relative',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position:   'absolute',
              top:        '16px',
              right:      '16px',
              background: 'rgba(255,255,255,0.06)',
              border:     '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              color:      '#94a3b8',
              width:      '30px',
              height:     '30px',
              cursor:     'pointer',
              fontSize:   '16px',
              display:    'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>

          {/* ── Header ───────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: '24px' }}>
            {/* Icon */}
            <div style={{
              width:        '48px',
              height:       '48px',
              borderRadius: '14px',
              background:   'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(59,130,246,0.2))',
              border:       '1px solid rgba(6,182,212,0.3)',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              fontSize:     '22px',
              marginBottom: '16px',
            }}>
              @
            </div>

            <h2 style={{
              margin:     0,
              color:      '#f1f5f9',
              fontSize:   '20px',
              fontWeight: 700,
              marginBottom: '6px',
            }}>
              {title}
            </h2>

            <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
              {isChanging
                ? 'Choose a new username. You can change it once every 30 days.'
                : 'Claim your unique identity on QF DappStore.'}
            </p>
          </div>

          {/* ── Cooldown Warning ─────────────────────────────────────────────── */}
          {isChanging && !canChange && (
            <div style={{
              background:   'rgba(245, 158, 11, 0.1)',
              border:       '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '10px',
              padding:      '12px 14px',
              marginBottom: '20px',
              color:        '#fbbf24',
              fontSize:     '13px',
            }}>
              ⏳ You can change your username again on{' '}
              <strong>{nextChangeDate(cooldownSecs)}</strong>{' '}
              ({formatCooldown(cooldownSecs)} remaining)
            </div>
          )}

          {/* ── Success Screen ───────────────────────────────────────────────── */}
          {success ? (
            <div style={{
              textAlign:  'center',
              padding:    '24px 0',
              animation:  'fadeIn 0.3s ease',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
              <p style={{ color: '#10b981', fontWeight: 700, fontSize: '18px', margin: '0 0 6px' }}>
                Welcome, @{value}!
              </p>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
                Your username has been registered on-chain.
              </p>
            </div>
          ) : (
            <>
              {/* ── Input ──────────────────────────────────────────────────────── */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display:      'block',
                  color:        '#cbd5e1',
                  fontSize:     '13px',
                  fontWeight:   600,
                  marginBottom: '8px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}>
                  Username
                </label>

                <div style={{ position: 'relative' }}>
                  {/* @ prefix */}
                  <span style={{
                    position:   'absolute',
                    left:       '14px',
                    top:        '50%',
                    transform:  'translateY(-50%)',
                    color:      '#06b6d4',
                    fontWeight: 700,
                    fontSize:   '16px',
                    pointerEvents: 'none',
                  }}>
                    @
                  </span>

                  <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleChange}
                    disabled={submitting || (isChanging && !canChange)}
                    maxLength={20}
                    placeholder="YourUsername"
                    style={{
                      width:        '100%',
                      boxSizing:    'border-box',
                      padding:      '12px 44px 12px 32px',
                      borderRadius: '10px',
                      border:       `1px solid ${
                        status === 'available' ? 'rgba(16,185,129,0.5)' :
                        status === 'taken'     ? 'rgba(239,68,68,0.5)'  :
                        status === 'invalid'   ? 'rgba(245,158,11,0.5)' :
                        'rgba(255,255,255,0.12)'
                      }`,
                      background:   'rgba(255,255,255,0.04)',
                      color:        '#f1f5f9',
                      fontSize:     '15px',
                      outline:      'none',
                      transition:   'border-color 0.2s',
                    }}
                  />

                  {/* Status dot */}
                  {status !== 'idle' && (
                    <span style={{
                      position:    'absolute',
                      right:       '14px',
                      top:         '50%',
                      transform:   'translateY(-50%)',
                      width:       '8px',
                      height:      '8px',
                      borderRadius:'50%',
                      background:  statusColor,
                      boxShadow:   `0 0 6px ${statusColor}`,
                      transition:  'all 0.2s',
                    }} />
                  )}
                </div>

                {/* Character count + status message */}
                <div style={{
                  display:        'flex',
                  justifyContent: 'space-between',
                  marginTop:      '6px',
                }}>
                  <span style={{
                    fontSize: '12px',
                    color:    statusColor !== 'transparent' ? statusColor : '#64748b',
                    transition: 'color 0.2s',
                  }}>
                    {statusMsg || 'Letters, numbers and underscore only'}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    color: value.length > 20 ? '#ef4444' : '#64748b',
                  }}>
                    {value.length}/20
                  </span>
                </div>
              </div>

              {/* ── Preview ──────────────────────────────────────────────────── */}
              {value && status !== 'invalid' && (
                <div style={{
                  background:   'rgba(6,182,212,0.06)',
                  border:       '1px solid rgba(6,182,212,0.15)',
                  borderRadius: '10px',
                  padding:      '10px 14px',
                  marginBottom: '20px',
                  color:        '#94a3b8',
                  fontSize:     '13px',
                }}>
                  You will be known as:{' '}
                  <strong style={{ color: '#06b6d4' }}>@{value}</strong>
                </div>
              )}

              {/* ── Transaction Error ─────────────────────────────────────────── */}
              {txError && (
                <div style={{
                  background:   'rgba(239,68,68,0.1)',
                  border:       '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '10px',
                  padding:      '10px 14px',
                  marginBottom: '16px',
                  color:        '#fca5a5',
                  fontSize:     '13px',
                }}>
                  {txError}
                </div>
              )}

              {/* ── Rules ────────────────────────────────────────────────────── */}
              <div style={{
                background:   'rgba(255,255,255,0.02)',
                borderRadius: '8px',
                padding:      '10px 12px',
                marginBottom: '20px',
                fontSize:     '12px',
                color:        '#64748b',
                lineHeight:   '1.7',
              }}>
                <div>• 3–20 characters</div>
                <div>• Letters (a–z), numbers (0–9), underscores (_)</div>
                <div>• Case-insensitive uniqueness (John = john)</div>
                <div>• One change per 30 days after registration</div>
              </div>

              {/* ── Buttons ──────────────────────────────────────────────────── */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  style={{
                    flex:         1,
                    padding:      '12px',
                    borderRadius: '10px',
                    border:       'none',
                    background:   canSubmit
                      ? 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)'
                      : 'rgba(255,255,255,0.06)',
                    color:        canSubmit ? '#fff' : '#475569',
                    fontSize:     '14px',
                    fontWeight:   600,
                    cursor:       canSubmit ? 'pointer' : 'not-allowed',
                    transition:   'all 0.2s',
                    boxShadow:    canSubmit ? '0 0 20px rgba(6,182,212,0.3)' : 'none',
                    letterSpacing:'0.02em',
                  }}
                >
                  {submitting ? 'Confirming…' : submitLabel}
                </button>

                {!isChanging && (
                  <button
                    onClick={onClose}
                    style={{
                      padding:      '12px 16px',
                      borderRadius: '10px',
                      border:       '1px solid rgba(255,255,255,0.1)',
                      background:   'rgba(255,255,255,0.04)',
                      color:        '#94a3b8',
                      fontSize:     '13px',
                      cursor:       'pointer',
                      transition:   'all 0.2s',
                      whiteSpace:   'nowrap',
                    }}
                  >
                    Skip for now
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>,
    document.body
  )
}
