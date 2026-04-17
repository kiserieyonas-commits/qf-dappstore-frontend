'use client'

import './App.css'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useDisconnect, useBalance } from 'wagmi';
import { getDapps, registerDapp, getBuilderDapps, getBuilderAnalytics, getBuilderRevenue, updateBuilderDapp, verifySdkInstallation } from './lib/api';
import { getListingFee, registerDappOnChain } from './lib/registryService';
import ReviewSection from './components/ReviewSection';
import ConnectButton from './components/ConnectButton';
import TreasuryDashboard from './components/TreasuryDashboard';
import DappViewer from './components/DappViewer';
import {
  sendMessage as chatSendMessage,
  getConversation,
  getConversationList,
  getAllTokenPrices,
  calculateCostInToken,
  NATIVE_TOKEN,
} from './lib/chatService';
import { useUsername } from './hooks/useUsername';


// Particles Component
const Particles = () => {
  useEffect(() => {
    const container = document.querySelector('.particles-qf');
    if (!container) return;
    
    // Clear existing particles
    container.innerHTML = '';
    
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.style.position = 'absolute';
      particle.style.width = `${1 + Math.random() * 2}px`;
      particle.style.height = particle.style.width;
      particle.style.background = 'rgba(14, 165, 233, 0.4)';
      particle.style.borderRadius = '50%';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.animation = `floatQF ${15 + Math.random() * 20}s linear infinite`;
      particle.style.animationDelay = `${Math.random() * 5}s`;
      container.appendChild(particle);
    }
  }, []);

  return <div className="particles-qf fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }} />;
};

// Header Component
const Header = ({ currentPage, setCurrentPage, setShowWalletModal: _setShowWalletModal }) => { // eslint-disable-line no-unused-vars
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#0a0e1a]/90 backdrop-blur-md border-b border-cyan-500/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setCurrentPage('home'); setMobileMenuOpen(false); }}>
            <div>
              <div className="text-lg md:text-xl font-bold text-cyan-400">QF DappStore</div>
              <div className="text-[10px] text-cyan-500/60 font-mono hidden sm:block">Distribution Layer</div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <button
              onClick={() => setCurrentPage('home')}
              className={`font-medium transition-colors ${currentPage === 'home' ? 'text-cyan-400' : 'text-gray-400 hover:text-cyan-400'}`}
            >
              Explore
            </button>
            <button
              onClick={() => setCurrentPage('builders')}
              className={`font-medium transition-colors ${currentPage === 'builders' ? 'text-cyan-400' : 'text-gray-400 hover:text-cyan-400'}`}
            >
              Builders
            </button>
            <button
              onClick={() => setCurrentPage('docs')}
              className={`font-medium transition-colors ${currentPage === 'docs' ? 'text-cyan-400' : 'text-gray-400 hover:text-cyan-400'}`}
            >
              Docs
            </button>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <ConnectButton />

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              className="md:hidden w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center hover:bg-cyan-500/20 transition-all"
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown — floats below header, doesn't push content */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 top-[57px] bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Menu panel */}
          <div className="md:hidden absolute left-0 right-0 z-50 bg-[#0f1729]/98 border-b border-cyan-500/20 shadow-2xl shadow-cyan-500/10">
            <nav className="container mx-auto px-4 py-3 flex flex-col gap-1">
              <button
                onClick={() => { setCurrentPage('home'); setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  currentPage === 'home'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-400'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H7m8-8l8 8-8 8" />
                </svg>
                Explore
              </button>
              <button
                onClick={() => { setCurrentPage('builders'); setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  currentPage === 'builders'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-400'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Builders
              </button>
              <button
                onClick={() => { setCurrentPage('docs'); setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  currentPage === 'docs'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-400'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Docs
              </button>
            </nav>
          </div>
        </>
      )}
    </header>
  );
};

// Reusable DApp Card
const DappCard = ({ dapp, favorites, toggleFavorite, onOpen }) => {
  const isFav = favorites.includes(dapp.id);
  return (
    <div
      className="bg-gradient-to-b from-[#0f1729]/40 to-[#0a0e1a]/60 border border-cyan-500/20 rounded-xl p-5 cursor-pointer hover:translate-y-[-4px] hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 relative group"
      onClick={() => onOpen(dapp)}
    >
      {/* Favorite star */}
      <button
        onClick={e => { e.stopPropagation(); toggleFavorite(dapp.id); }}
        className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all z-10
          ${isFav ? 'bg-yellow-400/20 text-yellow-400' : 'bg-transparent text-gray-600 hover:text-yellow-400 opacity-0 group-hover:opacity-100'}`}
        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
      >
        <svg className="w-4 h-4" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      </button>

      <div className="flex items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center text-2xl border border-cyan-500/30">
            {dapp.logo}
          </div>
          <div>
            <div className="font-bold text-base flex items-center gap-2">
              {dapp.name}
              {dapp.verified && <span className="text-cyan-400 text-xs">✓</span>}
            </div>
            <div className="text-xs text-gray-400">{dapp.tagline}</div>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">24h Volume</span>
          <span className="font-semibold text-cyan-400">{dapp.volume24h}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Users</span>
          <span className="font-semibold">{dapp.users.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded">{dapp.category}</span>
        <span>•</span>
        <span>{dapp.launchDate}</span>
      </div>

      <button className="w-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 py-2 rounded-lg text-sm font-semibold hover:bg-cyan-500/20 transition-all">
        Open App
      </button>
    </div>
  );
};

// Home Page
// Maps an API dapp document to the shape the UI cards expect
const CATEGORY_EMOJI = { DeFi: '💱', NFT: '🎭', Gaming: '🎮', Social: '💬', DAO: '🗳️', Other: '⚡' };
function adaptApiDapp(d) {
  return {
    id: d.dappId,
    name: d.name,
    tagline: d.description.length > 55 ? d.description.slice(0, 52) + '...' : d.description,
    category: d.category,
    logo: d.logoUrl || CATEGORY_EMOJI[d.category] || '⚡',
    volume24h: `$${(d.totalVolume || 0).toLocaleString()}`,
    feesGenerated: `$${Math.round((d.totalVolume || 0) * 0.0085).toLocaleString()}`,
    users: d.totalUsers || 0,
    rating: d.rating || 0,
    verified: d.verified,
    contract: d.contractAddress ? `${d.contractAddress.slice(0, 6)}...${d.contractAddress.slice(-4)}` : '',
    developer: d.builder ? `${d.builder.slice(0, 6)}...${d.builder.slice(-4)}` : 'Unknown',
    launchDate: d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown',
    totalVolume: `$${(d.totalVolume || 0).toLocaleString()}`,
    description: d.description,
    volumeHistory: Array(16).fill(0).map((_, i) => Math.max(1, Math.round(((d.totalVolume || 10) / 16) * (0.5 + i * 0.05)))),
    ownerWallet:   d.builder        || null,
    dappUrl:       d.dappUrl        || null,
    launchMode:    d.launchMode     || 'iframe',
    listingStatus: d.listingStatus  || 'live',
  };
}

const HomePage = ({ setCurrentPage, setSelectedDapp }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('featured');
  const [favorites, setFavorites] = useState([]);
  const [dapps, setDapps] = useState([]);
  const [loadingDapps, setLoadingDapps] = useState(true);

  useEffect(() => {
    setLoadingDapps(true);
    getDapps({ sort: 'newest', limit: 50 })
      .then(res => { if (res.dapps?.length) setDapps(res.dapps.map(adaptApiDapp)); })
      .catch(() => {})
      .finally(() => setLoadingDapps(false));
  }, []);

  const toggleFavorite = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const handleOpen = (dapp) => { setSelectedDapp(dapp); setCurrentPage('dapp'); };

  const filteredDapps = dapps.filter(dapp =>
    dapp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dapp.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasVerifiedHighRated = filteredDapps.some(d => d.verified && d.rating >= 4.5);
  const featuredDapps = hasVerifiedHighRated ? filteredDapps.filter(d => d.verified && d.rating >= 4.5) : filteredDapps;
  const trendingDapps = [...filteredDapps].sort((a, b) => parseFloat(b.volume24h.replace(/[$,]/g, '')) - parseFloat(a.volume24h.replace(/[$,]/g, ''))).slice(0, 6);
  const currentYear = new Date().getFullYear().toString();
  const newDapps = filteredDapps.filter(d => d.launchDate.includes('2025') || d.launchDate.includes(currentYear));
  const favDapps = dapps.filter(d => favorites.includes(d.id));

  const tabs = [
    { key: 'featured',   label: 'Featured' },
    { key: 'trending',   label: 'Trending' },
    { key: 'new',        label: 'New' },
    { key: 'favorites',  label: `Favorites ${favorites.length > 0 ? `(${favorites.length})` : ''}` },
  ];

  const displayDapps =
    activeTab === 'featured'  ? featuredDapps  :
    activeTab === 'trending'  ? trendingDapps  :
    activeTab === 'new'       ? newDapps        :
    favDapps;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-3" style={{ 
            textShadow: '0 0 20px rgba(6, 182, 212, 0.5)',
            color: '#ffffff'
          }}>
            All Web3. <span style={{ color: '#06b6d4' }}>One QF Wallet.</span>
          </h1>
          <p className="text-lg mb-6 text-gray-400">
            Permissionless distribution layer for QF
          </p>
          <div className="max-w-2xl mx-auto relative">
            <input
              type="text"
              placeholder="Search dApps..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-5 py-3 rounded-xl text-base focus:outline-none text-gray-900 placeholder-gray-500"
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(6, 182, 212, 0.3)'
              }}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Favorites shelf — always visible when favs exist and not on favorites tab */}
        {favorites.length > 0 && activeTab !== 'favorites' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                </svg>
                <span className="text-sm font-semibold text-gray-300">Your Favorites</span>
                <span className="text-xs text-gray-500">{favorites.length} saved</span>
              </div>
              <button onClick={() => setActiveTab('favorites')} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                View all →
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
              {favDapps.map(dapp => (
                <div
                  key={dapp.id}
                  onClick={() => handleOpen(dapp)}
                  className="flex-shrink-0 flex items-center gap-3 bg-gradient-to-r from-[#0f1729]/60 to-[#0a0e1a]/60 border border-yellow-400/20 rounded-xl px-4 py-3 cursor-pointer hover:border-yellow-400/40 hover:shadow-lg hover:shadow-yellow-400/10 transition-all"
                  style={{ minWidth: 180 }}
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center text-xl border border-cyan-500/30 flex-shrink-0">
                    {dapp.logo}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{dapp.name}</div>
                    <div className="text-xs text-cyan-400">{dapp.volume24h}</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); toggleFavorite(dapp.id); }}
                    className="ml-auto text-yellow-400 hover:text-yellow-300 flex-shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-cyan-500/20">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-5 py-2.5 font-semibold text-sm transition-all flex items-center gap-1.5"
              style={{
                color: activeTab === tab.key ? '#06b6d4' : '#94a3b8',
                borderBottom: activeTab === tab.key ? '2px solid #06b6d4' : 'none'
              }}
            >
              {tab.key === 'favorites' && (
                <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                </svg>
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading indicator */}
        {loadingDapps && (
          <div className="text-center py-6 text-cyan-400 text-sm">Loading dApps...</div>
        )}

        {/* Empty favorites state */}
        {activeTab === 'favorites' && favDapps.length === 0 && (
          <div className="text-center py-20">
            <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <div className="text-gray-400 font-semibold mb-2">No favorites yet</div>
            <div className="text-gray-500 text-sm">Star any dApp to save it here for quick access</div>
            <button onClick={() => setActiveTab('featured')} className="mt-5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-cyan-500/20 transition-all">
              Browse dApps
            </button>
          </div>
        )}

        {/* Grid */}
        {!(activeTab === 'favorites' && favDapps.length === 0) && (
          <>
            {!loadingDapps && displayDapps.length === 0 && (
              <div className="text-center py-24">
                <div className="text-6xl mb-6">⚡</div>
                <div className="text-xl font-bold text-gray-300 mb-2">No dApps yet</div>
                <div className="text-gray-500 text-sm mb-6">Be the first to list your dApp on QF DappStore</div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayDapps.map(dapp => (
                <DappCard
                  key={dapp.id}
                  dapp={dapp}
                  favorites={favorites}
                  toggleFavorite={toggleFavorite}
                  onOpen={handleOpen}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};


// DApp Profile Page
const DappProfilePage = ({ dapp, setCurrentPage }) => {
  const [gameOpen, setGameOpen] = useState(false);
  
  // If dApp is open, show full-page view
  if (gameOpen) {
    return (
      <div className="min-h-screen">
        {/* Header with back button */}
        <div className="bg-[#0a0e1a]/80 backdrop-blur-md border-b border-cyan-500/20 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setGameOpen(false)}
                className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to {dapp.name}
              </button>
              <div className="flex items-center gap-3">
                <div className="text-2xl">{dapp.logo}</div>
                <div>
                  <div className="text-lg font-bold text-white">{dapp.name}</div>
                  <div className="text-xs text-gray-400">{dapp.category}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Full-page dApp view */}
        <div className="container mx-auto px-4 py-6">
          {dapp.dappUrl && dapp.launchMode !== 'popup' && (
            <DappViewer dapp={dapp} />
          )}
          {dapp.dappUrl && dapp.launchMode === 'popup' && (
            <div className="bg-gradient-to-b from-[#0f1729]/40 to-[#0a0e1a]/60 border border-cyan-500/20 rounded-xl p-12 text-center">
              <div className="text-5xl mb-5">🚀</div>
              <h2 className="text-2xl font-bold mb-2">{dapp.name}</h2>
              <p className="text-gray-400 text-sm mb-6">
                This dApp runs outside DappStore. Fees are collected via the QF DappStore SDK.
              </p>
              <button
                onClick={() => window.open(dapp.dappUrl, '_blank', 'noopener,noreferrer')}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 text-[#0a0e1a] px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
              >
                Open {dapp.name} ↗
              </button>
            </div>
          )}
          {!dapp.dappUrl && (
            <div className="bg-gradient-to-b from-[#0f1729]/40 to-[#0a0e1a]/60 border border-cyan-500/20 rounded-xl p-12 text-center">
              <div className="text-6xl mb-6">{dapp.logo}</div>
              <h2 className="text-3xl font-bold mb-4">{dapp.name}</h2>
              <p className="text-gray-400 text-lg mb-8">{dapp.description}</p>
              <div className="inline-flex items-center gap-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl px-6 py-4">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div className="text-left">
                  <div className="text-sm text-gray-400">dApp Interface</div>
                  <div className="text-lg font-bold text-white">Coming Soon</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <button
          onClick={() => setCurrentPage('home')}
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Explore
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-gradient-to-b from-[#0f1729]/40 to-[#0a0e1a]/60 border border-cyan-500/20 rounded-xl p-6">
              <div className="flex items-start gap-5 mb-5">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center text-3xl border border-cyan-500/30 shadow-lg shadow-cyan-500/50">
                  {dapp.logo}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold">{dapp.name}</h1>
                    {dapp.verified && (
                      <span className="bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 px-2 py-1 rounded-lg text-xs">✓ Verified</span>
                    )}
                  </div>
                  <p className="text-lg text-gray-400 mb-2">{dapp.tagline}</p>
                  <p className="text-gray-300 text-sm">{dapp.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Total Volume', value: dapp.totalVolume, color: 'text-cyan-400' },
                  { label: '24h Volume', value: dapp.volume24h, color: 'text-cyan-400' },
                  { label: 'Active Users', value: dapp.users.toLocaleString(), color: 'text-white' },
                  { label: 'Rating', value: dapp.rating ? `★ ${dapp.rating}` : 'N/A', color: 'text-yellow-400' }
                ].map((stat, i) => (
                  <div key={i} className="bg-[#0f1729]/60 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">{stat.label}</div>
                    <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setGameOpen(o => !o)}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-[#0a0e1a] py-3 rounded-xl text-base font-bold hover:shadow-xl hover:shadow-cyan-500/50 transition-all">
                {gameOpen ? '✕ Close' : `🚀 Open ${dapp.name}`}
              </button>
            </div>

            <div className="bg-gradient-to-b from-[#0f1729]/40 to-[#0a0e1a]/60 border border-cyan-500/20 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Performance</h2>
              <svg viewBox="0 0 800 200" className="w-full">
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={`M 0 ${200 - (dapp.volumeHistory[0] * 1.5)} ${dapp.volumeHistory.map((v, i) => `L ${(800 / 15) * i} ${200 - (v * 1.5)}`).join(' ')}`}
                  stroke="#06b6d4"
                  strokeWidth="2"
                  fill="none"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.6))' }}
                />
                <path
                  d={`M 0 ${200 - (dapp.volumeHistory[0] * 1.5)} ${dapp.volumeHistory.map((v, i) => `L ${(800 / 15) * i} ${200 - (v * 1.5)}`).join(' ')} L 800 200 L 0 200 Z`}
                  fill="url(#gradient)"
                  opacity="0.3"
                />
              </svg>
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-gradient-to-b from-[#0f1729]/40 to-[#0a0e1a]/60 border border-cyan-500/20 rounded-xl p-5">
              <h3 className="text-base font-bold mb-4">Details</h3>
              <div className="space-y-3">
                {[
                  { label: 'Category', value: dapp.category },
                  { label: 'Developer', value: dapp.developer },
                  { label: 'Launch Date', value: dapp.launchDate }
                ].map((item, i) => (
                  <div key={i}>
                    <div className="text-xs text-gray-400 mb-1">{item.label}</div>
                    <div className="font-semibold text-sm">{item.value}</div>
                  </div>
                ))}
                <div>
                  <div className="text-xs text-gray-400 mb-1">Contract</div>
                  <div className="font-mono text-xs text-cyan-400">{dapp.contract}</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-b from-[#0f1729]/40 to-[#0a0e1a]/60 border border-cyan-500/20 rounded-xl p-5">
              <h3 className="text-base font-bold mb-4">Revenue Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Platform Fee (0.85%)</span>
                  <span className="font-semibold text-cyan-400">{dapp.feesGenerated}</span>
                </div>
                <div className="w-full bg-[#0f1729]/60 rounded-full h-2">
                  <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full" style={{width: '0.85%'}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews & Ratings Section */}
        <div className="mt-6">
          <ReviewSection dappId={dapp.dappId || dapp.id} builderAddress={dapp.builder || ''} />
        </div>
      </div>
    </div>
  );
};

// ─── Builder Dashboard ────────────────────────────────────────────────────────
const BuilderDashboard = ({ setShowRegisterModal }) => {
  const { address, isConnected } = useAccount();
  const [activeTab,     setActiveTab]     = useState('mydapps');
  const [myDapps,       setMyDapps]       = useState([]);
  const [analytics,     setAnalytics]     = useState(null);
  const [revenue,       setRevenue]       = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [verifyingId,   setVerifyingId]   = useState(null);   // dappId currently being verified
  const [verifyResult,  setVerifyResult]  = useState({});     // { [dappId]: { ok, message } }
  const [error,       setError]       = useState(null);
  const [editDapp,    setEditDapp]    = useState(null);   // dApp being edited in Settings
  const [editForm,    setEditForm]    = useState({});
  const [editSaving,  setEditSaving]  = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  const tabs = [
    { key: 'mydapps',   label: 'My dApps' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'revenue',   label: 'Revenue' },
    { key: 'settings',  label: 'Settings' },
  ];

  // Fetch data whenever wallet or tab changes
  useEffect(() => {
    if (!isConnected || !address) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (activeTab === 'mydapps' || activeTab === 'settings') {
          const res = await getBuilderDapps(address);
          setMyDapps(res.dapps ?? []);
        } else if (activeTab === 'analytics') {
          const res = await getBuilderAnalytics(address);
          setAnalytics(res);
        } else if (activeTab === 'revenue') {
          const res = await getBuilderRevenue(address);
          setRevenue(res);
        }
      } catch (e) {
        setError(e.message ?? 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, address, isConnected]);

  // Helper: format wei string to QF display string
  const formatWei = (wei) => {
    if (!wei) return '0';
    const eth = Number(wei) / 1e18;
    if (eth === 0) return '0 QF';
    if (eth < 0.0001) return '< 0.0001 QF';
    return `${eth.toFixed(4)} QF`;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">Connect your wallet to access your Builder Dashboard</p>
        </div>
      </div>
    );
  }

  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleVerifySdk = async (dappId) => {
    setVerifyingId(dappId);
    setVerifyResult(prev => ({ ...prev, [dappId]: null }));
    try {
      const result = await verifySdkInstallation(dappId);
      setVerifyResult(prev => ({ ...prev, [dappId]: { ok: true, message: result.message } }));
      // Refresh dApps list so listingStatus updates
      const data = await getBuilderDapps(address);
      setMyDapps(data.dapps ?? data);
    } catch (err) {
      setVerifyResult(prev => ({ ...prev, [dappId]: { ok: false, message: err.message } }));
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">Builder Dashboard</h1>
            <p className="text-gray-400 text-sm">
              Wallet: <span className="text-cyan-400 font-mono">{shortAddr}</span>
              {' · '}
              <span className="text-white font-semibold">{myDapps.length} dApp{myDapps.length !== 1 ? 's' : ''}</span>
            </p>
          </div>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-[#0a0e1a] px-5 py-2.5 rounded-lg font-semibold text-sm hover:shadow-lg hover:shadow-cyan-500/50 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Register New dApp
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-cyan-500/20">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-5 py-2.5 font-semibold text-sm transition-all ${activeTab === t.key ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-cyan-400'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-gray-400">Loading...</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400">
            {error}
          </div>
        )}

        {/* ── MY DAPPS TAB ── */}
        {activeTab === 'mydapps' && !loading && (
          <div className="bg-gradient-to-b from-[#0f1729]/40 to-[#0a0e1a]/60 border border-cyan-500/20 rounded-xl p-4 md:p-6">
            <h2 className="text-xl font-bold mb-4">My dApps</h2>

            {myDapps.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🚀</div>
                <p className="text-gray-400 mb-4">You haven't registered any dApps yet.</p>
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 text-[#0a0e1a] px-6 py-2.5 rounded-lg font-semibold text-sm hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
                >
                  Register Your First dApp
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myDapps.map(dapp => (
                  <div key={dapp.dappId} className="bg-[#0f1729]/60 rounded-xl p-4 hover:bg-[#0f1729]/80 transition-colors">
                    {/* Mobile layout */}
                    <div className="flex flex-col gap-3 md:hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center text-xl border border-cyan-500/30 overflow-hidden">
                            {dapp.logoUrl
                              ? <img src={dapp.logoUrl} alt={dapp.name} className="w-full h-full object-cover" />
                              : '🛒'}
                          </div>
                          <div>
                            <div className="font-bold text-sm">{dapp.name}</div>
                            <div className="text-xs text-gray-400">{dapp.category}</div>
                          </div>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${dapp.verified ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {dapp.verified ? '✓ Verified' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex gap-4">
                          <div>
                            <div className="text-gray-400">Txns</div>
                            <div className="font-semibold text-white">{dapp.stats?.transactionCount ?? 0}</div>
                          </div>
                          <div>
                            <div className="text-gray-400">Earned</div>
                            <div className="font-semibold text-cyan-400">{formatWei(dapp.stats?.builderEarned)}</div>
                          </div>
                        </div>
                        <button onClick={() => { setEditDapp(dapp); setEditForm({ description: dapp.description, websiteUrl: dapp.websiteUrl, dappUrl: dapp.dappUrl, logoUrl: dapp.logoUrl }); setActiveTab('settings'); }}
                          className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-cyan-500/20 transition-all">
                          Manage
                        </button>
                      </div>
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden md:flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30 overflow-hidden flex-shrink-0">
                          {dapp.logoUrl
                            ? <img src={dapp.logoUrl} alt={dapp.name} className="w-full h-full object-cover" />
                            : <span className="text-xl">🛒</span>}
                        </div>
                        <div>
                          <div className="font-bold text-sm">{dapp.name}</div>
                          <div className="text-xs text-gray-400">{dapp.category}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-8 text-xs">
                        <div>
                          <div className="text-gray-400">Transactions</div>
                          <div className="font-semibold text-white">{dapp.stats?.transactionCount ?? 0}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Volume</div>
                          <div className="font-semibold text-blue-400">{formatWei(dapp.stats?.totalVolume)}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">You Earned</div>
                          <div className="font-semibold text-cyan-400">{formatWei(dapp.stats?.builderEarned)}</div>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          dapp.listingStatus === 'live' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {dapp.listingStatus === 'live' ? '✓ Live' : '⏳ Pending SDK'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {dapp.listingStatus === 'pending' && dapp.hasBackend && (
                          <button
                            onClick={() => handleVerifySdk(dapp.dappId)}
                            disabled={verifyingId === dapp.dappId}
                            className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-yellow-500/20 transition-all disabled:opacity-50"
                          >
                            {verifyingId === dapp.dappId ? 'Verifying...' : 'Verify SDK'}
                          </button>
                        )}
                        <button
                          onClick={() => { setEditDapp(dapp); setEditForm({ description: dapp.description, websiteUrl: dapp.websiteUrl, dappUrl: dapp.dappUrl, logoUrl: dapp.logoUrl }); setActiveTab('settings'); }}
                          className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-cyan-500/20 transition-all"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                    {/* Verify result message */}
                    {verifyResult[dapp.dappId] && (
                      <div className={`mt-3 text-xs px-3 py-2 rounded-lg border ${
                        verifyResult[dapp.dappId].ok
                          ? 'bg-green-500/10 border-green-500/30 text-green-400'
                          : 'bg-red-500/10 border-red-500/30 text-red-400'
                      }`}>
                        {verifyResult[dapp.dappId].message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {activeTab === 'analytics' && !loading && analytics && (
          <div className="space-y-6">
            {/* Summary stats */}
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { label: 'Total Volume',    value: formatWei(analytics.overall.totalVolume),      color: 'text-blue-400' },
                { label: 'You Earned',      value: formatWei(analytics.overall.builderEarned),    color: 'text-cyan-400' },
                { label: 'Platform Fees',   value: formatWei(analytics.overall.totalFees),        color: 'text-orange-400' },
                { label: 'Total Txns',      value: analytics.overall.transactionCount.toString(), color: 'text-white' },
              ].map((s, i) => (
                <div key={i} className="bg-gradient-to-b from-[#0f1729]/40 to-[#0a0e1a]/60 border border-cyan-500/20 rounded-xl p-4">
                  <div className={`text-2xl font-bold mb-1 ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Revenue bar chart (30 days) */}
            <div className="bg-gradient-to-b from-[#0f1729]/40 to-[#0a0e1a]/60 border border-cyan-500/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">Revenue Trend (30 Days)</h2>
                  <p className="text-sm text-gray-400">Your builder earnings per day</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-green-400">
                    {formatWei(analytics.revenueOverTime.reduce((acc, d) => acc + d.builderEarned, 0))}
                  </div>
                  <div className="text-xs text-gray-400">Last 30 days</div>
                </div>
              </div>

              {analytics.revenueOverTime.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No transactions in the last 30 days</div>
              ) : (() => {
                const maxVal = Math.max(...analytics.revenueOverTime.map(d => d.builderEarned), 1);
                return (
                  <div className="h-48 flex items-end gap-1 relative">
                    {analytics.revenueOverTime.map((d, i) => {
                      const h = (d.builderEarned / maxVal) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center group relative">
                          <div className="w-full rounded-t-sm cursor-pointer"
                            style={{ height: `${Math.max(h, 2)}%`, background: 'linear-gradient(to top, #06b6d4, #3b82f6)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(to top, #22d3ee, #60a5fa)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(to top, #06b6d4, #3b82f6)'; }}
                          />
                          <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 pointer-events-none z-10 bg-gray-900 border border-cyan-500/30 text-white text-xs px-2 py-1.5 rounded-lg whitespace-nowrap">
                            <div className="font-bold text-cyan-400">{d.date}</div>
                            <div>Earned: <span className="text-green-400">{formatWei(d.builderEarned)}</span></div>
                            <div>Txns: <span className="text-white">{d.transactions}</span></div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="absolute inset-0 pointer-events-none">
                      {[0, 50, 100].map(p => (
                        <div key={p} className="absolute w-full border-t border-cyan-500/10" style={{ bottom: `${p}%` }} />
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Per-dApp breakdown */}
            <div className="bg-gradient-to-b from-[#0f1729]/40 to-[#0a0e1a]/60 border border-cyan-500/20 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Performance by dApp</h2>
              {analytics.perDapp.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No transaction data yet</p>
              ) : (
                <div className="space-y-3">
                  {analytics.perDapp.map((d) => (
                    <div key={d.dappId} className="bg-[#0f1729]/60 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30 overflow-hidden">
                            {d.logoUrl ? <img src={d.logoUrl} alt={d.name} className="w-full h-full object-cover" /> : <span>🛒</span>}
                          </div>
                          <div>
                            <div className="font-bold text-sm">{d.name}</div>
                            <div className="text-xs text-gray-400">{d.category}</div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">{d.transactions} txns</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <div className="text-gray-400 mb-0.5">Volume</div>
                          <div className="font-semibold text-blue-400">{formatWei(d.volume)}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 mb-0.5">You Earned</div>
                          <div className="font-semibold text-cyan-400">{formatWei(d.builderEarned)}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 mb-0.5">Platform Fees</div>
                          <div className="font-semibold text-orange-400">{formatWei(d.fees)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── REVENUE TAB ── */}
        {activeTab === 'revenue' && !loading && revenue && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: 'All-Time Earned',    value: formatWei(revenue.allTime.builderEarned),    sub: `${formatWei(revenue.allTime.totalVolume)} total volume`,  color: 'text-cyan-400' },
                { label: 'This Month',          value: formatWei(revenue.thisMonth.builderEarned),  sub: `${formatWei(revenue.thisMonth.totalVolume)} volume`,       color: 'text-green-400' },
                { label: 'This Week',           value: formatWei(revenue.thisWeek.builderEarned),   sub: `${formatWei(revenue.thisWeek.totalVolume)} volume`,        color: 'text-purple-400' },
              ].map((s, i) => (
                <div key={i} className="bg-gradient-to-b from-[#0f1729]/40 to-[#0a0e1a]/60 border border-cyan-500/20 rounded-xl p-6">
                  <div className={`text-3xl font-black mb-1 ${s.color}`}>{s.value}</div>
                  <div className="text-sm font-semibold text-white mb-1">{s.label}</div>
                  <div className="text-xs text-gray-500">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Fee breakdown */}
            <div className="bg-gradient-to-b from-[#0f1729]/40 to-[#0a0e1a]/60 border border-cyan-500/20 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4">Fee Structure</h3>
              <div className="space-y-3">
                {[
                  { label: 'Your Share (Builder)',      value: `${revenue.feeBreakdown.builderSharePct.toFixed(3)}%`, color: 'text-cyan-400' },
                  { label: 'Platform Fee (DappStore)',  value: `${revenue.feeBreakdown.platformFeePct.toFixed(3)}%`,  color: 'text-orange-400' },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-3 border-b border-cyan-500/10 last:border-0">
                    <span className="text-gray-400 text-sm">{item.label}</span>
                    <span className={`font-bold text-lg ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Per-dApp revenue */}
            {revenue.perDapp.length > 0 && (
              <div className="bg-gradient-to-b from-[#0f1729]/40 to-[#0a0e1a]/60 border border-cyan-500/20 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">Revenue by dApp</h3>
                <div className="space-y-3">
                  {revenue.perDapp.map((d) => (
                    <div key={d.dappId} className="flex items-center justify-between bg-[#0f1729]/60 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30 overflow-hidden">
                          {d.logoUrl ? <img src={d.logoUrl} alt={d.name} className="w-full h-full object-cover" /> : <span className="text-sm">🛒</span>}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{d.name}</div>
                          <div className="text-xs text-gray-500">{d.transactions} transactions</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-cyan-400 text-sm">{formatWei(d.builderEarned)}</div>
                        <div className="text-xs text-gray-500">of {formatWei(d.totalVolume)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent transactions */}
            {revenue.recentTransactions.length > 0 && (
              <div className="bg-gradient-to-b from-[#0f1729]/40 to-[#0a0e1a]/60 border border-cyan-500/20 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">Recent Transactions</h3>
                <div className="space-y-2">
                  {revenue.recentTransactions.map((tx) => (
                    <div key={tx.txHash} className="flex items-center justify-between bg-[#0f1729]/60 rounded-lg p-3 text-xs">
                      <div>
                        <div className="font-semibold text-white">{tx.dappName}</div>
                        <div className="text-gray-500 font-mono">{tx.txHash.slice(0, 10)}...{tx.txHash.slice(-6)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-cyan-400">+{formatWei(tx.builderEarned)}</div>
                        <div className="text-gray-500">{new Date(tx.timestamp).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {revenue.allTime.builderEarned === 0 && revenue.recentTransactions.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">💰</div>
                <p className="text-gray-400">No revenue yet. Revenue will appear here once users transact through your dApps.</p>
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === 'settings' && !loading && (
          <div className="space-y-6">
            <div className="bg-gradient-to-b from-[#0f1729]/40 to-[#0a0e1a]/60 border border-cyan-500/20 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-2">Builder Profile</h2>
              <p className="text-sm text-gray-400 mb-4">Your wallet address is your builder identity</p>
              <div className="bg-[#0f1729]/60 rounded-lg p-4 font-mono text-sm text-cyan-400 break-all">{address}</div>
            </div>

            {myDapps.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">⚙️</div>
                <p className="text-gray-400 mb-4">No dApps to manage. Register one first.</p>
                <button onClick={() => setShowRegisterModal(true)} className="bg-gradient-to-r from-cyan-500 to-blue-500 text-[#0a0e1a] px-6 py-2.5 rounded-lg font-semibold text-sm">
                  Register dApp
                </button>
              </div>
            ) : (
              <div className="bg-gradient-to-b from-[#0f1729]/40 to-[#0a0e1a]/60 border border-cyan-500/20 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">Manage dApps</h2>
                <p className="text-sm text-gray-400 mb-4">Select a dApp to update its details</p>

                {/* dApp selector */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {myDapps.map(d => (
                    <button key={d.dappId}
                      onClick={() => { setEditDapp(d); setEditForm({ description: d.description, websiteUrl: d.websiteUrl ?? '', dappUrl: d.dappUrl ?? '', logoUrl: d.logoUrl ?? '' }); setEditSuccess(false); }}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${editDapp?.dappId === d.dappId ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-[#0f1729]/60 border-cyan-500/20 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/40'}`}>
                      {d.name}
                    </button>
                  ))}
                </div>

                {editDapp && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setEditSaving(true);
                    setEditSuccess(false);
                    try {
                      await updateBuilderDapp(editDapp.dappId, address, editForm);
                      setEditSuccess(true);
                      // Refresh dApps list
                      const res = await getBuilderDapps(address);
                      setMyDapps(res.dapps ?? []);
                    } catch (err) {
                      setError(err.message);
                    } finally {
                      setEditSaving(false);
                    }
                  }} className="space-y-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Description</label>
                      <textarea
                        value={editForm.description ?? ''}
                        onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                        rows={3}
                        className="w-full bg-[#0f1729]/60 border border-cyan-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Logo URL</label>
                      <input
                        type="url"
                        value={editForm.logoUrl ?? ''}
                        onChange={e => setEditForm(f => ({ ...f, logoUrl: e.target.value }))}
                        placeholder="https://..."
                        className="w-full bg-[#0f1729]/60 border border-cyan-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Website URL</label>
                      <input
                        type="url"
                        value={editForm.websiteUrl ?? ''}
                        onChange={e => setEditForm(f => ({ ...f, websiteUrl: e.target.value }))}
                        placeholder="https://..."
                        className="w-full bg-[#0f1729]/60 border border-cyan-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">dApp URL</label>
                      <input
                        type="url"
                        value={editForm.dappUrl ?? ''}
                        onChange={e => setEditForm(f => ({ ...f, dappUrl: e.target.value }))}
                        placeholder="https://..."
                        className="w-full bg-[#0f1729]/60 border border-cyan-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    {editSuccess && (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-400 text-sm">
                        ✓ dApp updated successfully
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button type="submit" disabled={editSaving}
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 text-[#0a0e1a] px-6 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 hover:shadow-lg hover:shadow-cyan-500/50 transition-all">
                        {editSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button type="button" onClick={() => setEditDapp(null)}
                        className="bg-[#0f1729]/60 border border-cyan-500/20 text-gray-400 px-6 py-2.5 rounded-lg font-semibold text-sm hover:text-white transition-all">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

// Wallet Modal
const WalletModal = ({ onClose, isDarkMode }) => {
  const [view, setView] = useState('main'); // main | buy | send | receive | confirm | swap
  const [sendAmount, setSendAmount] = useState('');
  const [sendAddress, setSendAddress] = useState('');
  const [sendToken, setSendToken] = useState('QF');
  const [buyAmount, setBuyAmount] = useState('');
  const [buyToken, setBuyToken] = useState('QF');
  const [txDone, setTxDone] = useState(false);
  const [username, setUsername] = useState('crypto_builder'); // Default username
  const [editingUsername, setEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [swapFrom, setSwapFrom] = useState('QF');
  const [swapTo, setSwapTo] = useState('QF');
  const [swapAmount, setSwapAmount] = useState('');
  const [swapRate] = useState(0.24); // 1 ETH = 0.24 QF (example rate)

  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balanceData } = useBalance({ address });

  const walletAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '0x4731...B8E7';
  const ethBalance = balanceData ? parseFloat(balanceData.formatted).toFixed(4) : '—';
  const qfBalance = '—';
  const usdValue = '—';

  const fee = sendAmount ? (parseFloat(sendAmount) * 0.0085).toFixed(4) : '0.0000';
  const total = sendAmount ? (parseFloat(sendAmount) * 1.0085).toFixed(4) : '0.0000';

  const handleConfirm = () => {
    setView('confirm');
    setTimeout(() => { setTxDone(true); }, 1500);
  };

  const reset = () => { setView('main'); setTxDone(false); setSendAmount(''); setSendAddress(''); setBuyAmount(''); };
  
  const startEditUsername = () => {
    setTempUsername(username);
    setEditingUsername(true);
  };
  
  const saveUsername = () => {
    if (tempUsername.trim()) {
      setUsername(tempUsername.trim());
    }
    setEditingUsername(false);
  };
  
  const cancelEditUsername = () => {
    setTempUsername('');
    setEditingUsername(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0e1a]/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gradient-to-b from-[#0f1729]/95 to-[#0a0e1a]/95 border border-cyan-500/20 rounded-2xl w-full max-w-sm mx-4 shadow-2xl overflow-hidden" style={{ boxShadow: '0 0 60px rgba(6,182,212,0.15)' }} onClick={e => e.stopPropagation()}>

        {/* ── MAIN VIEW ── */}
        {view === 'main' && (
          <>
            {/* Header */}
            <div className="relative px-6 pt-6 pb-5 bg-gradient-to-b from-cyan-500/10 to-transparent border-b border-cyan-500/10">
              <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-lg shadow-lg shadow-cyan-500/40">👛</div>
                <div className="flex-1">
                  {/* Username with Edit */}
                  {!editingUsername ? (
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`text-sm font-bold ${'text-white'}`}>@{username}</div>
                      <button 
                        onClick={startEditUsername}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors"
                        title="Edit username"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="mb-1 flex items-center gap-1">
                      <div className={`text-sm mr-0.5 ${'text-white'}`}>@</div>
                      <input
                        type="text"
                        value={tempUsername}
                        onChange={(e) => setTempUsername(e.target.value)}
                        className="bg-white border border-cyan-500/50 rounded px-2 py-0.5 text-xs text-gray-900 focus:outline-none focus:border-cyan-500 flex-1"
                        placeholder="username"
                        autoFocus
                        style={{
                          color: '#0f172a',
                          backgroundColor: '#ffffff'
                        }}
                      />
                      <button 
                        onClick={saveUsername}
                        className="text-green-400 hover:text-green-300"
                        title="Save"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button 
                        onClick={cancelEditUsername}
                        className="text-red-400 hover:text-red-300"
                        title="Cancel"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <div className="text-xs text-gray-400 font-mono">{walletAddress}</div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />{isConnected ? 'Connected' : 'Not Connected'}</div>
                    {isConnected ? (
                      <button onClick={() => { disconnect(); onClose(); }} className="text-xs text-red-400 hover:text-red-300 transition-colors">Disconnect</button>
                    ) : (
                      <ConnectButton />
                    )}
                  </div>
                </div>
              </div>
              <div className={`text-4xl font-bold mb-1 ${'text-white'}`}>{usdValue}</div>
              <div className="text-sm text-gray-400">Total Portfolio Value</div>
            </div>

            {/* Balances */}
            <div className="px-6 py-4 space-y-2 border-b border-cyan-500/10">
              {[
                { symbol: 'QF',  name: 'QF Token',  bal: qfBalance,  usd: '$29,880.00', color: 'from-cyan-500 to-blue-500',   icon: '🔐' },
                { symbol: 'QF',  name: 'QF Network', bal: ethBalance, usd: '$8,124.00', color: 'from-blue-500 to-indigo-600', icon: '🔷' },
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-3 bg-[#0f1729]/60 rounded-xl px-4 py-3 border border-cyan-500/10">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-base flex-shrink-0`}>{t.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm ${'text-white'}`}>{t.symbol}</div>
                    <div className="text-xs text-gray-400">{t.name}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-sm ${'text-white'}`}>{t.bal}</div>
                    <div className="text-xs text-gray-400">{t.usd}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-5">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Buy',     view: 'buy',     icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  )},
                  { label: 'Send',    view: 'send',    icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  )},
                  { label: 'Swap',    view: 'swap',    icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                  )},
                  { label: 'Receive', view: 'receive', icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                  )},
                ].map(btn => (
                  <button
                    key={btn.label}
                    onClick={() => setView(btn.view)}
                    className="flex flex-col items-center gap-2 py-3 rounded-xl bg-gradient-to-b from-cyan-500/15 to-cyan-500/5 border border-cyan-500/25 hover:border-cyan-500/50 hover:from-cyan-500/25 transition-all group"
                  >
                    <span className="text-cyan-400 group-hover:scale-110 transition-transform">{btn.icon}</span>
                    <span className={`text-xs font-semibold ${'text-white'}`}>{btn.label}</span>
                  </button>
                ))}
              </div>

              {/* Recent Transactions */}
              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Recent</div>
                <div className="space-y-2">
                  {[
                    { type: 'Received', amount: '+500 QF', from: 'vitalik.eth', time: '2h ago', color: 'text-green-400' },
                    { type: 'Sent',     amount: '-120 QF',  from: '0xMara',      time: '1d ago', color: 'text-red-400' },
                  ].map((tx, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-[#0f1729]/40 px-3 py-2 rounded-lg">
                      <div>
                        <span className={`font-semibold ${'text-white'}`}>{tx.type}</span>
                        <span className="text-gray-400 ml-1">· {tx.from}</span>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${tx.color}`}>{tx.amount}</div>
                        <div className="text-gray-500">{tx.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-3 bg-cyan-500/8 rounded-lg border border-cyan-500/20">
                <div className="text-xs text-gray-400"><span className="text-cyan-400 font-semibold">Fee Transparency:</span> 0.85% platform fee on all transactions. Builders pay 10% revenue share.</div>
              </div>
            </div>
          </>
        )}

        {/* ── BUY VIEW ── */}
        {view === 'buy' && (
          <>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-cyan-500/10">
              <button onClick={() => setView('main')} className="text-cyan-400 hover:text-cyan-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h2 className={`text-lg font-bold ${'text-white'}`}>Buy Crypto</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Token</label>
                <div className="flex gap-2">
                  {['QF'].map(t => (
                    <button key={t} onClick={() => setBuyToken(t)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all ${buyToken === t ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-[#0a0e1a] border-transparent' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" value={buyAmount} onChange={e => setBuyAmount(e.target.value)} placeholder="0.00"
                    className={`w-full bg-[#0f1729]/60 border border-cyan-500/20 rounded-lg pl-7 pr-4 py-3 text-lg font-bold focus:outline-none focus:border-cyan-500/50 ${'text-white'}`} />
                </div>
              </div>
              <div className="flex gap-2">
                {['$50', '$100', '$250', '$500'].map(amt => (
                  <button key={amt} onClick={() => setBuyAmount(amt.replace('$',''))}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-all">
                    {amt}
                  </button>
                ))}
              </div>
              {buyAmount && (
                <div className="bg-[#0f1729]/60 rounded-xl p-4 border border-cyan-500/20 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400"><span>You pay</span><span className={`font-semibold ${'text-white'}`}>${buyAmount}</span></div>
                  <div className="flex justify-between text-gray-400"><span>Platform fee (0.85%)</span><span className="text-cyan-400">${(parseFloat(buyAmount)*0.0085).toFixed(2)}</span></div>
                  <div className="flex justify-between text-gray-400 border-t border-cyan-500/10 pt-2"><span>You receive ~</span><span className="text-green-400 font-bold">{(parseFloat(buyAmount)/0.24).toFixed(0)} QF</span></div>
                </div>
              )}
              <button onClick={handleConfirm} disabled={!buyAmount}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-500 text-[#0a0e1a] hover:shadow-lg hover:shadow-cyan-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                Buy {buyToken}
              </button>
            </div>
          </>
        )}

        {/* ── SEND VIEW ── */}
        {view === 'send' && (
          <>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-cyan-500/10">
              <button onClick={() => setView('main')} className="text-cyan-400 hover:text-cyan-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h2 className={`text-lg font-bold ${'text-white'}`}>Send</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Token</label>
                <div className="flex gap-2">
                  {['QF'].map(t => (
                    <button key={t} onClick={() => setSendToken(t)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all ${sendToken === t ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-[#0a0e1a] border-transparent' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">To Address</label>
                <input type="text" value={sendAddress} onChange={e => setSendAddress(e.target.value)} placeholder="0x... or ENS name"
                  className={`w-full bg-[#0f1729]/60 border border-cyan-500/20 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-cyan-500/50 placeholder-gray-500 ${'text-white'}`} />
              </div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs text-gray-400">Amount</label>
                  <span className="text-xs text-cyan-400 cursor-pointer">Max: {qfBalance}</span>
                </div>
                <input type="number" value={sendAmount} onChange={e => setSendAmount(e.target.value)} placeholder="0.00"
                  className={`w-full bg-[#0f1729]/60 border border-cyan-500/20 rounded-lg px-4 py-3 text-lg font-bold focus:outline-none focus:border-cyan-500/50 ${'text-white'}`} />
              </div>
              {sendAmount && (
                <div className="bg-[#0f1729]/60 rounded-xl p-4 border border-cyan-500/20 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400"><span>Amount</span><span className={`font-semibold ${'text-white'}`}>{sendAmount} {sendToken}</span></div>
                  <div className="flex justify-between text-gray-400"><span>Platform fee (0.85%)</span><span className="text-cyan-400">{fee} {sendToken}</span></div>
                  <div className="flex justify-between text-gray-400"><span>Gas estimate</span><span className="text-gray-300">~$1.20</span></div>
                  <div className="flex justify-between font-bold border-t border-cyan-500/10 pt-2"><span>Total</span><span className={'text-white'}>{total} {sendToken}</span></div>
                </div>
              )}
              <button onClick={handleConfirm} disabled={!sendAmount || !sendAddress}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-500 text-[#0a0e1a] hover:shadow-lg hover:shadow-cyan-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                Send {sendToken}
              </button>
            </div>
          </>
        )}

        {/* ── RECEIVE VIEW ── */}
        {view === 'receive' && (
          <>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-cyan-500/10">
              <button onClick={() => setView('main')} className="text-cyan-400 hover:text-cyan-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h2 className={`text-lg font-bold ${'text-white'}`}>Receive</h2>
            </div>
            <div className="px-6 py-6 flex flex-col items-center text-center space-y-5">
              {/* QR Code simulation */}
              <div className="w-44 h-44 bg-white rounded-xl p-3 shadow-lg shadow-cyan-500/20">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {[...Array(10)].map((_, r) => [...Array(10)].map((_, c) => (
                    Math.random() > 0.5 ? <rect key={`${r}-${c}`} x={c*10} y={r*10} width={9} height={9} fill="#0a0e1a" rx="1" /> : null
                  )))}
                  <rect x="0" y="0" width="30" height="30" fill="none" stroke="#0a0e1a" strokeWidth="3" />
                  <rect x="5" y="5" width="20" height="20" fill="#0a0e1a" />
                  <rect x="70" y="0" width="30" height="30" fill="none" stroke="#0a0e1a" strokeWidth="3" />
                  <rect x="75" y="5" width="20" height="20" fill="#0a0e1a" />
                  <rect x="0" y="70" width="30" height="30" fill="none" stroke="#0a0e1a" strokeWidth="3" />
                  <rect x="5" y="75" width="20" height="20" fill="#0a0e1a" />
                  {[2,4,5,6,8].map(c => [1,3,5,7,9].map(r => (
                    <rect key={`m-${r}-${c}`} x={c*10} y={r*10} width={8} height={8} fill="#0a0e1a" rx="1" />
                  )))}
                </svg>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-2">Your Wallet Address</div>
                <div className="bg-[#0f1729]/60 border border-cyan-500/20 rounded-xl px-4 py-3 font-mono text-sm text-cyan-400 flex items-center gap-3">
                  <span className="truncate">0x4731a9B2c3d8E4f5a6B7C8D9E0F1A2B3C4D5E6F7</span>
                  <button className="flex-shrink-0 text-gray-400 hover:text-cyan-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-400 bg-cyan-500/8 border border-cyan-500/20 rounded-lg px-4 py-3">
                Only send <span className={`font-semibold ${'text-white'}`}>QF tokens</span> to this address. Sending other assets may result in permanent loss.
              </div>
            </div>
          </>
        )}

        {/* ── SWAP VIEW ── */}
        {view === 'swap' && (
          <>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-cyan-500/10">
              <button onClick={() => setView('main')} className="text-cyan-400 hover:text-cyan-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h2 className={`text-lg font-bold ${'text-white'}`}>Swap Tokens</h2>
            </div>
            <div className="px-6 py-6 space-y-4">
              {/* From Token */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">From</label>
                <div className="bg-[#0f1729]/60 border border-cyan-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <input
                      type="number"
                      value={swapAmount}
                      onChange={e => setSwapAmount(e.target.value)}
                      placeholder="0.0"
                      className={`bg-transparent text-2xl font-bold outline-none w-full ${'text-white'}`}
                    />
                    <select
                      value={swapFrom}
                      onChange={e => setSwapFrom(e.target.value)}
                      className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white px-3 py-2 rounded-lg font-semibold text-sm outline-none cursor-pointer"
                    >
                      <option value="QF">QF</option>
                    </select>
                  </div>
                  <div className="text-xs text-gray-400">
                    Balance: {qfBalance} QF
                  </div>
                </div>
              </div>

              {/* Swap Direction Icon */}
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    const temp = swapFrom;
                    setSwapFrom(swapTo);
                    setSwapTo(temp);
                  }}
                  className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/30 rounded-full flex items-center justify-center hover:bg-cyan-500/20 transition-all"
                >
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
              </div>

              {/* To Token */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">To (Estimated)</label>
                <div className="bg-[#0f1729]/60 border border-cyan-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-2xl font-bold ${'text-white'}`}>
                      {swapAmount ? (parseFloat(swapAmount) * swapRate).toFixed(4) : '0.0'}
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 text-white px-3 py-2 rounded-lg font-semibold text-sm">
                      {swapTo}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    Balance: {qfBalance} {swapTo}
                  </div>
                </div>
              </div>

              {/* Exchange Rate */}
              <div className="bg-cyan-500/8 border border-cyan-500/20 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Exchange Rate</span>
                  <span className={`font-semibold ${'text-white'}`}>
                    1 {swapFrom} = {swapRate.toFixed(4)} {swapTo}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Platform Fee (0.85%)</span>
                  <span className="text-cyan-400">
                    {swapAmount ? (parseFloat(swapAmount) * 0.0085).toFixed(4) : '0.0000'} {swapFrom}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>You'll Receive</span>
                  <span className={`font-bold ${'text-white'}`}>
                    {swapAmount ? ((parseFloat(swapAmount) * 0.9915) * swapRate).toFixed(4) : '0.0000'} {swapTo}
                  </span>
                </div>
              </div>

              {/* Swap Button */}
              <button
                onClick={() => handleConfirm()}
                disabled={!swapAmount || parseFloat(swapAmount) <= 0}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔄 Swap Tokens
              </button>
            </div>
          </>
        )}

        {/* ── CONFIRM / SUCCESS VIEW ── */}
        {view === 'confirm' && (
          <div className="px-6 py-10 flex flex-col items-center text-center">
            {!txDone ? (
              <>
                <div className="w-16 h-16 rounded-full border-4 border-cyan-500/30 border-t-cyan-500 animate-spin mb-6" />
                <div className="text-lg font-bold mb-2">Broadcasting Transaction</div>
                <div className="text-sm text-gray-400">Encrypting & signing on-chain…</div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-cyan-500 flex items-center justify-center mb-6 shadow-lg shadow-green-400/30">
                  <svg className="w-8 h-8 text-[#0a0e1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div className="text-xl font-bold mb-2 text-green-400">Transaction Sent!</div>
                <div className="text-sm text-gray-400 mb-6">Your transaction has been broadcast to the network.</div>
                <div className="text-xs font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-4 py-2 mb-6">Tx: 0x8f3a...c29d</div>
                <button onClick={reset} className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-500 text-[#0a0e1a] hover:shadow-lg hover:shadow-cyan-500/40 transition-all">
                  Back to Wallet
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

// Register Modal
const RegisterModal = ({ onClose }) => {
  const { address } = useAccount();
  const [name,            setName]            = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [category,        setCategory]        = useState('DeFi');
  const [description,     setDescription]     = useState('');
  const [dappUrl,         setDappUrl]         = useState('');
  const [logoUrl,         setLogoUrl]         = useState('');
  const [agreedToTerms,   setAgreedToTerms]   = useState(false);
  const [hasBackend,      setHasBackend]       = useState(false);
  const [isSubmitting,    setIsSubmitting]     = useState(false);
  const [submitError,     setSubmitError]      = useState(null);
  const [step,            setStep]             = useState(''); // '', 'signing', 'saving', 'done'
  const [listingFee,      setListingFee]       = useState(null); // { wei, qf, usd }

  // Fetch listing fee when modal opens
  useEffect(() => {
    getListingFee()
      .then(fee => setListingFee(fee))
      .catch(() => setListingFee(null));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!address)               { setSubmitError('Connect your wallet to register a dApp'); return; }
    if (!agreedToTerms)         { setSubmitError('You must agree to the Terms of Service'); return; }
    if (!name.trim())           { setSubmitError('dApp name is required'); return; }
    if (!contractAddress.trim()) { setSubmitError('Contract address is required'); return; }
    if (!description.trim())    { setSubmitError('Description is required'); return; }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Step 1: on-chain registration (wallet signs tx, pays $20 listing fee)
      setStep('signing');
      const { dappId, txHash } = await registerDappOnChain({
        name:            name.trim(),
        description:     description.trim(),
        category,
        logoUrl:         logoUrl.trim(),
        dappUrl:         dappUrl.trim(),
        contractAddress: contractAddress.trim(),
      });

      // Step 2: save to backend with the on-chain dappId so they stay in sync
      setStep('saving');
      await registerDapp({
        dappId,
        name:            name.trim(),
        description:     description.trim(),
        contractAddress: contractAddress.trim(),
        builder:         address,
        category,
        logoUrl:         logoUrl.trim(),
        ...(dappUrl.trim()  ? { dappUrl:  dappUrl.trim()  } : {}),
        txHash,
        hasBackend,
      });

      setStep('done');
      setTimeout(onClose, 1800);
    } catch (err) {
      setSubmitError(err.message);
      setStep('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepLabel = step === 'signing' ? 'Waiting for wallet signature...'
                  : step === 'saving'  ? 'Saving to database...'
                  : step === 'done'    ? (hasBackend ? '✓ Registered! Install SDK to go live.' : '✓ dApp registered successfully!')
                  : 'Register dApp';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0e1a]/80 backdrop-blur-sm overflow-y-auto py-8" onClick={onClose}>
      <div className="bg-gradient-to-b from-[#0f1729]/90 to-[#0a0e1a]/90 border border-cyan-500/20 rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">Register New dApp</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Listing fee banner */}
        <div className="mb-5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-cyan-300">Listing Fee</div>
            <div className="text-xs text-gray-400 mt-0.5">Register your dApp on-chain for free</div>
          </div>
          <div className="text-right">
            {listingFee === null ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : parseFloat(listingFee.qf) === 0 ? (
              <div className="text-lg font-bold text-green-400">FREE</div>
            ) : (
              <>
                <div className="text-lg font-bold text-cyan-400">{parseFloat(listingFee.qf).toFixed(4)} QF</div>
              </>
            )}
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Logo URL */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">
              Logo URL <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <div className="flex gap-3 items-center">
              <div className="w-12 h-12 rounded-lg bg-[#0f1729]/60 border border-cyan-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <input
                type="url"
                placeholder="https://example.com/logo.png"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-white border border-cyan-500/30 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 text-sm"
                style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">dApp Name</label>
            <input
              type="text"
              placeholder="Enter your dApp name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-cyan-500/30 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
              style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">Contract Address</label>
            <input
              type="text"
              placeholder="0x..."
              value={contractAddress}
              onChange={e => setContractAddress(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-cyan-500/30 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 font-mono text-sm"
              style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-cyan-500/30 text-gray-900 focus:outline-none focus:border-cyan-500/50"
                style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
              >
                <option>DeFi</option>
                <option>Gaming</option>
                <option>NFT</option>
                <option>Social</option>
                <option>DAO</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Revenue Model</label>
              <select
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-cyan-500/30 text-gray-900 focus:outline-none focus:border-cyan-500/50"
                style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
              >
                <option>Standard 0.85% + 10% Builder Share</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">Description</label>
            <textarea
              placeholder="Describe your dApp..."
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-cyan-500/30 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 resize-none"
              style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">
              dApp URL <span className="text-gray-500 font-normal">(optional — enables Launch dApp)</span>
            </label>
            <input
              type="url"
              placeholder="https://your-dapp.com"
              value={dappUrl}
              onChange={e => setDappUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-cyan-500/30 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
              style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
            />
          </div>

          {/* Backend flag */}
          <div className="bg-[#0f1729]/60 rounded-lg p-3 border border-cyan-500/20">
            <label className="flex items-start gap-2 text-xs text-gray-300 cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={hasBackend} onChange={e => setHasBackend(e.target.checked)} />
              <span>
                <span className="text-white font-semibold">My dApp has a backend API</span>
                {' '}— it makes server-side calls (database, auth, etc). Your listing will be <span className="text-yellow-400">pending</span> until you install the <span className="text-cyan-400">@qf-dappstore/sdk</span> to enable fee collection in popup mode.
              </span>
            </label>
          </div>

          {hasBackend && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 text-xs text-yellow-300 space-y-1">
              <div className="font-semibold">After registration you must:</div>
              <div>1. Install: <code className="bg-black/30 px-1 rounded">npm install @qf-dappstore/sdk</code></div>
              <div>2. Add to your app: <code className="bg-black/30 px-1 rounded">sdk.install()</code></div>
              <div>3. Verify via the DappStore builder dashboard to go live</div>
            </div>
          )}

          <div className="bg-[#0f1729]/60 rounded-lg p-3 border border-cyan-500/20">
            <label className="flex items-start gap-2 text-xs text-gray-300 cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} />
              <span>I agree to the <span className="text-cyan-400">Terms of Service</span> and understand that a 0.85% platform fee on transactions and 10% builder revenue share will be applied to my dApp.</span>
            </label>
          </div>

          {submitError && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{submitError}</div>
          )}
          {step === 'done' && !hasBackend && (
            <div className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">✓ dApp registered and live in the DappStore!</div>
          )}
          {step === 'done' && hasBackend && (
            <div className="text-yellow-400 text-sm bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 space-y-1">
              <div className="font-semibold">✓ Registered on-chain! Your listing is pending.</div>
              <div>Install <code className="bg-black/30 px-1 rounded">@qf-dappstore/sdk</code> in your dApp, then verify from your builder dashboard to go live.</div>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 py-2.5 rounded-lg font-semibold hover:bg-cyan-500/20 transition-all disabled:opacity-40">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || !listingFee} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-[#0a0e1a] py-2.5 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              {isSubmitting ? stepLabel : listingFee && parseFloat(listingFee.qf) === 0 ? 'Register dApp — Free' : `Register dApp — ${listingFee ? `${parseFloat(listingFee.qf).toFixed(4)} QF` : '...'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Secure Chat Bubble
const statusColor = { online: 'bg-green-400', away: 'bg-yellow-400', offline: 'bg-gray-500' };

function chatShortAddr(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function chatFmtTime(unixSec) {
  if (!unixSec) return '';
  const d = new Date(unixSec * 1000);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Resolves @username for a wallet address, falls back to short address
const ChatPeerName = ({ address, className = '' }) => {
  const { username } = useUsername(address);
  if (username) {
    return <span className={className} style={{ color: '#06b6d4', fontWeight: 700 }}>@{username}</span>;
  }
  return <span className={className} style={{ fontFamily: 'monospace' }}>{chatShortAddr(address)}</span>;
};

const SecureChatBubble = () => {
  // ── UI state ────────────────────────────────────────────────────────────
  const [open, setOpen]                   = useState(false);
  const [activeFriend, setActiveFriend]   = useState(null); // { id, name, avatar, address, status }
  const [input, setInput]                 = useState('');
  const [search, setSearch]               = useState('');
  const [showTransfer, setShowTransfer]   = useState(false);
  const [transferType, setTransferType]   = useState(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferCurrency, setTransferCurrency] = useState('QF');
  const [showFileMenu, setShowFileMenu]   = useState(false);
  const [showNewChat, setShowNewChat]     = useState(false);
  const [newPeerAddress, setNewPeerAddress] = useState('');
  const [newPeerError, setNewPeerError]   = useState('');

  // ── Blockchain state ─────────────────────────────────────────────────────
  const [myAddress,     setMyAddress]     = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages,      setMessages]      = useState([]);
  const [tokenPrices,   setTokenPrices]   = useState([]);
  const [selectedToken, setSelectedToken] = useState(NATIVE_TOKEN);
  const [sending,       setSending]       = useState(false);
  const [sendError,     setSendError]     = useState('');
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);

  const bottomRef    = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // ── Get connected MetaMask address ───────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    const eth = window.ethereum;
    eth.request({ method: 'eth_accounts' })
      .then(accounts => { if (accounts.length) setMyAddress(accounts[0].toLowerCase()); })
      .catch(() => {});
    const handler = accounts => setMyAddress(accounts.length ? accounts[0].toLowerCase() : null);
    eth.on('accountsChanged', handler);
    return () => eth.removeListener('accountsChanged', handler);
  }, []);

  // ── When panel opens: ensure wallet is connected ─────────────────────────
  useEffect(() => {
    if (!open || typeof window === 'undefined' || !window.ethereum) return;
    // If no address yet, request access (shows MetaMask popup if needed)
    if (!myAddress) {
      window.ethereum.request({ method: 'eth_requestAccounts' })
        .then(accounts => { if (accounts.length) setMyAddress(accounts[0].toLowerCase()); })
        .catch(() => {});
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load token prices when panel opens ───────────────────────────────────
  useEffect(() => {
    if (!open) return;
    getAllTokenPrices()
      .then(setTokenPrices)
      .catch(() => setTokenPrices([{
        address: NATIVE_TOKEN, symbol: 'QF',
        priceUSD: 1.00, messageCostUSD: 0.01, costInToken: 0.01, costInWei: '10000000000000000',
      }]));
  }, [open]);

  // ── Load conversation list ───────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!myAddress) return;
    const list = await getConversationList(myAddress);
    setConversations(list.map(c => ({
      id:      c.peer,
      name:    chatShortAddr(c.peer),
      avatar:  c.peer.slice(2, 4).toUpperCase(),
      address: c.peer,
      status:  'online',
      lastMsg: c.lastMessage,
      time:    chatFmtTime(c.timestamp),
      unread:  0,
    })));
  }, [myAddress]);

  useEffect(() => { if (open && myAddress) loadConversations(); }, [open, myAddress, loadConversations]);

  // ── Load messages for active conversation (always from chain) ───────────
  useEffect(() => {
    if (!activeFriend || !myAddress) return;
    setLoadingMsgs(true);
    getConversation(myAddress, activeFriend.address, true)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoadingMsgs(false));
  }, [activeFriend, myAddress]);

  // ── Poll every 10 s (always from chain) ──────────────────────────────────
  useEffect(() => {
    if (!activeFriend || !myAddress) return;
    const iv = setInterval(() => {
      getConversation(myAddress, activeFriend.address, true).then(setMessages).catch(() => {});
    }, 10_000);
    return () => clearInterval(iv);
  }, [activeFriend, myAddress]);

  // ── Scroll to bottom ─────────────────────────────────────────────────────
  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeFriend]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const selectedTokenInfo = tokenPrices.find(
    t => t.address.toLowerCase() === selectedToken.toLowerCase()
  ) ?? tokenPrices[0];
  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);
  const filtered    = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.address.toLowerCase().includes(search.toLowerCase())
  );

  // ── Start new chat with a wallet address ─────────────────────────────────
  const startNewChat = () => {
    const addr = newPeerAddress.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
      setNewPeerError('Please enter a valid Ethereum address (0x…)');
      return;
    }
    if (addr.toLowerCase() === myAddress?.toLowerCase()) {
      setNewPeerError('You cannot message yourself');
      return;
    }
    setActiveFriend({
      id: addr.toLowerCase(), name: chatShortAddr(addr),
      avatar: addr.slice(2, 4).toUpperCase(), address: addr.toLowerCase(),
      status: 'online', lastMsg: '', time: 'now', unread: 0,
    });
    setMessages([]);
    setNewPeerAddress('');
    setNewPeerError('');
    setShowNewChat(false);
  };

  // ── Send message via contract ─────────────────────────────────────────────
  const send = async () => {
    if (!input.trim() || !activeFriend || !myAddress || sending) return;
    setSending(true);
    setSendError('');
    try {
      await chatSendMessage(activeFriend.address, input.trim(), selectedToken);
      // forceChain=true: read directly from contract so the new message
      // appears immediately, bypassing the backend which may have stale messageIds.
      const updated = await getConversation(myAddress, activeFriend.address, true);
      setMessages(updated);
      setInput('');
      loadConversations();
    } catch (err) {
      if (err?.code === 4001) {
        setSendError('Transaction cancelled');
      } else if (err?.message?.includes('Insufficient') || err?.message?.includes('insufficient')) {
        const sym = selectedTokenInfo?.symbol ?? 'QF';
        const amt = selectedTokenInfo?.costInToken?.toFixed(4) ?? '0.01';
        setSendError(`Insufficient balance. Need ${amt} ${sym} to send.`);
      } else {
        setSendError(err?.message ?? 'Transaction failed. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  // local-only optimistic inserts for transfer / file messages (off-chain UI actions)
  const appendLocal = (msg) => setMessages(prev => [...prev, {
    id: Date.now(), sender: myAddress ?? 'me', recipient: activeFriend?.address ?? '',
    content: msg.text, paymentToken: NATIVE_TOKEN, amountPaid: '0',
    timestamp: Math.floor(Date.now() / 1000), _local: true, ...msg,
  }]);

  const sendFunds = () => {
    if (!transferAmount || !activeFriend) return;
    appendLocal({ text: `🔐 Sent ${transferAmount} QF`, type: 'transfer', currency: 'QF' });
    setTransferAmount(''); setShowTransfer(false); setTransferType(null); setTransferCurrency('QF');
    setTimeout(() => appendLocal({ text: '✅ Payment received on-chain!', _them: true }), 1000);
  };

  const requestFunds = () => {
    if (!transferAmount || !activeFriend) return;
    appendLocal({ text: `🔐 Requesting ${transferAmount} QF`, type: 'request', currency: 'QF' });
    setTransferAmount(''); setShowTransfer(false); setTransferType(null); setTransferCurrency('QF');
    setTimeout(() => appendLocal({ text: '👍 Payment request received!', _them: true }), 1000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !activeFriend) return;
    const fileSize = (file.size / 1024).toFixed(1);
    const fileExt = file.name.split('.').pop().toUpperCase();
    appendLocal({ text: file.name, type: 'file', fileSize, fileExt });
    setShowFileMenu(false);
    setTimeout(() => appendLocal({ text: '📁 File received securely!', _them: true }), 1000);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !activeFriend) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      appendLocal({ text: file.name, type: 'image', imageData: event.target.result });
      setShowFileMenu(false);
      setTimeout(() => appendLocal({ text: '🖼️ Image received!', _them: true }), 1000);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
        style={{ boxShadow: '0 0 24px rgba(6,182,212,0.6)' }}
      >
        {open ? (
          <svg className="w-6 h-6 text-[#0a0e1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-[#0a0e1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6a2 2 0 012-2h14a2 2 0 012 2v10z" />
          </svg>
        )}
        {!open && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-400 text-[#0a0e1a] rounded-full text-[10px] font-bold flex items-center justify-center">{totalUnread}</span>
        )}
        {!open && <span className="absolute inset-0 rounded-full animate-ping bg-cyan-400 opacity-20" />}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          style={{ width: 320, height: 480, boxShadow: '0 0 40px rgba(6,182,212,0.25)', border: '1px solid rgba(6,182,212,0.25)', background: '#080d18' }}
        >
          {/* ── Header ── */}
          <div className="bg-gradient-to-r from-[#0f1d2e] to-[#0a1525] px-4 py-3 flex items-center gap-2 border-b border-cyan-500/20 flex-shrink-0">
            {activeFriend ? (
              <>
                <button onClick={() => { setActiveFriend(null); setInput(''); }} className="text-cyan-400 hover:text-cyan-300 mr-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="relative">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-[#0a0e1a]">{activeFriend.avatar}</div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0f1d2e] ${statusColor[activeFriend.status]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <ChatPeerName address={activeFriend.address} className="text-sm font-bold truncate" />
                  <div className="text-[10px] text-cyan-400 font-mono">{activeFriend.status}</div>
                </div>
                <svg className="w-4 h-4 text-cyan-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </>
            ) : (
              <>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm flex-shrink-0">💬</div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">Secure Chat</div>
                  <div className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                    {conversations.filter(c => c.status === 'online').length || myAddress ? 'connected' : 'not connected'}
                  </div>
                </div>
                {/* New Chat Button */}
                <button
                  onClick={() => setShowNewChat(true)}
                  className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 p-1.5 rounded-lg hover:bg-cyan-500/20 transition-all"
                  title="Start new chat"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* ── Friends List ── */}
          {!activeFriend && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Search */}
              <div className="px-3 py-2 border-b border-cyan-500/10 flex-shrink-0">
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by address..."
                  className="w-full bg-white border border-cyan-500/30 rounded-lg px-3 py-1.5 text-xs text-gray-900 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#0f172a'
                  }}
                />
              </div>
              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {!myAddress && (
                  <div className="px-4 py-6 text-center text-xs text-gray-500">
                    Connect your wallet to see conversations
                  </div>
                )}
                {myAddress && filtered.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-gray-500">
                    No conversations yet.<br/>Click <span className="text-cyan-400">+</span> to start one.
                  </div>
                )}
                {filtered.map(friend => (
                  <button
                    key={friend.id}
                    onClick={() => setActiveFriend(friend)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cyan-500/5 transition-colors border-b border-cyan-500/5 text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/30 flex items-center justify-center text-sm font-bold text-cyan-300">
                        {friend.avatar}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#080d18] ${statusColor[friend.status]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <ChatPeerName address={friend.address} className="text-sm font-semibold truncate" />
                        <span className="text-[10px] text-gray-500 flex-shrink-0 ml-2">{friend.time}</span>
                      </div>
                      <div className="text-xs text-gray-400 truncate">{friend.lastMsg}</div>
                    </div>
                    {friend.unread > 0 && (
                      <span className="flex-shrink-0 w-5 h-5 bg-cyan-500 text-[#0a0e1a] rounded-full text-[10px] font-bold flex items-center justify-center">
                        {friend.unread}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Chat View ── */}
          {activeFriend && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {loadingMsgs && (
                  <div className="text-center text-xs text-gray-500 py-4">Loading messages…</div>
                )}
                {!loadingMsgs && messages.length === 0 && (
                  <div className="text-center text-xs text-gray-500 py-6">No messages yet. Say hello!</div>
                )}
                {messages.map((msg, i) => {
                  // Normalise: on-chain ChatMessage vs local optimistic inserts
                  const isMine = msg._them
                    ? false
                    : msg.sender
                      ? msg.sender.toLowerCase() === myAddress?.toLowerCase()
                      : msg.from === 'me';
                  const text   = msg.content ?? msg.text ?? '';
                  const type   = msg.type;
                  return (
                  <div key={msg.id ?? i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    {/* Image Message */}
                    {type === 'image' ? (
                      <div className={`max-w-[78%] rounded-xl overflow-hidden ${
                        isMine ? 'rounded-br-sm' : 'rounded-bl-sm'
                      }`}>
                        <img src={msg.imageData} alt={text} className="w-full h-auto max-h-64 object-cover" style={{display:'block'}} />
                        <div className={`px-3 py-2 text-[10px] font-mono ${isMine ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white' : 'bg-[#0f1729] border-t border-cyan-500/20 text-gray-400'}`}>
                          🖼️ {text} • Encrypted
                        </div>
                      </div>
                    ) : type === 'file' ? (
                      <div className={`max-w-[78%] px-4 py-3 rounded-xl ${isMine ? 'bg-gradient-to-br from-orange-600 to-red-700 text-white rounded-br-sm' : 'bg-[#0f1729] border border-cyan-500/20 text-gray-300 rounded-bl-sm'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0"><span className="text-lg">📄</span></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold truncate">{text}</div>
                            <div className="text-[10px] opacity-75 font-mono mt-0.5">{msg.fileExt} • {msg.fileSize} KB • Encrypted</div>
                          </div>
                          <button className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={`max-w-[78%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                        type === 'transfer' && msg.currency === 'QF' ? 'bg-gradient-to-br from-purple-600 to-pink-700 text-white rounded-br-sm border-2 border-purple-400/50'
                        : type === 'transfer'   ? 'bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-br-sm border-2 border-green-400/50'
                        : type === 'request'    ? 'bg-gradient-to-br from-purple-600 to-pink-700 text-white rounded-br-sm border-2 border-purple-400/50'
                        : isMine                ? 'bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-br-sm'
                        :                         'bg-[#0f1729] border border-cyan-500/20 text-gray-300 rounded-bl-sm'
                      }`}>
                        {text}
                        {(type === 'transfer' || type === 'request') && (
                          <div className="text-[10px] mt-1 opacity-75 font-mono flex items-center gap-1">
                            {msg.currency === 'QF' && <span>🔐</span>}On-chain • Instant
                          </div>
                        )}
                        {msg.timestamp && !(type === 'transfer' || type === 'request') && (
                          <div className="text-[10px] mt-1 opacity-50 text-right">{chatFmtTime(msg.timestamp)}</div>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              {/* ── Cost bar ── */}
              <div className="bg-[#0a0f1e] border-t border-cyan-500/10 px-3 pt-2 pb-1 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500">Pay with:</span>
                  {tokenPrices.length > 1 ? (
                    <select value={selectedToken} onChange={e => setSelectedToken(e.target.value)}
                      className="bg-cyan-500/10 border border-cyan-500/20 rounded text-cyan-400 text-[10px] px-1.5 py-0.5 outline-none cursor-pointer">
                      {tokenPrices.map(t => <option key={t.address} value={t.address}>{t.symbol}</option>)}
                    </select>
                  ) : (
                    <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded px-1.5 py-0.5">
                      {tokenPrices[0]?.symbol ?? 'QF'}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400">
                    Cost: <span className="text-cyan-400 font-medium">$0.01</span>
                    {selectedTokenInfo && (
                      <span className="text-gray-600 ml-1">
                        ≈ {calculateCostInToken(0.01, selectedTokenInfo.priceUSD)} {selectedTokenInfo.symbol}
                      </span>
                    )}
                  </span>
                </div>
              </div>
              {sendError && (
                <div className="bg-red-500/10 border-t border-red-500/20 px-3 py-1 text-[10px] text-red-400 flex-shrink-0">
                  {sendError}
                </div>
              )}
              <div className="bg-[#0a0f1e] px-3 py-2 flex items-center gap-2 flex-shrink-0">
                {/* Hidden file inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.zip,.rar"
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  onChange={handleImageUpload}
                  className="hidden"
                  accept="image/*"
                />

                {/* + Button with File Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowFileMenu(!showFileMenu)}
                    className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center hover:shadow-lg hover:shadow-purple-500/40 transition-all flex-shrink-0"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>

                  {/* File Menu Popup */}
                  {showFileMenu && (
                    <div className="absolute bottom-full left-0 mb-2 bg-[#0f1d2e] border border-cyan-500/30 rounded-xl shadow-2xl overflow-hidden" style={{width: 180}}>
                      <button
                        onClick={() => { setShowTransfer(true); setShowFileMenu(false); }}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-white hover:bg-cyan-500/10 flex items-center gap-2 transition-colors"
                      >
                        <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-xs">💸</span>
                        Transfer Funds
                      </button>
                      <button
                        onClick={() => { imageInputRef.current?.click(); setShowFileMenu(false); }}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-white hover:bg-cyan-500/10 flex items-center gap-2 transition-colors border-t border-cyan-500/10"
                      >
                        <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs">🖼️</span>
                        Send Picture
                      </button>
                      <button
                        onClick={() => { fileInputRef.current?.click(); setShowFileMenu(false); }}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-white hover:bg-cyan-500/10 flex items-center gap-2 transition-colors border-t border-cyan-500/10"
                      >
                        <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-xs">📁</span>
                        Send File
                      </button>
                    </div>
                  )}
                </div>
                
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder={`Message ${chatShortAddr(activeFriend.address)}...`}
                  className="flex-1 bg-white border border-cyan-500/30 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#0f172a'
                  }}
                />
                <button
                  onClick={send}
                  disabled={sending || !input.trim()}
                  className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center hover:shadow-lg hover:shadow-cyan-500/40 transition-all flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={sending ? 'Sending…' : 'Send ($0.01)'}
                >
                  {sending ? (
                    <span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.8s linear infinite' }} />
                  ) : (
                    <svg className="w-4 h-4 text-[#0a0e1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Transfer Modal */}
              {showTransfer && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-10">
                  <div className="bg-gradient-to-b from-[#0f1d2e] to-[#0a1525] border border-cyan-500/30 rounded-2xl p-6 w-full max-w-[280px] shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-black text-white">Transfer Funds</h3>
                      <button onClick={() => { setShowTransfer(false); setTransferType(null); setTransferAmount(''); setTransferCurrency('QF'); }} className="text-gray-400 hover:text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="text-sm text-cyan-400 mb-4 font-mono">To: {activeFriend.name}</div>

                    {!transferType ? (
                      <div className="space-y-3">
                        <button
                          onClick={() => setTransferType('send')}
                          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-green-500/40 transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Send Funds
                        </button>
                        <button
                          onClick={() => setTransferType('request')}
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/40 transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Request Funds
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Currency Toggle */}
                        <div>
                          <label className="text-xs text-gray-400 mb-2 block">Currency</label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setTransferCurrency('QF')}
                              className="flex-1 py-2 rounded-lg font-bold text-xs transition-all bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/40"
                            >
                              🔐 QF
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-gray-400 mb-2 block">Amount ({transferCurrency})</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={transferAmount}
                              onChange={e => setTransferAmount(e.target.value)}
                              step={transferCurrency === 'QF' ? '1' : '0.001'}
                              min="0"
                              placeholder="0.00"
                              className={`w-full border rounded-xl px-4 py-3 text-gray-900 text-lg font-mono focus:outline-none ${
                                transferCurrency === 'QF'
                                  ? 'bg-white border-purple-500/30 focus:border-purple-500/60'
                                  : 'bg-white border-cyan-500/30 focus:border-cyan-500/60'
                              }`}
                              style={{
                                backgroundColor: '#ffffff',
                                color: '#0f172a'
                              }}
                            />
                            <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold ${
                              transferCurrency === 'QF' ? 'text-purple-400' : 'text-cyan-400'
                            }`}>
                              {transferCurrency}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {['10', '50', '100', '500'].map(amt => (
                            <button
                              key={amt}
                              onClick={() => setTransferAmount(amt)}
                              className="flex-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg py-2 text-xs font-bold text-cyan-400 transition-all"
                            >
                              {amt}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={transferType === 'send' ? sendFunds : requestFunds}
                          disabled={!transferAmount || parseFloat(transferAmount) <= 0}
                          className={`w-full text-white py-3 rounded-xl font-black text-sm hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            transferCurrency === 'QF'
                              ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:shadow-purple-500/50'
                              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-cyan-500/50'
                          }`}
                        >
                          {transferType === 'send' 
                            ? `🔐 Send QF`
                            : `🔐 Request QF`
                          }
                        </button>

                        <button
                          onClick={() => setTransferType(null)}
                          className="w-full bg-gray-700/50 hover:bg-gray-700/70 text-gray-300 py-2 rounded-lg text-xs font-semibold transition-all"
                        >
                          Back
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setShowNewChat(false); setNewPeerAddress(''); setNewPeerError(''); }}>
          <div
            className="bg-gradient-to-b from-[#0f1729]/95 to-[#0a0e1a]/95 border border-cyan-500/20 rounded-2xl w-full max-w-sm mx-4 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-cyan-500/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">New Conversation</h2>
                <button onClick={() => { setShowNewChat(false); setNewPeerAddress(''); setNewPeerError(''); }} className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3">Enter the wallet address you want to message. Each message costs <span className="text-cyan-400">$0.01</span> in QF.</p>
              <input
                type="text"
                value={newPeerAddress}
                onChange={e => { setNewPeerAddress(e.target.value); setNewPeerError(''); }}
                onKeyDown={e => e.key === 'Enter' && startNewChat()}
                placeholder="0x1234...5678"
                className="w-full border border-cyan-500/30 rounded-lg px-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 font-mono"
                autoFocus
                style={{ backgroundColor: '#0f1729', color: '#e2e8f0' }}
              />
              {newPeerError && <p className="text-xs text-red-400 mt-2">{newPeerError}</p>}
            </div>

            <div className="p-4 space-y-3">
              <button
                onClick={startNewChat}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-cyan-500/40 transition-all"
              >
                Start Chat
              </button>
              <div className="text-center text-xs text-gray-600">
                {myAddress ? (
                  <>Your address: <span className="text-cyan-500 font-mono">{chatShortAddr(myAddress)}</span></>
                ) : (
                  <span className="text-yellow-500">Connect your wallet first</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Docs Page ────────────────────────────────────────────────────────────────
const DOCS_SECTIONS = [
  {
    key: 'getting-started',
    label: 'Getting Started',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    key: 'for-users',
    label: 'For Users',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    key: 'for-builders',
    label: 'For Builders',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    key: 'sdk',
    label: 'SDK Reference',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: 'api',
    label: 'REST API',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    ),
  },
  {
    key: 'contracts',
    label: 'Smart Contracts',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

const Code = ({ children }) => (
  <code className="bg-[#0a0e1a] border border-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded text-sm font-mono">{children}</code>
);

const CodeBlock = ({ children, language = '' }) => (
  <pre className="bg-[#0a0e1a] border border-cyan-500/20 rounded-xl p-4 overflow-x-auto text-sm font-mono text-cyan-300 my-3">
    {language && <div className="text-xs text-gray-500 mb-2">{language}</div>}
    <code>{children}</code>
  </pre>
);

const DocSection = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-xl font-bold text-white mb-4 pb-2 border-b border-cyan-500/20">{title}</h2>
    {children}
  </div>
);

const DocSubSection = ({ title, children }) => (
  <div className="mb-5">
    <h3 className="text-base font-semibold text-cyan-400 mb-2">{title}</h3>
    {children}
  </div>
);

const ApiRoute = ({ method, path, desc, body, response }) => {
  const colors = { GET: 'text-green-400 bg-green-400/10 border-green-400/30', POST: 'text-blue-400 bg-blue-400/10 border-blue-400/30', DELETE: 'text-red-400 bg-red-400/10 border-red-400/30' };
  return (
    <div className="bg-[#0f1729]/60 border border-cyan-500/10 rounded-xl p-4 mb-3">
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <span className={`text-xs font-bold px-2 py-0.5 rounded border font-mono ${colors[method] ?? colors.GET}`}>{method}</span>
        <code className="text-sm font-mono text-white">{path}</code>
      </div>
      <p className="text-gray-400 text-sm mb-3">{desc}</p>
      {body && (
        <div className="mb-2">
          <div className="text-xs text-gray-500 mb-1">Request body</div>
          <CodeBlock>{body}</CodeBlock>
        </div>
      )}
      {response && (
        <div>
          <div className="text-xs text-gray-500 mb-1">Response</div>
          <CodeBlock>{response}</CodeBlock>
        </div>
      )}
    </div>
  );
};

const DOCS_CONTENT = {
  'getting-started': (
    <div>
      <DocSection title="What is QF DappStore?">
        <p className="text-gray-300 text-sm leading-relaxed mb-3">
          QF DappStore is a permissionless distribution layer for decentralized applications built on <span className="text-cyan-400 font-semibold">QF Network</span> (Chain ID 3426). It lets anyone browse, launch, and interact with dApps using a single QF wallet — no sign-ups, no intermediaries.
        </p>
        <p className="text-gray-300 text-sm leading-relaxed">
          Builders register their dApps on-chain via <Code>RegistryMini</Code>, install the SDK for fee routing, and go live once verified. Users connect their wallet and start exploring immediately.
        </p>
      </DocSection>

      <DocSection title="QF Network">
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: 'Network Name', value: 'QF Network' },
            { label: 'Chain ID', value: '3426' },
            { label: 'RPC URL', value: 'https://archive.mainnet.qfnode.net/eth' },
            { label: 'Explorer', value: 'portal.qfnetwork.xyz' },
            { label: 'Currency', value: 'QF' },
            { label: 'VM', value: 'PolkaVM (pallet_revive)' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#0f1729]/60 border border-cyan-500/10 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-0.5">{label}</div>
              <div className="text-sm font-mono text-cyan-300">{value}</div>
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection title="Architecture Overview">
        <div className="space-y-3 text-sm text-gray-300">
          {[
            { name: 'RegistryMini', addr: '0x1Aa08c6A63f8748506c09DDb54e73f3F461991cF', desc: 'dApp registry — submit and approve listings' },
            { name: 'UsernameRegistryMini', addr: '0xe20a5602cc82c15b2ef822a09243056ea199ce81', desc: 'On-chain username registry (bytes32)' },
            { name: 'ChatMini', addr: '0x5a0479d84c1e87280ba31c81cea0a7c26ca09f64', desc: 'On-chain messaging with fee routing' },
            { name: 'DappProxy', addr: '0x301b9ADE737B921c00A1481C97A233633c9dEa03', desc: 'Fee splitter — platform + builder revenue share' },
          ].map(c => (
            <div key={c.name} className="bg-[#0f1729]/60 border border-cyan-500/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-white">{c.name}</span>
              </div>
              <div className="text-xs font-mono text-cyan-400/70 mb-1">{c.addr}</div>
              <div className="text-xs text-gray-400">{c.desc}</div>
            </div>
          ))}
        </div>
      </DocSection>
    </div>
  ),

  'for-users': (
    <div>
      <DocSection title="Connecting Your Wallet">
        <DocSubSection title="Supported Wallets">
          <p className="text-gray-300 text-sm mb-2">Any EVM-compatible wallet works — MetaMask, Talisman, Rabby, etc.</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
            <li>Click <span className="text-cyan-400 font-semibold">Connect Wallet</span> in the top-right corner</li>
            <li>Select your wallet from the modal</li>
            <li>Add QF Network if prompted (Chain ID: 3426)</li>
            <li>Approve the connection</li>
          </ol>
        </DocSubSection>
        <DocSubSection title="Adding QF Network Manually">
          <CodeBlock language="Network details">{`Network Name:  QF Network
RPC URL:       https://archive.mainnet.qfnode.net/eth
Chain ID:      3426
Currency:      QF
Explorer:      https://portal.qfnetwork.xyz`}</CodeBlock>
        </DocSubSection>
      </DocSection>

      <DocSection title="Setting a Username">
        <p className="text-gray-300 text-sm mb-3">Usernames are registered on-chain via <Code>UsernameRegistryMini</Code> and stored as <Code>bytes32</Code>. They are 3–20 characters, letters, numbers and underscores only.</p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
          <li>Connect your wallet</li>
          <li>Click your wallet address in the top bar</li>
          <li>Enter a username and click <span className="text-cyan-400 font-semibold">Register</span></li>
          <li>Sign the transaction — username is now yours on-chain</li>
        </ol>
      </DocSection>

      <DocSection title="Secure Chat">
        <p className="text-gray-300 text-sm mb-3">The chat bubble (bottom-right) lets you message any wallet address directly. Messages are sent on-chain via <Code>ChatMini</Code> and mirrored to the backend for fast retrieval.</p>
        <DocSubSection title="Sending a Message">
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
            <li>Click the chat bubble icon</li>
            <li>Enter a wallet address or <Code>@username</Code></li>
            <li>Type your message and click Send</li>
            <li>Sign the transaction in your wallet</li>
          </ol>
        </DocSubSection>
      </DocSection>

      <DocSection title="Browsing & Launching dApps">
        <p className="text-gray-300 text-sm mb-2">The Explore tab shows all live dApps. Click any card to open the dApp profile. From there you can:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
          <li>Open the dApp in an iframe (embedded mode)</li>
          <li>Open in a new tab (popup mode)</li>
          <li>View stats, reviews, and on-chain details</li>
          <li>Star it to your favorites shelf</li>
        </ul>
      </DocSection>
    </div>
  ),

  'for-builders': (
    <div>
      <DocSection title="Listing Your dApp">
        <p className="text-gray-300 text-sm mb-3">Listing is currently <span className="text-green-400 font-semibold">free</span>. Registration happens in two steps: an on-chain transaction followed by a backend save.</p>
        <DocSubSection title="Step 1 — Submit on-chain">
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
            <li>Connect your wallet on QF Network</li>
            <li>Click <span className="text-cyan-400 font-semibold">Register dApp</span> in the Builders tab</li>
            <li>Fill in name, description, contract address, category, and dApp URL</li>
            <li>Click <span className="text-cyan-400 font-semibold">Register dApp — Free</span> and sign the transaction</li>
          </ol>
        </DocSubSection>
        <DocSubSection title="Step 2 — Install the SDK (if you have a backend)">
          <p className="text-gray-300 text-sm mb-2">If your dApp has a backend, you need to install the SDK and expose the verification endpoint before your listing goes live.</p>
          <CodeBlock language="bash">npm install @qf-dappstore/sdk</CodeBlock>
          <p className="text-gray-300 text-sm mt-2">If your dApp is frontend-only (no backend), it goes live immediately after the transaction.</p>
        </DocSubSection>
      </DocSection>

      <DocSection title="SDK Installation">
        <DocSubSection title="Browser (fee routing)">
          <p className="text-gray-300 text-sm mb-2">Install at app startup to route value-bearing transactions through <Code>DappProxy</Code> automatically:</p>
          <CodeBlock language="JavaScript">{`import { DappStoreSDK } from '@qf-dappstore/sdk/browser'

const sdk = new DappStoreSDK({
  dappId: YOUR_DAPP_ID,  // assigned at registration
  chainId: 3426,
})

sdk.install() // call once at startup`}</CodeBlock>
        </DocSubSection>

        <DocSubSection title="Server — Next.js App Router">
          <CodeBlock language="app/.well-known/dappstore-verify/route.ts">{`import { dappStoreVerifyHandler } from '@qf-dappstore/sdk/server'

export const GET = dappStoreVerifyHandler({ dappId: YOUR_DAPP_ID })`}</CodeBlock>
        </DocSubSection>

        <DocSubSection title="Server — Express">
          <CodeBlock language="JavaScript">{`import { dappStoreVerifyMiddleware } from '@qf-dappstore/sdk/server'

app.use(dappStoreVerifyMiddleware({ dappId: YOUR_DAPP_ID }))`}</CodeBlock>
        </DocSubSection>

        <DocSubSection title="wagmi / viem adapter">
          <CodeBlock language="JavaScript">{`import { useDappStore } from '@qf-dappstore/sdk/wagmi'

function App() {
  useDappStore({ dappId: YOUR_DAPP_ID })
  // ... rest of your app
}`}</CodeBlock>
        </DocSubSection>
      </DocSection>

      <DocSection title="Getting Verified & Going Live">
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
          <li>Deploy your dApp with the SDK installed and the <Code>/.well-known/dappstore-verify</Code> endpoint live</li>
          <li>Go to your <span className="text-cyan-400 font-semibold">Builder Dashboard</span></li>
          <li>Find your pending listing and click <span className="text-cyan-400 font-semibold">Verify SDK</span></li>
          <li>The DappStore backend pings your endpoint — if it returns <Code>{`{ dappId, verified: true }`}</Code> your listing goes live instantly</li>
        </ol>
      </DocSection>

      <DocSection title="Fee Structure">
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          {[
            { label: 'Listing Fee', value: 'Free', sub: 'No upfront cost' },
            { label: 'Platform Fee', value: '0.85%', sub: 'Goes to QF DappStore' },
            { label: 'Revenue Share', value: '10%', sub: 'Additional builder cut' },
          ].map(f => (
            <div key={f.label} className="bg-[#0f1729]/60 border border-cyan-500/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-cyan-400 mb-1">{f.value}</div>
              <div className="text-sm font-semibold text-white mb-0.5">{f.label}</div>
              <div className="text-xs text-gray-400">{f.sub}</div>
            </div>
          ))}
        </div>
        <p className="text-gray-400 text-xs">Fees are collected automatically via <Code>DappProxy</Code> on every value-bearing transaction routed through the SDK. The split happens on-chain with no manual intervention.</p>
      </DocSection>
    </div>
  ),

  'sdk': (
    <div>
      <DocSection title="@qf-dappstore/sdk">
        <p className="text-gray-300 text-sm mb-3">
          Published on npm at <Code>@qf-dappstore/sdk@1.1.1</Code>. Three entry points: <Code>/browser</Code>, <Code>/server</Code>, and <Code>/wagmi</Code>.
        </p>
        <CodeBlock language="bash">npm install @qf-dappstore/sdk</CodeBlock>
      </DocSection>

      <DocSection title="Browser API">
        <DocSubSection title="new DappStoreSDK(config)">
          <div className="space-y-2 text-sm text-gray-300 mb-3">
            {[
              { prop: 'dappId', type: 'number', required: true, desc: 'On-chain dApp ID assigned at registration' },
              { prop: 'chainId', type: 'number', required: false, desc: 'EVM chain ID — defaults to 3426 (QF mainnet)' },
              { prop: 'proxyAddress', type: 'string', required: false, desc: 'Override the DappProxy address (skip NETWORKS lookup)' },
            ].map(p => (
              <div key={p.prop} className="bg-[#0f1729]/60 border border-cyan-500/10 rounded-lg p-3 flex gap-3">
                <div className="flex-1">
                  <span className="font-mono text-cyan-300">{p.prop}</span>
                  <span className="text-gray-500 text-xs ml-2">{p.type}</span>
                  {p.required && <span className="text-red-400 text-xs ml-2">required</span>}
                </div>
                <div className="text-gray-400 text-xs">{p.desc}</div>
              </div>
            ))}
          </div>
        </DocSubSection>
        <DocSubSection title="sdk.install()">
          <p className="text-gray-300 text-sm">Wraps <Code>window.ethereum</Code> with a Proxy that intercepts <Code>eth_sendTransaction</Code>. Only value-bearing transactions are rerouted — zero-value calls and contract deployments pass through unchanged. Safe to call multiple times.</p>
        </DocSubSection>
        <DocSubSection title="sdk.uninstall()">
          <p className="text-gray-300 text-sm">Removes the wrapper and restores the original <Code>window.ethereum</Code>.</p>
        </DocSubSection>
      </DocSection>

      <DocSection title="Server API">
        <DocSubSection title="dappStoreVerifyMiddleware(config) — Express">
          <p className="text-gray-300 text-sm mb-2">Intercepts <Code>GET /.well-known/dappstore-verify</Code> and returns the verify payload. All other requests pass to <Code>next()</Code>.</p>
        </DocSubSection>
        <DocSubSection title="dappStoreVerifyHandler(config) — Next.js">
          <p className="text-gray-300 text-sm mb-2">Returns a Next.js App Router <Code>GET</Code> handler. Place the file at <Code>app/.well-known/dappstore-verify/route.ts</Code>.</p>
        </DocSubSection>
        <DocSubSection title="getVerifyPayload(config) — Framework-agnostic">
          <p className="text-gray-300 text-sm mb-2">Returns the raw payload object — pass it to your framework's response method.</p>
          <CodeBlock language="Response shape">{`{
  "dappId":     42,
  "verified":   true,
  "sdkVersion": "1.1.1"
}`}</CodeBlock>
        </DocSubSection>
      </DocSection>

      <DocSection title="Networks Map">
        <p className="text-gray-300 text-sm mb-2">Built-in DappProxy addresses by chain ID:</p>
        <CodeBlock language="networks.ts">{`{
  3426:  "0x301b9ADE737B921c00A1481C97A233633c9dEa03",  // QF mainnet
  31337: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",  // local Hardhat
}`}</CodeBlock>
      </DocSection>
    </div>
  ),

  'api': (
    <div>
      <DocSection title="REST API">
        <p className="text-gray-300 text-sm mb-4">Base URL: <Code>{`${process.env.NEXT_PUBLIC_API_URL ?? 'https://api.qfdappstore.com'}`}</Code>. All endpoints return JSON.</p>
      </DocSection>

      <DocSection title="dApps">
        <ApiRoute method="GET" path="/api/dapps" desc="List all live dApps. Supports ?category=, ?sort=newest|popular|volume, ?limit=, ?page=" response={`{ "dapps": [...], "total": 42, "page": 1 }`} />
        <ApiRoute method="GET" path="/api/dapps/:id" desc="Get a single dApp by its on-chain dappId." response={`{ "dappId": 1, "name": "...", "listingStatus": "live", ... }`} />
        <ApiRoute method="POST" path="/api/dapps" desc="Register a new dApp. Call this after the on-chain submitDapp() transaction." body={`{
  "dappId":          1,       // from on-chain event
  "name":            "My App",
  "description":     "...",
  "contractAddress": "0x...",
  "builder":         "0x...",
  "category":        "DeFi",
  "dappUrl":         "https://...",
  "txHash":          "0x...",
  "hasBackend":      true
}`} response={`{ "dappId": 1, "listingStatus": "pending", ... }`} />
        <ApiRoute method="POST" path="/api/dapps/:id/verify-sdk" desc="Trigger SDK verification. Backend pings /.well-known/dappstore-verify on the dApp's URL. On success, listing goes live." response={`{ "success": true, "message": "SDK verified — your dApp is now live!" }`} />
      </DocSection>

      <DocSection title="Usernames">
        <ApiRoute method="GET" path="/api/users/username/by-address/:address" desc="Get the username registered to a wallet address." response={`{ "username": "alice", "address": "0x..." }`} />
        <ApiRoute method="GET" path="/api/users/username/by-name/:username" desc="Look up the wallet address for a username." response={`{ "username": "alice", "address": "0x..." }`} />
        <ApiRoute method="GET" path="/api/users/username/:username/available" desc="Check if a username is available." response={`{ "available": true, "source": "chain" }`} />
        <ApiRoute method="POST" path="/api/users/username" desc="Sync a registered username to the backend after the on-chain transaction." body={`{
  "address":  "0x...",
  "username": "alice",
  "txHash":   "0x..."
}`} response={`{ "success": true, "username": "alice", "address": "0x..." }`} />
      </DocSection>

      <DocSection title="Reviews">
        <ApiRoute method="GET" path="/api/dapps/:id/reviews" desc="Get reviews for a dApp. Supports ?sort=newest|helpful&limit=." response={`{ "reviews": [...], "total": 10, "avgRating": 4.5 }`} />
        <ApiRoute method="POST" path="/api/dapps/:id/reviews" desc="Submit a review." body={`{
  "reviewer": "0x...",
  "rating":   5,
  "comment":  "Great dApp!"
}`} response={`{ "_id": "...", "rating": 5, "comment": "..." }`} />
      </DocSection>

      <DocSection title="Chat">
        <ApiRoute method="GET" path="/api/chat/conversation" desc="Get messages between two addresses. ?from=0x...&to=0x...&limit=50" response={`{ "messages": [...] }`} />
        <ApiRoute method="POST" path="/api/chat/message" desc="Mirror an on-chain message to the backend for fast retrieval." body={`{
  "from":    "0x...",
  "to":      "0x...",
  "content": "Hello!",
  "txHash":  "0x..."
}`} response={`{ "success": true }`} />
      </DocSection>

      <DocSection title="Analytics">
        <ApiRoute method="GET" path="/api/analytics/dapp/:id" desc="Get analytics for a dApp — volume, users, transactions over time." response={`{ "totalVolume": 0, "totalUsers": 0, "totalTransactions": 0, "history": [...] }`} />
        <ApiRoute method="GET" path="/api/builder/analytics/:address" desc="Get analytics across all dApps for a builder wallet." response={`{ "dapps": [...], "totalRevenue": 0 }`} />
      </DocSection>
    </div>
  ),

  'contracts': (
    <div>
      <DocSection title="Deployed Contracts">
        <p className="text-gray-300 text-sm mb-4">All contracts are deployed on QF Network (Chain ID 3426) using the Revive compiler via remix.polkadot.io. They use PolkaVM bytecode — standard EVM bytecode is not compatible.</p>
        <div className="space-y-3">
          {[
            {
              name: 'RegistryMini',
              address: '0x1Aa08c6A63f8748506c09DDb54e73f3F461991cF',
              abi: [`submitDapp(string name, string url) payable → uint256 id`, `approveDapp(uint256 id)`, `setFee(uint256 fee)  // owner only`, `dapps(uint256 id) → (address submitter, string name, string url, bool approved)`, `listingFee() → uint256`],
            },
            {
              name: 'UsernameRegistryMini',
              address: '0xe20a5602cc82c15b2ef822a09243056ea199ce81',
              abi: [`registerUsername(bytes32 username)`, `releaseUsername()`, `getUsername(address wallet) → bytes32`, `getAddress(bytes32 username) → address`, `adminClear(address wallet)  // owner only`],
            },
            {
              name: 'ChatMini',
              address: '0x5a0479d84c1e87280ba31c81cea0a7c26ca09f64',
              abi: [`sendMessage(address recipient, string content, address) payable → uint256`, `getMessageCost(address) → uint256`, `messageFee() → uint256`, `setFee(uint256 fee)  // owner only`],
            },
            {
              name: 'DappProxy',
              address: '0x301b9ADE737B921c00A1481C97A233633c9dEa03',
              abi: [`executeWithFees(address destination, uint256 dappId, bytes data) payable → bool`, `sendWithFees(address recipient, uint256 dappId) payable → bool`, `setTreasuryWallet(address newTreasury)  // owner only`, `getDappStats(uint256 dappId) → (uint256 totalRevenue, uint256 totalFees, uint256 builderEarned)`],
            },
          ].map(c => (
            <div key={c.name} className="bg-[#0f1729]/60 border border-cyan-500/10 rounded-xl p-4">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <span className="font-bold text-white">{c.name}</span>
                <code className="text-xs font-mono text-cyan-400/80 bg-[#0a0e1a] px-2 py-0.5 rounded">{c.address}</code>
              </div>
              <div className="space-y-1">
                {c.abi.map((fn, i) => (
                  <div key={i} className="font-mono text-xs text-gray-300 bg-[#0a0e1a]/60 px-3 py-1.5 rounded">{fn}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection title="Username Encoding">
        <p className="text-gray-300 text-sm mb-2">Usernames are stored as <Code>bytes32</Code> on-chain (right-padded, lowercase). Use ethers.js to encode/decode:</p>
        <CodeBlock language="JavaScript">{`import { ethers } from 'ethers'

// Encode before sending on-chain
const nameBytes32 = ethers.encodeBytes32String('alice')

// Decode after reading from chain
const name = ethers.decodeBytes32String(raw).replace(/\\0+$/, '')`}</CodeBlock>
      </DocSection>

      <DocSection title="Deploying to QF Network">
        <p className="text-gray-300 text-sm mb-2">Standard EVM bytecode does not work on QF Network. You must use the Revive compiler:</p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
          <li>Go to <Code>remix.polkadot.io</Code></li>
          <li>Write your contract in Solidity (avoid OpenZeppelin if possible — large bytecode hits the 49152-byte initcode limit)</li>
          <li>Compile with the built-in Revive plugin</li>
          <li>Connect MetaMask to QF Network (Chain ID 3426)</li>
          <li>Deploy via the Revive deploy panel</li>
        </ol>
        <p className="text-gray-400 text-xs mt-3">Tip: use <Code>bytes32</Code> instead of <Code>string</Code> in mappings to keep bytecode small.</p>
      </DocSection>
    </div>
  ),
};

const DocsPage = ({ setCurrentPage }) => {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const activeLabel = DOCS_SECTIONS.find(s => s.key === activeSection)?.label ?? '';

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => setCurrentPage('home')}
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-6 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">Documentation</h1>
          <p className="text-gray-400 text-sm">Everything you need to use and build on QF DappStore</p>
        </div>

        {/* Mobile section picker */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setMobileSidebarOpen(o => !o)}
            className="w-full flex items-center justify-between bg-[#0f1729]/60 border border-cyan-500/20 rounded-xl px-4 py-3 text-sm font-medium text-white"
          >
            <span className="flex items-center gap-2">
              {DOCS_SECTIONS.find(s => s.key === activeSection)?.icon}
              {activeLabel}
            </span>
            <svg className={`w-4 h-4 text-cyan-400 transition-transform ${mobileSidebarOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {mobileSidebarOpen && (
            <div className="mt-1 bg-[#0f1729]/95 border border-cyan-500/20 rounded-xl overflow-hidden">
              {DOCS_SECTIONS.map(s => (
                <button
                  key={s.key}
                  onClick={() => { setActiveSection(s.key); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all text-left ${
                    activeSection === s.key ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-400'
                  }`}
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-52 flex-shrink-0">
            <div className="sticky top-24 bg-[#0f1729]/60 border border-cyan-500/10 rounded-xl overflow-hidden">
              {DOCS_SECTIONS.map(s => (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all text-left border-b border-cyan-500/5 last:border-0 ${
                    activeSection === s.key
                      ? 'bg-cyan-500/20 text-cyan-400 border-l-2 border-l-cyan-400'
                      : 'text-gray-400 hover:bg-cyan-500/10 hover:text-cyan-300'
                  }`}
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            <div className="bg-[#0f1729]/40 border border-cyan-500/10 rounded-xl p-6">
              {DOCS_CONTENT[activeSection]}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

// Main App
export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedDapp, setSelectedDapp] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: '#0a0e1a', color: '#ffffff' }}
    >
      <style>{`
        @keyframes floatQF {
          0% { transform: translateY(100vh) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100px) translateX(50px); opacity: 0; }
        }
        * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div
        className="fixed inset-0"
        style={{ background: 'radial-gradient(ellipse at top, #0f1729 0%, #0a0e1a 50%)' }}
      />
      <Particles />

      <div className="relative z-10">
        <Header
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          setShowWalletModal={setShowWalletModal}
        />
        
        {currentPage === 'home' && <HomePage setCurrentPage={setCurrentPage} setSelectedDapp={setSelectedDapp} />}
        {currentPage === 'dapp' && selectedDapp && <DappProfilePage dapp={selectedDapp} setCurrentPage={setCurrentPage} />}
        {currentPage === 'builders' && <BuilderDashboard setShowRegisterModal={setShowRegisterModal} />}
        {currentPage === 'docs' && <DocsPage setCurrentPage={setCurrentPage} />}
        
        {showWalletModal && <WalletModal onClose={() => setShowWalletModal(false)} isDarkMode={true} />}
        {showRegisterModal && <RegisterModal onClose={() => setShowRegisterModal(false)} />}
        <TreasuryDashboard />
        <SecureChatBubble />
      </div>
    </div>
  );
}