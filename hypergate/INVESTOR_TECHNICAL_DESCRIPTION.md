# HyperGate - Technical Description

## What We Built

HyperGate is a widget that moves money from any blockchain into a Hyperliquid trading account in one transaction.

Without HyperGate, a user who wants to trade on Hyperliquid with funds on Ethereum must:
1. Open a bridge app (like Jumper or Across)
2. Bridge USDC from Ethereum to Arbitrum
3. Wait for the bridge to complete
4. Open another app to bridge from Arbitrum to HyperEVM
5. Wait again
6. Open Hyperliquid and manually deposit from HyperEVM to their trading account

With HyperGate, they click one button and wait.

---

## System Overview

HyperGate is three things:

1. **A React widget** that websites embed
2. **A backend server** that tracks transactions
3. **Smart contract interactions** that move the money

### The Widget

An embeddable React component. A website adds it with:

```jsx
<HyperGate userAddress="0x..." />
```

The widget handles:
- Wallet connection (via RainbowKit)
- Chain selection (Ethereum, Arbitrum, Base, Polygon, etc.)
- Amount input
- Transaction signing
- Progress display
- Error recovery

### The Server

An Express.js API that:
- Records deposit attempts in PostgreSQL
- Tracks transaction status (pending → bridging → depositing → completed)
- Receives webhooks when transactions complete
- Provides user deposit history

### The Flow

```
User's Wallet (any chain)
        ↓
   [LI.FI Bridge]
        ↓
    HyperEVM
        ↓
  [Asset Bridge Contract]
        ↓
  Hyperliquid Trading Account
```

---

## How It Works

### Step 1: Bridge

We embed the LI.FI widget. LI.FI aggregates 20+ bridge protocols and finds the cheapest/fastest route. When the user confirms, their USDC leaves the source chain and arrives on HyperEVM.

### Step 2: Deposit

Once USDC arrives on HyperEVM, we automatically:
1. Read the user's USDC balance
2. Approve the Asset Bridge contract to spend it
3. Call `deposit()` on the bridge contract
4. USDC moves to the user's Hyperliquid perps account

### Safety Guard

Before Step 2, we show the user what they'll receive:

```
You're depositing:     $100.00
Bridge fee:            - $0.42
Gas cost:              - $0.08
You'll receive:        $99.50
```

They confirm before we proceed.

---

## Technical Details

### Stack

| Component | Technology |
|-----------|------------|
| Widget | React 19, TypeScript, Zustand, Tailwind |
| Server | Express.js, Prisma, PostgreSQL |
| Blockchain | Viem, Wagmi |
| Bridge | LI.FI SDK |

### Contract Addresses (HyperEVM)

- USDC: `0xb88339CB7199b77E23DB6E890353E22632Ba630f`
- Asset Bridge: `0x6b9e773128f453f5c2c60935ee2de2cbc5390a24`

### Database Schema

One table tracks deposits:

```
deposits
├── id (UUID)
├── userAddress
├── sourceChain (e.g., "1" for Ethereum)
├── sourceAmount
├── destinationAmount
├── bridgeTxHash
├── depositTxHash
├── status (PENDING | BRIDGING | DEPOSITING | COMPLETED | FAILED)
├── createdAt
└── completedAt
```

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| POST /api/deposits | Create deposit record |
| GET /api/deposits/:id | Get deposit status |
| GET /api/deposits/user/:address | Get user's history |
| POST /api/deposits/bridge-success | Webhook: bridge done |
| POST /api/deposits/l1-success | Webhook: deposit done |

---

## Security

### Webhook Authentication

External services call our webhooks when transactions complete. We verify them with HMAC-SHA256:

```
signature = HMAC-SHA256(secret, timestamp + "." + body)
```

We reject requests where:
- Signature doesn't match
- Timestamp is older than 5 minutes (replay attack)

### Rate Limiting

| Action | Limit |
|--------|-------|
| General requests | 100/min per IP |
| Create deposit | 10/min per IP, 3/min per wallet |
| Verify transaction | 5/min |

### Input Validation

Every API request is validated with Zod schemas. We check:
- Ethereum addresses are 42 characters, start with 0x
- Transaction hashes are 66 characters
- Amounts are positive numbers within bounds

### Amount Verification

After a bridge completes, we read the user's actual USDC balance on-chain. If it's less than expected (slippage, fees, partial fill), we show them:

```
Expected: $100.00
Received: $98.50
Difference: 1.5%

[Proceed Anyway] [Cancel]
```

This prevents users from unknowingly depositing less than they intended.

### Minimum Deposit

Hyperliquid burns deposits under $5. We block deposits below $5.10 with a clear error message.

---

## Error Handling

### Bridge Fails

If LI.FI bridge fails, we show an error with a "Retry" button. User can try again without refreshing.

### Deposit Fails

If USDC arrives on HyperEVM but the deposit to Hyperliquid fails, we detect the balance and offer "Retry Deposit". The user doesn't lose funds.

### Stuck Transactions

Backend marks deposits as FAILED if they've been PENDING or BRIDGING for over 30 minutes. Users can start over.

---

## What's Not Built Yet

1. **Fiat on-ramp** - Buy crypto with card, then bridge
2. **Multi-token support** - Currently USDC only
3. **Analytics dashboard** - Success rates, volume, user metrics
4. **Mobile SDK** - React Native version
5. **Withdrawal flow** - Reverse direction (Hyperliquid → any chain)

---

## Deployment

### Requirements

- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for rate limiting)

### Environment Variables

```
DATABASE_URL=postgresql://...
REDIS_URL=redis://... (optional)
WEBHOOK_SECRET=your-secret
RPC_URL=https://rpc.hyperliquid.xyz/evm
```

### Running

```bash
# Install
npm install

# Database
npx prisma migrate deploy

# Start
npm run dev      # Development
npm run build    # Production build
npm start        # Production server
```

---

## Code Structure

```
hypergate/
├── apps/
│   ├── server/           # Backend API
│   │   ├── src/
│   │   │   ├── routes/   # API endpoints
│   │   │   ├── services/ # Business logic
│   │   │   └── middleware/
│   │   └── prisma/       # Database schema
│   └── demo/             # Demo website
└── packages/
    └── widget/           # The embeddable widget
        ├── src/
        │   ├── HyperGate.tsx      # Main component
        │   ├── stores/            # State management
        │   └── components/        # UI pieces
        └── dist/                  # Built output
```

---

## Metrics We Can Track

- Deposits initiated vs completed (conversion rate)
- Average bridge time by source chain
- Total volume processed
- Error frequency by type
- Most used source chains

---

## Summary

HyperGate removes friction from getting money into Hyperliquid. It's a widget that handles bridging and depositing in one flow, with proper error handling, security validation, and a backend to track everything.

The code is TypeScript throughout, uses standard libraries (React, Express, Prisma), and runs on commodity infrastructure (any VPS with PostgreSQL).
