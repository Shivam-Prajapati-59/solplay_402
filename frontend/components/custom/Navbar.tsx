"use client";
import React, { useState, useEffect } from "react";
import { Menu, X, Wallet, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/custom/ThemeToggle";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import Image from "next/image";

const navItems = [
    { name: "Home", href: "#" },
    { name: "Products", href: "#" },
    { name: "Services", href: "#" },
    { name: "Let's Talk", href: "#" },
];

// Dynamically import wallet button to avoid hydration issues
const WalletButton = dynamic(
    () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
    { ssr: false }
);

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Solana wallet connection
    const { publicKey, connected, disconnect } = useWallet();

    // Handle mounting to avoid hydration issues
    useEffect(() => {
        setMounted(true);
    }, []);

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    // Format wallet address for display
    const formatAddress = (address: string) => {
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };

    return (
        <header
            className={`fixed w-full top-0 z-50 transition-all duration-300 ease-in-out ${isScrolled
                ? "bg-background/95 backdrop-blur-lg shadow-lg border-b border-border/50"
                : "bg-background/80 backdrop-blur-sm border-b border-border"
                }`}
        >
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-14 sm:h-16">
                    {/* Logo - Left side with fixed width */}
                    <div className="flex items-center group w-1/6">
                        <Image
                            src="/logonew.png"
                            alt="Logo"
                            width={180}
                            height={100}
                            className="transition-transform duration-300 ease-in-out group-hover:scale-105"
                        />

                    </div>

                    {/* Desktop Nav Links - Centered with fixed width */}
                    <div className="hidden lg:flex justify-center w-1/2">
                        <ul className="flex gap-2 items-center">
                            {navItems.map((item, index) => (
                                <li key={item.name} className="relative group">
                                    <Link
                                        href={item.href}
                                        className="block px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground transition-all duration-300 ease-in-out hover:text-foreground hover:bg-accent/50 relative overflow-hidden"
                                        style={{
                                            animationDelay: `${index * 100}ms`,
                                        }}
                                    >
                                        <span className="relative z-10">{item.name}</span>
                                        <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Desktop Actions - Right side with fixed width */}
                    <div className="hidden lg:flex gap-2 items-center justify-end w-1/4">
                        {mounted && (
                            <>
                                {connected && publicKey ? (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="px-4 py-2 font-medium transition-all duration-300 hover:scale-105"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2"></div>
                                            {formatAddress(publicKey.toString())}
                                        </Button>
                                        <Button
                                            onClick={disconnect}
                                            variant="outline"
                                            size="sm"
                                            className="px-4 py-2 font-medium transition-all duration-300 hover:scale-105"
                                        >
                                            Disconnect
                                        </Button>
                                    </>
                                ) : (
                                    <WalletButton />
                                )}
                            </>
                        )}
                        <ThemeToggle />
                        <Button variant="ghost" size="icon" className="relative">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        </Button>
                    </div>

                    {/* Mobile Menu Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleMenu}
                        className="lg:hidden shrink-0"
                        aria-label="Toggle menu"
                    >
                        <div className="relative w-6 h-6">
                            <Menu
                                size={24}
                                className={`absolute inset-0 transition-all duration-300 ${isMenuOpen ? "rotate-180 opacity-0" : "rotate-0 opacity-100"
                                    }`}
                            />
                            <X
                                size={24}
                                className={`absolute inset-0 transition-all duration-300 ${isMenuOpen ? "rotate-0 opacity-100" : "rotate-180 opacity-0"
                                    }`}
                            />
                        </div>
                    </Button>
                </div>
            </nav>

            {/* Mobile Menu */}
            <div
                className={`lg:hidden overflow-hidden transition-all duration-500 ease-in-out ${isMenuOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
                    }`}
            >
                <div className="bg-background/98 backdrop-blur-md border-t border-border/50">
                    <div className="px-4 py-6 space-y-3">
                        {navItems.map((item, index) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="block px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-all duration-300 transform hover:translate-x-2"
                                style={{
                                    animationDelay: `${index * 50}ms`,
                                    transform: isMenuOpen ? "translateY(0)" : "translateY(-20px)",
                                    opacity: isMenuOpen ? 1 : 0,
                                    transition: `all 0.3s ease-in-out ${index * 50}ms`,
                                }}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {item.name}
                            </Link>
                        ))}

                        {/* Mobile Wallet Section */}
                        <div className="pt-4 border-t border-border/50 space-y-3">
                            {mounted && (
                                <>
                                    {connected && publicKey ? (
                                        <div className="space-y-3">
                                            <Button
                                                variant="outline"
                                                className="w-full py-3 font-medium"
                                            >
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2"></div>
                                                {formatAddress(publicKey.toString())}
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    disconnect();
                                                    setIsMenuOpen(false);
                                                }}
                                                variant="outline"
                                                className="w-full py-3 font-medium transition-all duration-300"
                                            >
                                                <Wallet className="mr-2 h-4 w-4" />
                                                Disconnect Wallet
                                            </Button>
                                        </div>
                                    ) : (
                                        <WalletButton />
                                    )}
                                </>
                            )}

                            {/* Mobile Theme Toggle and Notifications */}
                            <div className="flex justify-between items-center pt-2">
                                <ThemeToggle />
                                <Button variant="ghost" size="icon" className="relative">
                                    <Bell className="h-5 w-5" />
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header >
    );
};

export default Navbar;