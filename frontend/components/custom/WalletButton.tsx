"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";

/**
 * Client-only wrapper for WalletMultiButton to avoid hydration errors
 * The wallet button has internal state that differs between server and client
 */
export function WalletButton() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        // Return a placeholder that matches the button's approximate size
        return (
            <button
                className="wallet-adapter-button wallet-adapter-button-trigger"
                disabled
                style={{ pointerEvents: "none" }}
            >
                <span className="wallet-adapter-button-start-icon"></span>
                Select Wallet
            </button>
        );
    }

    return <WalletMultiButton />;
}
