import { Program, AnchorProvider, web3, BN, Idl } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

// Import the IDL
import idl from "./idl/royalties.json";

// Import cache
import { cache, CACHE_KEYS, CACHE_TTL, invalidateListingCaches, invalidateUserCaches } from "./cache";

// Program ID from deployment
const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "9d7TAi23mZtsXV4TRrMjmzHpVaBUxkzekhbc2q7YgJXF"
);

// RPC URL - defaults to devnet for development
const RPC_URL = 
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 
  "https://api.devnet.solana.com";

// Network type
const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";

// USDC Mint addresses by network
// For devnet testing, you may need to create your own SPL token or use a test token
// This is a placeholder - on mainnet, use the official USDC mint
export const USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT || 
  // Devnet USDC (Circle's official devnet USDC)
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

export { PROGRAM_ID };

// Export discriminator calculator for testing
export function getInstructionDiscriminator(name: string): Buffer {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(`global:${name}`).digest();
  return Buffer.from(hash.slice(0, 8));
}

export interface CreateListingArgs {
  metadataUri: string;
  percentageBps: number;
  durationSeconds: BN;
  price: BN;
  resaleAllowed: boolean;
  creatorRoyaltyBps: number;
}

/**
 * Hook to get the Royalties program instance
 * Use this in your React components
 */
export function useRoyaltiesProgram() {
  const wallet = useWallet();

  const getProvider = (): AnchorProvider | null => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;

    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 
      "https://api.devnet.solana.com",
      "confirmed"
    );

    const provider = new AnchorProvider(
      connection,
      wallet as any,
      { commitment: "confirmed" }
    );

    return provider;
  };

  const getProgram = (): Program | null => {
    const provider = getProvider();
    if (!provider) return null;

    try {
      // Use IDL without accounts to avoid prefetch issues
      const safeIdl = {
        address: idl.address,
        metadata: idl.metadata,
        instructions: idl.instructions,
        types: idl.types || [],
        errors: idl.errors || [],
        // Explicitly exclude 'accounts' to prevent Anchor from trying to fetch them
      };

      const program = new Program(
        safeIdl as unknown as Idl,
        provider
      );

      return program;
    } catch (error: any) {
      console.error("Failed to create program:", error);
      return null;
    }
  };

  return {
    program: getProgram(),
    provider: getProvider(),
    connected: wallet.connected,
    publicKey: wallet.publicKey,
  };
}

/**
 * Helper to get Platform Config PDA
 */
export function getPlatformConfigPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("platform_config")],
    programId
  );
}

/**
 * Helper to get Royalty Listing PDA
 */
export function getRoyaltyListingPDA(
  programId: PublicKey,
  creator: PublicKey,
  nftMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("royalty_listing"),
      creator.toBuffer(),
      nftMint.toBuffer(),
    ],
    programId
  );
}

/**
 * Helper to get Resale Listing PDA
 */
export function getResaleListingPDA(
  programId: PublicKey,
  royaltyListing: PublicKey,
  seller: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("resale_listing"),
      royaltyListing.toBuffer(),
      seller.toBuffer(),
    ],
    programId
  );
}

/**
 * Helper to get Payout Pool PDA
 */
export function getPayoutPoolPDA(
  programId: PublicKey,
  royaltyListing: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("payout_pool"), royaltyListing.toBuffer()],
    programId
  );
}

/**
 * Initialize Platform (one-time setup)
 */
export async function initializePlatform(
  program: Program,
  provider: AnchorProvider,
  treasury: PublicKey,
  platformFeeBps: number = 500 // 5%
) {
  // Use PROGRAM_ID constant instead of program.programId (may be undefined with minimal IDL)
  const [platformConfig] = getPlatformConfigPDA(PROGRAM_ID);

  const tx = await (program.methods as any)
    .initialize(platformFeeBps)
    .accounts({
      authority: provider.wallet.publicKey,
      platformConfig,
      treasury,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();

  return { tx, platformConfig };
}

/**
 * Create a new royalty listing
 * Uses manual instruction building to avoid IDL parsing issues
 */
export async function createRoyaltyListing(
  program: Program,
  provider: AnchorProvider,
  args: CreateListingArgs
) {
  const creator = provider.wallet.publicKey;
  const nftMint = Keypair.generate();
  const [royaltyListing] = getRoyaltyListingPDA(PROGRAM_ID, creator, nftMint.publicKey);
  const [platformConfig] = getPlatformConfigPDA(PROGRAM_ID);

  console.log("createRoyaltyListing - building instruction manually...");
  console.log("Creator:", creator.toString());
  console.log("NFT Mint:", nftMint.publicKey.toString());
  console.log("RoyaltyListing PDA:", royaltyListing.toString());
  console.log("PlatformConfig PDA:", platformConfig.toString());

  // Build instruction data manually using Borsh serialization
  // Discriminator for "createListing" = first 8 bytes of sha256("global:create_listing")
  const discriminator = Buffer.from([18, 168, 45, 24, 191, 31, 117, 54]);

  // Serialize args using Borsh format
  const metadataUriBytes = Buffer.from(args.metadataUri, 'utf8');
  const metadataUriLen = Buffer.alloc(4);
  metadataUriLen.writeUInt32LE(metadataUriBytes.length, 0);

  const percentageBpsBytes = Buffer.alloc(2);
  percentageBpsBytes.writeUInt16LE(args.percentageBps, 0);

  const durationSecondsBytes = Buffer.alloc(8);
  const durationBigInt = BigInt(args.durationSeconds.toString());
  durationSecondsBytes.writeBigUInt64LE(durationBigInt, 0);

  const priceBytes = Buffer.alloc(8);
  const priceBigInt = BigInt(args.price.toString());
  priceBytes.writeBigUInt64LE(priceBigInt, 0);

  const resaleAllowedBytes = Buffer.from([args.resaleAllowed ? 1 : 0]);

  const creatorRoyaltyBpsBytes = Buffer.alloc(2);
  creatorRoyaltyBpsBytes.writeUInt16LE(args.creatorRoyaltyBps, 0);

  // Combine all instruction data
  const data = Buffer.concat([
    discriminator,
    metadataUriLen,
    metadataUriBytes,
    percentageBpsBytes,
    durationSecondsBytes,
    priceBytes,
    resaleAllowedBytes,
    creatorRoyaltyBpsBytes,
  ]);

  console.log("Instruction data length:", data.length);

  // Build the instruction
  const instruction = new web3.TransactionInstruction({
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: platformConfig, isSigner: false, isWritable: false },
      { pubkey: royaltyListing, isSigner: false, isWritable: true },
      { pubkey: nftMint.publicKey, isSigner: true, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: web3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });

  // Build transaction
  const connection = provider.connection;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  
  const tx = new web3.Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: creator,
  });
  tx.add(instruction);

  // Sign with the NFT mint keypair first
  tx.sign(nftMint);
  
  // Then sign with wallet and send
  const signedTx = await provider.wallet.signTransaction(tx);
  const txId = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  
  console.log("Transaction sent:", txId);

  // Confirm transaction
  await connection.confirmTransaction({
    signature: txId,
    blockhash,
    lastValidBlockHeight,
  }, "confirmed");

  console.log("Transaction confirmed!");

  // Invalidate caches after creating listing
  invalidateListingCaches();

  return { tx: txId, royaltyListing, nftMint: nftMint.publicKey };
}

/**
 * Buy a royalty listing from primary market
 * Uses manual instruction building to avoid IDL parsing issues
 */
export async function buyRoyaltyListing(
  provider: AnchorProvider,
  listingData: {
    publicKey: string;
    creator: string;
    nftMint: string;
  }
) {
  const buyer = provider.wallet.publicKey;
  const royaltyListingPubkey = new PublicKey(listingData.publicKey);
  const creator = new PublicKey(listingData.creator);
  const nftMint = new PublicKey(listingData.nftMint);
  
  const [platformConfig] = getPlatformConfigPDA(PROGRAM_ID);
  
  // Fetch treasury from platform config
  const connection = provider.connection;
  const platformConfigAccount = await connection.getAccountInfo(platformConfig);
  if (!platformConfigAccount) {
    throw new Error("Platform not initialized");
  }
  
  // Parse treasury from platform config (offset: 8 discriminator + 32 authority = 40)
  const treasury = new PublicKey(platformConfigAccount.data.slice(40, 72));
  
  console.log("buyRoyaltyListing - building instruction manually...");
  console.log("Buyer:", buyer.toString());
  console.log("Creator:", creator.toString());
  console.log("NFT Mint:", nftMint.toString());
  console.log("Royalty Listing:", royaltyListingPubkey.toString());
  console.log("Treasury:", treasury.toString());
  console.log("USDC Mint:", USDC_MINT.toString());
  
  // Derive Associated Token Accounts
  const buyerUsdc = getAssociatedTokenAddressSync(USDC_MINT, buyer);
  const creatorUsdc = getAssociatedTokenAddressSync(USDC_MINT, creator);
  const treasuryUsdc = getAssociatedTokenAddressSync(USDC_MINT, treasury);
  const buyerNft = getAssociatedTokenAddressSync(nftMint, buyer);
  
  console.log("Buyer USDC ATA:", buyerUsdc.toString());
  console.log("Creator USDC ATA:", creatorUsdc.toString());
  console.log("Treasury USDC ATA:", treasuryUsdc.toString());
  console.log("Buyer NFT ATA:", buyerNft.toString());
  
  // Build transaction
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  
  const tx = new web3.Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: buyer,
  });
  
  // Check and create token accounts if they don't exist
  const treasuryUsdcAccount = await connection.getAccountInfo(treasuryUsdc);
  if (!treasuryUsdcAccount) {
    console.log("Creating treasury USDC account...");
    tx.add(
      createAssociatedTokenAccountInstruction(
        buyer, // payer
        treasuryUsdc, // ata
        treasury, // owner
        USDC_MINT // mint
      )
    );
  }
  
  const creatorUsdcAccount = await connection.getAccountInfo(creatorUsdc);
  if (!creatorUsdcAccount) {
    console.log("Creating creator USDC account...");
    tx.add(
      createAssociatedTokenAccountInstruction(
        buyer, // payer
        creatorUsdc, // ata
        creator, // owner
        USDC_MINT // mint
      )
    );
  }
  
  const buyerNftAccount = await connection.getAccountInfo(buyerNft);
  if (!buyerNftAccount) {
    console.log("Creating buyer NFT account...");
    tx.add(
      createAssociatedTokenAccountInstruction(
        buyer, // payer
        buyerNft, // ata
        buyer, // owner
        nftMint // mint
      )
    );
  }
  
  // Discriminator for "buyListing" = first 8 bytes of sha256("global:buy_listing")
  // [115,149,42,108,44,49,140,153]
  const discriminator = Buffer.from([115, 149, 42, 108, 44, 49, 140, 153]);
  
  // buyListing has no args, just the discriminator
  const data = discriminator;
  
  // Build the instruction with all required accounts
  const buyInstruction = new web3.TransactionInstruction({
    keys: [
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: creator, isSigner: false, isWritable: true },
      { pubkey: platformConfig, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: royaltyListingPubkey, isSigner: false, isWritable: true },
      { pubkey: nftMint, isSigner: false, isWritable: true },
      { pubkey: buyerUsdc, isSigner: false, isWritable: true },
      { pubkey: creatorUsdc, isSigner: false, isWritable: true },
      { pubkey: treasuryUsdc, isSigner: false, isWritable: true },
      { pubkey: USDC_MINT, isSigner: false, isWritable: false },
      { pubkey: buyerNft, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
  
  tx.add(buyInstruction);
  
  // Sign with wallet and send
  const signedTx = await provider.wallet.signTransaction(tx);
  const txId = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  
  console.log("Buy transaction sent:", txId);
  
  // Confirm transaction
  await connection.confirmTransaction({
    signature: txId,
    blockhash,
    lastValidBlockHeight,
  }, "confirmed");
  
  console.log("Buy transaction confirmed!");
  
  // Invalidate caches after purchase
  invalidateListingCaches();
  
  return txId;
}

// ============================================
// READ-ONLY FUNCTIONS (no wallet required)
// ============================================

/**
 * Get a connection to the Solana network
 */
export function getConnection(): Connection {
  return new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
    "confirmed"
  );
}

/**
 * Check if the platform is initialized
 */
export async function isPlatformInitialized(): Promise<boolean> {
  const connection = getConnection();
  const [platformConfig] = getPlatformConfigPDA(PROGRAM_ID);
  
  try {
    const account = await connection.getAccountInfo(platformConfig);
    return account !== null;
  } catch (e) {
    return false;
  }
}

/**
 * Fetch platform config
 */
export async function fetchPlatformConfig(): Promise<any | null> {
  const connection = getConnection();
  const [platformConfig] = getPlatformConfigPDA(PROGRAM_ID);
  
  try {
    const account = await connection.getAccountInfo(platformConfig);
    if (!account) return null;
    
    // Note: For proper decoding, you'd use the program's account decoder
    // This is a simplified version
    return { address: platformConfig.toBase58(), exists: true };
  } catch (e) {
    return null;
  }
}

/**
 * Fetch all royalty listings from the blockchain
 */
export async function fetchAllListings(forceRefresh: boolean = false): Promise<any[]> {
  // Check cache first
  if (!forceRefresh) {
    const cached = cache.get<any[]>(CACHE_KEYS.ALL_LISTINGS);
    if (cached) {
      console.log("Using cached listings");
      return cached;
    }
  }
  
  const connection = getConnection();
  
  try {
    console.log("Fetching listings from RPC...");
    // Get all accounts owned by our program
    const accounts = await connection.getProgramAccounts(PROGRAM_ID);
    
    // RoyaltyListing discriminator: sha256("account:RoyaltyListing")[0..8]
    const royaltyListingDiscriminator = [114, 27, 40, 41, 206, 120, 0, 66];
    
    // Filter to only RoyaltyListing accounts by checking discriminator
    const royaltyListingAccounts = accounts.filter(account => {
      const data = account.account.data;
      if (data.length < 8) return false;
      return royaltyListingDiscriminator.every((byte, i) => data[i] === byte);
    });

    console.log(`Found ${royaltyListingAccounts.length} RoyaltyListing accounts out of ${accounts.length} total`);

    return royaltyListingAccounts.map((account) => {
      try {
        // Parse the account data
        const data = account.account.data;
        console.log("Account data length:", data.length);
        
        // Skip 8-byte discriminator
        let offset = 8;
        
        // Parse creator (32 bytes)
        const creator = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        
        // Parse nftMint (32 bytes)
        const nftMint = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        
        // Parse metadataUri (4 bytes length + variable string)
        const uriLength = data.readUInt32LE(offset);
        offset += 4;
        const metadataUri = data.slice(offset, offset + uriLength).toString('utf8');
        offset += uriLength; // Move by actual string length, not fixed 200
        
        // Parse percentageBps (2 bytes)
        const percentageBps = data.readUInt16LE(offset);
        offset += 2;
        
        // Parse durationSeconds (8 bytes)
        const durationSeconds = data.readBigUInt64LE(offset);
        offset += 8;
        
        // Parse startTimestamp (8 bytes)
        const startTimestamp = data.readBigInt64LE(offset);
        offset += 8;
        
        // Parse price (8 bytes)
        const price = data.readBigUInt64LE(offset);
        offset += 8;
        
        // Parse resaleAllowed (1 byte)
        const resaleAllowed = data[offset] === 1;
        offset += 1;
        
        // Parse creatorRoyaltyBps (2 bytes)
        const creatorRoyaltyBps = data.readUInt16LE(offset);
        offset += 2;
        
        // Parse status (1 byte)
        const statusValue = data[offset];
        const status = ['Active', 'Sold', 'Cancelled', 'Expired'][statusValue] || 'Unknown';
        
        console.log("Parsed listing:", { creator: creator.toBase58(), metadataUri, percentageBps, price: Number(price) });
        
        return {
          publicKey: account.pubkey.toBase58(),
          creator: creator.toBase58(),
          nftMint: nftMint.toBase58(),
          metadataUri,
          percentageBps,
          percentage: percentageBps / 100, // Convert to percentage
          durationSeconds: Number(durationSeconds),
          startTimestamp: Number(startTimestamp),
          price: Number(price),
          priceUsdc: Number(price) / 1_000_000, // Convert to USDC
          resaleAllowed,
          creatorRoyaltyBps,
          creatorRoyalty: creatorRoyaltyBps / 100,
          status,
        };
      } catch (parseError) {
        console.error("Failed to parse listing:", parseError);
        return null;
      }
    }).filter(Boolean);
    
    // Cache the results
    cache.set(CACHE_KEYS.ALL_LISTINGS, royaltyListingAccounts, CACHE_TTL.LISTINGS);
    console.log(`Cached ${royaltyListingAccounts.length} listings for ${CACHE_TTL.LISTINGS / 1000}s`);
    
    return royaltyListingAccounts;
  } catch (error) {
    console.error("Failed to fetch listings:", error);
    return [];
  }
}

/**
 * Fetch all resale listings
 */
export async function fetchAllResaleListings(forceRefresh: boolean = false): Promise<any[]> {
  // Check cache first
  if (!forceRefresh) {
    const cached = cache.get<any[]>(CACHE_KEYS.ALL_RESALE_LISTINGS);
    if (cached) {
      console.log("Using cached resale listings");
      return cached;
    }
  }
  
  const connection = getConnection();
  
  try {
    console.log("Fetching resale listings from RPC...");
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          // ResaleListing::LEN = 121 bytes
          dataSize: 121,
        },
      ],
    });

    const listings = accounts.map((account) => {
      const data = account.account.data;
      let offset = 8; // Skip discriminator
      
      const seller = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      
      const royaltyListing = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      
      const nftMint = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      
      const price = data.readBigUInt64LE(offset);
      offset += 8;
      
      const listedAt = data.readBigInt64LE(offset);
      
      return {
        publicKey: account.pubkey.toBase58(),
        seller: seller.toBase58(),
        royaltyListing: royaltyListing.toBase58(),
        nftMint: nftMint.toBase58(),
        price: Number(price),
        priceUsdc: Number(price) / 1_000_000,
        listedAt: Number(listedAt),
      };
    });
    
    // Cache the results
    cache.set(CACHE_KEYS.ALL_RESALE_LISTINGS, listings, CACHE_TTL.LISTINGS);
    console.log(`Cached ${listings.length} resale listings for ${CACHE_TTL.LISTINGS / 1000}s`);
    
    return listings;
  } catch (error) {
    console.error("Failed to fetch resale listings:", error);
    return [];
  }
}

/**
 * Fetch a single listing by its public key
 */
export async function fetchListing(listingPubkey: string): Promise<any | null> {
  const listings = await fetchAllListings();
  return listings.find(l => l.publicKey === listingPubkey) || null;
}

/**
 * Fetch a single resale listing by its public key
 */
export async function fetchResaleListing(resaleListingPubkey: string): Promise<any | null> {
  try {
    const connection = getConnection();
    const pubkey = new PublicKey(resaleListingPubkey);
    
    const account = await connection.getAccountInfo(pubkey);
    if (!account) return null;
    
    const data = account.data;
    
    // Check if it's a ResaleListing by data size (121 bytes)
    if (data.length !== 121) return null;
    
    let offset = 8; // Skip discriminator
    
    const seller = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    const royaltyListing = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    const nftMint = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    const price = data.readBigUInt64LE(offset);
    offset += 8;
    
    const listedAt = data.readBigInt64LE(offset);
    
    // Fetch the original listing to get full details
    const originalListing = await fetchListing(royaltyListing.toBase58());
    
    return {
      publicKey: resaleListingPubkey,
      seller: seller.toBase58(),
      royaltyListing: royaltyListing.toBase58(),
      nftMint: nftMint.toBase58(),
      price: Number(price),
      priceUsdc: Number(price) / 1_000_000,
      listedAt: Number(listedAt),
      isResale: true,
      // Include original listing details if available
      originalListing,
    };
  } catch (error) {
    console.error("Failed to fetch resale listing:", error);
    return null;
  }
}

/**
 * Fetch any listing (primary or resale) by public key
 * First tries primary, then resale
 */
export async function fetchAnyListing(listingPubkey: string): Promise<{ type: 'primary' | 'resale', data: any } | null> {
  // First try primary listing
  const primaryListing = await fetchListing(listingPubkey);
  if (primaryListing) {
    return { type: 'primary', data: primaryListing };
  }
  
  // Then try resale listing
  const resaleListing = await fetchResaleListing(listingPubkey);
  if (resaleListing) {
    return { type: 'resale', data: resaleListing };
  }
  
  return null;
}

/**
 * Fetch user's owned royalty NFTs by checking their token accounts
 * Returns listings where the user owns the NFT
 */
export async function fetchUserOwnedRoyalties(walletPubkey: PublicKey): Promise<any[]> {
  try {
    const connection = getConnection();
    
    // Get all token accounts for this wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPubkey, {
      programId: TOKEN_PROGRAM_ID,
    });
    
    // Get NFT mints (tokens with amount = 1 and decimals = 0)
    const ownedMints = new Set<string>();
    for (const { account } of tokenAccounts.value) {
      const parsed = account.data.parsed?.info;
      if (parsed && parsed.tokenAmount?.uiAmount === 1 && parsed.tokenAmount?.decimals === 0) {
        ownedMints.add(parsed.mint);
      }
    }
    
    if (ownedMints.size === 0) {
      return [];
    }
    
    // Get all listings and filter to ones where user owns the NFT
    const allListings = await fetchAllListings();
    const ownedRoyalties = allListings.filter(listing => 
      ownedMints.has(listing.nftMint) && listing.status === 'Sold'
    );
    
    return ownedRoyalties;
  } catch (error) {
    console.error("Failed to fetch user owned royalties:", error);
    return [];
  }
}

/**
 * Fetch user's created listings (as creator)
 */
export async function fetchUserCreatedListings(walletPubkey: PublicKey): Promise<any[]> {
  try {
    const allListings = await fetchAllListings();
    return allListings.filter(listing => listing.creator === walletPubkey.toBase58());
  } catch (error) {
    console.error("Failed to fetch user created listings:", error);
    return [];
  }
}

/**
 * Helper to get Payout Pool PDA
 */
export function getPayoutPoolPDAForListing(
  royaltyListingPubkey: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("payout_pool"), royaltyListingPubkey.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Helper to get Payout Claim PDA
 */
export function getPayoutClaimPDA(
  payoutPoolPubkey: PublicKey,
  holderPubkey: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("payout_claim"),
      payoutPoolPubkey.toBuffer(),
      holderPubkey.toBuffer(),
    ],
    PROGRAM_ID
  );
}

/**
 * Fetch payout pool info for a listing
 */
export async function fetchPayoutPool(royaltyListingPubkey: string): Promise<any | null> {
  try {
    const connection = getConnection();
    const listingPubkey = new PublicKey(royaltyListingPubkey);
    const [payoutPoolPda] = getPayoutPoolPDAForListing(listingPubkey);
    
    const account = await connection.getAccountInfo(payoutPoolPda);
    if (!account) return null;
    
    const data = account.data;
    let offset = 8; // Skip discriminator
    
    const royaltyListing = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    const creator = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    const totalDeposited = data.readBigUInt64LE(offset);
    offset += 8;
    
    const totalClaimed = data.readBigUInt64LE(offset);
    offset += 8;
    
    const depositedAt = data.readBigInt64LE(offset);
    offset += 8;
    
    const period = data.readBigUInt64LE(offset);
    
    return {
      publicKey: payoutPoolPda.toBase58(),
      royaltyListing: royaltyListing.toBase58(),
      creator: creator.toBase58(),
      totalDeposited: Number(totalDeposited),
      totalDepositedUsdc: Number(totalDeposited) / 1_000_000,
      totalClaimed: Number(totalClaimed),
      totalClaimedUsdc: Number(totalClaimed) / 1_000_000,
      availableToClaim: Number(totalDeposited - totalClaimed),
      availableToClaimUsdc: Number(totalDeposited - totalClaimed) / 1_000_000,
      depositedAt: Number(depositedAt),
      period: Number(period),
    };
  } catch (error) {
    console.error("Failed to fetch payout pool:", error);
    return null;
  }
}

/**
 * Deposit payout to a listing's pool (creator only)
 */
export async function depositPayout(
  provider: AnchorProvider,
  royaltyListingPubkey: string,
  amountUsdc: number
) {
  const creator = provider.wallet.publicKey;
  const listingPubkey = new PublicKey(royaltyListingPubkey);
  const [payoutPoolPda] = getPayoutPoolPDAForListing(listingPubkey);
  
  // Generate a new keypair for the pool vault
  const poolVault = Keypair.generate();
  
  // Amount in smallest unit (6 decimals)
  const amountSmallest = BigInt(Math.floor(amountUsdc * 1_000_000));
  
  // Get creator's USDC token account
  const creatorUsdc = getAssociatedTokenAddressSync(USDC_MINT, creator);
  
  console.log("Depositing payout...");
  console.log("Amount:", amountUsdc, "USDC");
  console.log("Listing:", royaltyListingPubkey);
  console.log("Payout Pool PDA:", payoutPoolPda.toBase58());
  
  // Discriminator for "depositPayout" = sha256("global:deposit_payout").slice(0, 8)
  const discriminator = Buffer.from([72, 20, 41, 177, 158, 74, 219, 104]);
  
  // Serialize amount (u64)
  const amountBytes = Buffer.alloc(8);
  amountBytes.writeBigUInt64LE(amountSmallest, 0);
  
  const data = Buffer.concat([discriminator, amountBytes]);
  
  const instruction = new web3.TransactionInstruction({
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: listingPubkey, isSigner: false, isWritable: false },
      { pubkey: payoutPoolPda, isSigner: false, isWritable: true },
      { pubkey: creatorUsdc, isSigner: false, isWritable: true },
      { pubkey: poolVault.publicKey, isSigner: true, isWritable: true },
      { pubkey: USDC_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: web3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
  
  const connection = provider.connection;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  
  const tx = new web3.Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: creator,
  });
  tx.add(instruction);
  
  // Sign with pool vault keypair
  tx.sign(poolVault);
  
  const signedTx = await provider.wallet.signTransaction(tx);
  const txId = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  
  await connection.confirmTransaction({
    signature: txId,
    blockhash,
    lastValidBlockHeight,
  }, "confirmed");
  
  console.log("Deposit successful! TX:", txId);
  
  // Invalidate caches
  invalidateListingCaches();
  
  return txId;
}

/**
 * Claim payout from a listing's pool (NFT holder only)
 */
export async function claimPayout(
  provider: AnchorProvider,
  royaltyListingPubkey: string,
  nftMint: string
) {
  const holder = provider.wallet.publicKey;
  const listingPubkey = new PublicKey(royaltyListingPubkey);
  const nftMintPubkey = new PublicKey(nftMint);
  
  const [payoutPoolPda] = getPayoutPoolPDAForListing(listingPubkey);
  const [payoutClaimPda] = getPayoutClaimPDA(payoutPoolPda, holder);
  
  // Get holder's token accounts
  const holderNft = getAssociatedTokenAddressSync(nftMintPubkey, holder);
  const holderUsdc = getAssociatedTokenAddressSync(USDC_MINT, holder);
  
  // Fetch payout pool to get the vault
  const payoutPool = await fetchPayoutPool(royaltyListingPubkey);
  if (!payoutPool) {
    throw new Error("Payout pool not found");
  }
  
  console.log("Claiming payout...");
  console.log("Holder:", holder.toBase58());
  console.log("Listing:", royaltyListingPubkey);
  console.log("Available:", payoutPool.availableToClaimUsdc, "USDC");
  
  // Discriminator for "claimPayout" = sha256("global:claim_payout").slice(0, 8)
  const discriminator = Buffer.from([127, 240, 132, 62, 227, 198, 146, 133]);
  
  const instruction = new web3.TransactionInstruction({
    keys: [
      { pubkey: holder, isSigner: true, isWritable: true },
      { pubkey: listingPubkey, isSigner: false, isWritable: false },
      { pubkey: payoutPoolPda, isSigner: false, isWritable: true },
      { pubkey: payoutClaimPda, isSigner: false, isWritable: true },
      { pubkey: holderNft, isSigner: false, isWritable: false },
      { pubkey: new PublicKey(payoutPool.publicKey), isSigner: false, isWritable: true }, // pool vault - using pool PDA as placeholder
      { pubkey: holderUsdc, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: discriminator,
  });
  
  const connection = provider.connection;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  
  const tx = new web3.Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: holder,
  });
  tx.add(instruction);
  
  const signedTx = await provider.wallet.signTransaction(tx);
  const txId = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  
  await connection.confirmTransaction({
    signature: txId,
    blockhash,
    lastValidBlockHeight,
  }, "confirmed");
  
  console.log("Claim successful! TX:", txId);
  
  // Invalidate caches
  invalidateListingCaches();
  
  return txId;
}

/**
 * List an owned royalty NFT for resale
 */
export async function listForResale(
  provider: AnchorProvider,
  royaltyListingPubkey: string,
  nftMint: string,
  priceUsdc: number
) {
  const seller = provider.wallet.publicKey;
  const listingPubkey = new PublicKey(royaltyListingPubkey);
  const nftMintPubkey = new PublicKey(nftMint);
  
  const [resaleListingPda] = getResaleListingPDA(PROGRAM_ID, listingPubkey, seller);
  
  // Seller's NFT token account
  const sellerNft = getAssociatedTokenAddressSync(nftMintPubkey, seller);
  
  // Generate escrow account for holding the NFT
  const escrowNft = Keypair.generate();
  
  // Price in smallest unit (6 decimals)
  const priceSmallest = BigInt(Math.floor(priceUsdc * 1_000_000));
  
  console.log("Listing for resale...");
  console.log("Seller:", seller.toBase58());
  console.log("Royalty Listing:", royaltyListingPubkey);
  console.log("NFT Mint:", nftMint);
  console.log("Price:", priceUsdc, "USDC");
  console.log("Resale Listing PDA:", resaleListingPda.toBase58());
  
  // Discriminator for "listForResale" = sha256("global:list_for_resale").slice(0, 8)
  const discriminator = Buffer.from([235, 101, 201, 204, 83, 163, 213, 243]);
  
  // Serialize price (u64)
  const priceBytes = Buffer.alloc(8);
  priceBytes.writeBigUInt64LE(priceSmallest, 0);
  
  const data = Buffer.concat([discriminator, priceBytes]);
  
  const instruction = new web3.TransactionInstruction({
    keys: [
      { pubkey: seller, isSigner: true, isWritable: true },
      { pubkey: listingPubkey, isSigner: false, isWritable: false },
      { pubkey: resaleListingPda, isSigner: false, isWritable: true },
      { pubkey: sellerNft, isSigner: false, isWritable: true },
      { pubkey: escrowNft.publicKey, isSigner: true, isWritable: true },
      { pubkey: nftMintPubkey, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: web3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
  
  const connection = provider.connection;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  
  const tx = new web3.Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: seller,
  });
  tx.add(instruction);
  
  // Sign with escrow keypair
  tx.sign(escrowNft);
  
  const signedTx = await provider.wallet.signTransaction(tx);
  const txId = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  
  await connection.confirmTransaction({
    signature: txId,
    blockhash,
    lastValidBlockHeight,
  }, "confirmed");
  
  console.log("Listed for resale! TX:", txId);
  
  // Invalidate caches
  invalidateListingCaches();
  
  return { txId, resaleListingPda: resaleListingPda.toBase58() };
}

/**
 * Buy a resale listing (secondary market)
 */
export async function buyResaleListing(
  provider: AnchorProvider,
  resaleData: {
    publicKey: string;      // Resale listing pubkey
    seller: string;
    nftMint: string;
    royaltyListingPubkey: string;  // Original royalty listing
    creator: string;        // Original creator (for royalty)
  }
) {
  const buyer = provider.wallet.publicKey;
  const resaleListingPubkey = new PublicKey(resaleData.publicKey);
  const seller = new PublicKey(resaleData.seller);
  const creator = new PublicKey(resaleData.creator);
  const nftMint = new PublicKey(resaleData.nftMint);
  const royaltyListingPubkey = new PublicKey(resaleData.royaltyListingPubkey);
  
  const [platformConfig] = getPlatformConfigPDA(PROGRAM_ID);
  
  // Fetch treasury from platform config
  const connection = provider.connection;
  const platformConfigAccount = await connection.getAccountInfo(platformConfig);
  if (!platformConfigAccount) {
    throw new Error("Platform not initialized");
  }
  
  // Parse treasury from platform config (offset: 8 discriminator + 32 authority = 40)
  const treasury = new PublicKey(platformConfigAccount.data.slice(40, 72));
  
  // Fetch resale listing to get escrow account info
  const resaleListingAccount = await connection.getAccountInfo(resaleListingPubkey);
  if (!resaleListingAccount) {
    throw new Error("Resale listing not found");
  }
  
  // The escrow NFT account needs to be derived or stored in the resale listing
  // For now, we'll need to look up the escrow account
  // In the resale listing, we need to find where the NFT is held
  
  console.log("buyResaleListing - building instruction...");
  console.log("Buyer:", buyer.toString());
  console.log("Seller:", seller.toString());
  console.log("Creator:", creator.toString());
  console.log("NFT Mint:", nftMint.toString());
  console.log("Resale Listing:", resaleListingPubkey.toString());
  console.log("Royalty Listing:", royaltyListingPubkey.toString());
  
  // Derive token accounts
  const buyerUsdc = getAssociatedTokenAddressSync(USDC_MINT, buyer);
  const sellerUsdc = getAssociatedTokenAddressSync(USDC_MINT, seller);
  const creatorUsdc = getAssociatedTokenAddressSync(USDC_MINT, creator);
  const treasuryUsdc = getAssociatedTokenAddressSync(USDC_MINT, treasury);
  const buyerNft = getAssociatedTokenAddressSync(nftMint, buyer);
  
  // The escrow NFT is owned by the resale listing PDA
  // We need to find this token account
  const escrowNft = getAssociatedTokenAddressSync(nftMint, resaleListingPubkey, true);
  
  console.log("Escrow NFT:", escrowNft.toString());
  console.log("Buyer NFT ATA:", buyerNft.toString());
  
  // Build transaction
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  
  const tx = new web3.Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: buyer,
  });
  
  // Create ATAs if needed
  const sellerUsdcAccount = await connection.getAccountInfo(sellerUsdc);
  if (!sellerUsdcAccount) {
    tx.add(
      createAssociatedTokenAccountInstruction(buyer, sellerUsdc, seller, USDC_MINT)
    );
  }
  
  const creatorUsdcAccount = await connection.getAccountInfo(creatorUsdc);
  if (!creatorUsdcAccount) {
    tx.add(
      createAssociatedTokenAccountInstruction(buyer, creatorUsdc, creator, USDC_MINT)
    );
  }
  
  const treasuryUsdcAccount = await connection.getAccountInfo(treasuryUsdc);
  if (!treasuryUsdcAccount) {
    tx.add(
      createAssociatedTokenAccountInstruction(buyer, treasuryUsdc, treasury, USDC_MINT)
    );
  }
  
  const buyerNftAccount = await connection.getAccountInfo(buyerNft);
  if (!buyerNftAccount) {
    tx.add(
      createAssociatedTokenAccountInstruction(buyer, buyerNft, buyer, nftMint)
    );
  }
  
  // Discriminator for "buyResale" = sha256("global:buy_resale").slice(0, 8)
  const discriminator = Buffer.from([241, 32, 167, 60, 46, 70, 159, 105]);
  
  const instruction = new web3.TransactionInstruction({
    keys: [
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: seller, isSigner: false, isWritable: true },
      { pubkey: creator, isSigner: false, isWritable: true },
      { pubkey: platformConfig, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: royaltyListingPubkey, isSigner: false, isWritable: false },
      { pubkey: resaleListingPubkey, isSigner: false, isWritable: true },
      { pubkey: escrowNft, isSigner: false, isWritable: true },
      { pubkey: buyerNft, isSigner: false, isWritable: true },
      { pubkey: nftMint, isSigner: false, isWritable: false },
      { pubkey: buyerUsdc, isSigner: false, isWritable: true },
      { pubkey: sellerUsdc, isSigner: false, isWritable: true },
      { pubkey: creatorUsdc, isSigner: false, isWritable: true },
      { pubkey: treasuryUsdc, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: discriminator,
  });
  
  tx.add(instruction);
  
  // Sign and send
  const signedTx = await provider.wallet.signTransaction(tx);
  const txId = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  
  console.log("Buy resale transaction sent:", txId);
  
  await connection.confirmTransaction({
    signature: txId,
    blockhash,
    lastValidBlockHeight,
  }, "confirmed");
  
  console.log("Buy resale confirmed!");
  
  invalidateListingCaches();
  
  return txId;
}

/**
 * Cancel a resale listing and get NFT back
 */
export async function cancelResale(
  provider: AnchorProvider,
  royaltyListingPubkey: string,
  nftMint: string
) {
  const seller = provider.wallet.publicKey;
  const listingPubkey = new PublicKey(royaltyListingPubkey);
  const nftMintPubkey = new PublicKey(nftMint);
  
  const [resaleListingPda] = getResaleListingPDA(PROGRAM_ID, listingPubkey, seller);
  const sellerNft = getAssociatedTokenAddressSync(nftMintPubkey, seller);
  
  // Find the escrow account (token account owned by the resale listing PDA)
  const connection = provider.connection;
  const tokenAccounts = await connection.getTokenAccountsByOwner(resaleListingPda, {
    mint: nftMintPubkey,
  });
  
  if (tokenAccounts.value.length === 0) {
    throw new Error("Escrow account not found");
  }
  
  const escrowNft = tokenAccounts.value[0].pubkey;
  
  console.log("Cancelling resale...");
  console.log("Seller:", seller.toBase58());
  console.log("Resale Listing:", resaleListingPda.toBase58());
  console.log("Escrow NFT:", escrowNft.toBase58());
  
  // Discriminator for "cancelResale" = sha256("global:cancel_resale").slice(0, 8)
  const discriminator = Buffer.from([215, 11, 117, 119, 200, 163, 110, 66]);
  
  const instruction = new web3.TransactionInstruction({
    keys: [
      { pubkey: seller, isSigner: true, isWritable: true },
      { pubkey: listingPubkey, isSigner: false, isWritable: false },
      { pubkey: resaleListingPda, isSigner: false, isWritable: true },
      { pubkey: escrowNft, isSigner: false, isWritable: true },
      { pubkey: sellerNft, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: discriminator,
  });
  
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  
  const tx = new web3.Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: seller,
  });
  tx.add(instruction);
  
  const signedTx = await provider.wallet.signTransaction(tx);
  const txId = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  
  await connection.confirmTransaction({
    signature: txId,
    blockhash,
    lastValidBlockHeight,
  }, "confirmed");
  
  console.log("Resale cancelled! TX:", txId);
  
  // Invalidate caches
  invalidateListingCaches();
  
  return txId;
}

/**
 * Check if user has a resale listing for a royalty
 */
export async function fetchUserResaleListing(
  walletPubkey: PublicKey,
  royaltyListingPubkey: string
): Promise<any | null> {
  try {
    const connection = getConnection();
    const listingPubkey = new PublicKey(royaltyListingPubkey);
    const [resaleListingPda] = getResaleListingPDA(PROGRAM_ID, listingPubkey, walletPubkey);
    
    const account = await connection.getAccountInfo(resaleListingPda);
    if (!account) return null;
    
    const data = account.data;
    let offset = 8; // Skip discriminator
    
    const seller = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    const royaltyListing = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    const nftMint = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    const price = data.readBigUInt64LE(offset);
    offset += 8;
    
    const listedAt = data.readBigInt64LE(offset);
    
    return {
      publicKey: resaleListingPda.toBase58(),
      seller: seller.toBase58(),
      royaltyListing: royaltyListing.toBase58(),
      nftMint: nftMint.toBase58(),
      price: Number(price),
      priceUsdc: Number(price) / 1_000_000,
      listedAt: Number(listedAt),
    };
  } catch (error) {
    console.error("Failed to fetch user resale listing:", error);
    return null;
  }
}

// Export additional constants
export { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, NETWORK, RPC_URL };

// Re-export cache utilities
export { invalidateListingCaches, invalidateUserCaches } from "./cache";

