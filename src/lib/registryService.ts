/**
 * registryService.ts
 *
 * On-chain interactions with DappStoreRegistry + backend API.
 *
 * Deployed contract (0xc33e608dD6D70df7ed40F808bB8c9352C1E74636):
 *   mapping(uint256 => address) public builders
 *   function register(uint256 id) external  — reverts if taken
 *
 * Flow:
 *   1. Backend assigns a dappId and stores metadata in MongoDB.
 *   2. Frontend calls register(dappId) on-chain to claim builder ownership.
 *   3. On-chain record is the source of truth for "who built this dapp".
 *
 * Listing fee: collected as a direct ETH transfer to treasury (no on-chain fee logic).
 */

import { ethers, BrowserProvider, JsonRpcSigner, Contract, parseEther } from 'ethers'
import { getWalletClient } from '@wagmi/core'
import { wagmiConfig } from './wagmiConfig'

// ─── ABI (RegistryMini) ───────────────────────────────────────────────────────

const REGISTRY_ABI = [
  'function submitDapp(string name, string url) external payable returns (uint256)',
  'function approveDapp(uint256 id) external',
  'function dapps(uint256) external view returns (address submitter, string name, string url, bool approved)',
  'function listingFee() external view returns (uint256)',
  'event DappSubmitted(uint256 indexed id, address indexed submitter, string name)',
]

// ─── Constants ────────────────────────────────────────────────────────────────

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ?? ''
const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? ''
const API_BASE         = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

// Listing is free for now (listingFee = 0 on RegistryMini)
const LISTING_FEE_QF = parseEther('0')

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getEthersSigner(): Promise<JsonRpcSigner> {
  const walletClient = await getWalletClient(wagmiConfig)
  if (!walletClient) throw new Error('No wallet connected. Please connect your wallet.')
  const { account, chain, transport } = walletClient
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const provider = new BrowserProvider(transport as any, { chainId: chain.id, name: chain.name })
  return new JsonRpcSigner(provider, account.address)
}

async function getRegistryContract(withSigner = false): Promise<Contract> {
  if (!REGISTRY_ADDRESS) throw new Error('NEXT_PUBLIC_REGISTRY_ADDRESS is not set in .env.local')
  if (withSigner) {
    const signer = await getEthersSigner()
    return new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer)
  }
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://archive.mainnet.qfnode.net/eth'
  return new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, new ethers.JsonRpcProvider(rpcUrl))
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export interface ListingFeeInfo {
  wei: bigint
  qf:  string
  usd: string
}

/**
 * Returns the current listing fee from RegistryMini (currently free).
 */
export async function getListingFee(): Promise<ListingFeeInfo> {
  try {
    const contract = await getRegistryContract(false)
    const fee = await contract.listingFee()
    return {
      wei: fee,
      qf:  ethers.formatEther(fee),
      usd: '0.00',
    }
  } catch {
    return { wei: LISTING_FEE_QF, qf: '0', usd: '0.00' }
  }
}

export interface RegisterParams {
  name:            string
  description:     string
  category:        string
  logoUrl:         string
  dappUrl:         string
  contractAddress: string
}

export interface RegisterResult {
  dappId:  number
  txHash:  string
}

/**
 * Registers a dapp on RegistryMini then syncs to backend.
 *   1. Calls submitDapp(name, url) on-chain → gets on-chain dappId from event.
 *   2. Returns { dappId, txHash } for the caller to save to backend.
 */
export async function registerDappOnChain(params: RegisterParams): Promise<RegisterResult> {
  const contract = await getRegistryContract(true)

  const fee = await (async () => {
    try { return await contract.listingFee() } catch { return 0n }
  })()

  const tx      = await contract.submitDapp(params.name, params.dappUrl || params.contractAddress, {
    value:    fee,
    gasLimit: 35_343_055n,
  })
  const receipt = await tx.wait()

  // Parse DappSubmitted event to get the on-chain dappId
  const iface  = new ethers.Interface(REGISTRY_ABI)
  let dappId   = Date.now() // fallback
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log)
      if (parsed?.name === 'DappSubmitted') {
        dappId = Number(parsed.args.id)
        break
      }
    } catch { /* not our event */ }
  }

  return { dappId, txHash: receipt.hash }
}
