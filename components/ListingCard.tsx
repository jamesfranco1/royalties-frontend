import Link from "next/link";
import Card from "./Card";

export interface ListingData {
  id: string;
  creatorName: string;
  creatorAddress?: string; // wallet address
  revenueSource: string;
  percentageOffered: number;
  duration: string;
  durationSeconds?: number; // for countdown
  startTimestamp?: number;  // for countdown
  price: number;
  currency?: string;
  isSecondary?: boolean;
  currentOwner?: string;
  // Rich metadata
  imageUrl?: string;
  description?: string;
  platformIcon?: string; // youtube, spotify, twitch, etc.
  listingName?: string; // The actual name of the listing
}

interface ListingCardProps {
  listing: ListingData;
}

// Platform colors for the image placeholder
const platformColors: Record<string, string> = {
  youtube: "bg-red-600",
  spotify: "bg-green-600",
  twitch: "bg-purple-600",
  patreon: "bg-orange-500",
  steam: "bg-slate-800",
  amazon: "bg-amber-600",
  substack: "bg-orange-600",
  podcast: "bg-pink-600",
  other: "bg-gray-600",
};

// Platform icons (simple text for now)
const platformIcons: Record<string, string> = {
  youtube: "▶",
  spotify: "♪",
  twitch: "◉",
  patreon: "P",
  steam: "⬢",
  amazon: "A",
  substack: "S",
  podcast: "🎙",
  other: "★",
};

export default function ListingCard({ listing }: ListingCardProps) {
  const {
    id,
    creatorName,
    creatorAddress,
    revenueSource,
    percentageOffered,
    duration,
    durationSeconds,
    startTimestamp,
    price,
    currency = "USDC",
    isSecondary = false,
    currentOwner,
    imageUrl,
    platformIcon,
    listingName,
  } = listing;

  // Detect platform from revenue source
  const platform = revenueSource.toLowerCase().includes("youtube") ? "youtube"
    : revenueSource.toLowerCase().includes("spotify") ? "spotify"
    : revenueSource.toLowerCase().includes("twitch") ? "twitch"
    : revenueSource.toLowerCase().includes("patreon") ? "patreon"
    : revenueSource.toLowerCase().includes("steam") ? "steam"
    : revenueSource.toLowerCase().includes("amazon") ? "amazon"
    : revenueSource.toLowerCase().includes("substack") ? "substack"
    : revenueSource.toLowerCase().includes("podcast") ? "podcast"
    : "other";

  // Calculate remaining time if we have duration info
  const getRemainingTime = (): string | null => {
    if (!durationSeconds || durationSeconds === 0) return null;
    if (!startTimestamp) return null;
    
    const now = Date.now() / 1000;
    const endTime = startTimestamp + durationSeconds;
    const remaining = endTime - now;
    
    if (remaining <= 0) return "Expired";
    
    const days = Math.floor(remaining / (24 * 60 * 60));
    const months = Math.floor(days / 30);
    
    if (months > 0) return `${months}mo remaining`;
    if (days > 0) return `${days}d remaining`;
    return "< 1 day";
  };

  const remainingTime = getRemainingTime();

  return (
    <Card className="flex flex-col h-full hover:border-black/50 transition-colors overflow-hidden">
      {/* Image/Visual Header */}
      <div className={`relative h-32 -mx-6 -mt-6 mb-4 ${platformColors[platform]} flex items-center justify-center`}>
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={revenueSource}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-white/30 text-5xl font-bold">
            {platformIcons[platform]}
          </div>
        )}
        {/* Overlay badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {remainingTime && remainingTime !== "Expired" && (
            <span className="text-xs font-medium bg-black/70 text-white px-2 py-1">
              {remainingTime}
            </span>
          )}
          {remainingTime === "Expired" && (
            <span className="text-xs font-medium bg-red-600 text-white px-2 py-1">
              Expired
            </span>
          )}
        </div>
        {/* Price badge */}
        <div className="absolute bottom-3 right-3">
          <span className="text-sm font-bold bg-white text-black px-3 py-1.5 shadow-lg">
            {price.toLocaleString()} {currency}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg truncate">{listingName || revenueSource}</h3>
            <p className="text-sm text-black/60 truncate">
              {platformIcon ? `${platformIcon.charAt(0).toUpperCase() + platformIcon.slice(1)} • ` : ''}{creatorName}
            </p>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="flex gap-4 mt-3 pt-3 border-t border-black/10">
          <div className="flex-1">
            <p className="text-xs text-black/50 uppercase">Share</p>
            <p className="font-bold">{percentageOffered}%</p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-black/50 uppercase">Duration</p>
            <p className="font-medium text-sm">{duration}</p>
          </div>
        </div>

        {isSecondary && currentOwner && (
          <div className="flex justify-between items-center py-2 mt-2 border-t border-black/10">
            <span className="text-xs text-black/60">Seller</span>
            <span className="font-mono text-xs">{currentOwner}</span>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="mt-4 pt-4 border-t border-black/10">
        <Link
          href={`/marketplace/${id}`}
          className="block w-full text-center py-2.5 border-2 border-black font-medium text-sm hover:bg-black hover:text-white transition-colors"
        >
          View Details
        </Link>
        {creatorAddress && (
          <Link
            href={`/creator/${creatorAddress}`}
            className="block w-full text-center py-2 text-xs text-black/60 hover:text-black mt-2"
          >
            View Creator →
          </Link>
        )}
      </div>
    </Card>
  );
}
