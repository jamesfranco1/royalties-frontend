# Accural

A decentralized marketplace for trading creator royalty contracts on Solana.

## Overview

This application enables creators to tokenize future revenue streams and sell fractional ownership to investors. Royalty contracts are represented as NFTs on Solana, with all transactions, ownership transfers, and payout distributions handled by on-chain smart contracts.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  Next.js 15 + React 19 + TypeScript + Tailwind CSS          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Anchor Program                           │
│  programs/royalties/src/                                     │
│  - RoyaltyListing: Primary market listings                   │
│  - ResaleListing: Secondary market listings                  │
│  - PayoutPool: Revenue distribution to holders               │
│  - PlatformConfig: Fee configuration and admin controls      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Solana Network                            │
│  Program ID: 5qw1oP8MLMdtPWrtjdpt2nHWZykTHVEZH1NpYaX8aj9b   │
└─────────────────────────────────────────────────────────────┘
```

## Smart Contract Integration

The frontend interacts with the Anchor program through `lib/solana.ts`, which provides:

### Program Instructions

| Instruction | Description |
|-------------|-------------|
| `create_listing` | Creator mints NFT representing royalty ownership and lists for sale |
| `buy_listing` | Buyer purchases from primary market (USDC or SOL) |
| `list_for_resale` | Token holder lists on secondary market |
| `buy_resale` | Buyer purchases from secondary market with creator royalties |
| `deposit_payout` | Creator deposits revenue for distribution |
| `claim_payout` | Token holder claims their share of deposited revenue |
| `cancel_listing` | Creator cancels unsold listing |
| `cancel_resale` | Seller cancels secondary listing |

### On-Chain State

- **RoyaltyListing**: Stores listing metadata URI, percentage basis points, duration, price, and status
- **ResaleListing**: References original listing, tracks seller and asking price
- **PayoutPool**: Tracks deposited amounts and claimed distributions per period
- **PlatformConfig**: Platform fee rates, treasury address, pause state

### Wallet Integration

Uses `@solana/wallet-adapter-react` for wallet connections. Supports Phantom, Solflare, and other Solana wallets.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Runtime**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Blockchain**: Solana via @coral-xyz/anchor
- **Token Standard**: SPL Token (NFTs for ownership, USDC for payments)
- **Caching**: Upstash Redis
- **Storage**: Vercel Blob

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (listings, metadata, uploads)
│   ├── marketplace/       # Primary and secondary market views
│   ├── sell/              # Listing creation flow
│   ├── dashboard/         # User portfolio and payouts
│   ├── creator/[handle]/  # Creator profile pages
│   └── companies/         # Company listings (coming soon)
├── components/            # React components
├── lib/
│   ├── solana.ts         # Anchor program client and hooks
│   ├── api.ts            # API client functions
│   ├── cache.ts          # Redis caching utilities
│   ├── contractPDF.ts    # Legal contract PDF generation
│   └── idl/              # Anchor IDL (auto-generated)
└── programs/
    └── royalties/        # Anchor smart contract source
        └── src/
            ├── lib.rs
            ├── state.rs
            ├── errors.rs
            └── instructions/
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/listings` | GET | Fetch all primary listings (cached) |
| `/api/resale-listings` | GET | Fetch all secondary listings (cached) |
| `/api/metadata` | GET | Fetch listing metadata from URI |
| `/api/upload` | POST | Upload listing image to Vercel Blob |

