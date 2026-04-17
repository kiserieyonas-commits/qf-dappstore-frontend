/**
 * treasuryService.ts
 *
 * Client-side service for treasury fee monitoring and withdrawal.
 * Reads from both the Chat and DappStoreRegistry contracts.
 * Uses window.ethereum directly (no wagmi dependency).
 */

import { ethers, BrowserProvider, Contract, formatEther } from 'ethers';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TreasuryStats {
  chatPendingBalance:    string;  // wei
  chatPendingBalanceETH: number;
  chatTotalCollected:    string;  // wei
  chatTotalCollectedETH: number;
  chatTreasuryWallet:    string;

  dappPendingBalance:    string;  // wei
  dappPendingBalanceETH: number;
  dappTotalCollected:    string;  // wei
  dappTotalCollectedETH: number;
  dappTreasuryWallet:    string;

  combinedPendingETH:    number;
  combinedTotalETH:      number;

  feeStructure: {
    platformFeeBps:  number;
    revenueShareBps: number;
    totalFeePct:     string;      // e.g. "10.7650%"
  };
}

export interface WithdrawalRecord {
  _id:            string;
  type:           'withdrawal';
  source:         'chat' | 'dappstore';
  amount:         string;
  amountETH:      number;
  txHash:         string;
  treasuryWallet: string;
  timestamp:      string;
}

export interface FeeRecord {
  _id:         string;
  type:        'fee_collected';
  source:      'chat' | 'dappstore';
  amount:      string;
  amountETH:   number;
  txHash:      string;
  fromAddress: string;
  timestamp:   string;
}

// ─── ABIs ─────────────────────────────────────────────────────────────────────

const CHAT_TREASURY_ABI = [
  'function treasuryBalance() view returns (uint256)',
  'function totalFeesCollected() view returns (uint256)',
  'function treasuryWallet() view returns (address)',
  'function PLATFORM_FEE_BPS() view returns (uint256)',
  'function REVENUE_SHARE_BPS() view returns (uint256)',
  'function withdrawFees() external',
  'function setTreasuryWallet(address newTreasury) external',
  'event FeesWithdrawn(uint256 amount, address indexed treasury, uint256 timestamp)',
];

const REGISTRY_TREASURY_ABI = [
  'function treasuryBalance() view returns (uint256)',
  'function totalFeesCollected() view returns (uint256)',
  'function treasury() view returns (address)',
  'function USER_FEE_BPS() view returns (uint256)',
  'function DEV_FEE_BPS() view returns (uint256)',
  'function withdrawFees() external',
  'event FeesWithdrawn(uint256 amount, address indexed treasury, uint256 timestamp)',
];

// ─── Constants ────────────────────────────────────────────────────────────────

const CHAT_ADDRESS =
  process.env.NEXT_PUBLIC_CHAT_ADDRESS ?? '';

const REGISTRY_ADDRESS =
  process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ?? '';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

// ─── Provider helpers ─────────────────────────────────────────────────────────

function getProvider(): BrowserProvider {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not found');
  }
  return new BrowserProvider(window.ethereum as ethers.Eip1193Provider);
}

async function getChatContract(withSigner = false): Promise<Contract> {
  if (!CHAT_ADDRESS) throw new Error('NEXT_PUBLIC_CHAT_ADDRESS not set');
  const provider = getProvider();
  const runner   = withSigner ? await provider.getSigner() : provider;
  return new Contract(CHAT_ADDRESS, CHAT_TREASURY_ABI, runner);
}

async function getRegistryContract(withSigner = false): Promise<Contract | null> {
  if (!REGISTRY_ADDRESS) return null;
  const provider = getProvider();
  const runner   = withSigner ? await provider.getSigner() : provider;
  return new Contract(REGISTRY_ADDRESS, REGISTRY_TREASURY_ABI, runner);
}

// ─── Read: treasury balances ──────────────────────────────────────────────────

/**
 * Returns pending treasuryBalance from both Chat and DappStore contracts.
 * Falls back to "0" if a contract is not deployed.
 */
export async function getTreasuryBalances(): Promise<{
  chatBalance:    string;
  chatBalanceETH: number;
  regBalance:     string;
  regBalanceETH:  number;
}> {
  const [chatBal, regBal] = await Promise.allSettled([
    getChatContract().then((c) => c.treasuryBalance() as Promise<bigint>),
    getRegistryContract().then((c) =>
      c ? (c.treasuryBalance() as Promise<bigint>) : Promise.resolve(0n)
    ),
  ]);

  const chat = chatBal.status === 'fulfilled' ? chatBal.value : 0n;
  const reg  = regBal.status  === 'fulfilled' ? regBal.value  : 0n;

  return {
    chatBalance:    chat.toString(),
    chatBalanceETH: Number(formatEther(chat)),
    regBalance:     reg.toString(),
    regBalanceETH:  Number(formatEther(reg)),
  };
}

/**
 * Full treasury stats from both contracts.
 */
export async function getTreasuryStats(): Promise<TreasuryStats> {
  const chat     = await getChatContract();
  const registry = await getRegistryContract();

  const [
    chatBal,
    chatTotal,
    chatWallet,
    platformBps,
    revShareBps,
  ] = await Promise.all([
    chat.treasuryBalance()    as Promise<bigint>,
    chat.totalFeesCollected() as Promise<bigint>,
    chat.treasuryWallet()     as Promise<string>,
    chat.PLATFORM_FEE_BPS()   as Promise<bigint>,
    chat.REVENUE_SHARE_BPS()  as Promise<bigint>,
  ]);

  let regBal    = 0n;
  let regTotal  = 0n;
  let regWallet = '';

  if (registry) {
    [regBal, regTotal, regWallet] = await Promise.all([
      registry.treasuryBalance()    as Promise<bigint>,
      registry.totalFeesCollected() as Promise<bigint>,
      registry.treasury()           as Promise<string>,
    ]);
  }

  const pBps = Number(platformBps);
  const rBps = Number(revShareBps);
  const totalFeePct = ((pBps + (10000 - pBps) * rBps / 10000) / 100).toFixed(4) + '%';

  return {
    chatPendingBalance:    chatBal.toString(),
    chatPendingBalanceETH: Number(formatEther(chatBal)),
    chatTotalCollected:    chatTotal.toString(),
    chatTotalCollectedETH: Number(formatEther(chatTotal)),
    chatTreasuryWallet:    chatWallet,

    dappPendingBalance:    regBal.toString(),
    dappPendingBalanceETH: Number(formatEther(regBal)),
    dappTotalCollected:    regTotal.toString(),
    dappTotalCollectedETH: Number(formatEther(regTotal)),
    dappTreasuryWallet:    regWallet,

    combinedPendingETH: Number(formatEther(chatBal + regBal)),
    combinedTotalETH:   Number(formatEther(chatTotal + regTotal)),

    feeStructure: {
      platformFeeBps:  pBps,
      revenueShareBps: rBps,
      totalFeePct,
    },
  };
}

// ─── Write: withdrawals ───────────────────────────────────────────────────────

/**
 * Calls Chat.withdrawFees() as the signer.
 * Returns the transaction hash.
 */
export async function withdrawChatFees(): Promise<string> {
  const contract = await getChatContract(true);
  const tx       = await contract.withdrawFees();
  const receipt  = await tx.wait();

  // Notify backend to record the withdrawal
  try {
    const iface   = new ethers.Interface(CHAT_TREASURY_ABI);
    let amount    = '0';
    let treasury  = '';

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === 'FeesWithdrawn') {
          amount   = parsed.args.amount.toString();
          treasury = parsed.args.treasury;
        }
      } catch { /* not our event */ }
    }

    await fetch(`${API_BASE}/api/treasury/withdrawal`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        txHash:         receipt.hash,
        source:         'chat',
        treasuryWallet: treasury,
      }),
    });
  } catch { /* non-fatal */ }

  return receipt.hash;
}

/**
 * Calls DappStoreRegistry.withdrawFees() as the signer.
 * Returns the transaction hash.
 */
export async function withdrawDappStoreFees(): Promise<string> {
  const contract = await getRegistryContract(true);
  if (!contract) throw new Error('DappStoreRegistry address not configured');

  const tx      = await contract.withdrawFees();
  const receipt = await tx.wait();

  try {
    const iface  = new ethers.Interface(REGISTRY_TREASURY_ABI);
    let amount   = '0';
    let treasury = '';

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === 'FeesWithdrawn') {
          amount   = parsed.args.amount.toString();
          treasury = parsed.args.treasury;
        }
      } catch { /* not our event */ }
    }

    await fetch(`${API_BASE}/api/treasury/withdrawal`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        txHash:         receipt.hash,
        source:         'dappstore',
        treasuryWallet: treasury,
      }),
    });
  } catch { /* non-fatal */ }

  return receipt.hash;
}

// ─── Backend stats ────────────────────────────────────────────────────────────

/**
 * Fetches full treasury stats from backend (on-chain + DB aggregates).
 */
export async function getBackendTreasuryStats(): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(`${API_BASE}/api/treasury/stats`);
    if (!res.ok) return {};
    return await res.json() as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Fetches withdrawal history from backend.
 */
export async function getWithdrawalHistory(limit = 20): Promise<WithdrawalRecord[]> {
  try {
    const res = await fetch(`${API_BASE}/api/treasury/withdrawals?limit=${limit}`);
    if (!res.ok) return [];
    const { withdrawals } = await res.json() as { withdrawals: WithdrawalRecord[] };
    return withdrawals ?? [];
  } catch {
    return [];
  }
}

// ─── Pure utilities ───────────────────────────────────────────────────────────

/**
 * Calculates the expected treasury fee for a given payment amount.
 * Mirrors the Solidity fee split logic exactly.
 */
export function calculateExpectedFee(
  paidWei: bigint,
  platformBps = 85n,
  revShareBps = 1000n
): {
  platformFee:  bigint;
  revenueShare: bigint;
  totalFee:     bigint;
  builderGets:  bigint;
  feePct:       string;
} {
  const BPS      = 10000n;
  const platFee  = (paidWei * platformBps) / BPS;
  const remaining = paidWei - platFee;
  const revShare  = (remaining * revShareBps) / BPS;
  const totalFee  = platFee + revShare;

  const feePct = ((Number(totalFee) / Number(paidWei)) * 100).toFixed(4) + '%';

  return {
    platformFee:  platFee,
    revenueShare: revShare,
    totalFee,
    builderGets:  remaining - revShare,
    feePct,
  };
}

/**
 * Formats a wei amount as a human-readable string with 4–8 decimal places.
 */
export function formatFeeAmount(wei: bigint | string): string {
  const amount = Number(formatEther(BigInt(wei.toString())));
  if (amount < 0.00001)  return amount.toFixed(10);
  if (amount < 0.001)    return amount.toFixed(8);
  if (amount < 0.01)     return amount.toFixed(6);
  return amount.toFixed(4);
}
