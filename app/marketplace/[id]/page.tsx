"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { VersionedTransaction } from "@solana/web3.js";
import { useToast } from "@/components/Toast";
import { fetchAnyListing, buyRoyaltyListing, buyResaleListing, useRoyaltiesProgram, USDC_MINT, getConnection } from "@/lib/solana";
import { getSolPriceForUsdc, createSwapTransaction, formatSol, checkSolBalance, isJupiterAvailable } from "@/lib/jupiter";
import { fetchMetadataFromURI } from "@/lib/api";

type PaymentMethod = "usdc" | "sol";

interface ListingDetail {
  publicKey: string;
  creator: string;
  nftMint: string;
  metadataUri: string;
  percentageBps: number;
  percentage: number;
  durationSeconds: number;
  startTimestamp: number;
  price: number;
  priceUsdc: number;
  resaleAllowed: boolean;
  creatorRoyaltyBps: number;
  creatorRoyalty: number;
  status: string;
  // For resale listings
  isResale?: boolean;
  seller?: string;
  royaltyListingPubkey?: string;
}

export default function ListingDetailPage() {
  const params = useParams();
  const { connected, publicKey: walletPubkey } = useWallet();
  const { setVisible } = useWalletModal();
  const { showToast } = useToast();
  const { provider } = useRoyaltiesProgram();
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{
    name: string;
    platform: string;
    imageUrl: string;
    description: string;
  } | null>(null);
  
  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("usdc");
  const [solPrice, setSolPrice] = useState<{
    solAmount: number;
    solAmountLamports: bigint;
    pricePerSol: number;
    isEstimate: boolean;
  } | null>(null);
  const [isLoadingSolPrice, setIsLoadingSolPrice] = useState(false);
  const [solBalance, setSolBalance] = useState<bigint | null>(null);
  const jupiterAvailable = isJupiterAvailable();

  // Fetch listing from blockchain
  useEffect(() => {
    async function loadListing() {
      setIsLoading(true);
      setError(null);
      
      try {
        const id = params.id as string;
        console.log("Fetching listing:", id);
        
        const result = await fetchAnyListing(id);
        console.log("Fetched listing data:", result);
        
        if (result) {
          if (result.type === 'primary') {
            setListing(result.data);
          } else {
            // Resale listing - merge original listing data with resale data
            const resaleData = result.data;
            const originalListing = resaleData.originalListing;
            
            if (originalListing) {
              setListing({
                publicKey: resaleData.publicKey,
                creator: originalListing.creator,
                nftMint: resaleData.nftMint,
                metadataUri: originalListing.metadataUri,
                percentageBps: originalListing.percentageBps,
                percentage: originalListing.percentage,
                durationSeconds: originalListing.durationSeconds,
                startTimestamp: originalListing.startTimestamp,
                price: resaleData.price,
                priceUsdc: resaleData.priceUsdc,
                resaleAllowed: originalListing.resaleAllowed,
                creatorRoyaltyBps: originalListing.creatorRoyaltyBps,
                creatorRoyalty: originalListing.creatorRoyalty,
                status: 'Active',
                // Resale-specific fields
                isResale: true,
                seller: resaleData.seller,
                royaltyListingPubkey: resaleData.royaltyListing,
              });
            } else {
              // Original listing not found, show basic resale info
              setListing({
                publicKey: resaleData.publicKey,
                creator: resaleData.seller,
                nftMint: resaleData.nftMint,
                metadataUri: 'Secondary Market Listing',
                percentageBps: 0,
                percentage: 0,
                durationSeconds: 0,
                startTimestamp: 0,
                price: resaleData.price,
                priceUsdc: resaleData.priceUsdc,
                resaleAllowed: true,
                creatorRoyaltyBps: 0,
                creatorRoyalty: 0,
                status: 'Active',
                isResale: true,
                seller: resaleData.seller,
                royaltyListingPubkey: resaleData.royaltyListing,
              });
            }
          }
        } else {
          setError("Listing not found");
        }
      } catch (err) {
        console.error("Failed to fetch listing:", err);
        setError("Failed to load listing");
      } finally {
        setIsLoading(false);
      }
    }

    if (params.id) {
      loadListing();
    }
  }, [params.id]);

  // Fetch metadata when listing loads
  useEffect(() => {
    async function loadMetadata() {
      if (!listing?.metadataUri) return;
      
      try {
        const meta = await fetchMetadataFromURI(listing.metadataUri);
        console.log("Fetched metadata:", meta);
        setMetadata(meta);
      } catch (err) {
        console.error("Failed to fetch metadata:", err);
      }
    }
    
    loadMetadata();
  }, [listing?.metadataUri]);

  // Fetch SOL price when listing loads
  useEffect(() => {
    async function fetchSolPrice() {
      if (!listing) return;
      
      setIsLoadingSolPrice(true);
      try {
        const priceData = await getSolPriceForUsdc(listing.priceUsdc);
        setSolPrice(priceData);
      } catch (err) {
        console.error("Failed to fetch SOL price:", err);
      } finally {
        setIsLoadingSolPrice(false);
      }
    }
    
    fetchSolPrice();
    // Refresh price every 30 seconds
    const interval = setInterval(fetchSolPrice, 30000);
    return () => clearInterval(interval);
  }, [listing]);

  // Fetch SOL balance when wallet connects
  useEffect(() => {
    async function fetchBalance() {
      if (!connected || !walletPubkey) {
        setSolBalance(null);
        return;
      }
      
      try {
        const connection = getConnection();
        const balance = await connection.getBalance(walletPubkey);
        setSolBalance(BigInt(balance));
      } catch (err) {
        console.error("Failed to fetch balance:", err);
      }
    }
    
    fetchBalance();
  }, [connected, walletPubkey]);

  // Format duration from seconds
  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return "Perpetual";
    const months = Math.floor(seconds / (30 * 24 * 60 * 60));
    if (months > 0) return `${months} months`;
    const days = Math.floor(seconds / (24 * 60 * 60));
    return `${days} days`;
  };

  const handleBuy = () => {
    if (!connected) {
      setVisible(true);
      return;
    }
    setShowCheckout(true);
  };

  const handleConfirmPurchase = async () => {
    if (!provider || !listing || !walletPubkey) {
      showToast("Wallet not connected", "error");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      console.log("Starting purchase...");
      console.log("Payment method:", paymentMethod);
      console.log("Listing:", listing);
      
      // If paying with SOL, first swap to USDC
      if (paymentMethod === "sol") {
        // Check if Jupiter is available (mainnet only)
        if (!jupiterAvailable) {
          showToast("SOL payments are only available on mainnet. Please use USDC.", "error");
          setIsProcessing(false);
          return;
        }
        
        if (!solPrice) {
          showToast("SOL price not available. Please try again.", "error");
          setIsProcessing(false);
          return;
        }
        
        // Check SOL balance
        const connection = getConnection();
        const balanceCheck = await checkSolBalance(
          connection,
          walletPubkey,
          solPrice.solAmountLamports
        );
        
        if (!balanceCheck.hasEnough) {
          showToast(
            `Insufficient SOL. You need ${formatSol(balanceCheck.required)} SOL but have ${formatSol(balanceCheck.balance)} SOL.`,
            "error"
          );
          setIsProcessing(false);
          return;
        }
        
        console.log("Creating swap transaction...");
        showToast("Swapping SOL to USDC...", "info");
        
        const swapResult = await createSwapTransaction(
          connection,
          walletPubkey,
          listing.priceUsdc
        );
        
        if (!swapResult) {
          showToast("Failed to create swap transaction. Try paying with USDC directly.", "error");
          setIsProcessing(false);
          return;
        }
        
        // Sign and send swap transaction
        console.log("Signing swap transaction...");
        const signedSwapTx = await provider.wallet.signTransaction(swapResult.swapTransaction as any);
        const swapTxId = await connection.sendRawTransaction(
          (signedSwapTx as VersionedTransaction).serialize(),
          { skipPreflight: false, preflightCommitment: "confirmed" }
        );
        
        console.log("Swap transaction sent:", swapTxId);
        
        // Wait for swap confirmation
        await connection.confirmTransaction(swapTxId, "confirmed");
        console.log("Swap confirmed!");
        showToast("SOL swapped to USDC. Completing purchase...", "success");
      }
      
      // Now proceed with the buy transaction
      let txId: string;
      
      if (listing.isResale && listing.seller && listing.royaltyListingPubkey) {
        // Buy from resale (secondary market)
        txId = await buyResaleListing(provider, {
          publicKey: listing.publicKey,
          seller: listing.seller,
          nftMint: listing.nftMint,
          royaltyListingPubkey: listing.royaltyListingPubkey,
          creator: listing.creator,
        });
      } else {
        // Buy from primary market
        txId = await buyRoyaltyListing(provider, {
          publicKey: listing.publicKey,
          creator: listing.creator,
          nftMint: listing.nftMint,
        });
      }
      
      console.log("Purchase successful! TX:", txId);
      setTxSignature(txId);
      setCheckoutStep(3);
      setIsComplete(true);
      showToast("Purchase complete! NFT minted to your wallet.", "success");
    } catch (err: any) {
      console.error("Purchase failed:", err);
      
      // Parse error message for user-friendly display
      let errorMsg = "Purchase failed. Please try again.";
      if (err.message?.includes("Insufficient") || err.message?.includes("insufficient")) {
        errorMsg = paymentMethod === "sol" 
          ? "Insufficient SOL balance for swap."
          : "Insufficient USDC balance. Please ensure you have enough USDC.";
      } else if (err.message?.includes("not active")) {
        errorMsg = "This listing is no longer active.";
      } else if (err.message?.includes("User rejected") || err.message?.includes("rejected")) {
        errorMsg = "Transaction cancelled.";
      } else if (err.logs) {
        // Try to find the actual error in logs
        const errorLog = err.logs.find((log: string) => log.includes("Error"));
        if (errorLog) errorMsg = errorLog;
      }
      
      showToast(errorMsg, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = listing 
      ? `Check out this royalty listing on Royalties.fun - ${listing.percentage}% for $${listing.priceUsdc}`
      : "Check out this royalty listing on Royalties.fun";
    
    if (navigator.share) {
      await navigator.share({ title: "Royalties.fun", text, url });
    } else {
      await navigator.clipboard.writeText(url);
      showToast("Link copied to clipboard!", "success");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white min-h-screen">
        <section className="border-b border-black">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
            <Link 
              href="/marketplace" 
              className="inline-flex items-center gap-2 text-black/60 hover:text-black transition-colors"
            >
              ← Back to Marketplace
            </Link>
          </div>
        </section>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-4" />
              <p className="text-black/60">Loading listing...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !listing) {
    return (
      <div className="bg-white min-h-screen">
        <section className="border-b border-black">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
            <Link 
              href="/marketplace" 
              className="inline-flex items-center gap-2 text-black/60 hover:text-black transition-colors"
            >
              ← Back to Marketplace
            </Link>
          </div>
        </section>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Listing Not Found</h2>
            <p className="text-black/60 mb-8">{error || "This listing doesn't exist or may have been removed."}</p>
            <Link
              href="/marketplace"
              className="inline-block px-6 py-3 bg-black text-white font-medium hover:bg-black/80 transition-colors"
            >
              Browse Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Use fetched metadata or fallback
  const displayName = metadata?.name || 'Loading...';
  const displayPlatform = metadata?.platform || 'Unknown';
  const displayDescription = metadata?.description || '';
  const displayImage = metadata?.imageUrl || '';
  const creatorShort = `${listing.creator.slice(0, 4)}...${listing.creator.slice(-4)}`;

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <section className="border-b border-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <Link 
            href="/marketplace" 
            className="inline-flex items-center gap-2 text-black/60 hover:text-black transition-colors"
          >
            ← Back to Marketplace
          </Link>
        </div>
      </section>

      {/* On-chain indicator */}
      <div className={`border-b ${listing.isResale ? 'bg-purple-50 border-purple-200' : 'bg-green-50 border-green-200'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-2">
          <p className={`text-sm flex items-center gap-2 ${listing.isResale ? 'text-purple-700' : 'text-green-700'}`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${listing.isResale ? 'bg-purple-500' : 'bg-green-500'}`} />
            {listing.isResale 
              ? 'Secondary Market Listing • Live on-chain data'
              : 'Live on-chain data from Solana Devnet'
            }
          </p>
        </div>
      </div>

      {/* Main Content */}
      <section>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left: Listing Details */}
            <div className="lg:col-span-2 space-y-8">
              {/* Listing Image */}
              {displayImage && (
                <div className="border border-black/20 overflow-hidden">
                  <img 
                    src={displayImage} 
                    alt={displayName}
                    className="w-full h-64 object-cover"
                  />
                </div>
              )}

              {/* Creator/Seller Info */}
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-16 h-16 flex items-center justify-center text-white font-bold text-2xl ${listing.isResale ? 'bg-purple-600' : 'bg-black'}`}>
                    {displayPlatform.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-black/50 uppercase tracking-wider">{displayPlatform}</p>
                    <h2 className="text-3xl font-bold">{displayName}</h2>
                    {listing.isResale && listing.seller ? (
                      <div className="space-y-1 mt-1">
                        <p className="text-black/60 font-mono text-sm">
                          Seller: {listing.seller.slice(0, 4)}...{listing.seller.slice(-4)}
                        </p>
                        <p className="text-black/40 font-mono text-xs">
                          Creator: {creatorShort}
                        </p>
                      </div>
                    ) : (
                      <p className="text-black/60 font-mono text-sm">{creatorShort}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {listing.isResale && (
                      <span className="text-xs font-medium border border-purple-500 text-purple-600 px-3 py-1 uppercase">
                        RESALE
                      </span>
                    )}
                    <span className={`text-xs font-medium border px-3 py-1 uppercase ${
                      listing.status === 'Active' 
                        ? 'border-green-500 text-green-600' 
                        : 'border-black/30 text-black/60'
                    }`}>
                      {listing.status}
                    </span>
                  </div>
                </div>
                {displayDescription && (
                  <p className="text-lg text-black/60">{displayDescription}</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleShare}
                  className="px-4 py-2 border border-black/30 text-sm font-medium hover:border-black transition-colors"
                >
                  Share
                </button>
                <a
                  href={`https://explorer.solana.com/address/${listing.publicKey}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 border border-black/30 text-sm font-medium hover:border-black transition-colors"
                >
                  View on Explorer ↗
                </a>
              </div>

              {/* Description */}
              <div className="border-t border-black/10 pt-8">
                <h3 className="text-xl font-bold mb-4">About This Royalty</h3>
                <p className="text-black/70 leading-relaxed">
                  {listing.percentage}% share of {source} revenue from creator {creatorShort}. 
                  This royalty token was minted on Solana and represents a claim to future revenue 
                  as specified in the on-chain contract.
                </p>
              </div>

              {/* Contract Details */}
              <div className="border-t border-black/10 pt-8">
                <h3 className="text-xl font-bold mb-6">Contract Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="border border-black p-4">
                    <p className="text-sm text-black/60 mb-1">Percentage</p>
                    <p className="text-2xl font-bold">{listing.percentage}%</p>
                  </div>
                  <div className="border border-black p-4">
                    <p className="text-sm text-black/60 mb-1">Duration</p>
                    <p className="text-xl font-bold">{formatDuration(listing.durationSeconds)}</p>
                  </div>
                  <div className="border border-black p-4">
                    <p className="text-sm text-black/60 mb-1">Price</p>
                    <p className="text-xl font-bold">{listing.priceUsdc.toLocaleString()} USDC</p>
                  </div>
                  <div className="border border-black p-4">
                    <p className="text-sm text-black/60 mb-1">Resale Royalty</p>
                    <p className="text-xl font-bold">{listing.creatorRoyalty}%</p>
                  </div>
                  <div className="border border-black p-4">
                    <p className="text-sm text-black/60 mb-1">Resale Allowed</p>
                    <p className={`text-xl font-bold ${listing.resaleAllowed ? "text-green-600" : "text-red-600"}`}>
                      {listing.resaleAllowed ? "Yes" : "No"}
                    </p>
                  </div>
                    <div className="border border-black p-4">
                    <p className="text-sm text-black/60 mb-1">Status</p>
                    <p className={`text-xl font-bold ${listing.status === 'Active' ? "text-green-600" : "text-black/60"}`}>
                      {listing.status}
                    </p>
                    </div>
                </div>
              </div>

              {/* On-chain addresses */}
                <div className="border-t border-black/10 pt-8">
                <h3 className="text-xl font-bold mb-4">On-Chain Details</h3>
                <div className="space-y-3 font-mono text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-black/60 w-32">Listing:</span>
                    <a 
                      href={`https://explorer.solana.com/address/${listing.publicKey}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {listing.publicKey}
                    </a>
                    </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-black/60 w-32">Creator:</span>
                    <a 
                      href={`https://explorer.solana.com/address/${listing.creator}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {listing.creator}
                    </a>
                    </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-black/60 w-32">NFT Mint:</span>
                    <a 
                      href={`https://explorer.solana.com/address/${listing.nftMint}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {listing.nftMint}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Purchase Card */}
            <div className="lg:col-span-1">
              <div className="border border-black p-6 sticky top-24">
                <div className="mb-6">
                  <p className="text-sm text-black/60 mb-1">Price</p>
                  <p className="text-4xl font-bold">${listing.priceUsdc.toLocaleString()}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-black/60">USDC</span>
                    {solPrice && (
                      <>
                        <span className="text-black/30">•</span>
                        <span className="text-sm text-black/60">
                          ~{solPrice.solAmount.toFixed(3)} SOL
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="border-t border-black/10 py-6 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-black/60">Royalty Share</span>
                    <span className="font-bold">{listing.percentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/60">Duration</span>
                    <span className="font-medium">{formatDuration(listing.durationSeconds)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/60">Resale</span>
                    <span className={`font-medium ${listing.resaleAllowed ? "text-green-600" : "text-red-600"}`}>
                      {listing.resaleAllowed ? "Allowed" : "Not Allowed"}
                    </span>
                  </div>
                </div>

                {listing.status === 'Active' ? (
                  <button
                    onClick={handleBuy}
                    className="w-full py-4 bg-black text-white font-medium hover:bg-black/80 transition-colors"
                  >
                    {connected ? "Buy Now" : "Connect Wallet to Buy"}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-4 bg-black/20 text-black/40 font-medium cursor-not-allowed"
                  >
                    {listing.status}
                  </button>
                )}

                <p className="text-xs text-black/50 text-center mt-4">
                  By purchasing, you agree to the Terms of Service.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Checkout Modal */}
      <AnimatePresence>
        {showCheckout && listing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !isProcessing && setShowCheckout(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-lg"
            >
              {/* Header */}
              <div className="border-b border-black p-6">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg">Checkout</span>
                  {!isProcessing && !isComplete && (
                    <button
                      onClick={() => setShowCheckout(false)}
                      className="text-black/60 hover:text-black"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {!isComplete ? (
                  <>
                    {checkoutStep === 1 && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <h3 className="text-xl font-bold mb-6">Review Purchase</h3>
                        
                        <div className="border border-black p-4 mb-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 flex items-center justify-center text-white font-bold ${listing.isResale ? 'bg-purple-600' : 'bg-black'}`}>
                              {source.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-bold capitalize">{source}</p>
                                {listing.isResale && (
                                  <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 uppercase font-medium">
                                    Resale
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-black/60">{work}</p>
                            </div>
                          </div>
                          <div className="border-t border-black/10 pt-4 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-black/60">Royalty Share</span>
                              <span className="font-bold">{listing.percentage}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-black/60">Duration</span>
                              <span>{formatDuration(listing.durationSeconds)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-black/60">Resale</span>
                              <span className={listing.resaleAllowed ? "text-green-600" : "text-red-600"}>
                                {listing.resaleAllowed ? "Allowed" : "Not Allowed"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Payment Method Selection */}
                        <div className="mb-6">
                          <p className="text-sm font-medium mb-3">Payment Method</p>
                          <div className="grid grid-cols-2 gap-3">
                            {/* USDC Option */}
                            <button
                              onClick={() => setPaymentMethod("usdc")}
                              className={`p-4 border-2 transition-all ${
                                paymentMethod === "usdc"
                                  ? "border-black bg-black/5"
                                  : "border-black/20 hover:border-black/40"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                  $
                                </div>
                                <span className="font-medium">USDC</span>
                              </div>
                              <p className="text-lg font-bold">
                                ${listing.priceUsdc.toLocaleString()}
                              </p>
                            </button>
                            
                            {/* SOL Option */}
                            <button
                              onClick={() => jupiterAvailable && setPaymentMethod("sol")}
                              disabled={!jupiterAvailable}
                              className={`p-4 border-2 transition-all relative ${
                                !jupiterAvailable 
                                  ? "border-black/10 bg-black/5 cursor-not-allowed opacity-60"
                                  : paymentMethod === "sol"
                                    ? "border-black bg-black/5"
                                    : "border-black/20 hover:border-black/40"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-green-400 flex items-center justify-center text-white text-xs font-bold">
                                  ◎
                                </div>
                                <span className="font-medium">SOL</span>
                                {!jupiterAvailable && (
                                  <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                                    Mainnet only
                                  </span>
                                )}
                              </div>
                              {isLoadingSolPrice ? (
                                <p className="text-lg font-bold text-black/40">Loading...</p>
                              ) : solPrice ? (
                                <p className="text-lg font-bold">
                                  ~{solPrice.solAmount.toFixed(3)} SOL
                                  {solPrice.isEstimate && (
                                    <span className="text-xs font-normal text-black/40 ml-1">(est.)</span>
                                  )}
                                </p>
                              ) : (
                                <p className="text-lg font-bold text-black/40">N/A</p>
                              )}
                            </button>
                          </div>
                          
                          {!jupiterAvailable && (
                            <p className="text-xs text-yellow-600 mt-2">
                              ⚠️ SOL payments via Jupiter are only available on mainnet. Use USDC on devnet.
                            </p>
                          )}
                          
                          {paymentMethod === "sol" && solPrice && jupiterAvailable && (
                            <p className="text-xs text-black/50 mt-2">
                              Rate: 1 SOL ≈ ${solPrice.pricePerSol.toFixed(2)} USDC • Includes 1% slippage
                            </p>
                          )}
                          
                          {paymentMethod === "sol" && solBalance !== null && solPrice && (
                            <p className={`text-xs mt-1 ${
                              solBalance >= solPrice.solAmountLamports + BigInt(10_000_000)
                                ? "text-green-600"
                                : "text-red-600"
                            }`}>
                              Your balance: {formatSol(solBalance)} SOL
                            </p>
                          )}
                        </div>

                        <div className="border-t border-black/10 pt-4 mb-6">
                          <div className="flex justify-between text-lg">
                            <span>Total</span>
                            {paymentMethod === "usdc" ? (
                              <span className="font-bold">${listing.priceUsdc.toLocaleString()} USDC</span>
                            ) : (
                              <span className="font-bold">
                                {solPrice ? `~${solPrice.solAmount.toFixed(3)} SOL` : "..."}
                              </span>
                            )}
                          </div>
                          {paymentMethod === "sol" && (
                            <p className="text-xs text-black/50 text-right">
                              ≈ ${listing.priceUsdc.toLocaleString()} USD
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => setCheckoutStep(2)}
                          disabled={paymentMethod === "sol" && !solPrice}
                          className="w-full py-4 bg-black text-white font-medium hover:bg-black/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Continue
                        </button>
                      </motion.div>
                    )}

                    {checkoutStep === 2 && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <h3 className="text-xl font-bold mb-6">Confirm Transaction</h3>
                        
                        {/* Payment Summary */}
                        <div className="bg-black/5 p-4 mb-4">
                          <div className="flex items-center gap-2 mb-4">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                              paymentMethod === "usdc" 
                                ? "bg-blue-500" 
                                : "bg-gradient-to-br from-purple-500 to-green-400"
                            }`}>
                              {paymentMethod === "usdc" ? "$" : "◎"}
                            </div>
                            <span className="font-medium">
                              Paying with {paymentMethod === "usdc" ? "USDC" : "SOL"}
                            </span>
                          </div>
                          
                          <p className="text-sm text-black/70 mb-4">
                            This transaction will:
                          </p>
                          <ul className="space-y-2 text-sm">
                            {paymentMethod === "sol" && solPrice && (
                              <li className="flex items-start gap-2">
                                <span className="text-blue-600">↻</span>
                                Swap ~{solPrice.solAmount.toFixed(3)} SOL → {listing.priceUsdc.toLocaleString()} USDC via Jupiter
                              </li>
                            )}
                            <li className="flex items-start gap-2">
                              <span className="text-green-600">✓</span>
                              {paymentMethod === "usdc" 
                                ? `Transfer ${listing.priceUsdc.toLocaleString()} USDC from your wallet`
                                : listing.isResale ? "Pay seller with USDC (from swap)" : "Pay creator with USDC (from swap)"
                              }
                            </li>
                            {listing.isResale && (
                              <li className="flex items-start gap-2">
                                <span className="text-purple-600">✓</span>
                                Pay creator royalty ({listing.creatorRoyalty}%)
                              </li>
                            )}
                            <li className="flex items-start gap-2">
                              <span className="text-green-600">✓</span>
                              Transfer NFT representing {listing.percentage}% royalty to your wallet
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-600">✓</span>
                              Record purchase on-chain
                            </li>
                            {!listing.resaleAllowed && !listing.isResale && (
                              <li className="flex items-start gap-2">
                                <span className="text-yellow-600">!</span>
                                This token cannot be resold
                              </li>
                            )}
                          </ul>
                        </div>
                        
                        {paymentMethod === "usdc" ? (
                          <div className="bg-yellow-50 border border-yellow-200 p-3 mb-6">
                            <p className="text-xs text-yellow-700">
                              <strong>Note:</strong> You need USDC in your wallet to complete this purchase. 
                              On devnet, you can get test USDC from a faucet.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-purple-50 border border-purple-200 p-3 mb-6">
                            <p className="text-xs text-purple-700">
                              <strong>Note:</strong> Your SOL will be swapped to USDC via Jupiter DEX, then used to purchase. 
                              This requires {paymentMethod === "sol" && solPrice ? `~${solPrice.solAmount.toFixed(3)}` : "..."} SOL + gas fees.
                            </p>
                          </div>
                        )}

                        <div className="flex gap-4">
                          <button
                            onClick={() => setCheckoutStep(1)}
                            disabled={isProcessing}
                            className="flex-1 py-4 border border-black font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                          >
                            Back
                          </button>
                          <button
                            onClick={handleConfirmPurchase}
                            disabled={isProcessing}
                            className="flex-1 py-4 bg-black text-white font-medium hover:bg-black/80 transition-colors disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <span className="flex items-center justify-center gap-2">
                                <motion.span
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block"
                                />
                                Processing...
                              </span>
                            ) : (
                              "Confirm Purchase"
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      className="w-20 h-20 bg-green-500 text-white flex items-center justify-center text-4xl mx-auto mb-6"
                    >
                      ✓
                    </motion.div>
                    <h3 className="text-2xl font-bold mb-2">Purchase Complete!</h3>
                    <p className="text-black/60 mb-4">
                      You now own {listing.percentage}% of this creator's royalties.
                    </p>
                    
                    {txSignature && (
                      <div className="bg-green-50 border border-green-200 p-3 mb-6 text-left">
                        <p className="text-xs text-green-700 mb-1">Transaction Confirmed</p>
                        <a
                          href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-green-600 hover:underline break-all"
                        >
                          {txSignature.slice(0, 20)}...{txSignature.slice(-20)}
                        </a>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <Link
                        href="/dashboard"
                        className="block w-full py-4 bg-black text-white font-medium hover:bg-black/80 transition-colors text-center"
                      >
                        View in Dashboard
                      </Link>
                      {txSignature && (
                        <a
                          href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full py-4 border border-black font-medium hover:bg-gray-50 transition-colors text-center"
                        >
                          View on Explorer ↗
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setShowCheckout(false);
                          setCheckoutStep(1);
                          setIsComplete(false);
                          setTxSignature(null);
                          setPaymentMethod("usdc");
                        }}
                        className="block w-full py-4 border border-black/30 font-medium hover:bg-gray-50 transition-colors"
                      >
                        Continue Browsing
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
