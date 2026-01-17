# HyperGate

**One-click bridge + deposit to Hyperliquid trading accounts.**

HyperGate is a React widget that combines LI.FI cross-chain bridging with atomic Hyperliquid L1 deposits. Users bridge from any chain and land directly in their trading account—no manual steps required.

---

## Why HyperGate?

The standard Hyperliquid onboarding flow requires 3 separate transactions:
1. Swap to USDC on origin chain
2. Bridge to HyperEVM
3. Deposit USDC from HyperEVM → Hyperliquid L1

**HyperGate reduces this to 1 click.** Using LI.FI's routing, we automatically:
- Find the best swap+bridge route from any chain/token
- Execute the cross-chain transfer
- Auto-deposit to the user's Hyperliquid trading account

---

## Features

### Core
- **Multi-chain support**: Bridge from Ethereum, Arbitrum, Optimism, Base, and more
- **Any token → USDC**: LI.FI handles optimal swap + bridge routing
- **Atomic deposits**: Bridged funds go directly to your trading account
- **Real-time status**: Clear progress indicators at every step

### Safety
- **Safety Guard**: Warns users when depositing amounts below Hyperliquid's $5.10 minimum (smaller amounts are burned by the protocol)
- **Balance verification**: Confirms funds arrived before initiating L1 deposit
- **Error recovery**: Guided flows to retry failed deposits or get gas tokens

### Developer Experience
- **Embeddable widget**: `<HyperGate userAddress={address} />`
- **Customizable theme**: Primary color, border radius, container size
- **Callback hooks**: `onSuccess`, `onError`, `onStatusChange`
- **TypeScript**: Full type safety

---

## Quick Start

```bash
# Install
npm install @hypergate/widget

# Use
import { HyperGate } from '@hypergate/widget';

function App() {
  const { address } = useAccount();
  return <HyperGate userAddress={address} />;
}
```

---

## Demo

**Live demo**: [hypergate-pi.vercel.app](https://hypergate-pi.vercel.app)

Try it without a wallet using **Demo Mode**—simulates the full bridge flow.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        HyperGate Widget                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   LI.FI      │───▶│   Safety     │───▶│   L1         │  │
│  │   Widget     │    │   Guard      │    │   Deposit    │  │
│  │              │    │              │    │              │  │
│  │  Route &     │    │  Check min   │    │  Transfer    │  │
│  │  Execute     │    │  deposit     │    │  to trading  │  │
│  │  Bridge      │    │  threshold   │    │  account     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                    │          │
│         ▼                   ▼                    ▼          │
│    Any Chain         Hyperliquid Rule     Hyperliquid L1    │
│    → HyperEVM        ($5.10 minimum)      Trading Account   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
hypergate/
├── apps/
│   ├── demo/          # Demo app (Vite + React)
│   └── backend/       # Transaction tracking API
├── packages/
│   └── widget/        # @hypergate/widget (embeddable component)
└── docs/              # Documentation
```

---

## Development

```bash
# Install dependencies
pnpm install

# Run all apps in dev mode
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test
```

---

## LI.FI Integration

HyperGate uses LI.FI in two ways:

1. **LI.FI Widget**: Embedded for chain/token selection and route visualization
2. **LI.FI SDK Events**: Listen for `RouteExecutionCompleted` to trigger L1 deposit

This is not a simple redirect—we intercept the bridge completion to add our atomic deposit step.

---

## Resources

- [LI.FI Docs](https://docs.li.fi/)
- [Hyperliquid HyperEVM Docs](https://hyperliquid.gitbook.io/)
- [Bridge Deposit Flow Details](https://hyperliquid.gitbook.io/hyperliquid-docs/)

---

## Submission

**LI.FI Hackathon 2025**

- GitHub: [this repo]
- Live Demo: https://hypergate-pi.vercel.app
- Video: [3-minute demo]

---

## License

MIT
