import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { getFromCache, setInCache, CACHE_TTL, isRedisConfigured } from '@/lib/redis';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '9d7TAi23mZtsXV4TRrMjmzHpVaBUxkzekhbc2q7YgJXF';
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

const CACHE_KEY = 'listings:resale';

interface ResaleListingAccount {
  pubkey: string;
  seller: string;
  originalListing: string;
  nftMint: string;
  price: string;
  createdAt: string;
  isActive: boolean;
}

// Discriminator for ResaleListing account
const RESALE_LISTING_DISCRIMINATOR = [214, 254, 220, 107, 49, 129, 174, 134];

function parseResaleListingAccount(pubkey: PublicKey, data: Buffer): ResaleListingAccount | null {
  try {
    // Check discriminator
    const discriminator = Array.from(data.slice(0, 8));
    const matches = RESALE_LISTING_DISCRIMINATOR.every((b, i) => b === discriminator[i]);
    if (!matches) return null;

    let offset = 8;

    // seller (32 bytes)
    const seller = new PublicKey(data.slice(offset, offset + 32)).toString();
    offset += 32;

    // originalListing (32 bytes)
    const originalListing = new PublicKey(data.slice(offset, offset + 32)).toString();
    offset += 32;

    // nftMint (32 bytes)
    const nftMint = new PublicKey(data.slice(offset, offset + 32)).toString();
    offset += 32;

    // price (u64 - 8 bytes)
    const priceLow = data.readUInt32LE(offset);
    const priceHigh = data.readUInt32LE(offset + 4);
    const price = (BigInt(priceHigh) << 32n) + BigInt(priceLow);
    offset += 8;

    // createdAt (i64 - 8 bytes)
    const createdAtLow = data.readUInt32LE(offset);
    const createdAtHigh = data.readUInt32LE(offset + 4);
    const createdAt = (BigInt(createdAtHigh) << 32n) + BigInt(createdAtLow);
    offset += 8;

    // isActive (bool - 1 byte)
    const isActive = data.readUInt8(offset) === 1;

    return {
      pubkey: pubkey.toString(),
      seller,
      originalListing,
      nftMint,
      price: price.toString(),
      createdAt: createdAt.toString(),
      isActive,
    };
  } catch (error) {
    console.error('Error parsing resale listing:', error);
    return null;
  }
}

async function fetchResaleListingsFromChain(): Promise<ResaleListingAccount[]> {
  const connection = new Connection(RPC_URL, 'confirmed');
  const programId = new PublicKey(PROGRAM_ID);

  // Fetch all program accounts - the discriminator is checked during parsing
  const accounts = await connection.getProgramAccounts(programId);

  const listings: ResaleListingAccount[] = [];

  for (const { pubkey, account } of accounts) {
    const parsed = parseResaleListingAccount(pubkey, account.data as Buffer);
    if (parsed && parsed.isActive) {
      listings.push(parsed);
    }
  }

  console.log(`Fetched ${accounts.length} program accounts, ${listings.length} active resale listings`);

  return listings;
}

export async function GET(request: Request) {
  try {
    // Check for cache bypass
    const { searchParams } = new URL(request.url);
    const skipCache = searchParams.get('fresh') === 'true';

    // Try to get from cache first (unless bypassed)
    if (!skipCache && isRedisConfigured()) {
      const cached = await getFromCache<ResaleListingAccount[]>(CACHE_KEY);
      if (cached) {
        console.log(`Serving ${cached.length} resale listings from cache`);
        return NextResponse.json({
          success: true,
          data: cached,
          cached: true,
          timestamp: Date.now(),
        });
      }
    }

    console.log(`Fetching resale listings from chain...`);
    
    // Fetch from chain
    const listings = await fetchResaleListingsFromChain();
    console.log(`Found ${listings.length} active resale listings on chain`);

    // Cache the results
    if (isRedisConfigured()) {
      await setInCache(CACHE_KEY, listings, CACHE_TTL.RESALE);
    }

    return NextResponse.json({
      success: true,
      data: listings,
      cached: false,
      count: listings.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching resale listings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch resale listings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

