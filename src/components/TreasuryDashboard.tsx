'use client'

import { useState, useEffect, useCallback } from 'react'
import { ethers, BrowserProvider, Contract } from 'ethers'

const CHAT_ADDRESS     = process.env.NEXT_PUBLIC_CHAT_ADDRESS     ?? ''
const TREASURY_ADDRESS = (process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC').toLowerCase()

const CHAT_ABI = [
  'function treasuryWallet() view returns (address)',
  'function totalFeesCollected() view returns (uint256)',
  'function getMessageCost(address) view returns (uint256)',
  'function getTotalMessages() view returns (uint256)',
  'function PLATFORM_FEE_BPS() view returns (uint256)',
  'function REVENUE_SHARE_BPS() view returns (uint256)',
]

interface Stats {
  treasuryWallet:     string
  totalFeesCollected: string
  totalFeesWei:       bigint
  messageCost:        string
  totalMessages:      number
  treasuryBalance:    string
  platformFeeBps:     number
  revenueShareBps:    number
  feePercent:         string
  feePerMsg:          string
}

export default function TreasuryDashboard() {
  const [open,        setOpen]        = useState(false)
  const [connected,   setConnected]   = useState(false)
  const [isTreasury,  setIsTreasury]  = useState(false)
  const [stats,       setStats]       = useState<Stats | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // ── Check wallet ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const eth = (window as any).ethereum
    if (!eth) return
    const update = (accounts: string[]) => {
      const connected = accounts.length > 0
      setConnected(connected)
      setIsTreasury(connected && accounts[0].toLowerCase() === TREASURY_ADDRESS)
    }
    eth.request({ method: 'eth_accounts' }).then(update)
    eth.on('accountsChanged', update)
    return () => eth.removeListener('accountsChanged', update)
  }, [])

  // ── Fetch stats ──────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    const eth = (window as any).ethereum
    if (!eth || !CHAT_ADDRESS) return
    try {
      setLoading(true)
      setError('')
      const provider = new BrowserProvider(eth)
      const contract = new Contract(CHAT_ADDRESS, CHAT_ABI, provider)

      const [
        treasuryWallet,
        totalFeesWei,
        messageCostWei,
        totalMessages,
        platformFeeBps,
        revenueShareBps,
        treasuryBalWei,
      ] = await Promise.all([
        contract.treasuryWallet(),
        contract.totalFeesCollected(),
        contract.getMessageCost(ethers.ZeroAddress),
        contract.getTotalMessages(),
        contract.PLATFORM_FEE_BPS(),
        contract.REVENUE_SHARE_BPS(),
        provider.getBalance(TREASURY_ADDRESS),
      ])

      const pBps        = Number(platformFeeBps)
      const rBps        = Number(revenueShareBps)
      const feePercent  = ((pBps + (10000 - pBps) * rBps / 10000) / 100).toFixed(3)
      const costWei     = BigInt(messageCostWei.toString())
      const feePerMsgWei = costWei * BigInt(pBps) / 10000n +
                          (costWei - costWei * BigInt(pBps) / 10000n) * BigInt(rBps) / 10000n

      setStats({
        treasuryWallet:     String(treasuryWallet),
        totalFeesCollected: ethers.formatEther(totalFeesWei),
        totalFeesWei:       BigInt(totalFeesWei.toString()),
        messageCost:        ethers.formatEther(messageCostWei),
        totalMessages:      Number(totalMessages),
        treasuryBalance:    ethers.formatEther(treasuryBalWei),
        platformFeeBps:     pBps,
        revenueShareBps:    rBps,
        feePercent,
        feePerMsg:          ethers.formatEther(feePerMsgWei),
      })
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Auto-refresh every 5 s while open ───────────────────────────────────────
  useEffect(() => {
    if (!open) return
    fetchStats()
    const iv = setInterval(fetchStats, 5_000)
    return () => clearInterval(iv)
  }, [open, fetchStats])

  // Only render anything if the connected wallet IS the treasury wallet
  if (!isTreasury) return null

  return (
    <div style={{ position: 'fixed', bottom: '90px', right: '20px', zIndex: 9997 }}>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background:   'linear-gradient(135deg, #10b981, #059669)',
          border:       'none',
          borderRadius: '12px',
          padding:      '8px 14px',
          color:        '#fff',
          fontSize:     '12px',
          fontWeight:   700,
          cursor:       'pointer',
          boxShadow:    '0 4px 15px rgba(16,185,129,0.4)',
          display:      'flex',
          alignItems:   'center',
          gap:          '6px',
          whiteSpace:   'nowrap',
        }}
      >
        💰 Treasury
        {stats && (
          <span style={{ opacity: 0.85, fontSize: '10px' }}>
            {parseFloat(stats.totalFeesCollected).toFixed(8)} QF
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position:     'absolute',
          bottom:       '44px',
          right:        0,
          background:   '#0a0e1a',
          border:       '1px solid rgba(16,185,129,0.35)',
          borderRadius: '16px',
          padding:      '18px',
          width:        '370px',
          color:        '#fff',
          fontFamily:   'monospace',
          boxShadow:    '0 20px 60px rgba(0,0,0,0.7)',
        }}>
          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
            <span style={{ fontSize:'13px', fontWeight:700, color:'#10b981' }}>💰 Treasury Dashboard</span>
            <button
              onClick={fetchStats}
              style={{ background:'none', border:'1px solid rgba(16,185,129,0.4)', color:'#10b981', borderRadius:'6px', padding:'3px 10px', fontSize:'10px', cursor:'pointer' }}
            >
              {loading ? '...' : '↺ Refresh'}
            </button>
          </div>

          {error && (
            <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid #ef4444', borderRadius:'8px', padding:'8px 10px', fontSize:'11px', color:'#ef4444', marginBottom:'12px' }}>
              {error}
            </div>
          )}

          {stats && (
            <>
              {/* Treasury wallet address */}
              <div style={{ background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:'8px', padding:'8px 12px', marginBottom:'14px' }}>
                <div style={{ fontSize:'9px', color:'#6b7280', marginBottom:'3px' }}>TREASURY WALLET</div>
                <div style={{ fontSize:'11px', color:'#10b981', wordBreak:'break-all' }}>{stats.treasuryWallet}</div>
              </div>

              {/* Big numbers */}
              <BigStat
                label="Lifetime Fees Collected"
                value={parseFloat(stats.totalFeesCollected).toFixed(12) + ' QF'}
                sub={`across ${stats.totalMessages} messages`}
                color="#10b981"
              />
              <div style={{ height:'1px', background:'rgba(255,255,255,0.06)', margin:'10px 0' }} />
              <BigStat
                label="Treasury Wallet Balance (live)"
                value={parseFloat(stats.treasuryBalance).toFixed(12) + ' QF'}
                sub="full-precision on-chain balance"
                color="#06b6d4"
              />
              <div style={{ height:'1px', background:'rgba(255,255,255,0.06)', margin:'10px 0' }} />

              {/* Fee breakdown */}
              <div style={{ fontSize:'10px', color:'#4b5563', marginBottom:'8px', letterSpacing:'0.05em' }}>FEE BREAKDOWN PER MESSAGE</div>
              <Row label="User pays"           value={parseFloat(stats.messageCost).toFixed(12) + ' QF'} />
              <Row label="→ Treasury receives" value={parseFloat(stats.messageCost).toFixed(12) + ' QF'} highlight />
              <Row label="→ Treasury %"        value="100%" highlight />

              {lastUpdated && (
                <div style={{ fontSize:'9px', color:'#374151', marginTop:'12px', textAlign:'right' }}>
                  Auto-refreshes every 5s · last: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
      <span style={{ fontSize:'11px', color: highlight ? '#10b981' : '#9ca3af' }}>{label}</span>
      <span style={{ fontSize:'11px', color: highlight ? '#10b981' : '#d1d5db', fontWeight: highlight ? 700 : 400 }}>{value}</span>
    </div>
  )
}

function BigStat({ label, value, sub, color }: { label:string; value:string; sub:string; color:string }) {
  return (
    <div style={{ marginBottom:'4px' }}>
      <div style={{ fontSize:'10px', color:'#6b7280', marginBottom:'3px', letterSpacing:'0.05em' }}>{label}</div>
      <div style={{ fontSize:'14px', color, fontWeight:700, marginBottom:'2px' }}>{value}</div>
      <div style={{ fontSize:'10px', color:'#4b5563' }}>{sub}</div>
    </div>
  )
}
