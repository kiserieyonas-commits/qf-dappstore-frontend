import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReviewSection from '@/components/ReviewSection'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Dapp {
  id:              string | number
  name:            string
  description:     string
  category:        string
  websiteUrl?:     string
  dappUrl?:        string
  logoUrl?:        string
  contractAddress: string
  builder:         string
  ownerWallet?:    string
  verified?:       boolean
  totalRevenue?:   string | number
  totalUsers?:     number
  rating?:         number
  reviewCount?:    number
  installCount?:   number
  createdAt?:      string
  socialLinks?:    string
}

// ─── Data fetching ────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function fetchDapp(id: string): Promise<Dapp> {
  const res = await fetch(`${BASE_URL}/api/dapps/${id}`, {
    next: { revalidate: 60 },
  })
  if (!res.ok) notFound()
  const data = await res.json()
  // Support both { dapp: {...} } and flat response shapes
  return data.dapp ?? data
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortAddr(addr?: string) {
  if (!addr) return '—'
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function formatRevenue(v?: string | number) {
  if (v == null) return '—'
  const n = Number(v)
  if (isNaN(n)) return String(v)
  return `${n.toFixed(4)} QF`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DappDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const dapp = await fetchDapp(id)

  const canLaunch = Boolean(dapp.dappUrl)

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">

        {/* ── Header ── */}
        <div className="flex items-start gap-6">
          {/* Logo */}
          <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {dapp.logoUrl ? (
              <img src={dapp.logoUrl} alt={dapp.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-cyan-400">
                {dapp.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{dapp.name}</h1>
              {dapp.verified && (
                <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/40 rounded-full text-xs text-cyan-400 font-semibold">
                  ✓ Verified
                </span>
              )}
              <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400">
                {dapp.category}
              </span>
            </div>
            <p className="mt-2 text-gray-400 text-sm leading-relaxed max-w-2xl">
              {dapp.description}
            </p>
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: formatRevenue(dapp.totalRevenue) },
            { label: 'Users',         value: dapp.totalUsers?.toLocaleString() ?? '—' },
            { label: 'Rating',        value: dapp.rating != null ? `${Number(dapp.rating).toFixed(1)} ★` : '—' },
            { label: 'Reviews',       value: dapp.reviewCount?.toLocaleString() ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#0f1729] border border-cyan-500/20 rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-cyan-400">{value}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Main content: chart + sidebar ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Performance chart (placeholder) */}
          <div className="lg:col-span-2 bg-[#0f1729] border border-cyan-500/20 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Revenue Performance</h2>
            <svg viewBox="0 0 400 120" className="w-full h-32 opacity-60">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline
                points="0,100 50,85 100,70 150,55 200,65 250,40 300,30 350,20 400,15"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
              />
              <polygon
                points="0,100 50,85 100,70 150,55 200,65 250,40 300,30 350,20 400,15 400,120 0,120"
                fill="url(#chartGrad)"
              />
            </svg>
          </div>

          {/* Details sidebar */}
          <div className="bg-[#0f1729] border border-cyan-500/20 rounded-xl p-5 space-y-4 text-sm">
            <h2 className="font-semibold text-gray-300">Details</h2>

            <div className="space-y-3 text-gray-400">
              <div className="flex justify-between gap-2">
                <span>Contract</span>
                <span className="font-mono text-xs text-cyan-400 truncate">{shortAddr(dapp.contractAddress)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Builder</span>
                <span className="font-mono text-xs text-cyan-400 truncate">{shortAddr(dapp.builder || dapp.ownerWallet)}</span>
              </div>
              {dapp.installCount != null && (
                <div className="flex justify-between gap-2">
                  <span>Installs</span>
                  <span className="text-white">{dapp.installCount.toLocaleString()}</span>
                </div>
              )}
              {dapp.createdAt && (
                <div className="flex justify-between gap-2">
                  <span>Listed</span>
                  <span className="text-white">{new Date(dapp.createdAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {dapp.socialLinks && (
              <div className="pt-3 border-t border-cyan-500/10">
                <a
                  href={dapp.socialLinks}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:underline"
                >
                  Social / Community ↗
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ── Revenue breakdown ── */}
        <div className="bg-[#0f1729] border border-cyan-500/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Revenue Breakdown</h2>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            {[
              { label: 'Platform Fee',   pct: '0.85%',   color: 'text-yellow-400' },
              { label: 'Revenue Share',  pct: '10%',     color: 'text-orange-400' },
              { label: 'Builder Earns',  pct: '89.235%', color: 'text-green-400'  },
            ].map(({ label, pct, color }) => (
              <div key={label} className="bg-white/5 rounded-lg p-3">
                <div className={`text-lg font-bold ${color}`}>{pct}</div>
                <div className="text-xs text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA buttons ── */}
        <div className="flex flex-col sm:flex-row gap-4">
          {canLaunch ? (
            <Link
              href={`/dapps/${id}/run`}
              className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-center font-bold text-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-200"
            >
              🚀 Launch dApp
            </Link>
          ) : (
            <div className="flex-1 py-4 bg-gray-700/40 border border-gray-600/30 rounded-xl text-center font-bold text-lg text-gray-500 cursor-not-allowed">
              🚀 Launch dApp — Coming Soon
            </div>
          )}

          {dapp.websiteUrl && (
            <a
              href={dapp.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 border border-cyan-500/30 rounded-xl text-center font-semibold hover:bg-cyan-500/10 transition-colors"
            >
              Open in New Tab ↗
            </a>
          )}
        </div>

        {/* ── QF DappStore fee info panel ── */}
        <div className="p-5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 space-y-2">
          <p className="text-sm font-semibold text-cyan-400">About QF DappStore Fees</p>
          <ul className="text-xs text-gray-400 space-y-1 list-none">
            <li>• A <span className="text-white font-medium">10.765% fee</span> is automatically collected on all value-bearing transactions through this dApp.</li>
            <li>• <span className="text-white font-medium">0.85%</span> platform fee goes to the QF DappStore treasury.</li>
            <li>• <span className="text-white font-medium">10%</span> revenue share (on the remainder) is also routed to treasury for network development.</li>
            <li>• <span className="text-white font-medium">89.235%</span> of every transaction goes directly to the dApp builder.</li>
          </ul>
        </div>

        {/* ── Reviews & Ratings ── */}
        <ReviewSection dappId={id} builderAddress={dapp.builder ?? dapp.ownerWallet ?? ''} />

      </div>
    </div>
  )
}
