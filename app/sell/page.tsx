"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { BN } from "@coral-xyz/anchor";
import SectionHeader from "@/components/SectionHeader";
import Card from "@/components/Card";
import AnimatedSection from "@/components/AnimatedSection";
import { useToast } from "@/components/Toast";
import { useRoyaltiesProgram, createRoyaltyListing, isPlatformInitialized } from "@/lib/solana";

// Image Upload Component
function ImageUpload({ 
  imageUrl, 
  onImageChange, 
  onError 
}: { 
  imageUrl: string; 
  onImageChange: (url: string) => void; 
  onError: (msg: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > 500 * 1024) {
      onError("Image must be under 500KB");
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      onError("Please select an image file");
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    try {
      const formData = new FormData();
      formData.append('file', file);

      setUploadProgress(50);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(80);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadProgress(100);
      onImageChange(result.url);
    } catch (error) {
      console.error('Upload error:', error);
      onError(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        Cover Image <span className="text-black/40">(optional)</span>
      </label>
      
      {/* Upload Area */}
      {!imageUrl ? (
        <label className="block cursor-pointer">
          <div className={`border-2 border-dashed border-black/30 p-8 text-center hover:border-black transition-colors ${isUploading ? 'opacity-50' : ''}`}>
            {isUploading ? (
              <div className="space-y-3">
                <div className="w-8 h-8 border-2 border-black/20 border-t-black rounded-full animate-spin mx-auto" />
                <p className="text-sm text-black/60">Uploading... {uploadProgress}%</p>
                <div className="w-full bg-black/10 h-1">
                  <div 
                    className="bg-black h-1 transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="text-3xl mb-2">+</div>
                <p className="font-medium">Click to upload image</p>
                <p className="text-sm text-black/60 mt-1">PNG, JPG up to 500KB</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
        </label>
      ) : (
        <div className="relative">
          <div className="border border-black/20 p-2">
            <img 
              src={imageUrl} 
              alt="Cover" 
              className="w-full h-40 object-cover"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <label className="flex-1 cursor-pointer">
              <div className="px-4 py-2 border border-black text-center text-sm font-medium hover:bg-black hover:text-white transition-colors">
                {isUploading ? 'Uploading...' : 'Change Image'}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
            </label>
            <button
              type="button"
              onClick={() => onImageChange('')}
              className="px-4 py-2 border border-black/30 text-sm font-medium text-black/60 hover:border-black hover:text-black transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      )}
      
      <p className="mt-2 text-sm text-black/60">
        A thumbnail image for your listing (YouTube thumbnail, album art, etc.)
      </p>
    </div>
  );
}

// Revenue source labels
const revenueSourceLabels: Record<string, string> = {
  youtube: "YouTube AdSense",
  spotify: "Spotify Streaming",
  twitch: "Twitch Subscriptions",
  patreon: "Patreon Memberships",
  steam: "Steam Game Sales",
  amazon: "Amazon KDP / Book Sales",
  substack: "Substack Newsletter",
  podcast: "Podcast Sponsorships",
  other: "Other",
};

export default function SellPage() {
  const { showToast } = useToast();
  const { program, provider, connected, publicKey } = useRoyaltiesProgram();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    revenueSource: "",
    workIdentifier: "",
    description: "",
    imageUrl: "",
    percentageSold: "",
    duration: "",
    reportingFrequency: "monthly",
    price: "",
    resaleRoyalty: "",
    allowResale: true,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const [platformReady, setPlatformReady] = useState<boolean | null>(null);

  // Check platform status on mount
  useEffect(() => {
    isPlatformInitialized().then(setPlatformReady);
  }, []);

  const handleInitializePlatform = async () => {
    if (!program || !provider || !publicKey) {
      showToast("Connect wallet first", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const { initializePlatform } = await import("@/lib/solana");
      // Use connected wallet as treasury for now
      const result = await initializePlatform(program, provider, publicKey, 500);
      showToast(`Platform initialized! TX: ${result.tx.slice(0, 8)}...`, "success");
      setPlatformReady(true);
    } catch (error: any) {
      console.error("Init error:", error);
      showToast(error.message || "Failed to initialize", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!connected) {
      showToast("Please connect your wallet first", "error");
      return;
    }

    if (!program || !provider) {
      showToast("Failed to connect to program", "error");
      return;
    }

    if (!platformReady) {
      showToast("Platform not initialized yet", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert form data to contract args
      const durationMonths = formData.duration === "perpetual" ? 0 : Number(formData.duration);
      const durationSeconds = new BN(durationMonths * 30 * 24 * 60 * 60);
      
      const percentageBps = Math.floor(Number(formData.percentageSold) * 100);
      const priceUsdc = Math.floor(Number(formData.price) * 1_000_000);
      const resaleRoyaltyBps = Math.floor(Number(formData.resaleRoyalty || 0) * 100);
      
      // Create a JSON metadata object, encoded in the URI
      const metadata = {
        source: formData.revenueSource,
        work: formData.workIdentifier.slice(0, 100), // Limit length
        description: formData.description.slice(0, 200), // Limit length
        imageUrl: formData.imageUrl.slice(0, 200), // Limit URL length
      };
      // Encode as base64 for on-chain storage (simple approach)
      const metadataJson = JSON.stringify(metadata);
      const metadataUri = `data:application/json;base64,${Buffer.from(metadataJson).toString('base64')}`;
      
      // Check if metadata is too large for on-chain storage
      if (metadataUri.length > 500) {
        showToast("Metadata too large. Try shorter description or image URL.", "error");
        setIsSubmitting(false);
        return;
      }

      const args = {
        metadataUri: metadataUri,
        percentageBps: percentageBps,
        durationSeconds: durationSeconds,
        price: new BN(priceUsdc),
        resaleAllowed: Boolean(formData.allowResale),
        creatorRoyaltyBps: resaleRoyaltyBps,
      };

      console.log("Creating listing with args:", args);
      const result = await createRoyaltyListing(program, provider, args);
      
      console.log("Listing created:", result);
      showToast(`Listing created! TX: ${result.tx.slice(0, 8)}...`, "success");
      
      // Reset form
      setFormData({
        revenueSource: "",
        workIdentifier: "",
        description: "",
        imageUrl: "",
        percentageSold: "",
        duration: "",
        reportingFrequency: "monthly",
        price: "",
        resaleRoyalty: "",
        allowResale: true,
      });
    } catch (error: any) {
      console.error("Failed to create listing:", error);
      showToast(error.message || "Failed to create listing", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-updating contract preview
  const contractPreview = useMemo(() => {
    return {
      revenueSource: formData.revenueSource 
        ? revenueSourceLabels[formData.revenueSource] || formData.revenueSource 
        : null,
      work: formData.workIdentifier || null,
      description: formData.description || null,
      imageUrl: formData.imageUrl || null,
      percentage: formData.percentageSold ? `${formData.percentageSold}%` : null,
      duration: formData.duration 
        ? formData.duration === "perpetual" 
          ? "Perpetual" 
          : `${formData.duration} months`
        : null,
      price: formData.price ? `${Number(formData.price).toLocaleString()} USDC` : null,
      resaleRoyalty: formData.resaleRoyalty ? `${formData.resaleRoyalty}%` : null,
      reportingFrequency: formData.reportingFrequency 
        ? formData.reportingFrequency.charAt(0).toUpperCase() + formData.reportingFrequency.slice(1)
        : null,
      allowResale: formData.allowResale,
    };
  }, [formData]);

  const isFormComplete = useMemo(() => {
    return (
      formData.revenueSource &&
      formData.workIdentifier &&
      formData.percentageSold &&
      formData.duration &&
      formData.price
    );
  }, [formData]);

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <section className="border-b border-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <AnimatedSection>
            <SectionHeader
              title="Sell Royalties"
              subtitle="Create a royalty listing to raise capital from your future revenue. Complete the form below to generate your royalty contract."
            />
          </AnimatedSection>
        </div>
      </section>

      {/* Platform Init Banner (if not initialized) */}
      {connected && platformReady === false && (
        <section className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-yellow-800">Platform not initialized</p>
                <p className="text-sm text-yellow-600">Initialize the platform to start creating listings.</p>
              </div>
              <button
                onClick={handleInitializePlatform}
                disabled={isSubmitting}
                className="px-4 py-2 bg-yellow-600 text-white font-medium hover:bg-yellow-700 disabled:opacity-50"
              >
                {isSubmitting ? "Initializing..." : "Initialize Platform"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Form */}
      <section>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Fields */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Revenue Source Section */}
                <AnimatedSection delay={0.1}>
                  <Card>
                    <h3 className="text-xl font-bold mb-6">Revenue Source</h3>
                    <div className="space-y-6">
                      <div>
                        <label htmlFor="revenueSource" className="block text-sm font-medium mb-2">
                          Revenue Source Type
                        </label>
                        <select
                          id="revenueSource"
                          name="revenueSource"
                          value={formData.revenueSource}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-black bg-white text-black focus:outline-none focus:ring-2 focus:ring-black"
                        >
                          <option value="">Select a revenue source</option>
                          <option value="youtube">YouTube AdSense</option>
                          <option value="spotify">Spotify Streaming</option>
                          <option value="twitch">Twitch Subscriptions</option>
                          <option value="patreon">Patreon Memberships</option>
                          <option value="steam">Steam Game Sales</option>
                          <option value="amazon">Amazon KDP / Book Sales</option>
                          <option value="substack">Substack Newsletter</option>
                          <option value="podcast">Podcast Sponsorships</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="workIdentifier" className="block text-sm font-medium mb-2">
                          Work Identifier
                        </label>
                        <input
                          type="text"
                          id="workIdentifier"
                          name="workIdentifier"
                          value={formData.workIdentifier}
                          onChange={handleChange}
                          placeholder="e.g., Channel URL, Album Name, Game Title"
                          className="w-full px-4 py-3 border border-black bg-white text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black"
                        />
                        <p className="mt-2 text-sm text-black/60">
                          The specific work or channel generating the revenue.
                        </p>
                      </div>

                      <div>
                        <label htmlFor="description" className="block text-sm font-medium mb-2">
                          Description
                        </label>
                        <textarea
                          id="description"
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          rows={3}
                          maxLength={200}
                          placeholder="Describe what you're selling and why it's a good investment..."
                          className="w-full px-4 py-3 border border-black bg-white text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black resize-none"
                        />
                        <div className="mt-2 flex justify-between">
                          <p className="text-sm text-black/60">
                            Brief description of your content.
                          </p>
                          <p className={`text-sm ${formData.description.length > 180 ? 'text-red-500' : 'text-black/40'}`}>
                            {formData.description.length}/200
                          </p>
                        </div>
                      </div>

                      <ImageUpload
                        imageUrl={formData.imageUrl}
                        onImageChange={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                        onError={(msg) => showToast(msg, "error")}
                      />
                    </div>
                  </Card>
                </AnimatedSection>

                {/* Terms Section */}
                <AnimatedSection delay={0.2}>
                  <Card>
                    <h3 className="text-xl font-bold mb-6">Royalty Terms</h3>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="percentageSold" className="block text-sm font-medium mb-2">
                            Percentage Sold (%)
                          </label>
                          <input
                            type="number"
                            id="percentageSold"
                            name="percentageSold"
                            value={formData.percentageSold}
                            onChange={handleChange}
                            placeholder="e.g., 10"
                            min="1"
                            max="100"
                            className="w-full px-4 py-3 border border-black bg-white text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black"
                          />
                        </div>

                        <div>
                          <label htmlFor="duration" className="block text-sm font-medium mb-2">
                            Duration
                          </label>
                          <select
                            id="duration"
                            name="duration"
                            value={formData.duration}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-black bg-white text-black focus:outline-none focus:ring-2 focus:ring-black"
                          >
                            <option value="">Select duration</option>
                            <option value="12">12 months</option>
                            <option value="24">24 months</option>
                            <option value="36">36 months</option>
                            <option value="48">48 months</option>
                            <option value="60">60 months</option>
                            <option value="perpetual">Perpetual</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="reportingFrequency" className="block text-sm font-medium mb-2">
                          Revenue Reporting Frequency
                        </label>
                        <select
                          id="reportingFrequency"
                          name="reportingFrequency"
                          value={formData.reportingFrequency}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-black bg-white text-black focus:outline-none focus:ring-2 focus:ring-black"
                        >
                          <option value="weekly">Weekly</option>
                          <option value="biweekly">Bi-weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                        </select>
                        <p className="mt-2 text-sm text-black/60">
                          How often you will report and distribute revenue to token holders.
                        </p>
                      </div>
                    </div>
                  </Card>
                </AnimatedSection>

                {/* Pricing Section */}
                <AnimatedSection delay={0.3}>
                  <Card>
                    <h3 className="text-xl font-bold mb-6">Pricing</h3>
                    <div className="space-y-6">
                      <div>
                        <label htmlFor="price" className="block text-sm font-medium mb-2">
                          Price (USDC)
                        </label>
                        <input
                          type="number"
                          id="price"
                          name="price"
                          value={formData.price}
                          onChange={handleChange}
                          placeholder="e.g., 5000"
                          min="1"
                          className="w-full px-4 py-3 border border-black bg-white text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black"
                        />
                        <p className="mt-2 text-sm text-black/60">
                          The amount you want to raise for this royalty contract.
                        </p>
                      </div>
                    </div>
                  </Card>
                </AnimatedSection>

                {/* Resale Settings */}
                <AnimatedSection delay={0.4}>
                  <Card>
                    <h3 className="text-xl font-bold mb-6">Secondary Market Settings</h3>
                    <div className="space-y-6">
                      {/* Allow Resale Toggle */}
                      <div className="flex items-start gap-4">
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, allowResale: !prev.allowResale }))}
                            className={`w-12 h-6 flex items-center transition-colors ${
                              formData.allowResale ? "bg-black" : "bg-black/20"
                            }`}
                          >
                            <motion.div
                              animate={{ x: formData.allowResale ? 24 : 2 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              className="w-5 h-5 bg-white"
                            />
                          </button>
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium mb-1">
                            Allow Resale on Secondary Market
                          </label>
                          <p className="text-sm text-black/60">
                            {formData.allowResale 
                              ? "Buyers can resell this royalty token to other investors on the secondary market."
                              : "This royalty token cannot be resold. The original buyer must hold until the contract ends."}
                          </p>
                        </div>
                      </div>

                      {/* Resale Royalty (only if resale allowed) */}
                      {formData.allowResale && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <label htmlFor="resaleRoyalty" className="block text-sm font-medium mb-2">
                            Resale Royalty (%)
                          </label>
                          <input
                            type="number"
                            id="resaleRoyalty"
                            name="resaleRoyalty"
                            value={formData.resaleRoyalty}
                            onChange={handleChange}
                            placeholder="e.g., 2.5"
                            min="0"
                            max="10"
                            step="0.5"
                            className="w-full px-4 py-3 border border-black bg-white text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black"
                          />
                          <p className="mt-2 text-sm text-black/60">
                            Percentage you receive when the token is resold on the secondary market (0-10%).
                          </p>
                        </motion.div>
                      )}
                    </div>
                  </Card>
                </AnimatedSection>

                {/* Actions - Mobile only */}
                <div className="lg:hidden space-y-4">
                  {!connected ? (
                    <p className="text-center text-black/60 py-4">
                      Connect your wallet to create a listing
                    </p>
                  ) : (
                    <button
                      type="submit"
                      disabled={!isFormComplete || isSubmitting}
                      className={`w-full px-8 py-4 font-medium transition-colors ${
                        isFormComplete && !isSubmitting
                          ? "bg-black text-white hover:bg-black/80"
                          : "bg-black/20 text-black/40 cursor-not-allowed"
                      }`}
                    >
                      {isSubmitting ? "Creating..." : "Create Listing"}
                    </button>
                  )}
                  <p className="text-sm text-black/60 text-center">
                    By creating a listing, you agree to the Royalties.fun Terms of Service.
                  </p>
                </div>
              </form>
            </div>

            {/* Contract Preview - Sticky Sidebar */}
            <div className="lg:col-span-1">
              <AnimatedSection delay={0.4} direction="right">
                <div className="sticky top-24">
                  <motion.div
                    layout
                    className="bg-black text-white p-6"
                  >
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                      Contract Preview
                      {isFormComplete && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2 h-2 bg-green-500"
                        />
                      )}
                    </h3>
                    <div className="space-y-4">
                      <motion.div layout className="border-b border-white/10 pb-3">
                        <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Revenue Source</p>
                        <p className={`font-medium ${contractPreview.revenueSource ? "text-white" : "text-white/30"}`}>
                          {contractPreview.revenueSource || "Not selected"}
                        </p>
                      </motion.div>
                      
                      <motion.div layout className="border-b border-white/10 pb-3">
                        <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Work</p>
                        <p className={`font-medium ${contractPreview.work ? "text-white" : "text-white/30"}`}>
                          {contractPreview.work || "Not specified"}
                        </p>
                      </motion.div>
                      
                      <motion.div layout className="border-b border-white/10 pb-3">
                        <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Selling</p>
                        <p className={`font-medium ${contractPreview.percentage ? "text-white" : "text-white/30"}`}>
                          {contractPreview.percentage ? `${contractPreview.percentage} of revenue` : "—"}
                        </p>
                      </motion.div>
                      
                      <motion.div layout className="border-b border-white/10 pb-3">
                        <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Duration</p>
                        <p className={`font-medium ${contractPreview.duration ? "text-white" : "text-white/30"}`}>
                          {contractPreview.duration || "Not selected"}
                        </p>
                      </motion.div>
                      
                      <motion.div layout className="border-b border-white/10 pb-3">
                        <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Price</p>
                        <p className={`font-medium text-lg ${contractPreview.price ? "text-white" : "text-white/30"}`}>
                          {contractPreview.price || "—"}
                        </p>
                      </motion.div>
                      
                      <motion.div layout className="border-b border-white/10 pb-3">
                        <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Reporting</p>
                        <p className={`font-medium ${contractPreview.reportingFrequency ? "text-white" : "text-white/30"}`}>
                          {contractPreview.reportingFrequency || "Monthly"}
                        </p>
                      </motion.div>

                      <motion.div layout className="border-b border-white/10 pb-3">
                        <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Secondary Market</p>
                        <p className={`font-medium ${contractPreview.allowResale ? "text-green-400" : "text-red-400"}`}>
                          {contractPreview.allowResale ? "Resale Allowed" : "No Resale"}
                        </p>
                      </motion.div>
                      
                      {contractPreview.allowResale && contractPreview.resaleRoyalty && (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="pb-3"
                        >
                          <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Resale Royalty</p>
                          <p className="font-medium text-white">
                            {contractPreview.resaleRoyalty}
                          </p>
                        </motion.div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-8 space-y-3">
                      {!connected ? (
                        <p className="text-center text-white/60 py-4">
                          Connect wallet to continue
                        </p>
                      ) : (
                        <button
                          type="submit"
                          disabled={!isFormComplete || isSubmitting}
                          onClick={handleSubmit}
                          className={`w-full px-6 py-4 font-medium transition-colors ${
                            isFormComplete && !isSubmitting
                              ? "bg-white text-black hover:bg-white/90"
                              : "bg-white/20 text-white/40 cursor-not-allowed"
                          }`}
                        >
                          {isSubmitting ? "Creating..." : "Create Listing"}
                        </button>
                      )}
                    </div>
                  </motion.div>

                  <p className="mt-4 text-xs text-black/60 text-center">
                    By creating a listing, you agree to the Terms of Service and acknowledge that a legally binding contract will be generated.
                  </p>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
