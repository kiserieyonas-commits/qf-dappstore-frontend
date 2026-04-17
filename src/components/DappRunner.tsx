'use client';

import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { handleTransactionWithFees } from '../lib/feeInterceptor';

// ─── Config ───────────────────────────────────────────────────────────────────

const CHAIN_ID     = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? '42', 10)
const CHAIN_ID_HEX = '0x' + CHAIN_ID.toString(16)

// ─── Types ────────────────────────────────────────────────────────────────────

interface DappRunnerProps {
  dappId:   number;
  dappUrl:  string;
  dappName: string;
}

interface TxParams {
  to:    string;
  value?: string;
  data?:  string;
  gas?:   string;
  from?:  string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DappRunner({ dappId, dappUrl, dappName }: DappRunnerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { address: userAddress } = useAccount();

  // Cache wallet info for instant responses — no async needed for read methods
  const walletInfo = useRef({ address: userAddress, chainIdHex: CHAIN_ID_HEX });
  useEffect(() => { walletInfo.current.address = userAddress }, [userAddress]);

  // Wallet request bridge (iframe → parent → wallet → iframe)
  useEffect(() => {
    const handleWalletRequest = async (event: MessageEvent) => {
      if (event.data?.type !== 'WALLET_REQUEST') return;

      // walletInjector.js sends `requestId` and reads `d.requestId` in responses
      const { method, params, requestId } = event.data as {
        method:    string;
        params:    unknown[];
        requestId: number;
      };

      const startTime = performance.now();

      const reply = (result: unknown) =>
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'WALLET_RESPONSE', requestId, result },
          '*'
        );

      const replyError = (message: string) =>
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'WALLET_RESPONSE', requestId, error: message },
          '*'
        );

      try {
        let result: unknown;

        switch (method) {
          case 'eth_requestAccounts':
          case 'eth_accounts':
            // INSTANT — from cached ref, no async
            result = walletInfo.current.address ? [walletInfo.current.address] : [];
            console.log(`[QF] ${method}: ${(performance.now() - startTime).toFixed(0)}ms`);
            break;

          case 'eth_chainId':
            // INSTANT — hardcoded
            result = walletInfo.current.chainIdHex;
            break;

          case 'net_version':
            result = String(CHAIN_ID);
            break;

          case 'eth_sendTransaction': {
            const txParams = (params as TxParams[])[0];
            const valueWei = BigInt(txParams?.value ?? '0');

            if (valueWei === BigInt(0)) {
              // Zero-value contract call — no fee, forward directly
              const eth = (window as Window & {
                ethereum?: { request: (a: { method: string; params: unknown[] }) => Promise<unknown> }
              }).ethereum;
              if (!eth) throw new Error('Wallet not connected');
              result = await eth.request({ method, params });
            } else {
              // Value-bearing tx — route through DappProxy (single signature)
              result = await handleTransactionWithFees(txParams, dappId, dappName);
            }

            console.log(`[QF] eth_sendTransaction: ${(performance.now() - startTime).toFixed(0)}ms`);
            break;
          }

          default: {
            // Forward read-only / wallet-specific methods to MetaMask
            const eth = (window as Window & {
              ethereum?: { request: (a: { method: string; params: unknown[] }) => Promise<unknown> }
            }).ethereum;
            if (!eth) throw new Error(`Unsupported method: ${method}`);
            result = await eth.request({ method, params: params as unknown[] });
          }
        }

        reply(result);

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[QF] Wallet request error:', method, msg);
        replyError(msg);
      }
    };

    window.addEventListener('message', handleWalletRequest);
    return () => window.removeEventListener('message', handleWalletRequest);
  }, [userAddress, dappId, dappName]);

  // Proxy URL injects the QF wallet bridge script into the dApp's HTML
  const proxyUrl = `/api/dapp-proxy?url=${encodeURIComponent(dappUrl)}&dappId=${dappId}`;

  return (
    <div className="h-screen flex flex-col bg-[#0a0e1a]">

      {/* Header */}
      <div className="h-14 border-b border-cyan-500/20 flex items-center px-4 shrink-0">
        <button
          onClick={() => window.history.back()}
          className="text-cyan-400 hover:text-cyan-300 text-sm"
        >
          ← Exit to DappStore
        </button>
        <div className="ml-4 text-base font-semibold truncate">{dappName}</div>
        <div className="ml-auto text-xs text-gray-400 whitespace-nowrap">
          via QF DappStore &middot; Fee: 10.765%
        </div>
      </div>

      {/* dApp iframe — served through proxy so wallet bridge script is injected */}
      <iframe
        ref={iframeRef}
        src={proxyUrl}
        className="flex-1 w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        allow="clipboard-write; clipboard-read"
        title={dappName}
      />

    </div>
  );
}

export default DappRunner;
