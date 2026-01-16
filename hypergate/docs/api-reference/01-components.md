# Component API Reference

Complete API documentation for all React components in the HyperGate system.

---

## Table of Contents

1. [HyperGate Component](#hypergate-component)
2. [Shared UI Components](#shared-ui-components)
   - [Button](#button)
   - [Card](#card)
   - [Code](#code)

---

## HyperGate Component

**Package**: `@hypergate/widget`
**File**: [packages/widget/src/HyperGate.tsx](../../packages/widget/src/HyperGate.tsx)

### Description

Main widget component that orchestrates the two-step atomic deposit flow from any chain to Hyperliquid.

### Import

```typescript
import { HyperGate } from '@hypergate/widget';
```

### TypeScript Interface

```typescript
interface HyperGateProps {
    userAddress: string;
}

function HyperGate({ userAddress }: HyperGateProps): JSX.Element;
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `userAddress` | `string` | ✅ Yes | User's wallet address (Ethereum address format) |

### Prop Details

#### `userAddress`

**Type**: `string`
**Format**: `0x${string}` (Ethereum address)
**Example**: `"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"`

**Purpose**:
- Sets the recipient address for bridged funds on HyperEVM
- Used as the `toAddress` in LI.FI widget configuration
- Determines which L1 trading account receives the deposit

**Validation**:
- Must be a valid Ethereum address (42 characters, starts with `0x`)
- Should be the connected wallet address
- Cannot be changed during transaction

**Security Note**:
- User can only deposit to their own address (good security practice)
- Address comes from wallet connection, not user input
- No risk of sending to wrong address

### Usage Example

```typescript
import { HyperGate } from '@hypergate/widget';
import { useAccount } from 'wagmi';

function MyBridgeApp() {
    const { address } = useAccount();

    if (!address) {
        return <div>Please connect your wallet</div>;
    }

    return (
        <div>
            <h1>Bridge to Hyperliquid</h1>
            <HyperGate userAddress={address} />
        </div>
    );
}
```

### State Management

The component uses the global `useBridgeState` store internally:

```typescript
const { state, setState, setError } = useBridgeState();
```

**States**:
- `IDLE` - Initial state, widget ready for input
- `QUOTING` - Fetching route from LI.FI (not currently used)
- `BRIDGING` - Cross-chain transfer in progress
- `DEPOSITING` - L1 deposit transaction in progress
- `SUCCESS` - Funds successfully deposited

**Errors**:
- `BELOW_MINIMUM` - Amount < $5.10
- `NO_GAS` - Insufficient HYPE for gas
- `BRIDGE_FAILED` - Step 1 (bridge) failed
- `DEPOSIT_FAILED` - Step 2 (L1 deposit) failed

### Internal Hooks

| Hook | Purpose |
|------|---------|
| `useWidgetEvents()` | LI.FI widget event listener |
| `useL1Deposit()` | Execute L1 deposit transaction |
| `useBridgeState()` | Global state management |

### Event Handlers

#### `onRouteExecuted`

Triggered when LI.FI completes cross-chain bridge.

```typescript
const onRouteExecuted = async (route: any) => {
    console.log('✅ Step 1 Complete: Funds on HyperEVM', route);
    setState('DEPOSITING');

    try {
        const amount = BigInt(route.toAmount);
        await depositToL1(amount);
        setState('SUCCESS');
    } catch (err) {
        console.error('❌ L1 Deposit Failed:', err);
        setError('DEPOSIT_FAILED');
    }
};
```

#### `onRouteFailed`

Triggered when LI.FI bridge fails.

```typescript
const onRouteFailed = (error: any) => {
    console.error('❌ Bridge failed:', error);
    setState('IDLE');
    setError('BRIDGE_FAILED');
};
```

#### `onRouteExecutionStarted`

Triggered when bridge transaction starts (safety guard).

```typescript
const onRouteExecutionStarted = (route: any) => {
    const amountUSD = parseFloat(route.toAmountUSD || '0');
    if (amountUSD < 5.1) {
        alert('⚠️ SAFETY GUARD ACTIVE: Deposit < $5...');
    }
};
```

### LI.FI Widget Configuration

```typescript
const widgetConfig = {
    integrator: 'HyperGate',
    toChain: CHAINS.HYPEREVM.id,           // Force destination: HyperEVM
    toToken: CONTRACTS.USDC_HYPEREVM,       // Force asset: USDC
    toAddress: userAddress,                 // User's wallet
    hiddenUI: ['toAddress', 'toToken', 'appearance'],
    appearance: 'light',
    enableGas: true,                        // Enable gas refuel
    theme: {
        container: {
            borderRadius: '16px',
            maxWidth: '100%',
            boxShadow: 'none',
        },
        palette: {
            primary: { main: '#A855F7' },   // Hyperliquid purple
        },
    },
};
```

### Rendered UI States

#### IDLE / QUOTING / BRIDGING

Renders the LI.FI widget for chain/amount selection and bridge execution.

```tsx
<div className="relative z-10">
    <LiFiWidget config={widgetConfig} integrator="HyperGate" />
</div>
```

#### DEPOSITING

Shows loading state while L1 deposit is in progress.

```tsx
<div className="flex flex-col items-center">
    <div className="text-4xl">🔄</div>
    <div className="text-2xl font-bold">Depositing to L1...</div>
    <div className="text-sm text-gray-400">
        Bridging complete. Please sign the transaction.
    </div>
    {isDepositingL1 && (
        <div className="text-xs text-hyper-primary animate-pulse">
            Waiting for signature...
        </div>
    )}
</div>
```

#### SUCCESS

Shows completion UI with link to Hyperliquid terminal.

```tsx
<div className="flex flex-col items-center">
    <div className="text-4xl">🎉</div>
    <div className="text-2xl font-bold">Funds Arrived!</div>
    <div className="text-sm text-gray-400">
        Your USDC is now in your Hyperliquid Trading Account.
    </div>
    <button onClick={() => window.open('https://app.hyperliquid.xyz/trade')}>
        Open Terminal
    </button>
</div>
```

### Styling

**Container Classes**:
```css
hypergate-widget-container
flex flex-col items-center justify-center
min-h-[500px] w-full max-w-[400px]
mx-auto
bg-neutral-900/90 backdrop-blur-xl
border border-white/10
ring-1 ring-inset ring-white/5
shadow-[0_8px_32px_rgba(0,0,0,0.4)]
rounded-[24px]
p-4
font-sans
```

**Custom CSS Variables**:
- `--hyper-primary`: `#A855F7` (purple)
- `--hyper-dark`: `#0F0F0F`
- `--hyper-surface`: `#18181B`

### Dependencies

```json
{
    "@lifi/widget": "^3.40.2",
    "wagmi": "^2.19.5",
    "zustand": "^5.0.10",
    "react": "^19.2.0"
}
```

### Performance

**Bundle Size**: ~450 KB (minified, including LI.FI widget)
**Initial Render**: < 100ms
**Re-renders**: Optimized with React 19

### Accessibility

- ✅ Keyboard navigation (via LI.FI widget)
- ✅ Screen reader support for state changes
- ⚠️ Missing: ARIA labels for custom buttons
- ⚠️ Missing: Focus management on state transitions

### Browser Support

- Chrome/Edge: >= 90
- Firefox: >= 88
- Safari: >= 14
- Mobile Safari: >= 14
- Mobile Chrome: >= 90

### Known Limitations

1. **Single Asset**: Only USDC supported
2. **No Transaction History**: No persistence of past deposits
3. **No Retry Button**: If deposit fails, user must refresh
4. **No Amount Validation**: Safety guard doesn't block transactions
5. **No Balance Display**: Doesn't show user's current balance

### Future Enhancements

- [ ] Multi-asset support (ETH, USDT, DAI)
- [ ] Transaction history with local storage
- [ ] Retry mechanism for failed deposits
- [ ] Real-time balance display
- [ ] Estimated time to completion
- [ ] Transaction tracking link

---

## Shared UI Components

### Button

**Package**: `@repo/ui`
**File**: [packages/ui/src/button.tsx](../../packages/ui/src/button.tsx)

#### Import

```typescript
import { Button } from '@repo/ui/button';
```

#### TypeScript Interface

```typescript
interface ButtonProps {
    children: ReactNode;
    className?: string;
    appName: string;
}

function Button({ children, className, appName }: ButtonProps): JSX.Element;
```

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | `ReactNode` | ✅ Yes | - | Button content |
| `className` | `string` | ❌ No | `undefined` | Custom CSS classes |
| `appName` | `string` | ✅ Yes | - | Application name for alert |

#### Usage Example

```typescript
import { Button } from '@repo/ui/button';

function MyApp() {
    return (
        <Button appName="HyperGate" className="bg-blue-500 px-4 py-2">
            Click Me
        </Button>
    );
}
```

#### Behavior

Clicking the button triggers an alert:
```javascript
onClick={() => alert(`Hello from your ${appName} app!`)}
```

#### Note

This is a demo component. Replace with production button in real apps.

---

### Card

**Package**: `@repo/ui`
**File**: [packages/ui/src/card.tsx](../../packages/ui/src/card.tsx)

#### Import

```typescript
import { Card } from '@repo/ui/card';
```

#### TypeScript Interface

```typescript
interface CardProps {
    className?: string;
    title: string;
    children: React.ReactNode;
    href: string;
}

function Card({ className, title, children, href }: CardProps): JSX.Element;
```

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `className` | `string` | ❌ No | `undefined` | Custom CSS classes |
| `title` | `string` | ✅ Yes | - | Card heading |
| `children` | `ReactNode` | ✅ Yes | - | Card content |
| `href` | `string` | ✅ Yes | - | External link URL |

#### Usage Example

```typescript
import { Card } from '@repo/ui/card';

function Documentation() {
    return (
        <Card
            title="Learn More"
            href="https://docs.hypergate.app"
            className="border rounded-lg p-4"
        >
            Read the comprehensive documentation.
        </Card>
    );
}
```

#### Behavior

Renders as an anchor tag (`<a>`) with UTM tracking:
```typescript
href={`${href}?utm_source=create-turbo&utm_medium=basic&utm_campaign=create-turbo"`}
rel="noopener noreferrer"
target="_blank"
```

#### Note

UTM parameters should be customized for production use.

---

### Code

**Package**: `@repo/ui`
**File**: [packages/ui/src/code.tsx](../../packages/ui/src/code.tsx)

#### Import

```typescript
import { Code } from '@repo/ui/code';
```

#### TypeScript Interface

```typescript
interface CodeProps {
    children: React.ReactNode;
    className?: string;
}

function Code({ children, className }: CodeProps): JSX.Element;
```

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | `ReactNode` | ✅ Yes | - | Code content |
| `className` | `string` | ❌ No | `undefined` | Custom CSS classes |

#### Usage Example

```typescript
import { Code } from '@repo/ui/code';

function Example() {
    return (
        <div>
            Run <Code className="text-purple-500">npm install</Code> to get started.
        </div>
    );
}
```

#### Rendered HTML

```html
<code class="text-purple-500">npm install</code>
```

---

## Component Testing

### Example Test for HyperGate

```typescript
import { render, screen } from '@testing-library/react';
import { HyperGate } from '@hypergate/widget';

describe('HyperGate Component', () => {
    it('renders without crashing', () => {
        render(<HyperGate userAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" />);
        expect(screen.getByText(/HyperGate/i)).toBeInTheDocument();
    });

    it('requires userAddress prop', () => {
        // @ts-expect-error - testing missing prop
        expect(() => render(<HyperGate />)).toThrow();
    });
});
```

---

## Migration Guide

### Upgrading from v0.x to v1.x

No breaking changes yet (initial version).

---

**Next**: See [Hooks API Reference](./02-hooks.md)
