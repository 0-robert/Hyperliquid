import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider, useAccount } from 'wagmi';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { config } from './wagmi';
import { HyperGate } from '@hypergate/widget';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { TransactionHistory } from './components/TransactionHistory';
import { ToastContainer, useToast } from './components/Toast';
import './App.css';

const queryClient = new QueryClient();

function BridgePage() {
  const { address } = useAccount();
  const { toasts, addToast, dismissToast } = useToast();

  const handleNotification = (message: string, type: 'success' | 'error' | 'info') => {
    addToast(message, type);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-4 font-sans">
      <header className="w-full max-w-4xl flex justify-between items-center py-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg"></div>
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">HyperGate</span>
        </div>
        <ConnectButton />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-md gap-8 mt-12">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Bridge to Hyperliquid</h1>
          <p className="text-gray-400">One-click atomic deposits to your trading account.</p>
        </div>

        <div className="w-full">
          {address ? (
            <HyperGate userAddress={address} />
          ) : (
            <div className="p-8 border border-white/10 rounded-2xl bg-white/5 text-center">
              <p className="mb-4 text-gray-400">Please connect your wallet to start.</p>
              <ConnectButton />
            </div>
          )}
        </div>

        {address && (
          <div className="w-full mt-4">
            <TransactionHistory
              userAddress={address}
              onNotification={handleNotification}
            />
          </div>
        )}

        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-200 text-sm max-w-sm text-center">
          ⚠️ <b>Demo Mode:</b> Ensure you are bridging {'>'} $5 USDC to avoid protocol burn.
        </div>
      </main>

      <footer className="mt-auto py-8 text-gray-600 text-sm">
        Built for LI.FI Hackathon 2025
      </footer>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <BridgePage />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
