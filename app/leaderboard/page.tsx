"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import SectionHeader from "@/components/SectionHeader";
import { fetchListingsFromAPI, fetchResaleListingsFromAPI } from "@/lib/api";

interface CreatorStats {
  address: string;
  displayName: string;
  totalRaised: number;
  contractsSold: number;
  listings: number;
}

interface TraderStats {
  address: string;
  displayName: string;
  volume: number;
  listings: number;
}

type Tab = "creators" | "traders";

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("creators");
  const [isLoading, setIsLoading] = useState(true);
  const [creators, setCreators] = useState<CreatorStats[]>([]);
  const [traders, setTraders] = useState<TraderStats[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalValue: 0,
    totalListings: 0,
    totalResales: 0,
    uniqueCreators: 0,
  });

  useEffect(() => {
    async function loadLeaderboardData() {
      setIsLoading(true);
      try {
        // Fetch all listings
        const primaryListings = await fetchListingsFromAPI();
        const resaleListings = await fetchResaleListingsFromAPI();

        // Aggregate creator stats - count SOLD listings as "raised"
        const creatorMap = new Map<string, CreatorStats>();
        
        for (const listing of primaryListings) {
          const existing = creatorMap.get(listing.creator) || {
            address: listing.creator,
            displayName: `${listing.creator.slice(0, 4)}...${listing.creator.slice(-4)}`,
            totalRaised: 0,
            contractsSold: 0,
            listings: 0,
          };
          
          // Count sold listings as revenue raised
          if (listing.status === 'Sold') {
            existing.totalRaised += Number(listing.price) / 1_000_000;
            existing.contractsSold += 1;
          }
          
          // Count active listings
          if (listing.status === 'Active') {
            existing.listings += 1;
          }
          
          creatorMap.set(listing.creator, existing);
        }

        // Sort creators by total raised (actual sales)
        const sortedCreators = Array.from(creatorMap.values())
          .filter(c => c.totalRaised > 0 || c.listings > 0) // Only show creators with activity
          .sort((a, b) => b.totalRaised - a.totalRaised);

        // Aggregate trader/seller stats from resale listings
        const traderMap = new Map<string, TraderStats>();
        
        for (const listing of resaleListings) {
          if (!listing.isActive) continue;
          
          const existing = traderMap.get(listing.seller) || {
            address: listing.seller,
            displayName: `${listing.seller.slice(0, 4)}...${listing.seller.slice(-4)}`,
            volume: 0,
            listings: 0,
          };
          
          existing.volume += Number(listing.price) / 1_000_000;
          existing.listings += 1;
          traderMap.set(listing.seller, existing);
        }

        // Sort traders by volume
        const sortedTraders = Array.from(traderMap.values())
          .sort((a, b) => b.volume - a.volume);

        // Calculate total stats
        const totalRaised = primaryListings
          .filter(l => l.status === 'Sold')
          .reduce((sum, l) => sum + Number(l.price) / 1_000_000, 0);
        const totalSold = primaryListings.filter(l => l.status === 'Sold').length;
        
        setCreators(sortedCreators);
        setTraders(sortedTraders);
        setTotalStats({
          totalValue: totalRaised,
          totalListings: primaryListings.filter(l => l.status === 'Active').length,
          totalResales: resaleListings.length,
          uniqueCreators: sortedCreators.length,
        });
      } catch (error) {
        console.error("Failed to load leaderboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadLeaderboardData();
  }, []);

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <section className="border-b border-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <SectionHeader
            title="Leaderboard"
            subtitle="Top creators and traders on the platform. Rankings based on real on-chain activity."
          />

          {/* Stats summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
            <div className="border border-black p-4">
              <p className="text-sm text-black/60">Total Raised</p>
              <p className="text-2xl font-bold text-green-600">
                {isLoading ? '...' : `$${totalStats.totalValue.toLocaleString()}`}
              </p>
            </div>
            <div className="border border-black p-4">
              <p className="text-sm text-black/60">Active Listings</p>
              <p className="text-2xl font-bold">
                {isLoading ? '...' : totalStats.totalListings}
              </p>
            </div>
            <div className="border border-black p-4">
              <p className="text-sm text-black/60">Secondary Market</p>
              <p className="text-2xl font-bold">
                {isLoading ? '...' : totalStats.totalResales}
              </p>
            </div>
            <div className="border border-black p-4">
              <p className="text-sm text-black/60">Creators</p>
              <p className="text-2xl font-bold">
                {isLoading ? '...' : totalStats.uniqueCreators}
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-0 mt-8 border border-black inline-flex">
            <button
              onClick={() => setActiveTab("creators")}
              className={`px-8 py-3 font-medium text-sm transition-colors ${
                activeTab === "creators"
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              Top Creators
              <span className="ml-2 text-xs opacity-60">PRIMARY</span>
            </button>
            <button
              onClick={() => setActiveTab("traders")}
              className={`px-8 py-3 font-medium text-sm transition-colors border-l border-black ${
                activeTab === "traders"
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              Top Sellers
              <span className="ml-2 text-xs opacity-60">SECONDARY</span>
            </button>
          </div>
        </div>
      </section>

      {/* Leaderboard Table */}
      <section>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-3 text-black/60">
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Loading leaderboard...
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === "creators" ? (
                <motion.div
                  key="creators"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {creators.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-black text-white">
                            <th className="border border-black p-4 text-center font-bold w-20">Rank</th>
                            <th className="border border-black p-4 text-left font-bold">Creator</th>
                            <th className="border border-black p-4 text-right font-bold w-40">Total Raised</th>
                            <th className="border border-black p-4 text-center font-bold w-28">Sold</th>
                            <th className="border border-black p-4 text-center font-bold w-28">Active</th>
                            <th className="border border-black p-4 text-center font-bold w-28">Profile</th>
                          </tr>
                        </thead>
                        <tbody>
                          {creators.map((creator, index) => (
                            <tr
                              key={creator.address}
                              className="bg-white hover:bg-gray-50 transition-colors"
                            >
                              <td className="border border-black p-4 text-center font-bold text-lg">
                                {index + 1}
                              </td>
                              <td className="border border-black p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-black flex items-center justify-center text-white font-bold text-sm">
                                    {creator.address.slice(0, 2)}
                                  </div>
                                  <div>
                                    <p className="font-bold font-mono">{creator.displayName}</p>
                                    <p className="text-sm text-black/60">Creator</p>
                                  </div>
                                </div>
                              </td>
                              <td className="border border-black p-4 text-right font-bold text-green-600">
                                ${creator.totalRaised.toLocaleString()}
                              </td>
                              <td className="border border-black p-4 text-center font-medium">
                                {creator.contractsSold}
                              </td>
                              <td className="border border-black p-4 text-center font-medium">
                                {creator.listings}
                              </td>
                              <td className="border border-black p-4 text-center">
                                <Link
                                  href={`/creator/${creator.address}`}
                                  className="inline-block px-4 py-2 border border-black text-sm font-medium hover:bg-black hover:text-white transition-colors"
                                >
                                  View
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-16 text-center border border-dashed border-black/20">
                      <h3 className="text-xl font-bold mb-2">No creators yet</h3>
                      <p className="text-black/60 mb-4">
                        Be the first to create a royalty listing!
                      </p>
                      <Link
                        href="/sell"
                        className="inline-block px-6 py-2 bg-black text-white font-medium hover:bg-black/80 transition-colors"
                      >
                        Create Listing
                      </Link>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="traders"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {traders.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-black text-white">
                            <th className="border border-black p-4 text-center font-bold w-20">Rank</th>
                            <th className="border border-black p-4 text-left font-bold">Seller</th>
                            <th className="border border-black p-4 text-right font-bold w-40">Listed Value</th>
                            <th className="border border-black p-4 text-center font-bold w-32">Listings</th>
                          </tr>
                        </thead>
                        <tbody>
                          {traders.map((trader, index) => (
                            <tr
                              key={trader.address}
                              className="bg-white hover:bg-gray-50 transition-colors"
                            >
                              <td className="border border-black p-4 text-center font-bold text-lg">
                                {index + 1}
                              </td>
                              <td className="border border-black p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-black flex items-center justify-center text-white font-bold text-sm">
                                    {trader.address.slice(0, 2)}
                                  </div>
                                  <div>
                                    <p className="font-bold font-mono">{trader.displayName}</p>
                                    <p className="text-sm text-black/60">Seller</p>
                                  </div>
                                </div>
                              </td>
                              <td className="border border-black p-4 text-right font-bold">
                                ${trader.volume.toLocaleString()}
                              </td>
                              <td className="border border-black p-4 text-center font-medium">
                                {trader.listings}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-16 text-center border border-dashed border-black/20">
                      <h3 className="text-xl font-bold mb-2">No resale listings yet</h3>
                      <p className="text-black/60 mb-4">
                        Check back later for secondary market activity
                      </p>
                      <Link
                        href="/marketplace"
                        className="inline-block px-6 py-2 bg-black text-white font-medium hover:bg-black/80 transition-colors"
                      >
                        Browse Marketplace
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-black bg-black text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border border-white/20 p-8 hover:border-white/40 transition-colors">
              <h3 className="text-2xl font-bold mb-2">Start Trading</h3>
              <p className="text-white/60 mb-6">
                Buy and sell royalty tokens on the secondary market.
              </p>
              <Link
                href="/marketplace"
                className="inline-block px-6 py-3 bg-white text-black font-medium hover:bg-white/90 transition-colors"
              >
                Browse Marketplace
              </Link>
            </div>
            <div className="border border-white/20 p-8 hover:border-white/40 transition-colors">
              <h3 className="text-2xl font-bold mb-2">Become a Creator</h3>
              <p className="text-white/60 mb-6">
                Tokenize your future revenue and raise capital.
              </p>
              <Link
                href="/sell"
                className="inline-block px-6 py-3 bg-white text-black font-medium hover:bg-white/90 transition-colors"
              >
                Sell Royalties
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
