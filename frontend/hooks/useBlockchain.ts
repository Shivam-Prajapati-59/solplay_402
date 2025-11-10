// =============================================================================
// useBlockchain Hook
// =============================================================================
// React hook for using blockchain service with wallet integration
// =============================================================================

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState, useMemo } from "react";
import { BlockchainService } from "../lib/anchor/blockchain-service";

export function useBlockchain() {
  const { publicKey, connected, signTransaction, signAllTransactions } =
    useWallet();
  const { connection } = useConnection();
  const [service, setService] = useState<BlockchainService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Create blockchain service instance
  useEffect(() => {
    if (connected && publicKey && signTransaction) {
      const wallet = {
        publicKey,
        signTransaction,
        signAllTransactions,
      };

      const blockchainService = new BlockchainService(wallet);
      setService(blockchainService);
      setIsInitialized(true);
    } else {
      setService(null);
      setIsInitialized(false);
    }
  }, [connected, publicKey, signTransaction, signAllTransactions]);

  return {
    service,
    isInitialized,
    connected,
    publicKey,
    connection,
  };
}

export default useBlockchain;
