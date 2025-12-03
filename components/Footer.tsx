import Link from "next/link";
import PlaceholderCrownLogo from "./PlaceholderCrownLogo";

export default function Footer() {
  return (
    <footer className="border-t border-black bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <PlaceholderCrownLogo size={32} />
              <span className="text-lg font-bold">royalties.fun</span>
            </div>
            <p className="text-sm text-black/60">
              The on-chain marketplace for creator royalties.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-sm mb-4 uppercase tracking-wider">Platform</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/marketplace" className="text-sm text-black/60 hover:text-black transition-colors">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link href="/sell" className="text-sm text-black/60 hover:text-black transition-colors">
                  Sell Royalties
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="text-sm text-black/60 hover:text-black transition-colors">
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-black/60 hover:text-black transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-4 uppercase tracking-wider">Resources</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/token" className="text-sm text-black/60 hover:text-black transition-colors">
                  Token
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-sm text-black/60 hover:text-black transition-colors">
                  Documentation
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-4 uppercase tracking-wider">Connect</h4>
            <ul className="space-y-3">
              <li>
                <a 
                  href="https://x.com/royaltiesfun" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-black/60 hover:text-black transition-colors"
                >
                  Twitter / X
                </a>
              </li>
              <li>
                <a 
                  href="https://github.com/jamesdfranco/royalties" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-black/60 hover:text-black transition-colors"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-black/10">
          <p className="text-sm text-black/40">
            © 2024 royalties.fun. All rights reserved. Built on Solana.
          </p>
        </div>
      </div>
    </footer>
  );
}
