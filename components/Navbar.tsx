"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import PlaceholderCrownLogo from "./PlaceholderCrownLogo";
import { useState, useEffect } from "react";

const navLinks = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/sell", label: "Sell" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/token", label: "Token" },
  { href: "/docs", label: "Docs" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering wallet state after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const handleConnectWallet = () => {
    setVisible(true);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-black">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-70 transition-opacity">
            <PlaceholderCrownLogo size={32} />
            <span className="text-lg font-bold tracking-tight">royalties.fun</span>
          </Link>

          {/* Center - Nav links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  text-sm font-medium transition-colors
                  ${pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href)) 
                    ? "text-black" 
                    : "text-black/50 hover:text-black"}
                `}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side - Wallet */}
          <div className="hidden md:flex items-center">
            {!mounted ? (
              <div className="bg-black text-white text-sm font-medium px-4 py-2">
                Loading...
              </div>
            ) : connected && publicKey ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 border border-black/20">
                  <div className="w-2 h-2 bg-green-500" />
                  <span className="font-mono text-sm">{truncateAddress(publicKey.toString())}</span>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="text-xs text-black/50 hover:text-black transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                className="bg-black text-white text-sm font-medium px-4 py-2 hover:bg-black/80 transition-colors"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
