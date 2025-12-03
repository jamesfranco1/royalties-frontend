"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ListingCard, { ListingData } from "@/components/ListingCard";
import { fetchListingsFromAPI, fetchResaleListingsFromAPI, fetchMetadataFromURI } from "@/lib/api";

// Revenue source display names
const sourceLabels: Record<string, string> = {
  youtube: "YouTube AdSense",
  spotify: "Spotify Streaming",
  twitch: "Twitch Subscriptions",
  patreon: "Patreon Memberships",
  steam: "Steam Game Sales",
  amazon: "Amazon KDP",
  substack: "Substack Newsletter",
  podcast: "Podcast Sponsorships",
  other: "Other",
};

type MarketType = "secondary" | "primary";
type SortOption = "newest" | "price-low" | "price-high" | "percentage";

export default function MarketplacePage() {
  const [marketType, setMarketType] = useState<MarketType>("primary");
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000000]);
  const [isLoading, setIsLoading] = useState(true);
  const [onChainPrimaryListings, setOnChainPrimaryListings] = useState<ListingData[]>([]);
  const [onChainSecondaryListings, setOnChainSecondaryListings] = useState<ListingData[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filter !== "all") count++;
    if (priceRange[0] > 0) count++;
    if (priceRange[1] < 1000000000) count++;
    if (sortBy !== "newest") count++;
    return count;
  }, [filter, priceRange, sortBy]);

  // Fetch listings from cached API on mount
  useEffect(() => {
    async function loadListings() {
      setIsLoading(true);
      try {
        // Fetch primary listings from API (fresh to bypass any stale cache)
        const allListings = await fetchListingsFromAPI(true);
        
        // Filter to active listings only for display (show all formats)
        const activeListings = allListings.filter(l => 
          l.status === 'Active' && l.metadataUri
        );
        
        // Fetch metadata for each listing (in parallel)
        const formattedPrimary: ListingData[] = await Promise.all(
          activeListings.map(async (l) => {
            const metadata = await fetchMetadataFromURI(l.metadataUri || '');
            const priceUsdc = Number(l.price) / 1_000_000;
            const priceSol = l.priceSol ? Number(l.priceSol) / 1_000_000_000 : 0;
            const durationSeconds = Number(l.durationSeconds);
            
            const platformLabel = sourceLabels[metadata.platform] || metadata.platform || 'Unknown';
            const listingName = metadata.name && metadata.name !== 'Untitled' ? metadata.name : '';
            
            return {
              id: l.pubkey,
              creatorName: `${l.creator.slice(0, 4)}...${l.creator.slice(-4)}`,
              creatorAddress: l.creator,
              revenueSource: platformLabel,
              listingName: listingName,
              percentageOffered: l.percentageBps / 100,
              duration: durationSeconds === 0 ? "Perpetual" : `${Math.floor(durationSeconds / (30 * 24 * 60 * 60))} months`,
              durationSeconds: durationSeconds,
              startTimestamp: Number(l.createdAt),
              price: priceUsdc,
              priceSol: priceSol,
              imageUrl: metadata.imageUrl,
              description: metadata.description,
              platformIcon: metadata.platform,
            };
          })
        );
        
        // Fetch secondary listings from API
        const secondaryData = await fetchResaleListingsFromAPI(true);
        
        const formattedSecondary: ListingData[] = await Promise.all(
          secondaryData
            .filter(l => l.isActive)
            .map(async (l) => {
              const priceUsdc = Number(l.price) / 1_000_000;
              
              const originalListing = allListings.find(p => p.pubkey === l.originalListing);
              let metadata = { name: '', platform: '', imageUrl: '', description: '' };
              let percentage = 0;
              
              if (originalListing?.metadataUri) {
                try {
                  metadata = await fetchMetadataFromURI(originalListing.metadataUri);
                  percentage = originalListing.percentageBps / 100;
                } catch (e) {
                  console.error('Failed to fetch resale metadata:', e);
                }
              }
              
              const platformLabel = sourceLabels[metadata.platform] || metadata.platform || 'Unknown';
              const displayName = metadata.name && metadata.name !== 'Untitled' ? metadata.name : 'Royalty Contract';
              const priceSol = l.priceSol ? Number(l.priceSol) / 1_000_000_000 : 0;
              
              return {
                id: l.pubkey,
                creatorName: `${l.seller.slice(0, 4)}...${l.seller.slice(-4)}`,
                creatorAddress: l.seller,
                revenueSource: platformLabel,
                listingName: displayName,
                percentageOffered: percentage,
                duration: "See Details",
                price: priceUsdc,
                priceSol: priceSol,
                isSecondary: true,
                currentOwner: `${l.seller.slice(0, 4)}...${l.seller.slice(-4)}`,
                imageUrl: metadata.imageUrl,
                description: metadata.description,
                platformIcon: metadata.platform,
              };
            })
        );

        setOnChainPrimaryListings(formattedPrimary);
        setOnChainSecondaryListings(formattedSecondary);
      } catch (error) {
        console.error("Failed to fetch listings:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadListings();
  }, []);

  // Raw listings based on market type
  const rawListings = marketType === "secondary" 
    ? onChainSecondaryListings
    : onChainPrimaryListings;

  // Filtered and sorted listings
  const listings = useMemo(() => {
    let result = [...rawListings];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(l => 
        l.creatorName.toLowerCase().includes(query) ||
        l.revenueSource.toLowerCase().includes(query) ||
        l.description?.toLowerCase().includes(query)
      );
    }

    // Platform filter
    if (filter !== "all") {
      result = result.filter(l => 
        l.revenueSource.toLowerCase().includes(filter.toLowerCase())
      );
    }

    // Price range filter
    result = result.filter(l => 
      l.price >= priceRange[0] && l.price <= priceRange[1]
    );

    // Sorting
    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result.sort((a, b) => b.price - a.price);
        break;
      case "percentage":
        result.sort((a, b) => b.percentageOffered - a.percentageOffered);
        break;
      case "newest":
      default:
        break;
    }

    return result;
  }, [rawListings, searchQuery, filter, priceRange, sortBy]);

  const clearAllFilters = () => {
    setFilter('all');
    setPriceRange([0, 1000000000]);
    setSortBy('newest');
    setSearchQuery('');
  };

  const platformFilters = [
    { key: "all", label: "All Platforms" },
    { key: "youtube", label: "YouTube" },
    { key: "spotify", label: "Spotify" },
    { key: "twitch", label: "Twitch" },
    { key: "patreon", label: "Patreon" },
    { key: "steam", label: "Steam" },
    { key: "substack", label: "Substack" },
    { key: "other", label: "Other" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="border-b border-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          {/* Top Row: Title + Market Toggle */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Marketplace</h1>
              <p className="text-black/60 text-sm mt-1">Browse and invest in creator royalties</p>
            </div>

            {/* Market Type Toggle */}
            <div className="flex gap-0 border border-black inline-flex">
              <button
                onClick={() => setMarketType("secondary")}
                className={`px-6 py-2 font-medium text-sm transition-colors ${
                  marketType === "secondary"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-gray-100"
                }`}
              >
                Secondary
              </button>
              <button
                onClick={() => setMarketType("primary")}
                className={`px-6 py-2 font-medium text-sm transition-colors border-l border-black ${
                  marketType === "primary"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-gray-100"
                }`}
              >
                Primary
              </button>
            </div>
          </div>
          
          {/* Compact Stats */}
          <div className="flex flex-wrap gap-6 mt-4 text-sm">
            {marketType === "secondary" ? (
              <>
                <div><span className="text-black/50">Listings:</span> <span className="font-semibold">{onChainSecondaryListings.length}</span></div>
                <div><span className="text-black/50">Floor:</span> <span className="font-semibold">{onChainSecondaryListings.length > 0 ? `$${Math.min(...onChainSecondaryListings.map(l => l.price)).toLocaleString()}` : '—'}</span></div>
                <div><span className="text-black/50">Total Value:</span> <span className="font-semibold">{onChainSecondaryListings.length > 0 ? `$${onChainSecondaryListings.reduce((sum, l) => sum + l.price, 0).toLocaleString()}` : '—'}</span></div>
              </>
            ) : (
              <>
                <div><span className="text-black/50">Listings:</span> <span className="font-semibold">{onChainPrimaryListings.length}</span></div>
                <div><span className="text-black/50">Floor:</span> <span className="font-semibold">{onChainPrimaryListings.length > 0 ? `$${Math.min(...onChainPrimaryListings.map(l => l.price)).toLocaleString()}` : '—'}</span></div>
                <div><span className="text-black/50">Total Value:</span> <span className="font-semibold">{onChainPrimaryListings.length > 0 ? `$${onChainPrimaryListings.reduce((sum, l) => sum + l.price, 0).toLocaleString()}` : '—'}</span></div>
              </>
            )}
          </div>

          {/* Search + Filters Button Row */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            {/* Search */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-10 border border-black bg-white text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black"
              />
              <svg 
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filters Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-5 py-3 border font-medium text-sm transition-all flex items-center gap-2 ${
                showFilters || activeFilterCount > 0
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-black hover:bg-black/5"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className={`ml-1 w-5 h-5 text-xs flex items-center justify-center ${
                  showFilters ? "bg-white text-black" : "bg-black text-white"
                }`}>
                  {activeFilterCount}
                </span>
              )}
              <svg 
                className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Collapsible Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-6 pb-2 border-t border-black/10 mt-6">
                  {/* Filter Sections Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Platform Filter */}
                    <div>
                      <label className="block text-xs font-medium text-black/50 uppercase tracking-wider mb-3">
                        Platform
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {platformFilters.map((f) => (
                          <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                              filter === f.key
                                ? "bg-black text-white"
                                : "border border-black/20 text-black/60 hover:border-black hover:text-black"
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Price Range */}
                    <div>
                      <label className="block text-xs font-medium text-black/50 uppercase tracking-wider mb-3">
                        Price Range (USDC)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={priceRange[0] || ''}
                          onChange={(e) => setPriceRange([Number(e.target.value) || 0, priceRange[1]])}
                          className="w-full px-3 py-2 border border-black/20 bg-white text-black placeholder:text-black/40 focus:outline-none focus:border-black text-sm"
                        />
                        <span className="text-black/30">—</span>
                        <input
                          type="number"
                          placeholder="Max"
                          value={priceRange[1] === 1000000000 ? '' : priceRange[1]}
                          onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value) || 1000000000])}
                          className="w-full px-3 py-2 border border-black/20 bg-white text-black placeholder:text-black/40 focus:outline-none focus:border-black text-sm"
                        />
                      </div>
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="block text-xs font-medium text-black/50 uppercase tracking-wider mb-3">
                        Sort By
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="w-full px-3 py-2 border border-black/20 bg-white text-black focus:outline-none focus:border-black text-sm"
                      >
                        <option value="newest">Newest First</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="percentage">Highest Percentage</option>
                      </select>
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {activeFilterCount > 0 && (
                    <div className="mt-4 pt-4 border-t border-black/10">
                      <button
                        onClick={clearAllFilters}
                        className="text-sm text-black/60 hover:text-black underline"
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Listings Grid */}
      <section>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          {/* Status Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-center gap-2 text-black/60">
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Loading...
                </div>
              )}
              
              {/* On-chain indicator */}
              {!isLoading && (onChainPrimaryListings.length > 0 || onChainSecondaryListings.length > 0) && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Live on-chain
                </div>
              )}
            </div>

            {/* Results count */}
            {!isLoading && (
              <p className="text-sm text-black/60">
                {listings.length} {listings.length === 1 ? 'listing' : 'listings'}
                {(searchQuery || activeFilterCount > 0) && (
                  <button
                    onClick={clearAllFilters}
                    className="ml-2 text-black underline hover:no-underline"
                  >
                    Clear filters
                  </button>
                )}
              </p>
            )}
          </div>

          <AnimatePresence mode="wait">
            {listings.length > 0 ? (
              <motion.div
                key={`${marketType}-${filter}-${sortBy}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {listings.map((listing) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ListingCard listing={listing} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-16 text-center border border-dashed border-black/20"
              >
                <h3 className="text-xl font-bold mb-2">
                  {searchQuery || activeFilterCount > 0
                    ? "No listings match your filters"
                    : marketType === "primary" 
                      ? "No active listings yet"
                      : "No resale listings yet"
                  }
                </h3>
                <p className="text-black/60 mb-4">
                  {searchQuery 
                    ? `No results for "${searchQuery}"`
                    : marketType === "primary"
                      ? "Be the first to create a royalty listing!"
                      : "Check back later for secondary market listings"
                  }
                </p>
                {(searchQuery || activeFilterCount > 0) ? (
                  <button
                    onClick={clearAllFilters}
                    className="px-6 py-2 border border-black font-medium hover:bg-black hover:text-white transition-colors"
                  >
                    Clear Filters
                  </button>
                ) : marketType === "primary" ? (
                  <Link
                    href="/sell"
                    className="inline-block px-6 py-2 bg-black text-white font-medium hover:bg-black/80 transition-colors"
                  >
                    Create Listing
                  </Link>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Load more */}
          {listings.length >= 8 && (
            <div className="mt-12 text-center">
              <button className="px-8 py-4 border-2 border-black font-medium hover:bg-black hover:text-white transition-colors">
                Load More Listings
              </button>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-black bg-black text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-2">
                {marketType === "secondary" ? "Have tokens to sell?" : "Want to raise capital?"}
              </h3>
              <p className="text-white/60">
                {marketType === "secondary"
                  ? "List your royalty tokens on the secondary market."
                  : "Tokenize your future revenue and sell royalties."}
              </p>
            </div>
            <Link
              href="/sell"
              className="px-8 py-4 bg-white text-black font-medium hover:bg-white/90 transition-colors whitespace-nowrap"
            >
              {marketType === "secondary" ? "List Tokens" : "Sell Royalties"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
