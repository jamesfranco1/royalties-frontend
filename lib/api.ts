/**
 * API client for fetching cached listing data
 * Uses server-side caching to reduce RPC calls
 */

export interface ListingFromAPI {
  pubkey: string;
  creator: string;
  nftMint: string;
  metadataUri: string;
  price: string;
  percentageBps: number;
  durationSeconds: string;
  createdAt: string;
  resaleAllowed: boolean;
  resaleRoyaltyBps: number;
  status: string;
}

export interface ResaleListingFromAPI {
  pubkey: string;
  seller: string;
  originalListing: string;
  nftMint: string;
  price: string;
  createdAt: string;
  isActive: boolean;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  cached?: boolean;
  timestamp?: number;
  error?: string;
  message?: string;
}

/**
 * Fetch all primary listings from the cached API
 */
export async function fetchListingsFromAPI(fresh = false): Promise<ListingFromAPI[]> {
  try {
    const url = fresh ? '/api/listings?fresh=true' : '/api/listings';
    console.log('Fetching listings from:', url);
    const response = await fetch(url, { cache: 'no-store' });
    const result: APIResponse<ListingFromAPI[]> = await response.json();
    
    console.log('API response:', result);
    
    if (!result.success || !result.data) {
      console.error('API error:', result.error, result.message);
      return [];
    }
    
    if (result.cached) {
      console.log('Listings served from cache');
    }
    
    console.log(`Got ${result.data.length} listings from API`);
    return result.data;
  } catch (error) {
    console.error('Failed to fetch listings from API:', error);
    return [];
  }
}

/**
 * Fetch all resale listings from the cached API
 */
export async function fetchResaleListingsFromAPI(fresh = false): Promise<ResaleListingFromAPI[]> {
  try {
    const url = fresh ? '/api/resale-listings?fresh=true' : '/api/resale-listings';
    const response = await fetch(url, { cache: 'no-store' });
    const result: APIResponse<ResaleListingFromAPI[]> = await response.json();
    
    if (!result.success || !result.data) {
      console.error('Resale API error:', result.error);
      return [];
    }
    
    if (result.cached) {
      console.log('Resale listings served from cache');
    }
    
    console.log(`Got ${result.data.length} resale listings from API`);
    return result.data;
  } catch (error) {
    console.error('Failed to fetch resale listings from API:', error);
    return [];
  }
}

/**
 * Parse metadata URI to extract listing details (sync version for base64 and ipfs)
 */
export function parseMetadataFromAPI(uri: string): { 
  name: string; 
  platform: string; 
  imageUrl: string; 
  description: string;
} {
  // Try to parse base64 JSON first (old format)
  if (uri.startsWith('data:application/json;base64,')) {
    try {
      const base64 = uri.replace('data:application/json;base64,', '');
      const json = JSON.parse(atob(base64));
      return {
        name: json.work || json.name || 'Untitled',
        platform: json.source || json.attributes?.find((a: { trait_type: string; value: string }) => a.trait_type === 'platform')?.value || 'Unknown',
        imageUrl: json.imageUrl || json.image || '',
        description: json.description || '',
      };
    } catch (e) {
      console.error('Failed to parse base64 metadata:', e);
    }
  }
  
  // Handle ipfs:// format (e.g., ipfs://youtube/my-video)
  if (uri.startsWith('ipfs://')) {
    const parts = uri.replace('ipfs://', '').split('/');
    const platform = parts[0] || 'Unknown';
    const name = parts.slice(1).join('/') || 'Untitled';
    return {
      name,
      platform,
      imageUrl: '',
      description: '',
    };
  }
  
  // Fallback
  return {
    name: 'Untitled',
    platform: 'Unknown',
    imageUrl: '',
    description: '',
  };
}

// Cache for fetched metadata
const metadataCache = new Map<string, { name: string; platform: string; imageUrl: string; description: string }>();

/**
 * Fetch and parse metadata from any URI format (async version)
 */
export async function fetchMetadataFromURI(uri: string): Promise<{
  name: string;
  platform: string;
  imageUrl: string;
  description: string;
}> {
  // Check cache first
  if (metadataCache.has(uri)) {
    return metadataCache.get(uri)!;
  }

  // Base64 encoded JSON (old format)
  if (uri.startsWith('data:application/json;base64,')) {
    const result = parseMetadataFromAPI(uri);
    metadataCache.set(uri, result);
    return result;
  }
  
  // IPFS format (e.g., ipfs://youtube/my-video)
  if (uri.startsWith('ipfs://')) {
    const result = parseMetadataFromAPI(uri);
    metadataCache.set(uri, result);
    return result;
  }
  
  // HTTPS URL to JSON file (new format from Vercel Blob)
  if (uri.startsWith('https://')) {
    try {
      // Try direct fetch first (Vercel Blob is public)
      const response = await fetch(uri, { 
        cache: 'force-cache',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const json = await response.json();
        const result = {
          name: json.work || json.name || 'Untitled',
          platform: json.source || 'Unknown',
          imageUrl: json.imageUrl || json.image || '',
          description: json.description || '',
        };
        metadataCache.set(uri, result);
        return result;
      }
    } catch (e) {
      console.error('Direct metadata fetch failed, trying proxy:', e);
      
      // Fallback to API proxy
      try {
        const proxyUrl = `/api/metadata?url=${encodeURIComponent(uri)}`;
        const proxyResponse = await fetch(proxyUrl);
        if (proxyResponse.ok) {
          const json = await proxyResponse.json();
          const result = {
            name: json.work || json.name || 'Untitled',
            platform: json.source || 'Unknown',
            imageUrl: json.imageUrl || json.image || '',
            description: json.description || '',
          };
          metadataCache.set(uri, result);
          return result;
        }
      } catch (proxyError) {
        console.error('Proxy metadata fetch also failed:', proxyError);
      }
    }
  }
  
  // Fallback
  const fallback = {
    name: 'Untitled',
    platform: 'Unknown',
    imageUrl: '',
    description: '',
  };
  return fallback;
}

