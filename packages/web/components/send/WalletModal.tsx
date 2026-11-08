"use client";

import { useEffect, useState } from "react";

export type ConnectedWalletInfo = {
  address: string;
  provider: "freighter" | "ethereum" | "privy" | "tester";
};

type WalletModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConnected: (info: ConnectedWalletInfo) => void;
  onPrivyConnect?: () => void;
  privyAvailable?: boolean;
};

const TESTER_STELLAR_ADDRESS = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

export function WalletModal({
  isOpen,
  onClose,
  onConnected,
  onPrivyConnect,
  privyAvailable = false,
}: WalletModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsConnecting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFreighter = async () => {
    setError(null);
    setIsConnecting(true);
    try {
      // Check window.freighterApi or window.freighter
      const win = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : {};
      const freighter = win.freighterApi ?? win.freighter;

      if (freighter && typeof freighter === "object" && "getPublicKey" in freighter) {
        const pk = await (freighter as { getPublicKey: () => Promise<string> }).getPublicKey();
        if (pk) {
          onConnected({ address: pk, provider: "freighter" });
          onClose();
          return;
        }
      }

      // If Freighter not detected in window
      setError("Freighter extension not detected. You can install it from freighter.app or use the Instant Tester Wallet below.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect Freighter.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleEthereum = async () => {
    setError(null);
    setIsConnecting(true);
    try {
      const win = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : {};
      const eth = win.ethereum;
      if (eth && typeof eth === "object" && "request" in eth) {
        const accounts = await (eth as { request: (args: { method: string }) => Promise<string[]> }).request({
          method: "eth_requestAccounts",
        });
        if (accounts && accounts.length > 0) {
          onConnected({ address: accounts[0], provider: "ethereum" });
          onClose();
          return;
        }
      }
      setError("No Web3 / MetaMask wallet extension detected in your browser.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect browser wallet.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handlePrivy = () => {
    if (onPrivyConnect) {
      onPrivyConnect();
      onClose();
    } else {
      setError("Privy embedded sign-in is not initialized in this environment.");
    }
  };

  const handleTester = () => {
    onConnected({
      address: TESTER_STELLAR_ADDRESS,
      provider: "tester",
    });
    onClose();
  };

  return (
    <div className="send-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="send-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="send-modal-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          ✕
        </button>

        <h3 className="send-modal-title">Connect Wallet</h3>
        <p className="send-modal-subtitle">
          Choose a wallet to fund, hold, and send tokenized stocks on Stellar.
        </p>

        {error && (
          <p className="send-pending-text" style={{ color: "#ef4444", marginBottom: "16px" }}>
            {error}
          </p>
        )}

        <div className="send-modal-list">
          <button
            type="button"
            className="send-modal-option"
            onClick={handleFreighter}
            disabled={isConnecting}
          >
            <div className="send-modal-option-left">
              <span className="send-modal-icon">🚀</span>
              <div className="send-modal-text">
                <span className="send-modal-name">Freighter Wallet</span>
                <span className="send-modal-desc">Native Stellar & Soroban extension</span>
              </div>
            </div>
            <span className="send-modal-badge send-modal-badge-stellar">Stellar</span>
          </button>

          <button
            type="button"
            className="send-modal-option"
            onClick={handleEthereum}
            disabled={isConnecting}
          >
            <div className="send-modal-option-left">
              <span className="send-modal-icon">🦊</span>
              <div className="send-modal-text">
                <span className="send-modal-name">Browser Wallet</span>
                <span className="send-modal-desc">MetaMask, Rabby, OKX Web3</span>
              </div>
            </div>
            <span className="send-modal-badge">Injected</span>
          </button>

          {privyAvailable && (
            <button
              type="button"
              className="send-modal-option"
              onClick={handlePrivy}
              disabled={isConnecting}
            >
              <div className="send-modal-option-left">
                <span className="send-modal-icon">🔑</span>
                <div className="send-modal-text">
                  <span className="send-modal-name">Email / Google Passkey</span>
                  <span className="send-modal-desc">Gasless embedded account</span>
                </div>
              </div>
              <span className="send-modal-badge">Passkey</span>
            </button>
          )}

          <button
            type="button"
            className="send-modal-option"
            onClick={handleTester}
            disabled={isConnecting}
          >
            <div className="send-modal-option-left">
              <span className="send-modal-icon">⚡</span>
              <div className="send-modal-text">
                <span className="send-modal-name">1-Click Tester Stellar Wallet</span>
                <span className="send-modal-desc">Instant pre-funded testnet account</span>
              </div>
            </div>
            <span className="send-modal-badge send-modal-badge-instant">Instant</span>
          </button>
        </div>
      </div>
    </div>
  );
}

