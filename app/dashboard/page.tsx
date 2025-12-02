"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { motion, AnimatePresence } from "framer-motion";
import SectionHeader from "@/components/SectionHeader";
import Card from "@/components/Card";
import { useToast } from "@/components/Toast";
import {
  fetchUserOwnedRoyalties,
  fetchUserCreatedListings,
  fetchPayoutPool,
  depositPayout,
  claimPayout,
  listForResale,
  useRoyaltiesProgram,
} from "@/lib/solana";
import { fetchMetadataFromURI } from "@/lib/api";
import { generateContractPDF, getContractTiming, ContractData } from "@/lib/contractPDF";

interface OwnedRoyalty {
  publicKey: string;
  creator: string;
  nftMint: string;
  metadataUri: string;
  percentage: number;
  durationSeconds: number;
  priceUsdc: number;
  resaleAllowed: boolean;
  status: string;
  startTimestamp?: number;
  payoutPool?: {
    availableToClaimUsdc: number;
    totalDepositedUsdc: number;
    totalClaimedUsdc: number;
  } | null;
}

interface CreatedListing {
  publicKey: string;
  nftMint: string;
  metadataUri: string;
  percentage: number;
  priceUsdc: number;
  status: string;
  payoutPool?: {
    totalDepositedUsdc: number;
    totalClaimedUsdc: number;
  } | null;
}

export default function DashboardPage() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { provider } = useRoyaltiesProgram();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"owned" | "created" | "activity">("owned");
  const [ownedRoyalties, setOwnedRoyalties] = useState<OwnedRoyalty[]>([]);
  const [createdListings, setCreatedListings] = useState<CreatedListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  
  // Activity history (stored in localStorage for persistence)
  const [activities, setActivities] = useState<{
    id: string;
    type: 'purchase' | 'sale' | 'claim' | 'deposit' | 'list_resale' | 'create_listing';
    description: string;
    amount?: number;
    txId: string;
    timestamp: number;
  }[]>([]);
  
  // Cached metadata for https:// URIs
  const [metadataCache, setMetadataCache] = useState<Record<string, { source: string; work: string; imageUrl: string }>>({});

  // Load activities from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && publicKey) {
      const stored = localStorage.getItem(`royalties_activity_${publicKey.toBase58()}`);
      if (stored) {
        try {
          setActivities(JSON.parse(stored));
        } catch (e) {}
      }
    }
  }, [publicKey]);

  // Save activity helper
  const addActivity = (activity: Omit<typeof activities[0], 'id' | 'timestamp'>) => {
    const newActivity = {
      ...activity,
      id: Math.random().toString(36).slice(2),
      timestamp: Date.now(),
    };
    const updated = [newActivity, ...activities].slice(0, 50); // Keep last 50
    setActivities(updated);
    if (typeof window !== 'undefined' && publicKey) {
      localStorage.setItem(`royalties_activity_${publicKey.toBase58()}`, JSON.stringify(updated));
    }
  };
  
  // Deposit modal state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositListing, setDepositListing] = useState<CreatedListing | null>(null);
  const [depositAmount, setDepositAmount] = useState("");

  // Resale modal state
  const [showResaleModal, setShowResaleModal] = useState(false);
  const [resaleRoyalty, setResaleRoyalty] = useState<OwnedRoyalty | null>(null);
  const [resalePrice, setResalePrice] = useState("");

  // Contract preview modal state
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractRoyalty, setContractRoyalty] = useState<OwnedRoyalty | null>(null);

  // Fetch data when wallet connects
  useEffect(() => {
    async function loadData() {
      if (!connected || !publicKey) {
        setOwnedRoyalties([]);
        setCreatedListings([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch owned royalties
        const owned = await fetchUserOwnedRoyalties(publicKey);
        
        // Fetch payout pools for each owned royalty
        const ownedWithPayouts = await Promise.all(
          owned.map(async (royalty) => {
            const payoutPool = await fetchPayoutPool(royalty.publicKey);
            return { ...royalty, payoutPool };
          })
        );
        setOwnedRoyalties(ownedWithPayouts);

        // Fetch created listings
        const created = await fetchUserCreatedListings(publicKey);
        
        // Fetch payout pools for created listings
        const createdWithPayouts = await Promise.all(
          created.map(async (listing) => {
            const payoutPool = await fetchPayoutPool(listing.publicKey);
            return { ...listing, payoutPool };
          })
        );
        setCreatedListings(createdWithPayouts);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [connected, publicKey]);

  // Fetch metadata for https:// URIs
  useEffect(() => {
    async function fetchMetadata() {
      const allUris = [
        ...ownedRoyalties.map(r => r.metadataUri),
        ...createdListings.map(l => l.metadataUri),
      ].filter(uri => uri.startsWith('https://'));
      
      for (const uri of allUris) {
        if (!metadataCache[uri]) {
          try {
            const meta = await fetchMetadataFromURI(uri);
            setMetadataCache(prev => ({
              ...prev,
              [uri]: { source: meta.platform, work: meta.name, imageUrl: meta.imageUrl }
            }));
          } catch (e) {
            console.error('Failed to fetch metadata:', e);
          }
        }
      }
    }
    
    if (ownedRoyalties.length > 0 || createdListings.length > 0) {
      fetchMetadata();
    }
  }, [ownedRoyalties, createdListings]);

  // Handle claim payout
  const handleClaim = async (royalty: OwnedRoyalty) => {
    if (!provider) {
      showToast("Wallet not connected", "error");
      return;
    }

    setIsProcessing(royalty.publicKey);
    try {
      const txId = await claimPayout(provider, royalty.publicKey, royalty.nftMint);
      showToast(`Payout claimed! TX: ${txId.slice(0, 8)}...`, "success");
      addActivity({
        type: 'claim',
        description: `Claimed payout from ${parseUri(royalty.metadataUri).source}`,
        amount: royalty.payoutPool?.availableToClaimUsdc,
        txId,
      });
      
      // Refresh data
      if (publicKey) {
        const owned = await fetchUserOwnedRoyalties(publicKey);
        const ownedWithPayouts = await Promise.all(
          owned.map(async (r) => {
            const payoutPool = await fetchPayoutPool(r.publicKey);
            return { ...r, payoutPool };
          })
        );
        setOwnedRoyalties(ownedWithPayouts);
      }
    } catch (error: any) {
      console.error("Claim failed:", error);
      showToast(error.message || "Failed to claim payout", "error");
    } finally {
      setIsProcessing(null);
    }
  };

  // Handle deposit payout
  const handleDeposit = async () => {
    if (!provider || !depositListing) {
      showToast("Wallet not connected", "error");
      return;
    }

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }

    setIsProcessing(depositListing.publicKey);
    try {
      const txId = await depositPayout(provider, depositListing.publicKey, amount);
      showToast(`Deposited ${amount} USDC! TX: ${txId.slice(0, 8)}...`, "success");
      addActivity({
        type: 'deposit',
        description: `Deposited payout for ${parseUri(depositListing.metadataUri).source}`,
        amount,
        txId,
      });
      setShowDepositModal(false);
      setDepositAmount("");
      setDepositListing(null);
      
      // Refresh data
      if (publicKey) {
        const created = await fetchUserCreatedListings(publicKey);
        const createdWithPayouts = await Promise.all(
          created.map(async (listing) => {
            const payoutPool = await fetchPayoutPool(listing.publicKey);
            return { ...listing, payoutPool };
          })
        );
        setCreatedListings(createdWithPayouts);
      }
    } catch (error: any) {
      console.error("Deposit failed:", error);
      showToast(error.message || "Failed to deposit", "error");
    } finally {
      setIsProcessing(null);
    }
  };

  // Handle view contract (show preview modal)
  const handleViewContract = (royalty: OwnedRoyalty) => {
    setContractRoyalty(royalty);
    setShowContractModal(true);
  };

  // Get contract data for PDF
  const getContractData = (royalty: OwnedRoyalty): ContractData => {
    const { source, work } = parseUri(royalty.metadataUri);
    return {
      contractId: royalty.publicKey,
      nftMint: royalty.nftMint,
      creatorWallet: royalty.creator,
      buyerWallet: publicKey?.toBase58() || '',
      workName: work && work !== 'Loading...' ? work : 'Unknown Work',
      platform: source && source !== 'Loading...' ? source : 'Unknown',
      percentage: royalty.percentage,
      durationSeconds: royalty.durationSeconds,
      priceUsdc: royalty.priceUsdc,
      resaleAllowed: royalty.resaleAllowed,
      startTimestamp: royalty.startTimestamp,
      totalDeposited: royalty.payoutPool?.totalDepositedUsdc,
      totalClaimed: royalty.payoutPool?.totalClaimedUsdc,
      availableToClaim: royalty.payoutPool?.availableToClaimUsdc,
    };
  };

  // Handle download contract PDF
  const handleDownloadContract = () => {
    if (!contractRoyalty) return;
    const contractData = getContractData(contractRoyalty);
    generateContractPDF(contractData);
    showToast('Contract PDF downloaded!', 'success');
  };

  // Handle list for resale
  const handleListForResale = async () => {
    if (!provider || !resaleRoyalty) {
      showToast("Wallet not connected", "error");
      return;
    }

    const price = parseFloat(resalePrice);
    if (isNaN(price) || price <= 0) {
      showToast("Please enter a valid price", "error");
      return;
    }

    setIsProcessing(resaleRoyalty.publicKey);
    try {
      const result = await listForResale(
        provider,
        resaleRoyalty.publicKey,
        resaleRoyalty.nftMint,
        price
      );
      showToast(`Listed for ${price} USDC! TX: ${result.txId.slice(0, 8)}...`, "success");
      addActivity({
        type: 'list_resale',
        description: `Listed ${parseUri(resaleRoyalty.metadataUri).source} for resale`,
        amount: price,
        txId: result.txId,
      });
      setShowResaleModal(false);
      setResalePrice("");
      setResaleRoyalty(null);
      
      // Refresh data
      if (publicKey) {
        const owned = await fetchUserOwnedRoyalties(publicKey);
        const ownedWithPayouts = await Promise.all(
          owned.map(async (r) => {
            const payoutPool = await fetchPayoutPool(r.publicKey);
            return { ...r, payoutPool };
          })
        );
        setOwnedRoyalties(ownedWithPayouts);
      }
    } catch (error: any) {
      console.error("List for resale failed:", error);
      showToast(error.message || "Failed to list for resale", "error");
    } finally {
      setIsProcessing(null);
    }
  };

  // Parse metadata URI (handles old, new, and URL formats)
  const parseUri = useCallback((uri: string) => {
    // New format: data:application/json;base64,...
    if (uri.startsWith('data:application/json;base64,')) {
      try {
        const base64 = uri.replace('data:application/json;base64,', '');
        const json = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
        return { source: json.source || 'other', work: json.work || 'Unknown', imageUrl: json.imageUrl || '' };
      } catch (e) { /* fallthrough */ }
    }
    // IPFS format: ipfs://source/work
    if (uri.startsWith('ipfs://')) {
      const parts = uri.replace("ipfs://", "").split("/");
      return { source: parts[0] || "Unknown", work: parts.slice(1).join("/") || uri, imageUrl: '' };
    }
    // HTTPS URL format (Vercel Blob) - use cached metadata
    if (uri.startsWith('https://')) {
      const cached = metadataCache[uri];
      if (cached) {
        return cached;
      }
      return { source: 'Loading...', work: 'Loading...', imageUrl: '' };
    }
    // Fallback
    return { source: "Unknown", work: uri, imageUrl: '' };
  }, [metadataCache]);

  // Format duration
  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "Perpetual";
    const months = Math.floor(seconds / (30 * 24 * 60 * 60));
    if (months > 0) return `${months} months`;
    const days = Math.floor(seconds / (24 * 60 * 60));
    return `${days} days`;
  };

  // Not connected state
  if (!connected) {
    return (
      <div className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-6">Connect Your Wallet</h1>
            <p className="text-xl text-black/60 mb-12 max-w-xl mx-auto">
              Connect your Solana wallet to view your royalty tokens, track earnings, and claim payouts.
            </p>
            <button
              onClick={() => setVisible(true)}
              className="bg-black text-white font-medium px-8 py-4 hover:bg-black/80 transition-colors"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalClaimable = ownedRoyalties.reduce(
    (acc, r) => acc + (r.payoutPool?.availableToClaimUsdc || 0),
    0
  );
  const totalDeposited = createdListings.reduce(
    (acc, l) => acc + (l.payoutPool?.totalDepositedUsdc || 0),
    0
  );

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <section className="border-b border-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <SectionHeader
              title="Dashboard"
              subtitle="Manage your royalty contracts and earnings."
              className="mb-0"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-black/60 font-mono">
                {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
              </span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
            <div className="border border-black p-4">
              <p className="text-sm text-black/60">Owned Contracts</p>
              <p className="text-2xl font-bold">{ownedRoyalties.length}</p>
            </div>
            <div className="border border-black p-4">
              <p className="text-sm text-black/60">Created Listings</p>
              <p className="text-2xl font-bold">{createdListings.length}</p>
            </div>
            <div className="border border-black p-4">
              <p className="text-sm text-black/60">Claimable Payouts</p>
              <p className="text-2xl font-bold text-green-600">
                ${totalClaimable.toFixed(2)}
              </p>
            </div>
            <div className="border border-black p-4">
              <p className="text-sm text-black/60">Total Deposited</p>
              <p className="text-2xl font-bold">${totalDeposited.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="border-b border-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab("owned")}
              className={`py-4 font-medium border-b-2 transition-colors ${
                activeTab === "owned"
                  ? "border-black text-black"
                  : "border-transparent text-black/40 hover:text-black/60"
              }`}
            >
              Owned Contracts ({ownedRoyalties.length})
            </button>
            <button
              onClick={() => setActiveTab("created")}
              className={`py-4 font-medium border-b-2 transition-colors ${
                activeTab === "created"
                  ? "border-black text-black"
                  : "border-transparent text-black/40 hover:text-black/60"
              }`}
            >
              My Listings ({createdListings.length})
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`py-4 font-medium border-b-2 transition-colors ${
                activeTab === "activity"
                  ? "border-black text-black"
                  : "border-transparent text-black/40 hover:text-black/60"
              }`}
            >
              Activity ({activities.length})
            </button>
          </div>
        </div>
      </section>

      {/* Content */}
      <section>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-4" />
              <p className="text-black/60">Loading your contracts...</p>
            </div>
          ) : activeTab === "owned" ? (
            /* Owned Contracts */
            ownedRoyalties.length > 0 ? (
          <div className="space-y-4">
                {ownedRoyalties.map((royalty) => {
                  const { source, work, imageUrl } = parseUri(royalty.metadataUri);
                  const claimable = royalty.payoutPool?.availableToClaimUsdc || 0;
                  const displayName = work && work !== 'Loading...' && work !== 'Unknown' ? work : source;
                  const displayPlatform = source && source !== 'Loading...' ? source : '';
                  
                  return (
                    <Card key={royalty.publicKey} className="p-0 overflow-hidden">
                      <div className="flex flex-col lg:flex-row">
                        {/* Info */}
                        <div className="flex-1 p-6">
                          <div className="flex items-start gap-4">
                            {imageUrl ? (
                              <img src={imageUrl} alt={displayName} className="w-12 h-12 object-cover" />
                            ) : (
                              <div className="w-12 h-12 bg-black flex items-center justify-center text-white font-bold text-xl">
                                {displayPlatform.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                <div className="flex-1">
                              <h3 className="font-bold text-lg">{displayName}</h3>
                              <p className="text-sm text-black/60 capitalize">{displayPlatform}</p>
                              <p className="text-xs text-black/40 font-mono mt-1">
                                {royalty.publicKey.slice(0, 8)}...{royalty.publicKey.slice(-8)}
                              </p>
                            </div>
                </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div>
                              <p className="text-xs text-black/60 uppercase">Ownership</p>
                              <p className="font-bold">{royalty.percentage}%</p>
                  </div>
                  <div>
                              <p className="text-xs text-black/60 uppercase">Duration</p>
                              <p className="font-medium">{formatDuration(royalty.durationSeconds)}</p>
                  </div>
                  <div>
                              <p className="text-xs text-black/60 uppercase">Purchase Price</p>
                              <p className="font-medium">${royalty.priceUsdc.toLocaleString()}</p>
                  </div>
                  <div>
                              <p className="text-xs text-black/60 uppercase">Resale</p>
                              <p className={`font-medium ${royalty.resaleAllowed ? "text-green-600" : "text-red-600"}`}>
                                {royalty.resaleAllowed ? "Allowed" : "Not Allowed"}
                              </p>
                            </div>
                  </div>
                </div>
                        
                        {/* Actions */}
                        <div className="lg:w-64 bg-black/5 p-6 flex flex-col justify-between">
                      <div>
                            <p className="text-xs text-black/60 uppercase mb-1">Claimable</p>
                            <p className="text-2xl font-bold text-green-600">
                              ${claimable.toFixed(2)}
                            </p>
                      </div>
                          
                          <div className="flex flex-col gap-2 mt-4">
                            <button
                              onClick={() => handleClaim(royalty)}
                              disabled={claimable <= 0 || isProcessing === royalty.publicKey}
                              className="w-full py-3 bg-black text-white font-medium hover:bg-black/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isProcessing === royalty.publicKey ? "Claiming..." : "Claim Payout"}
                            </button>
                            <button
                              onClick={() => handleViewContract(royalty)}
                              className="w-full py-3 border border-black font-medium hover:bg-black hover:text-white transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              View Contract
                            </button>
                            <Link
                              href={`/marketplace/${royalty.publicKey}`}
                              className="w-full py-3 border border-black text-center font-medium hover:bg-black hover:text-white transition-colors"
                            >
                              View Details
                            </Link>
                            {royalty.resaleAllowed && (
                              <button 
                                onClick={() => {
                                  setResaleRoyalty(royalty);
                                  setShowResaleModal(true);
                                }}
                                className="w-full py-3 border border-black font-medium hover:bg-black hover:text-white transition-colors"
                              >
                                List for Resale
                              </button>
                            )}
                          </div>
                        </div>
                </div>
              </Card>
                  );
                })}
                </div>
              ) : (
              <Card className="text-center py-16">
                <h3 className="text-xl font-bold mb-2">No Royalty Contracts</h3>
                <p className="text-black/60 mb-6">
                  You don't own any royalty contracts yet. Browse the marketplace to find opportunities.
                </p>
                <Link
                  href="/marketplace"
                  className="inline-block px-6 py-3 bg-black text-white font-medium hover:bg-black/80 transition-colors"
                >
                  Browse Marketplace
                </Link>
                </Card>
            )
          ) : activeTab === "created" ? (
            /* Created Listings */
            createdListings.length > 0 ? (
              <div className="space-y-4">
                {createdListings.map((listing) => {
                  const { source, work, imageUrl } = parseUri(listing.metadataUri);
                  const totalDeposited = listing.payoutPool?.totalDepositedUsdc || 0;
                  const totalClaimed = listing.payoutPool?.totalClaimedUsdc || 0;
                  const displayName = work && work !== 'Loading...' && work !== 'Unknown' ? work : source;
                  const displayPlatform = source && source !== 'Loading...' ? source : '';
                  
                  return (
                    <Card key={listing.publicKey} className="p-0 overflow-hidden">
                      <div className="flex flex-col lg:flex-row">
                        {/* Info */}
                        <div className="flex-1 p-6">
                          <div className="flex items-start gap-4">
                            {imageUrl ? (
                              <img src={imageUrl} alt={displayName} className="w-12 h-12 object-cover" />
                            ) : (
                              <div className="w-12 h-12 bg-black flex items-center justify-center text-white font-bold text-xl">
                                {displayPlatform.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg">{displayName}</h3>
                                <span className={`text-xs px-2 py-0.5 ${
                                  listing.status === 'Active' 
                                    ? 'bg-green-100 text-green-700'
                                    : listing.status === 'Sold'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {listing.status}
                                </span>
                              </div>
                              <p className="text-sm text-black/60 capitalize">{displayPlatform}</p>
                              <p className="text-xs text-black/40 font-mono mt-1">
                                {listing.publicKey.slice(0, 8)}...{listing.publicKey.slice(-8)}
                              </p>
          </div>
        </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                            <div>
                              <p className="text-xs text-black/60 uppercase">Percentage</p>
                              <p className="font-bold">{listing.percentage}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-black/60 uppercase">Price</p>
                              <p className="font-medium">${listing.priceUsdc.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-black/60 uppercase">Total Deposited</p>
                              <p className="font-medium">${totalDeposited.toFixed(2)}</p>
                            </div>
            <div>
                              <p className="text-xs text-black/60 uppercase">Total Claimed</p>
                              <p className="font-medium">${totalClaimed.toFixed(2)}</p>
                            </div>
                          </div>
            </div>

                        {/* Actions */}
                        <div className="lg:w-64 bg-black/5 p-6 flex flex-col justify-between">
                          {listing.status === 'Sold' ? (
                            <>
                      <div>
                                <p className="text-xs text-black/60 uppercase mb-1">Holder Earnings</p>
                                <p className="text-2xl font-bold">
                                  ${totalDeposited.toFixed(2)}
                                </p>
                      </div>
                              <div className="flex flex-col gap-2 mt-4">
                                <button
                                  onClick={() => {
                                    setDepositListing(listing);
                                    setShowDepositModal(true);
                                  }}
                                  disabled={isProcessing === listing.publicKey}
                                  className="w-full py-3 bg-black text-white font-medium hover:bg-black/80 transition-colors disabled:opacity-50"
                                >
                                  Deposit Payout
                        </button>
                                <Link
                                  href={`/marketplace/${listing.publicKey}`}
                                  className="w-full py-3 border border-black text-center font-medium hover:bg-black hover:text-white transition-colors"
                                >
                                  View Details
                                </Link>
                              </div>
                            </>
                          ) : (
                            <>
            <div>
                                <p className="text-xs text-black/60 uppercase mb-1">Status</p>
                                <p className="text-xl font-bold capitalize">{listing.status}</p>
                              </div>
                              <div className="flex flex-col gap-2 mt-4">
                                <Link
                                  href={`/marketplace/${listing.publicKey}`}
                                  className="w-full py-3 bg-black text-white text-center font-medium hover:bg-black/80 transition-colors"
                                >
                                  View Listing
                                </Link>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
                </div>
            ) : (
              <Card className="text-center py-16">
                <h3 className="text-xl font-bold mb-2">No Listings Yet</h3>
                <p className="text-black/60 mb-6">
                  You haven't created any royalty listings. Start monetizing your content today!
                </p>
                <Link
                  href="/sell"
                  className="inline-block px-6 py-3 bg-black text-white font-medium hover:bg-black/80 transition-colors"
                >
                  Create Listing
                </Link>
              </Card>
            )
          ) : (
            /* Activity History */
            activities.length > 0 ? (
              <div className="space-y-3">
                {activities.map((activity) => {
                  const activityIcons = {
                    purchase: '🛒',
                    sale: '💰',
                    claim: '✅',
                    deposit: '📥',
                    list_resale: '🏷️',
                    create_listing: '➕',
                  };
                  const activityColors = {
                    purchase: 'bg-blue-100 text-blue-800',
                    sale: 'bg-green-100 text-green-800',
                    claim: 'bg-green-100 text-green-800',
                    deposit: 'bg-purple-100 text-purple-800',
                    list_resale: 'bg-orange-100 text-orange-800',
                    create_listing: 'bg-gray-100 text-gray-800',
                  };
                  
                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-4 p-4 border border-black/10 hover:border-black/30 transition-colors"
                    >
                      <div className="text-2xl">{activityIcons[activity.type]}</div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-xs px-2 py-0.5 ${activityColors[activity.type]}`}>
                            {activity.type.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-xs text-black/40">
                            {new Date(activity.timestamp).toLocaleDateString()} {new Date(activity.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      {activity.amount !== undefined && (
                        <div className="text-right">
                          <p className="font-bold">${activity.amount.toFixed(2)}</p>
                          <p className="text-xs text-black/40">USDC</p>
                        </div>
                      )}
                      <a
                        href={`https://explorer.solana.com/tx/${activity.txId}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View ↗
                      </a>
                    </motion.div>
                  );
                })}
                </div>
              ) : (
              <Card className="text-center py-16">
                <h3 className="text-xl font-bold mb-2">No Activity Yet</h3>
                <p className="text-black/60 mb-6">
                  Your transaction history will appear here after you make your first transaction.
                </p>
                <Link
                  href="/marketplace"
                  className="inline-block px-6 py-3 bg-black text-white font-medium hover:bg-black/80 transition-colors"
                >
                  Browse Marketplace
                </Link>
                </Card>
            )
          )}
        </div>
      </section>

      {/* Deposit Modal */}
      <AnimatePresence>
        {showDepositModal && depositListing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !isProcessing && setShowDepositModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-md"
            >
              <div className="border-b border-black p-6">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg">Deposit Payout</span>
                  {!isProcessing && (
                    <button
                      onClick={() => setShowDepositModal(false)}
                      className="text-black/60 hover:text-black"
                    >
                      ✕
                    </button>
              )}
            </div>
              </div>

              <div className="p-6">
                <p className="text-sm text-black/60 mb-4">
                  Deposit USDC to distribute to the holder of this royalty contract.
                </p>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Amount (USDC)</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="100.00"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border border-black focus:outline-none focus:ring-2 focus:ring-black/20"
                  />
                </div>
                
                <div className="bg-black/5 p-4 mb-6">
                  <p className="text-sm text-black/70">
                    This will deposit USDC into the payout pool for:{" "}
                    <span className="font-medium">
                      {parseUri(depositListing.metadataUri).source}
                    </span>
                  </p>
            </div>

                <button
                  onClick={handleDeposit}
                  disabled={isProcessing === depositListing.publicKey || !depositAmount}
                  className="w-full py-4 bg-black text-white font-medium hover:bg-black/80 transition-colors disabled:opacity-50"
                >
                  {isProcessing === depositListing.publicKey ? "Depositing..." : "Deposit"}
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resale Modal */}
      <AnimatePresence>
        {showResaleModal && resaleRoyalty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !isProcessing && setShowResaleModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-md"
            >
              <div className="border-b border-black p-6">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg">List for Resale</span>
                  {!isProcessing && (
                    <button
                      onClick={() => setShowResaleModal(false)}
                      className="text-black/60 hover:text-black"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-black flex items-center justify-center text-white font-bold">
                    {parseUri(resaleRoyalty.metadataUri).source.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold capitalize">{parseUri(resaleRoyalty.metadataUri).source}</p>
                    <p className="text-sm text-black/60">{resaleRoyalty.percentage}% royalty share</p>
                  </div>
                </div>
                
                <p className="text-sm text-black/60 mb-4">
                  Set your asking price for this royalty contract. It will be listed on the secondary market.
                </p>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Price (USDC)</label>
                  <input
                    type="number"
                    value={resalePrice}
                    onChange={(e) => setResalePrice(e.target.value)}
                    placeholder="Enter price"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border border-black focus:outline-none focus:ring-2 focus:ring-black/20"
                  />
                </div>
                
                <div className="bg-black/5 p-4 mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-black/60">Original Price</span>
                    <span>${resaleRoyalty.priceUsdc.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-black/60">Creator Royalty</span>
                    <span>5%</span>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 p-3 mb-6">
                  <p className="text-xs text-yellow-700">
                    <strong>Note:</strong> Your NFT will be transferred to escrow until sold or cancelled.
                  </p>
                </div>

                <button
                  onClick={handleListForResale}
                  disabled={isProcessing === resaleRoyalty.publicKey || !resalePrice}
                  className="w-full py-4 bg-black text-white font-medium hover:bg-black/80 transition-colors disabled:opacity-50"
                >
                  {isProcessing === resaleRoyalty.publicKey ? "Listing..." : "List for Sale"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contract Preview Modal */}
      <AnimatePresence>
        {showContractModal && contractRoyalty && (() => {
          const { source, work, imageUrl } = parseUri(contractRoyalty.metadataUri);
          const contractData = getContractData(contractRoyalty);
          const timing = getContractTiming(contractData);
          
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
              onClick={() => setShowContractModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-2xl my-8"
              >
                {/* Header */}
                <div className="border-b-2 border-black p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold">Digital Royalty Rights Agreement</h2>
                      <p className="text-sm text-black/60">Revenue Participation Certificate</p>
                    </div>
                    <button
                      onClick={() => setShowContractModal(false)}
                      className="text-black/60 hover:text-black text-xl"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    {imageUrl ? (
                      <img src={imageUrl} alt={work} className="w-16 h-16 object-cover border border-black" />
                    ) : (
                      <div className="w-16 h-16 bg-black flex items-center justify-center text-white font-bold text-2xl">
                        {source.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-lg">{work}</p>
                      <p className="text-black/60 capitalize">{source}</p>
                    </div>
                  </div>
                </div>

                {/* Contract Details */}
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                  {/* Parties */}
                  <div>
                    <h3 className="font-bold text-sm uppercase text-black/60 mb-3">Parties to this Agreement</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between py-2 border-b border-black/10">
                        <span className="text-black/60">Creator</span>
                        <span className="font-mono text-sm">{contractRoyalty.creator.slice(0, 8)}...{contractRoyalty.creator.slice(-8)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-black/10">
                        <span className="text-black/60">Rights Holder (You)</span>
                        <span className="font-mono text-sm">{publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Terms */}
                  <div>
                    <h3 className="font-bold text-sm uppercase text-black/60 mb-3">Financial Terms</h3>
                    <div className="bg-black/5 p-4 space-y-3">
                      <div className="flex justify-between">
                        <span>Royalty Percentage</span>
                        <span className="font-bold text-lg">{contractRoyalty.percentage}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Purchase Price</span>
                        <span className="font-bold">${contractRoyalty.priceUsdc.toLocaleString()} USDC</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transferability</span>
                        <span className={contractRoyalty.resaleAllowed ? "text-green-600" : "text-red-600"}>
                          {contractRoyalty.resaleAllowed ? "Transferable" : "Non-transferable"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <h3 className="font-bold text-sm uppercase text-black/60 mb-3">Term and Duration</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between py-2 border-b border-black/10">
                        <span className="text-black/60">Start Date</span>
                        <span>{timing.startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-black/10">
                        <span className="text-black/60">End Date</span>
                        <span>{timing.isPerpetual ? 'Perpetual (No Expiration)' : timing.endDate?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-black/10">
                        <span className="text-black/60">Status</span>
                        <span className={`font-bold ${timing.status === 'Active' ? 'text-green-600' : 'text-red-600'}`}>
                          {timing.status}
                        </span>
                      </div>
                      {!timing.isPerpetual && timing.status === 'Active' && (
                        <div className="flex justify-between py-2 border-b border-black/10">
                          <span className="text-black/60">Time Remaining</span>
                          <span>{timing.remainingDays} days, {timing.remainingHours} hours</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payout Summary */}
                  {contractRoyalty.payoutPool && (
                    <div>
                      <h3 className="font-bold text-sm uppercase text-black/60 mb-3">Financial Summary</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-black/5 p-3 text-center">
                          <p className="text-xs text-black/60 mb-1">Total Deposited</p>
                          <p className="font-bold">${(contractRoyalty.payoutPool.totalDepositedUsdc || 0).toFixed(2)}</p>
                        </div>
                        <div className="bg-black/5 p-3 text-center">
                          <p className="text-xs text-black/60 mb-1">Total Claimed</p>
                          <p className="font-bold">${(contractRoyalty.payoutPool.totalClaimedUsdc || 0).toFixed(2)}</p>
                        </div>
                        <div className="bg-green-50 p-3 text-center">
                          <p className="text-xs text-green-700 mb-1">Available</p>
                          <p className="font-bold text-green-600">${(contractRoyalty.payoutPool.availableToClaimUsdc || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Creator Obligations */}
                  <div>
                    <h3 className="font-bold text-sm uppercase text-black/60 mb-3">Creator Obligations</h3>
                    <div className="text-sm space-y-2 text-black/80">
                      <p>The Creator agrees to deposit {contractRoyalty.percentage}% of all revenue earned from "{work}" into the smart contract payout pool.</p>
                      <p>Payments shall be made in USDC to the designated smart contract address.</p>
                      <p>The Rights Holder may claim accumulated royalties at any time through the platform interface.</p>
                      <p>This agreement is recorded on the Solana blockchain and is self-executing.</p>
                    </div>
                  </div>

                  {/* Blockchain Verification */}
                  <div className="bg-black/5 p-4 text-sm">
                    <h3 className="font-bold mb-2">Blockchain Verification</h3>
                    <p className="text-black/60 mb-2">This contract is recorded on-chain and can be independently verified:</p>
                    <div className="font-mono text-xs break-all">
                      <p><span className="text-black/60">Contract:</span> {contractRoyalty.publicKey}</p>
                      <p><span className="text-black/60">NFT Mint:</span> {contractRoyalty.nftMint}</p>
                    </div>
                    <a
                      href={`https://explorer.solana.com/address/${contractRoyalty.publicKey}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-blue-600 hover:underline"
                    >
                      View on Solana Explorer
                    </a>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="border-t-2 border-black p-6 flex gap-4">
                  <button
                    onClick={() => setShowContractModal(false)}
                    className="flex-1 py-3 border border-black font-medium hover:bg-black/5 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleDownloadContract}
                    className="flex-1 py-3 bg-black text-white font-medium hover:bg-black/80 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
