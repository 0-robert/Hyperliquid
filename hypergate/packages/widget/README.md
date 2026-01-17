# @hypergate/widget

A one-click bridge + deposit widget for Hyperliquid. Enables seamless cross-chain deposits directly to Hyperliquid L1 trading accounts.

## Features

- **One-Click Deposits**: Bridge from any chain and deposit to Hyperliquid L1 in a single flow
- **Safety Guard**: Prevents deposits below $5.10 that would be burned by Hyperliquid
- **LI.FI Integration**: Access 30+ chains and 20+ bridges
- **Progress Tracking**: Real-time status updates with step-by-step progress
- **Error Recovery**: Smart retry logic for failed transactions
- **Fully Customizable**: Theme support and callback handlers

## Quick Start

### 1. Install

```bash
npm install @hypergate/widget
# or
yarn add @hypergate/widget
# or
pnpm add @hypergate/widget
```

### 2. Setup Providers

The widget requires wagmi and RainbowKit (or similar wallet connection library):

```tsx
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from './wagmi'; // Your wagmi config

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {/* Your app */}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### 3. Use the Widget

```tsx
import { HyperGate } from '@hypergate/widget';
import { useAccount } from 'wagmi';

function BridgePage() {
  const { address } = useAccount();

  if (!address) {
    return <div>Please connect your wallet</div>;
  }

  return (
    <HyperGate
      userAddress={address}
      callbacks={{
        onSuccess: (data) => {
          console.log('Deposit successful!', data.txHash);
        },
        onError: (error) => {
          console.error('Error:', error.type, error.message);
        },
        onStatusChange: (status) => {
          console.log('Status:', status);
        },
      }}
    />
  );
}
```

## Props

### `HyperGateProps`

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `userAddress` | `string` | Yes | - | User's connected wallet address |
| `theme` | `HyperGateTheme` | No | - | Customize colors and styling |
| `callbacks` | `HyperGateCallbacks` | No | - | Event handlers for success/error/status |
| `showProgress` | `boolean` | No | `true` | Show step-by-step progress indicator |
| `className` | `string` | No | `''` | Additional CSS classes for container |

### `HyperGateTheme`

```typescript
interface HyperGateTheme {
  primaryColor?: string;      // Default: '#A855F7' (purple)
  borderRadius?: string;      // Default: '24px'
  containerMaxWidth?: string; // Default: '400px'
}
```

### `HyperGateCallbacks`

```typescript
interface HyperGateCallbacks {
  onSuccess?: (data: { txHash: string; amount: string }) => void;
  onError?: (error: { type: string; message: string }) => void;
  onStatusChange?: (status: BridgeState) => void;
}
```

### `BridgeState`

```typescript
type BridgeState =
  | 'IDLE'        // Ready to start
  | 'QUOTING'     // Getting bridge quote
  | 'SAFETY_GUARD'// Reviewing fees
  | 'BRIDGING'    // Bridge in progress
  | 'DEPOSITING'  // L1 deposit in progress
  | 'SUCCESS';    // Complete
```

## Examples

### Custom Theme

```tsx
<HyperGate
  userAddress={address}
  theme={{
    primaryColor: '#00D395',    // Hyperliquid green
    borderRadius: '16px',
    containerMaxWidth: '450px',
  }}
/>
```

### With Callbacks

```tsx
<HyperGate
  userAddress={address}
  callbacks={{
    onSuccess: ({ txHash, amount }) => {
      // Show success toast
      toast.success(`Deposited ${amount} USDC!`);
      // Track analytics
      analytics.track('deposit_success', { txHash });
    },
    onError: ({ type, message }) => {
      // Show error toast
      toast.error(message);
      // Report to error tracking
      Sentry.captureMessage(`Bridge error: ${type}`);
    },
    onStatusChange: (status) => {
      // Update UI based on status
      setCurrentStep(status);
    },
  }}
/>
```

### Without Progress Bar

```tsx
<HyperGate
  userAddress={address}
  showProgress={false}
/>
```

## How It Works

1. **Select Source Chain**: User selects source chain and amount via LI.FI widget
2. **Safety Check**: Widget calculates fees and shows net amount received
3. **Bridge**: LI.FI handles cross-chain bridging to HyperEVM
4. **L1 Deposit**: Widget automatically deposits USDC to Hyperliquid L1
5. **Success**: User can start trading immediately

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    HyperGate Widget                  │
├──────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  LI.FI      │  │   Safety    │  │    L1       │  │
│  │  Widget     │──│   Guard     │──│   Deposit   │  │
│  │  (Bridge)   │  │   (Verify)  │  │   (Trade)   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└──────────────────────────────────────────────────────┘
         │                 │                 │
         ▼                 ▼                 ▼
   Any Chain → → → → HyperEVM → → → → Hyperliquid L1
```

## Minimum Deposit

Hyperliquid burns deposits under $5. The Safety Guard ensures users see the exact net amount and warns if below the minimum.

## License

MIT
