import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@hypergate/widget': path.resolve(__dirname, '../../packages/widget/src'),
    },
  },
  optimizeDeps: {
    include: ['@lifi/widget', '@lifi/sdk'],
  },
  build: {
    // Web3 apps have inherently large dependencies (wallet SDKs, chain configs)
    // These are industry standard sizes for apps with RainbowKit + LI.FI
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React + UI framework
          'react-vendor': ['react', 'react-dom'],
          // Web3 wallet connectors
          'wallet-core': ['wagmi', 'viem', '@tanstack/react-query'],
          // RainbowKit (wallet UI)
          'rainbowkit': ['@rainbow-me/rainbowkit'],
          // LI.FI SDK (bridge logic)
          'lifi-sdk': ['@lifi/sdk'],
          // LI.FI Widget (bridge UI) - largest chunk
          'lifi-widget': ['@lifi/widget'],
        },
      },
    },
  },
})
