/**
 * chatService.ts
 *
 * Client-side service for the Chat contract and backend API.
 *
 * Deployed contract (0x97eFd538Dcc392aD9E1Baa8096166eb51474C0AE):
 *   function sendMessage(address recipient, string content, address paymentToken) external payable
 *   event MessageSent(uint256 indexed messageId, address indexed sender, address indexed recipient, ...)
 *
 * On-chain: stores full message content + forwards fee 100% to treasury wallet.
 * Off-chain: backend indexes MessageSent events and stores base64-encoded content for fast retrieval.
 */

import { ethers, BrowserProvider, JsonRpcSigner, Contract, parseEther } from 'ethers';
import { getWalletClient } from '@wagmi/core';
import { wagmiConfig } from './wagmiConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id:           number;
  sender:       string;
  recipient:    string;
  content:      string;
  paymentToken: string;
  amountPaid:   string;
  feeAmount:    string;
  timestamp:    number;
}

export interface TokenPrice {
  address:        string;
  symbol:         string;
  priceUSD:       number;
  messageCostUSD: number;
  costInToken:    number;
  costInWei:      string;
}

export interface ConversationSummary {
  peer:        string;
  lastMessage: string;
  timestamp:   number;
  unread:      number;
}

// ─── ABI (deployed contract) ──────────────────────────────────────────────────

const CHAT_ABI = [
  'function sendMessage(address recipient, string content, address) external payable returns (uint256)',
  'function getMessageCost(address) external view returns (uint256)',
  'function messageFee() external view returns (uint256)',
  'event MessageSent(uint256 indexed messageId, address indexed sender, address indexed recipient, string content, uint256 amountPaid, uint256 timestamp)',
];

// ─── Constants ────────────────────────────────────────────────────────────────

export const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000';

// Flat message fee in QF
const MESSAGE_FEE_QF = parseEther('0.01');

// PolkaVM contracts on QF Network do not support eth_estimateGas reliably.
// Use a fixed gas limit to bypass estimation (same approach as deploy-polkavm.js).
const PVM_GAS_LIMIT = 35_343_055n;

const CHAT_ADDRESS = process.env.NEXT_PUBLIC_CHAT_ADDRESS ?? '';
const TREASURY     = process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? '';
const API_BASE     = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getEthersSigner(): Promise<JsonRpcSigner> {
  // Try wagmi first
  try {
    const walletClient = await getWalletClient(wagmiConfig);
    if (walletClient) {
      const { account, chain, transport } = walletClient;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = new BrowserProvider(transport as any, { chainId: chain.id, name: chain.name });
      provider.pollingInterval = 15_000;
      return new JsonRpcSigner(provider, account.address);
    }
  } catch { /* fall through to window.ethereum */ }

  // Fallback: use injected window.ethereum directly
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provider = new BrowserProvider((window as any).ethereum);
    provider.pollingInterval = 15_000;
    return provider.getSigner();
  }

  throw new Error('No wallet connected. Please connect your wallet.');
}

async function getChatContract(): Promise<Contract> {
  if (!CHAT_ADDRESS) throw new Error('NEXT_PUBLIC_CHAT_ADDRESS is not set in .env.local');
  const signer = await getEthersSigner();
  return new Contract(CHAT_ADDRESS, CHAT_ABI, signer);
}

// ─── Price utilities ──────────────────────────────────────────────────────────

/**
 * Returns the current message cost (flat fee, read from backend config).
 */
export async function getMessageCost(_tokenAddress: string): Promise<{ wei: string; human: string }> {
  return {
    wei:   MESSAGE_FEE_QF.toString(),
    human: ethers.formatEther(MESSAGE_FEE_QF),
  };
}

/**
 * Returns token price info from backend (no contract call needed).
 */
export async function getAllTokenPrices(): Promise<TokenPrice[]> {
  try {
    const prices = await getTokenPricesFromAPI();
    return Object.values(prices);
  } catch {
    return [{
      address:        NATIVE_TOKEN,
      symbol:         'QF',
      priceUSD:       1,
      messageCostUSD: 0.01,
      costInToken:    Number(ethers.formatEther(MESSAGE_FEE_QF)),
      costInWei:      MESSAGE_FEE_QF.toString(),
    }];
  }
}

export function calculateCostInToken(usdCost: number, tokenPriceUSD: number): string {
  if (tokenPriceUSD <= 0) return '0';
  const amount = usdCost / tokenPriceUSD;
  if (amount < 0.0001) return amount.toFixed(10);
  if (amount < 0.001)  return amount.toFixed(8);
  if (amount < 0.01)   return amount.toFixed(6);
  return amount.toFixed(4);
}

// ─── Messaging ────────────────────────────────────────────────────────────────

/**
 * Sends a message:
 *   1. Gets the message cost from the contract.
 *   2. Calls Chat.sendMessage(recipient, content, paymentToken) with the fee.
 *   3. POSTs base64-encoded content to backend for immediate display.
 */
export async function sendMessage(
  recipient:    string,
  content:      string,
  _paymentToken: string = NATIVE_TOKEN
): Promise<{ txHash: string; messageId: number }> {
  if (!ethers.isAddress(recipient)) throw new Error('Invalid recipient address');
  if (!content.trim())              throw new Error('Message cannot be empty');
  if (content.length > 375)         throw new Error('Message too long (max 375 chars)');

  const signer  = await getEthersSigner();
  const address = (await signer.getAddress()).toLowerCase();
  const contract = await getChatContract();

  // Send on-chain — ChatMini deployed on QF mainnet via Remix/Revive
  const tx = await contract.sendMessage(recipient, content, NATIVE_TOKEN, {
    value:    MESSAGE_FEE_QF,
    gasLimit: PVM_GAS_LIMIT,
  });

  const receipt = await tx.wait();
  const txHash  = receipt?.hash ?? tx.hash;
  const messageId = Math.floor(Date.now() / 1000);

  // Mirror to backend for fast retrieval
  const encoded = btoa(unescape(encodeURIComponent(content)));
  await fetch(`${API_BASE}/api/chat/store`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messageId,
      from:         address,
      to:           recipient.toLowerCase(),
      content:      encoded,
      paymentToken: NATIVE_TOKEN,
      amountPaid:   MESSAGE_FEE_QF.toString(),
      txHash,
      timestamp:    new Date().toISOString(),
    }),
  }).catch(() => { /* backend mirror is best-effort */ });

  return { txHash, messageId };
}

// ─── Conversation fetching ────────────────────────────────────────────────────

/**
 * Fetches messages between two addresses from the backend.
 */
export async function getConversation(
  addr1: string,
  addr2: string,
  _forceChain = false
): Promise<ChatMessage[]> {
  try {
    const res = await fetch(`${API_BASE}/api/chat/messages?user1=${addr1}&user2=${addr2}`);
    if (res.ok) {
      const { messages } = await res.json() as { messages: Array<{
        messageId: number; from: string; to: string; content: string;
        paymentToken: string; amountPaid: string; feeAmount?: string; timestamp: string;
      }> };
      return messages.map((m) => ({
        id:           m.messageId,
        sender:       m.from,
        recipient:    m.to,
        content:      decodeContent(m.content),
        paymentToken: m.paymentToken,
        amountPaid:   m.amountPaid,
        feeAmount:    m.feeAmount ?? '0',
        timestamp:    Math.floor(new Date(m.timestamp).getTime() / 1000),
      }));
    }
  } catch { /* fall through */ }
  return [];
}

/**
 * Returns conversation list (latest message per peer) for a wallet.
 */
export async function getConversationList(address: string): Promise<ConversationSummary[]> {
  try {
    const res = await fetch(`${API_BASE}/api/chat/conversations/${address}`);
    if (!res.ok) return [];
    const { conversations } = await res.json() as { conversations: Array<{
      from: string; to: string; content: string; timestamp: string;
    }> };
    return conversations.map((c) => {
      const peer = c.from.toLowerCase() === address.toLowerCase() ? c.to : c.from;
      return {
        peer,
        lastMessage: decodeContent(c.content).slice(0, 60),
        timestamp:   Math.floor(new Date(c.timestamp).getTime() / 1000),
        unread:      0,
      };
    });
  } catch {
    return [];
  }
}

// ─── Content encode / decode ──────────────────────────────────────────────────

function decodeContent(raw: string): string {
  try {
    return decodeURIComponent(escape(atob(raw)));
  } catch {
    return raw;
  }
}

// ─── Token price from backend ─────────────────────────────────────────────────

export async function getTokenPricesFromAPI(): Promise<Record<string, TokenPrice>> {
  try {
    const res = await fetch(`${API_BASE}/api/chat/token-prices`);
    if (!res.ok) return {};
    const { prices } = await res.json() as { prices: Record<string, {
      symbol: string; priceUSD: number; messageCostUSD: number; costInToken: number;
    }> };
    const result: Record<string, TokenPrice> = {};
    for (const [addr, p] of Object.entries(prices)) {
      result[addr] = {
        address:        addr,
        symbol:         p.symbol,
        priceUSD:       p.priceUSD,
        messageCostUSD: p.messageCostUSD,
        costInToken:    p.costInToken,
        costInWei:      ethers.parseUnits(p.costInToken.toFixed(18), 18).toString(),
      };
    }
    return result;
  } catch {
    return {};
  }
}
