"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

export default function TokenPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
          <motion.div {...fadeIn}>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">The Token</h1>
            <p className="text-xl text-white/60 max-w-2xl">
              Powered by the Bags.fm SDK.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Key Points */}
      <section className="border-b border-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <motion.div {...fadeIn} className="grid md:grid-cols-3 gap-8">
            <div className="border-l-4 border-black pl-6">
              <p className="text-lg font-medium">The marketplace runs independently of the token.</p>
            </div>
            <div className="border-l-4 border-black pl-6">
              <p className="text-lg font-medium">The token has real utility from day one.</p>
            </div>
            <div className="border-l-4 border-black pl-6">
              <p className="text-lg font-medium">Value is supported by transparent buybacks and burns.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bags SDK Integration */}
      <section className="border-b border-black bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <motion.div {...fadeIn}>
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-3xl font-bold">Bags.fm SDK Integration</h2>
            </div>
            <p className="text-black/60 mb-12 max-w-2xl">
              Our token is built on the Bags.fm SDK, enabling powerful automated mechanics that drive value to holders. 
              Automated buybacks are triggered from both transaction fees and platform profits.
            </p>
            <div className="mb-8">
              <a 
                href="https://github.com/jamesdfranco/royalties" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                View Implementation
              </a>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Dividends Bot */}
              <div className="border border-black p-8 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold">Dividends Bot</h3>
                  <span className="text-3xl font-bold text-black/20">10%</span>
                </div>
                <p className="text-black/70 mb-6">
                  10% of all transaction fees are allocated to the dividends bot, distributing rewards directly to token holders.
                </p>
                
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 bg-black mt-2 flex-shrink-0" />
                    <span>Automatic holder rewards</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 bg-black mt-2 flex-shrink-0" />
                    <span>Passive income for holding</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 bg-black mt-2 flex-shrink-0" />
                    <span>Powered by Bags SDK</span>
                  </li>
                </ul>
              </div>

              {/* AMM Bot */}
              <div className="border border-black p-8 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold">AMM Bot</h3>
                  <span className="text-3xl font-bold text-black/20">10%</span>
                </div>
                <p className="text-black/70 mb-6">
                  10% of all transaction fees power the AMM bot, maintaining deep liquidity and stable trading conditions.
                </p>
                
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 bg-black mt-2 flex-shrink-0" />
                    <span>Deep liquidity provision</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 bg-black mt-2 flex-shrink-0" />
                    <span>Reduced price volatility</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 bg-black mt-2 flex-shrink-0" />
                    <span>Smooth trading experience</span>
                  </li>
                </ul>
              </div>

              {/* Buybacks & Burns */}
              <div className="border border-black p-8 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold">Buybacks & Burns</h3>
                  <span className="text-3xl font-bold text-black/20">80%</span>
                </div>
                <p className="text-black/70 mb-6">
                  The remaining 80% is dedicated to aggressive buybacks and burns, driving market cap growth.
                </p>
                
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 bg-black mt-2 flex-shrink-0" />
                    <span>Deflationary mechanics</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 bg-black mt-2 flex-shrink-0" />
                    <span>Continuous buy pressure</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 bg-black mt-2 flex-shrink-0" />
                    <span>Market cap inflation</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 100K Challenge */}
      <section className="border-b border-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <motion.div {...fadeIn}>
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">The 100K Challenge</h2>
                <p className="text-black/70 text-lg mb-6">
                  Our goal is to become the largest token on Bags.fm. Why? Because Bags distributes <span className="font-bold">$100,000 to holders</span> of the top token on the platform.
                </p>
                <p className="text-black/70 mb-8">
                  With 80% of fees going to buybacks and burns, we&apos;re aggressively positioning ourselves to capture this prize for our community.
                </p>
                
                <div className="bg-black text-white p-6">
                  <p className="text-sm text-white/60 mb-2">Target</p>
                  <p className="text-3xl font-bold mb-2">#1 on Bags.fm</p>
                  <p className="text-white/60">Largest market cap = $100K distribution to holders</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="border border-black p-6">
                  <div className="text-sm text-black/50 mb-2">Allocation Breakdown</div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">Buybacks & Burns</span>
                        <span className="font-bold">80%</span>
                      </div>
                      <div className="h-3 bg-gray-200">
                        <div className="h-full bg-black" style={{ width: "80%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">Dividends Bot</span>
                        <span className="font-bold">10%</span>
                      </div>
                      <div className="h-3 bg-gray-200">
                        <div className="h-full bg-black" style={{ width: "10%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">AMM Bot</span>
                        <span className="font-bold">10%</span>
                      </div>
                      <div className="h-3 bg-gray-200">
                        <div className="h-full bg-black" style={{ width: "10%" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Future Utility */}
      <section className="border-b border-black bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <motion.div {...fadeIn}>
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-3xl font-bold">Future Utility</h2>
            </div>
            <p className="text-black/60 mb-12 max-w-2xl">
              Additional utilities introduced as the platform matures.
            </p>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Reduced Fees */}
              <div className="border border-black p-6 bg-white">
                <h3 className="text-lg font-bold mb-3">Reduced Marketplace Fees</h3>
                <p className="text-black/60 text-sm mb-4">
                  Token holders receive reduced fees on primary and secondary market transactions.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-black/10">
                    <span className="text-black/60">Base Fee</span>
                    <span className="font-medium">Standard</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-black/10">
                    <span className="text-black/60">Token Holders</span>
                    <span className="font-medium">Reduced</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-black/60">Stakers</span>
                    <span className="font-medium">Further Reduced</span>
                  </div>
                </div>
              </div>

              {/* Priority Boost */}
              <div className="border border-black p-6 bg-white">
                <h3 className="text-lg font-bold mb-3">Priority Boost for Creators</h3>
                <p className="text-black/60 text-sm mb-4">
                  Creators can pay fees in the token to receive enhanced visibility.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-black mt-2 flex-shrink-0" />
                    <span>Featured placement</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-black mt-2 flex-shrink-0" />
                    <span>Boosted visibility</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-black mt-2 flex-shrink-0" />
                    <span>Higher indexing priority</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-black mt-2 flex-shrink-0" />
                    <span>Verified royalty audit tools</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Onboarding */}
      <section className="border-b border-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <motion.div {...fadeIn}>
            <h2 className="text-3xl font-bold mb-4">Onboarding</h2>
            <p className="text-black/60 mb-12 max-w-2xl">
              Using developer fees to protect and incentivize early creators.
            </p>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4">How It Works</h3>
                <p className="text-black/70 mb-6">
                  When the token launches, the developer wallet receives a fee from every trade. 
                  These earnings are allocated to a creator protection fund.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                    <div>
                      <p className="font-medium">Fund Creation</p>
                      <p className="text-sm text-black/60">Dev fees accumulate in protection fund</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                    <div>
                      <p className="font-medium">Creator Protection</p>
                      <p className="text-sm text-black/60">Fund protects early creators from poor sale outcomes</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                    <div>
                      <p className="font-medium">Risk Reduction</p>
                      <p className="text-sm text-black/60">Makes early adoption more attractive for quality creators</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border border-black p-8 bg-white">
                <h3 className="text-lg font-bold mb-4">Example</h3>
                <p className="text-black/70 mb-6">
                  If a creator sells royalties worth 1,000 USDC but later regrets it due to volatility or low pricing:
                </p>
                <div className="bg-gray-50 border border-black/10 p-6">
                  <p className="text-2xl font-bold mb-2">Up to 50%</p>
                  <p className="text-black/60">reimbursement based on pre-determined rules</p>
                </div>
                <div className="mt-6 pt-6 border-t border-black/10">
                  <p className="text-sm font-medium mb-2">Purpose</p>
                  <ul className="space-y-2 text-sm text-black/60">
                    <li>• Encourage high-quality creators to list early</li>
                    <li>• Build trust and participation</li>
                    <li>• Position the platform as creator-first</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Docs Link */}
      <section className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <motion.div {...fadeIn} className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-2">Full Documentation</h3>
              <p className="text-white/60">
                Fee structure, trading mechanics, NFT mechanics, contract legality, and more.
              </p>
            </div>
            <Link
              href="/docs"
              className="px-8 py-4 bg-white text-black font-medium hover:bg-white/90 transition-colors whitespace-nowrap"
            >
              Read the Docs
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
