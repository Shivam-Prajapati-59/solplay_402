"use client";

import { ThemeProvider } from "@/components/ui/theme-provider";
import React, { FC, ReactNode, useMemo } from "react";
import {
    ConnectionProvider,
    WalletProvider
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

interface ProvidersProps {
    children: ReactNode;
}

export const Providers: FC<ProvidersProps> = ({ children }) => {
    // The network is set to 'devnet' - change to 'testnet' or 'mainnet-beta' as needed
    const network = WalletAdapterNetwork.Devnet;

    // Using Solana devnet RPC endpoint
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <ConnectionProvider endpoint={endpoint}>
                <WalletProvider wallets={[]} autoConnect>
                    <WalletModalProvider>{children}</WalletModalProvider>
                </WalletProvider>
            </ConnectionProvider>
        </ThemeProvider>
    );
};