'use client';

import { useState } from 'react';

export interface FeeConfirmationModalProps {
  isOpen:        boolean;
  amount:        string;
  fee:           string;
  builderAmount: string;
  destination:   string;
  onApprove:     () => void;
  onReject:      () => void;
}

export function FeeConfirmationModal({
  isOpen,
  amount,
  fee,
  builderAmount,
  destination,
  onApprove,
  onReject,
}: FeeConfirmationModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleApprove = () => {
    setIsProcessing(true);
    onApprove();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-[#0f1729] border border-cyan-500/30 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Confirm Transaction</h2>

        <div className="space-y-3">
          <div className="flex justify-between text-lg">
            <span>Amount:</span>
            <span className="font-bold">{amount} QF</span>
          </div>

          <div className="bg-cyan-500/10 rounded p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">DappStore fee (10.765%):</span>
              <span className="text-cyan-400">{fee} QF</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Builder receives:</span>
              <span className="text-green-400">{builderAmount} QF</span>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            To: {destination.slice(0, 10)}...{destination.slice(-8)}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onReject}
            disabled={isProcessing}
            className="flex-1 py-2 bg-red-500/20 border border-red-500/30 rounded hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all disabled:opacity-50"
          >
            {isProcessing ? 'Opening MetaMask...' : 'Approve'}
          </button>
        </div>

        {isProcessing && (
          <div className="mt-3 text-xs text-center text-cyan-400 animate-pulse">
            Waiting for MetaMask confirmation...
          </div>
        )}
      </div>
    </div>
  );
}

export default FeeConfirmationModal;
