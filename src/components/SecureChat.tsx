'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ethers } from 'ethers'
import {
  sendMessage,
  getConversation,
  getConversationList,
  getAllTokenPrices,
  calculateCostInToken,
  NATIVE_TOKEN,
  type ChatMessage,
  type TokenPrice,
  type ConversationSummary,
} from '../lib/chatService'
import { useUsername } from '../hooks/useUsername'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// Tiny sub-component: resolves and displays @username or short address for a peer
function PeerLabel({ address, style }: { address: string; style?: React.CSSProperties }) {
  const { username } = useUsername(address)
  if (username) {
    return (
      <span style={{ color: '#06b6d4', fontWeight: 700, ...style }}>
        @{username}
      </span>
    )
  }
  return (
    <span style={{ color: '#e2e8f0', fontFamily: 'monospace', ...style }}>
      {shortAddr(address)}
    </span>
  )
}

function fmtTime(unixSec: number) {
  const d = new Date(unixSec * 1000)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MessageBubble({ msg, myAddress }: { msg: ChatMessage; myAddress: string }) {
  const isMine = msg.sender.toLowerCase() === myAddress.toLowerCase()
  return (
    <div
      style={{
        display:       'flex',
        justifyContent: isMine ? 'flex-end' : 'flex-start',
        marginBottom:  '8px',
      }}
    >
      <div
        style={{
          maxWidth:     '72%',
          padding:      '10px 14px',
          borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background:   isMine
            ? 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)'
            : 'rgba(255,255,255,0.07)',
          border:   isMine ? 'none' : '1px solid rgba(255,255,255,0.1)',
          color:    '#fff',
          fontSize: '14px',
          lineHeight: '1.5',
          wordBreak: 'break-word',
        }}
      >
        <div>{msg.content}</div>
        <div
          style={{
            fontSize:  '10px',
            opacity:   0.6,
            marginTop: '4px',
            textAlign: 'right',
          }}
        >
          {fmtTime(msg.timestamp)}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SecureChat() {
  const [isOpen,       setIsOpen]       = useState(false)
  const [myAddress,    setMyAddress]    = useState<string | null>(null)

  // Conversations
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activePeer,    setActivePeer]    = useState<string | null>(null)
  const [messages,      setMessages]      = useState<ChatMessage[]>([])

  // New chat
  const [newPeerInput, setNewPeerInput] = useState('')
  const [newPeerError, setNewPeerError] = useState('')

  // Compose
  const [draft,        setDraft]        = useState('')
  const [selectedToken, setSelectedToken] = useState(NATIVE_TOKEN)
  const [tokenPrices,  setTokenPrices]  = useState<TokenPrice[]>([])
  const [sending,      setSending]      = useState(false)
  const [sendError,    setSendError]    = useState('')
  const [sendSuccess,  setSendSuccess]  = useState(false)

  // UI
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ── Get connected address ──────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return

    const eth = window.ethereum as {
      request: (a: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (e: string, cb: (...a: unknown[]) => void) => void
      removeListener: (e: string, cb: (...a: unknown[]) => void) => void
    }

    eth.request({ method: 'eth_accounts' })
      .then((accounts) => {
        const accs = accounts as string[]
        if (accs.length) setMyAddress(accs[0].toLowerCase())
      })
      .catch(() => {})

    const handleAccountsChanged = (accounts: unknown) => {
      const accs = accounts as string[]
      setMyAddress(accs.length ? accs[0].toLowerCase() : null)
    }
    eth.on('accountsChanged', handleAccountsChanged)
    return () => eth.removeListener('accountsChanged', handleAccountsChanged)
  }, [])

  // ── Load token prices ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    getAllTokenPrices()
      .then(setTokenPrices)
      .catch(() => {
        // Fallback: static price for local testing
        setTokenPrices([{
          address:        NATIVE_TOKEN,
          symbol:         'QF',
          priceUSD:       1.00,
          messageCostUSD: 0.01,
          costInToken:    0.01,
          costInWei:      '10000000000000000',
        }])
      })
  }, [isOpen])

  // ── Load conversation list ─────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!myAddress) return
    const list = await getConversationList(myAddress)
    setConversations(list)
  }, [myAddress])

  useEffect(() => {
    if (isOpen && myAddress) loadConversations()
  }, [isOpen, myAddress, loadConversations])

  // ── Load active conversation ───────────────────────────────────────────────
  useEffect(() => {
    if (!activePeer || !myAddress) return
    setLoadingMsgs(true)
    getConversation(myAddress, activePeer)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoadingMsgs(false))
  }, [activePeer, myAddress])

  // ── Poll for new messages every 10 s ──────────────────────────────────────
  useEffect(() => {
    if (!activePeer || !myAddress) return
    const interval = setInterval(() => {
      getConversation(myAddress, activePeer)
        .then(setMessages)
        .catch(() => {})
    }, 10_000)
    return () => clearInterval(interval)
  }, [activePeer, myAddress])

  // ── Scroll to bottom when messages change ─────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Derived: selected token info ──────────────────────────────────────────
  const selectedTokenInfo = tokenPrices.find(
    (t) => t.address.toLowerCase() === selectedToken.toLowerCase()
  ) ?? tokenPrices[0]

  // ── Open new conversation ──────────────────────────────────────────────────
  const startNewChat = () => {
    const addr = newPeerInput.trim()
    if (!ethers.isAddress(addr)) {
      setNewPeerError('Please enter a valid Ethereum address (0x…)')
      return
    }
    if (addr.toLowerCase() === myAddress?.toLowerCase()) {
      setNewPeerError('You cannot message yourself')
      return
    }
    setNewPeerError('')
    setNewPeerInput('')
    setActivePeer(addr.toLowerCase())
    setMessages([])
  }

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!draft.trim() || !activePeer || !myAddress) return
    setSending(true)
    setSendError('')
    setSendSuccess(false)

    try {
      await sendMessage(activePeer, draft.trim(), selectedToken)

      const updatedMessages = await getConversation(myAddress, activePeer)
      setMessages(updatedMessages)
      setDraft('')
      setSendSuccess(true)
      setTimeout(() => setSendSuccess(false), 2000)
      loadConversations()
    } catch (err: unknown) {
      const error = err as { code?: number; message?: string }
      if (error?.code === 4001) {
        setSendError('Transaction cancelled')
      } else if (error?.message?.includes('Insufficient')) {
        const costStr = selectedTokenInfo
          ? `${selectedTokenInfo.costInToken.toFixed(4)} ${selectedTokenInfo.symbol}`
          : 'enough tokens'
        setSendError(`Insufficient balance. Need ${costStr} to send.`)
      } else {
        setSendError(error?.message ?? 'Transaction failed. Please try again.')
      }
    } finally {
      setSending(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: floating bubble (closed state)
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Secure Chat"
          style={{
            position:     'fixed',
            bottom:       '24px',
            right:        '24px',
            width:        '52px',
            height:       '52px',
            borderRadius: '50%',
            background:   'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            border:       'none',
            cursor:       'pointer',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            boxShadow:    '0 4px 24px rgba(6,182,212,0.5)',
            zIndex:       1000,
            transition:   'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform  = 'scale(1.1)'
            e.currentTarget.style.boxShadow  = '0 6px 32px rgba(6,182,212,0.7)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform  = 'scale(1)'
            e.currentTarget.style.boxShadow  = '0 4px 24px rgba(6,182,212,0.5)'
          }}
        >
          <svg width="24" height="24" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          style={{
            position:    'fixed',
            bottom:      '24px',
            right:       '24px',
            width:       '720px',
            maxWidth:    'calc(100vw - 32px)',
            height:      '580px',
            maxHeight:   'calc(100vh - 48px)',
            borderRadius: '16px',
            background:  'rgba(10, 14, 26, 0.97)',
            border:      '1px solid rgba(6,182,212,0.25)',
            boxShadow:   '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(6,182,212,0.1)',
            backdropFilter: 'blur(20px)',
            display:     'flex',
            flexDirection: 'column',
            zIndex:      1000,
            overflow:    'hidden',
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '14px 18px',
              borderBottom:   '1px solid rgba(6,182,212,0.15)',
              background:     'rgba(6,182,212,0.05)',
              flexShrink:     0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: myAddress ? '#06b6d4' : '#6b7280',
                  boxShadow: myAddress ? '0 0 6px #06b6d4' : 'none',
                }}
              />
              <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '15px' }}>
                Secure Chat
              </span>
              {myAddress && (
                <PeerLabel address={myAddress} style={{ fontSize: '11px' }} />
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none', border: 'none', color: '#94a3b8',
                cursor: 'pointer', fontSize: '18px', lineHeight: 1,
                padding: '4px',
              }}
            >
              ✕
            </button>
          </div>

          {/* ── Body: sidebar + conversation ── */}
          {!myAddress ? (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#64748b', textAlign: 'center', padding: '24px',
            }}>
              <div>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔒</div>
                <div style={{ color: '#94a3b8', marginBottom: '8px' }}>Connect your wallet to use Secure Chat</div>
                <div style={{ fontSize: '12px', color: '#475569' }}>Each message costs $0.01 in QF</div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

              {/* ── Sidebar ── */}
              <div
                style={{
                  width:       '220px',
                  flexShrink:  0,
                  borderRight: '1px solid rgba(6,182,212,0.12)',
                  display:     'flex',
                  flexDirection: 'column',
                  overflow:    'hidden',
                }}
              >
                {/* New chat input */}
                <div style={{ padding: '10px', borderBottom: '1px solid rgba(6,182,212,0.1)' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      value={newPeerInput}
                      onChange={(e) => { setNewPeerInput(e.target.value); setNewPeerError('') }}
                      onKeyDown={(e) => e.key === 'Enter' && startNewChat()}
                      placeholder="0x address…"
                      style={{
                        flex:         1,
                        background:   'rgba(255,255,255,0.05)',
                        border:       newPeerError
                          ? '1px solid rgba(239,68,68,0.5)'
                          : '1px solid rgba(6,182,212,0.2)',
                        borderRadius: '7px',
                        color:        '#e2e8f0',
                        fontSize:     '11px',
                        padding:      '6px 8px',
                        outline:      'none',
                        fontFamily:   'monospace',
                      }}
                    />
                    <button
                      onClick={startNewChat}
                      title="New chat"
                      style={{
                        width:        '28px',
                        height:       '28px',
                        borderRadius: '7px',
                        background:   'rgba(6,182,212,0.15)',
                        border:       '1px solid rgba(6,182,212,0.3)',
                        color:        '#06b6d4',
                        cursor:       'pointer',
                        fontSize:     '18px',
                        lineHeight:   '1',
                        display:      'flex',
                        alignItems:   'center',
                        justifyContent: 'center',
                      }}
                    >
                      +
                    </button>
                  </div>
                  {newPeerError && (
                    <div style={{ color: '#f87171', fontSize: '10px', marginTop: '4px' }}>
                      {newPeerError}
                    </div>
                  )}
                </div>

                {/* Conversation list */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {conversations.length === 0 && (
                    <div style={{ padding: '16px', color: '#475569', fontSize: '12px', textAlign: 'center' }}>
                      No conversations yet.<br />Enter a wallet address above.
                    </div>
                  )}
                  {conversations.map((conv) => (
                    <button
                      key={conv.peer}
                      onClick={() => setActivePeer(conv.peer)}
                      style={{
                        width:     '100%',
                        textAlign: 'left',
                        padding:   '10px 12px',
                        border:    'none',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: activePeer === conv.peer
                          ? 'rgba(6,182,212,0.1)'
                          : 'transparent',
                        cursor:    'pointer',
                        display:   'flex',
                        flexDirection: 'column',
                        gap:       '3px',
                      }}
                    >
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <PeerLabel address={conv.peer} style={{ fontSize: '12px' }} />
                        <span style={{ color: '#475569', fontSize: '10px' }}>
                          {fmtTime(conv.timestamp)}
                        </span>
                      </div>
                      {conv.lastMessage && (
                        <span style={{ color: '#64748b', fontSize: '11px', overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {conv.lastMessage}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Conversation panel ── */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {!activePeer ? (
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#475569', fontSize: '13px',
                  }}>
                    Select or start a conversation
                  </div>
                ) : (
                  <>
                    {/* Conversation header */}
                    <div style={{
                      padding:      '10px 16px',
                      borderBottom: '1px solid rgba(6,182,212,0.1)',
                      display:      'flex',
                      alignItems:   'center',
                      gap:          '8px',
                      flexShrink:   0,
                    }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', color: '#fff', fontWeight: 700,
                      }}>
                        {activePeer.slice(2, 4).toUpperCase()}
                      </div>
                      <div>
                        <PeerLabel address={activePeer} style={{ fontSize: '13px' }} />
                        <div style={{ color: '#475569', fontSize: '10px', fontFamily: 'monospace' }}>
                          {activePeer}
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                      {loadingMsgs ? (
                        <div style={{ color: '#475569', textAlign: 'center', paddingTop: '24px', fontSize: '13px' }}>
                          Loading messages…
                        </div>
                      ) : messages.length === 0 ? (
                        <div style={{ color: '#475569', textAlign: 'center', paddingTop: '24px', fontSize: '13px' }}>
                          No messages yet. Say hello!
                        </div>
                      ) : (
                        messages.map((msg) => (
                          <MessageBubble key={msg.id} msg={msg} myAddress={myAddress} />
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Compose area */}
                    <div style={{
                      padding:    '12px 16px',
                      borderTop:  '1px solid rgba(6,182,212,0.12)',
                      flexShrink: 0,
                      background: 'rgba(0,0,0,0.2)',
                    }}>
                      {/* Token selector + cost display */}
                      <div style={{
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'space-between',
                        marginBottom:   '8px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#64748b', fontSize: '11px' }}>Pay with:</span>
                          {tokenPrices.length > 1 ? (
                            <select
                              value={selectedToken}
                              onChange={(e) => setSelectedToken(e.target.value)}
                              style={{
                                background:   'rgba(6,182,212,0.08)',
                                border:       '1px solid rgba(6,182,212,0.25)',
                                borderRadius: '6px',
                                color:        '#06b6d4',
                                fontSize:     '12px',
                                padding:      '3px 8px',
                                cursor:       'pointer',
                                outline:      'none',
                              }}
                            >
                              {tokenPrices.map((t) => (
                                <option key={t.address} value={t.address}>
                                  {t.symbol}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span style={{
                              color: '#06b6d4', fontSize: '12px',
                              background: 'rgba(6,182,212,0.08)',
                              border: '1px solid rgba(6,182,212,0.25)',
                              borderRadius: '6px', padding: '3px 8px',
                            }}>
                              {tokenPrices[0]?.symbol ?? 'QF'}
                            </span>
                          )}
                        </div>

                        {selectedTokenInfo && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 500 }}>
                              Message cost: <span style={{ color: '#06b6d4' }}>$0.01</span>
                            </div>
                            <div style={{ color: '#64748b', fontSize: '11px' }}>
                              ≈ {calculateCostInToken(0.01, selectedTokenInfo.priceUSD)}{' '}
                              {selectedTokenInfo.symbol}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Input row */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSend()
                              }
                            }}
                            placeholder="Type a message… (Enter to send)"
                            maxLength={500}
                            rows={2}
                            style={{
                              width:        '100%',
                              background:   'rgba(255,255,255,0.05)',
                              border:       '1px solid rgba(6,182,212,0.2)',
                              borderRadius: '10px',
                              color:        '#e2e8f0',
                              fontSize:     '13px',
                              padding:      '10px 12px',
                              outline:      'none',
                              resize:       'none',
                              fontFamily:   'inherit',
                              lineHeight:   '1.4',
                              boxSizing:    'border-box',
                            }}
                          />
                          <div style={{
                            position: 'absolute', bottom: '6px', right: '8px',
                            color: '#475569', fontSize: '10px',
                          }}>
                            {draft.length}/500
                          </div>
                        </div>

                        <button
                          onClick={handleSend}
                          disabled={sending || !draft.trim()}
                          style={{
                            padding:      '10px 18px',
                            borderRadius: '10px',
                            border:       'none',
                            background:   sending || !draft.trim()
                              ? 'rgba(6,182,212,0.2)'
                              : 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                            color:        sending || !draft.trim() ? '#64748b' : '#fff',
                            cursor:       sending || !draft.trim() ? 'not-allowed' : 'pointer',
                            fontWeight:   600,
                            fontSize:     '13px',
                            whiteSpace:   'nowrap',
                            boxShadow:    sending || !draft.trim()
                              ? 'none'
                              : '0 0 16px rgba(6,182,212,0.3)',
                            transition:   'all 0.2s',
                            height:       '60px',
                          }}
                        >
                          {sending ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                width: '14px', height: '14px', border: '2px solid #64748b',
                                borderTopColor: '#06b6d4', borderRadius: '50%',
                                display: 'inline-block', animation: 'spin 0.8s linear infinite',
                              }} />
                              Sending
                            </span>
                          ) : sendSuccess ? '✓ Sent' : 'Send'}
                        </button>
                      </div>

                      {sendError && (
                        <div style={{
                          marginTop:    '6px',
                          color:        '#f87171',
                          fontSize:     '11px',
                          background:   'rgba(239,68,68,0.1)',
                          border:       '1px solid rgba(239,68,68,0.2)',
                          borderRadius: '6px',
                          padding:      '6px 10px',
                        }}>
                          {sendError}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Keyframe for spinner */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
