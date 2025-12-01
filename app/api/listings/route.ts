import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { getFromCache, setInCache, CACHE_TTL, isRedisConfigured } from '@/lib/redis';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '9d7TAi23mZtsXV4TRrMjmzHpVaBUxkzekhbc2q7YgJXF';
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

const CACHE_KEY = 'listings:primary';

interface ListingAccount {
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

// Discriminator for RoyaltyListing account
const ROYALTY_LISTING_DISCRIMINATOR = [142, 180, 37, 203, 57, 212, 243, 45];

function parseListingAccount(pubkey: PublicKey, data: Buffer): ListingAccount | null {
  try {
    // Check discriminator
    const discriminator = Array.from(data.slice(0, 8));
    const matches = ROYALTY_LISTING_DISCRIMINATOR.every((b, i) => b === discriminator[i]);
    if (!matches) return null;

    let offset = 8;

    // creator (32 bytes)
    const creator = new PublicKey(data.slice(offset, offset + 32)).toString();
    offset += 32;

    // nftMint (32 bytes)
    const nftMint = new PublicKey(data.slice(offset, offset + 32)).toString();
    offset += 32;

    // metadataUri (string: 4 bytes length + data)
    const uriLength = data.readUInt32LE(offset);
    offset += 4;
    const metadataUri = data.slice(offset, offset + uriLength).toString('utf8');
    offset += uriLength;

    // price (u64 - 8 bytes)
    const priceLow = data.readUInt32LE(offset);
    const priceHigh = data.readUInt32LE(offset + 4);
    const price = (BigInt(priceHigh) << 32n) + BigInt(priceLow);
    offset += 8;

    // percentageBps (u16 - 2 bytes)
    const percentageBps = data.readUInt16LE(offset);
    offset += 2;

    // durationSeconds (i64 - 8 bytes)
    const durationLow = data.readUInt32LE(offset);
    const durationHigh = data.readUInt32LE(offset + 4);
    const durationSeconds = (BigInt(durationHigh) << 32n) + BigInt(durationLow);
    offset += 8;

    // createdAt (i64 - 8 bytes)
    const createdAtLow = data.readUInt32LE(offset);
    const createdAtHigh = data.readUInt32LE(offset + 4);
    const createdAt = (BigInt(createdAtHigh) << 32n) + BigInt(createdAtLow);
    offset += 8;

    // resaleAllowed (bool - 1 byte)
    const resaleAllowed = data.readUInt8(offset) === 1;
    offset += 1;

    // resaleRoyaltyBps (u16 - 2 bytes)
    const resaleRoyaltyBps = data.readUInt16LE(offset);
    offset += 2;

    // status (enum - 1 byte)
    const statusByte = data.readUInt8(offset);
    const statusMap: { [key: number]: string } = {
      0: 'Active',
      1: 'Sold',
      2: 'Cancelled',
    };
    const status = statusMap[statusByte] || 'Unknown';

    return {
      pubkey: pubkey.toString(),
      creator,
      nftMint,
      metadataUri,
      price: price.toString(),
      percentageBps,
      durationSeconds: durationSeconds.toString(),
      createdAt: createdAt.toString(),
      resaleAllowed,
      resaleRoyaltyBps,
      status,
    };
  } catch (error) {
    console.error('Error parsing listing:', error);
    return null;
  }
}

async function fetchListingsFromChain(): Promise<ListingAccount[]> {
  const connection = new Connection(RPC_URL, 'confirmed');
  const programId = new PublicKey(PROGRAM_ID);

  // Fetch all program accounts - the discriminator is checked during parsing
  // Don't filter by dataSize since metadataUri length varies
  const accounts = await connection.getProgramAccounts(programId);

  const listings: ListingAccount[] = [];

  for (const { pubkey, account } of accounts) {
    const parsed = parseListingAccount(pubkey, account.data as Buffer);
    if (parsed && parsed.status === 'Active') {
      listings.push(parsed);
    }
  }

  console.log(`Fetched ${accounts.length} program accounts, ${listings.length} active listings`);

  return listings;
}

export async function GET(request: Request) {
  try {
    // Check for cache bypass
    const { searchParams } = new URL(request.url);
    const skipCache = searchParams.get('fresh') === 'true';

    // Try to get from cache first (unless bypassed)
    if (!skipCache && isRedisConfigured()) {
      const cached = await getFromCache<ListingAccount[]>(CACHE_KEY);
      if (cached) {
        console.log(`Serving ${cached.length} listings from cache`);
        return NextResponse.json({
          success: true,
          data: cached,
          cached: true,
          timestamp: Date.now(),
        });
      }
    }

    console.log(`Fetching listings from chain (RPC: ${RPC_URL.substring(0, 30)}...)`);
    
    // Fetch from chain
    const listings = await fetchListingsFromChain();
    console.log(`Found ${listings.length} active listings on chain`);

    // Cache the results
    if (isRedisConfigured()) {
      await setInCache(CACHE_KEY, listings, CACHE_TTL.LISTINGS);
    }

    return NextResponse.json({
      success: true,
      data: listings,
      cached: false,
      count: listings.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch listings',
        message: error instanceof Error ? error.message : 'Unknown error',
        rpcUrl: RPC_URL.substring(0, 30),
      },
      { status: 500 }
    );
  }
}

