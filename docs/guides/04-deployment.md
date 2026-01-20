# Deployment Guide

Complete guide for deploying HyperGate to production.

---

## ⚠️ CRITICAL PRE-DEPLOYMENT CHECKLIST

**DO NOT DEPLOY** until all items are checked:

### Security Requirements

- [ ] **Replace placeholder contract addresses** in `constants.ts`
- [ ] **Remove test private key** from `wagmi.ts`
- [ ] **Add balance verification** before L1 deposits
- [ ] **Implement decimal precision** handling
- [ ] **Fix safety guard** to actually block < $5 deposits
- [ ] **Add input validation** for all external data
- [ ] **Complete security audit** by external firm
- [ ] **Set up error monitoring** (Sentry)

### Configuration Requirements

- [ ] **Environment variables** configured for production
- [ ] **RPC endpoints** verified and tested
- [ ] **Chain IDs** confirmed for HyperEVM
- [ ] **Contract addresses** verified on-chain
- [ ] **Gas settings** optimized
- [ ] **Rate limiting** implemented

### Testing Requirements

- [ ] **Unit tests** pass (>80% coverage)
- [ ] **Integration tests** pass
- [ ] **E2E tests** on testnet completed
- [ ] **Load testing** completed
- [ ] **Security testing** completed
- [ ] **Manual QA** completed

---

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Build Process](#build-process)
3. [Deployment Platforms](#deployment-platforms)
4. [Environment Variables](#environment-variables)
5. [Monitoring & Logging](#monitoring--logging)
6. [Rollback Procedures](#rollback-procedures)
7. [Production Checklist](#production-checklist)

---

## Environment Setup

### Prerequisites

**Required Software**:
- Node.js >= 18.0.0
- npm >= 11.6.2
- Git

**Development Tools** (optional):
- Vercel CLI (for Vercel deployment)
- Docker (for containerized deployment)

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/hypergate.git
cd hypergate

# Install dependencies
npm install

# Verify installation
npm run check-types
npm run lint
```

---

## Build Process

### Development Build

```bash
# Start all dev servers
npm run dev

# Widget dev server: http://localhost:5173
# Demo app: http://localhost:5174
```

### Production Build

```bash
# Build all packages
npm run build

# Output locations:
# - packages/widget/dist/
# - apps/demo/dist/
```

### Build Configuration

**Vite Configuration** (`vite.config.ts`):

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist',
        sourcemap: true,           // Enable for production debugging
        minify: 'esbuild',         // Fast minification
        target: 'es2020',          // Browser compatibility
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor': ['react', 'react-dom'],
                    'lifi': ['@lifi/widget', '@lifi/sdk'],
                    'wagmi': ['wagmi', 'viem'],
                }
            }
        }
    },
    server: {
        port: 5173,
        strictPort: false,
    }
});
```

### Build Optimization

**Code Splitting**:
```typescript
// Lazy load large components
const HyperGate = lazy(() => import('@hypergate/widget'));
```

**Bundle Analysis**:
```bash
# Install analyzer
npm install -D rollup-plugin-visualizer

# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

plugins: [
    react(),
    visualizer({ open: true })
]

# Build and analyze
npm run build
```

---

## Deployment Platforms

### Option 1: Vercel (Recommended)

**Why Vercel**:
- Native support for Vite and React
- Automatic deployments from Git
- Edge network for fast global access
- Zero configuration for monorepos
- Built-in analytics and monitoring

**Setup**:

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Configure Project**:

Create `vercel.json` in the demo app:
```json
{
    "buildCommand": "cd ../.. && npm run build --filter=demo",
    "outputDirectory": "dist",
    "framework": "vite",
    "env": {
        "NODE_ENV": "production"
    }
}
```

3. **Deploy**:
```bash
# First deployment
vercel

# Production deployment
vercel --prod
```

4. **Automatic Deployments**:
- Connect GitHub repository in Vercel dashboard
- Push to `main` → Production
- Push to `dev` → Preview

**Environment Variables** (Vercel Dashboard):
```
VITE_CHAIN_ID=998
VITE_RPC_URL=https://rpc.hyperliquid.xyz/evm
VITE_USDC_ADDRESS=0x...
VITE_BRIDGE_ADDRESS=0x...
```

---

### Option 2: Netlify

**Setup**:

1. **Create `netlify.toml`**:
```toml
[build]
  command = "npm run build"
  publish = "apps/demo/dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

2. **Deploy**:
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

---

### Option 3: AWS S3 + CloudFront

**Setup**:

1. **Build Application**:
```bash
npm run build
```

2. **Upload to S3**:
```bash
aws s3 sync apps/demo/dist/ s3://your-bucket-name/ --delete
```

3. **Configure CloudFront**:
```json
{
    "Origins": [{
        "DomainName": "your-bucket.s3.amazonaws.com",
        "Id": "S3-hypergate"
    }],
    "DefaultCacheBehavior": {
        "ViewerProtocolPolicy": "redirect-to-https",
        "Compress": true
    }
}
```

4. **Invalidate Cache**:
```bash
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

---

### Option 4: Docker Container

**Dockerfile**:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY apps/ ./apps/
COPY packages/ ./packages/

# Install dependencies
RUN npm ci

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/apps/demo/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf**:
```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Build and Deploy**:
```bash
# Build image
docker build -t hypergate:latest .

# Run locally
docker run -p 8080:80 hypergate:latest

# Push to registry
docker tag hypergate:latest your-registry/hypergate:latest
docker push your-registry/hypergate:latest
```

---

## Environment Variables

### Required Variables

Create `.env.production`:

```bash
# Chain Configuration
VITE_CHAIN_ID=998
VITE_CHAIN_NAME=HyperEVM
VITE_RPC_URL=https://rpc.hyperliquid.xyz/evm
VITE_EXPLORER_URL=https://hyperevm.org/explorer

# Contract Addresses (MUST BE REAL)
VITE_USDC_ADDRESS=0x... # Replace with actual USDC address
VITE_BRIDGE_ADDRESS=0x... # Replace with actual bridge address

# LI.FI Configuration
VITE_LIFI_INTEGRATOR=HyperGate

# Feature Flags
VITE_ENABLE_GAS_REFUEL=true
VITE_MIN_DEPOSIT_USD=5.1
VITE_MAX_DEPOSIT_USD=100000

# Monitoring
VITE_SENTRY_DSN=https://...@sentry.io/...
VITE_MIXPANEL_TOKEN=your_token_here

# RainbowKit
VITE_WALLET_CONNECT_PROJECT_ID=your_project_id
```

### Variable Validation

**Add to `constants.ts`**:

```typescript
// Validate environment variables at build time
const REQUIRED_ENV_VARS = [
    'VITE_CHAIN_ID',
    'VITE_RPC_URL',
    'VITE_USDC_ADDRESS',
    'VITE_BRIDGE_ADDRESS',
] as const;

for (const varName of REQUIRED_ENV_VARS) {
    if (!import.meta.env[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`);
    }
}

// Validate addresses
if (import.meta.env.VITE_USDC_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('CRITICAL: USDC address is placeholder');
}

if (import.meta.env.VITE_BRIDGE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('CRITICAL: Bridge address is placeholder');
}

export const CHAINS = {
    HYPEREVM: {
        id: parseInt(import.meta.env.VITE_CHAIN_ID),
        name: import.meta.env.VITE_CHAIN_NAME,
        rpcUrl: import.meta.env.VITE_RPC_URL,
    }
};

export const CONTRACTS = {
    USDC_HYPEREVM: import.meta.env.VITE_USDC_ADDRESS as `0x${string}`,
    ASSET_BRIDGE: import.meta.env.VITE_BRIDGE_ADDRESS as `0x${string}`,
};
```

---

## Monitoring & Logging

### Error Tracking (Sentry)

**Installation**:
```bash
npm install @sentry/react --workspace=demo
```

**Setup** (`apps/demo/src/main.tsx`):
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
});

// Wrap app in ErrorBoundary
<Sentry.ErrorBoundary fallback={<ErrorFallback />}>
    <App />
</Sentry.ErrorBoundary>
```

### Analytics (Mixpanel)

```bash
npm install mixpanel-browser --workspace=demo
```

```typescript
import mixpanel from 'mixpanel-browser';

mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN);

// Track events
mixpanel.track('Bridge Started', {
    sourceChain: 'Ethereum',
    amount: 100,
    asset: 'USDC'
});

mixpanel.track('Bridge Completed', {
    txHash: '0x...',
    duration: 120 // seconds
});
```

### Performance Monitoring

```typescript
// Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics({ name, delta, id }) {
    console.log(name, delta, id);
    // Send to your analytics service
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### Logging Strategy

**Log Levels**:
```typescript
enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3
}

class Logger {
    private level: LogLevel;

    constructor() {
        this.level = import.meta.env.MODE === 'production'
            ? LogLevel.WARN
            : LogLevel.DEBUG;
    }

    error(message: string, data?: any) {
        if (this.level >= LogLevel.ERROR) {
            console.error(message, data);
            Sentry.captureException(new Error(message), { extra: data });
        }
    }

    warn(message: string, data?: any) {
        if (this.level >= LogLevel.WARN) {
            console.warn(message, data);
        }
    }

    info(message: string, data?: any) {
        if (this.level >= LogLevel.INFO) {
            console.log(message, data);
        }
    }

    debug(message: string, data?: any) {
        if (this.level >= LogLevel.DEBUG) {
            console.debug(message, data);
        }
    }
}

export const logger = new Logger();
```

---

## Rollback Procedures

### Vercel Rollback

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback <deployment-url>
```

### Git-Based Rollback

```bash
# Identify last good commit
git log --oneline

# Create rollback branch
git checkout -b rollback/emergency-fix <good-commit-hash>

# Push to trigger deployment
git push origin rollback/emergency-fix
```

### Docker Rollback

```bash
# List images
docker images

# Redeploy previous version
docker tag hypergate:v1.0.0 hypergate:latest
docker push your-registry/hypergate:latest
```

---

## Production Checklist

### Pre-Launch

**Infrastructure**:
- [ ] Domain name purchased and configured
- [ ] SSL certificate installed (HTTPS)
- [ ] CDN configured for global distribution
- [ ] Load balancer configured (if needed)
- [ ] Database backup strategy (if applicable)

**Security**:
- [ ] Security headers configured
  - Content-Security-Policy
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Strict-Transport-Security
- [ ] Rate limiting enabled
- [ ] DDoS protection configured
- [ ] Secrets properly managed (no hardcoded keys)

**Testing**:
- [ ] Smoke tests on production build
- [ ] Cross-browser testing completed
- [ ] Mobile testing completed
- [ ] Accessibility audit passed
- [ ] Performance audit passed (Lighthouse)

**Monitoring**:
- [ ] Error tracking configured (Sentry)
- [ ] Analytics configured (Mixpanel/GA)
- [ ] Uptime monitoring configured
- [ ] Alert rules configured
- [ ] Dashboards created

**Documentation**:
- [ ] Deployment runbook created
- [ ] Incident response plan documented
- [ ] Contact list for on-call engineers

### Post-Launch

**Immediate (Day 1)**:
- [ ] Monitor error rates (should be <1%)
- [ ] Check server logs for issues
- [ ] Verify analytics tracking
- [ ] Test one live transaction
- [ ] Monitor transaction success rate

**Short-term (Week 1)**:
- [ ] Review performance metrics
- [ ] Analyze user feedback
- [ ] Fix critical bugs
- [ ] Optimize slow queries
- [ ] Update documentation with learnings

**Long-term (Month 1)**:
- [ ] Review security audit findings
- [ ] Implement feature flags for new features
- [ ] Set up A/B testing framework
- [ ] Optimize bundle size
- [ ] Plan next release

---

## Security Headers Configuration

### Nginx Example

```nginx
# Security headers
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://widget.lifi.com; connect-src 'self' https://rpc.hyperliquid.xyz https://li.quest; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### Vercel Headers

Create `vercel.json`:
```json
{
    "headers": [
        {
            "source": "/(.*)",
            "headers": [
                {
                    "key": "X-Frame-Options",
                    "value": "DENY"
                },
                {
                    "key": "X-Content-Type-Options",
                    "value": "nosniff"
                },
                {
                    "key": "Strict-Transport-Security",
                    "value": "max-age=31536000; includeSubDomains"
                }
            ]
        }
    ]
}
```

---

## Performance Optimization

### Lighthouse Targets

Aim for these scores:
- Performance: >= 90
- Accessibility: >= 95
- Best Practices: >= 95
- SEO: >= 90

### Optimization Checklist

- [ ] Enable gzip/brotli compression
- [ ] Minify CSS/JS
- [ ] Optimize images (WebP format)
- [ ] Lazy load non-critical resources
- [ ] Implement code splitting
- [ ] Use CDN for static assets
- [ ] Enable browser caching
- [ ] Preload critical resources
- [ ] Remove unused CSS/JS
- [ ] Optimize web fonts

### Example: Preload Critical Resources

```html
<!-- index.html -->
<head>
    <link rel="preconnect" href="https://rpc.hyperliquid.xyz">
    <link rel="preconnect" href="https://li.quest">
    <link rel="preload" href="/assets/main.js" as="script">
    <link rel="preload" href="/assets/main.css" as="style">
</head>
```

---

## Disaster Recovery

### Backup Strategy

**Code**:
- Git repository (primary backup)
- GitHub/GitLab automatic backups

**Configuration**:
- Environment variables backed up securely
- Vercel/Netlify automatic configuration snapshots

**Recovery Time Objective (RTO)**: < 1 hour
**Recovery Point Objective (RPO)**: < 5 minutes

### Incident Response Plan

1. **Detection**: Monitor alerts trigger
2. **Assessment**: Identify severity and impact
3. **Communication**: Notify team and users
4. **Mitigation**: Rollback or hotfix
5. **Recovery**: Restore service
6. **Post-Mortem**: Document lessons learned

---

## Deployment Script

**deploy.sh**:
```bash
#!/bin/bash

set -e  # Exit on error

echo "🚀 Starting deployment process..."

# 1. Run tests
echo "Running tests..."
npm run check-types
npm run lint

# 2. Build
echo "Building application..."
npm run build

# 3. Deploy to Vercel
echo "Deploying to Vercel..."
vercel --prod --yes

echo "✅ Deployment complete!"
echo "🔗 Production URL: https://hypergate.app"
```

Make executable:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## Conclusion

**Before deploying to production**:
1. Complete all security fixes
2. Run full test suite
3. Verify environment variables
4. Enable monitoring
5. Create rollback plan

**Remember**: It's better to delay launch than to deploy with critical security issues.

---

**Next**: Review [Configuration Guide](./05-configuration.md) for detailed setup.
