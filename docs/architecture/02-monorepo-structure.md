# Monorepo Structure Documentation

## Table of Contents

1. [Overview](#overview)
2. [Directory Structure](#directory-structure)
3. [Package Specifications](#package-specifications)
4. [Dependencies Graph](#dependencies-graph)
5. [Build System](#build-system)
6. [Development Workflow](#development-workflow)

---

## Overview

HyperGate uses a **Turborepo-based monorepo** structure to manage multiple packages and applications. This architecture enables code sharing, consistent tooling, and efficient builds.

### Key Benefits

- **Code Reusability**: Shared components, configs, and utilities
- **Atomic Commits**: Changes across multiple packages in single commit
- **Consistent Tooling**: Unified ESLint, TypeScript, and Prettier configs
- **Build Caching**: Turborepo caches build outputs for speed
- **Type Safety**: Shared TypeScript configurations

---

## Directory Structure

```
hypergate/
├── .git/                          # Git repository
├── .gitignore                     # Git ignore patterns
├── .npmrc                         # NPM configuration
├── package.json                   # Root package (workspace manager)
├── package-lock.json              # Lockfile for dependencies
├── turbo.json                     # Turborepo configuration
├── README.md                      # Project documentation
│
├── apps/                          # Application packages
│   └── demo/                      # Demo application
│       ├── src/
│       │   ├── App.tsx           # Main app component
│       │   ├── main.tsx          # React DOM entry point
│       │   ├── wagmi.ts          # Wagmi/RainbowKit config
│       │   ├── App.css           # App styles
│       │   └── index.css         # Global styles
│       ├── public/               # Static assets
│       ├── index.html            # HTML entry point
│       ├── package.json          # Demo dependencies
│       ├── vite.config.ts        # Vite configuration
│       ├── tailwind.config.js    # Tailwind CSS config
│       ├── postcss.config.js     # PostCSS config
│       ├── eslint.config.js      # ESLint config
│       └── tsconfig.json         # TypeScript config
│
└── packages/                      # Shared packages
    ├── widget/                    # Core HyperGate widget
    │   ├── src/
    │   │   ├── HyperGate.tsx     # Main widget component
    │   │   ├── App.tsx           # Widget demo
    │   │   ├── main.tsx          # Entry point
    │   │   ├── index.ts          # Public exports
    │   │   ├── index.css         # Widget styles
    │   │   ├── config/
    │   │   │   └── constants.ts  # Configuration constants
    │   │   ├── stores/
    │   │   │   └── useBridgeState.ts  # Zustand store
    │   │   └── hooks/
    │   │       └── useL1Deposit.ts    # L1 deposit hook
    │   ├── package.json          # Widget dependencies
    │   ├── vite.config.ts        # Vite configuration
    │   ├── tailwind.config.js    # Tailwind CSS config
    │   └── tsconfig.json         # TypeScript config
    │
    ├── ui/                        # Shared UI components
    │   ├── src/
    │   │   ├── button.tsx        # Button component
    │   │   ├── card.tsx          # Card component
    │   │   └── code.tsx          # Code component
    │   ├── package.json          # UI dependencies
    │   └── tsconfig.json         # TypeScript config
    │
    ├── eslint-config/             # Shared ESLint configs
    │   ├── base.js               # Base config
    │   ├── next.js               # Next.js config
    │   ├── react-internal.js     # React internal config
    │   ├── package.json          # Config dependencies
    │   └── README.md             # ESLint docs
    │
    └── typescript-config/         # Shared TS configs
        ├── base.json             # Base TypeScript config
        ├── nextjs.json           # Next.js config
        ├── react-library.json    # React library config
        ├── package.json          # No dependencies
        └── README.md             # TypeScript config docs
```

---

## Package Specifications

### Root Package

**File**: `package.json`

```json
{
  "name": "hypergate",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,md}\"",
    "check-types": "turbo run check-types"
  },
  "devDependencies": {
    "prettier": "^3.7.4",
    "turbo": "^2.7.4",
    "typescript": "5.9.2"
  },
  "engines": {
    "node": ">=18"
  },
  "packageManager": "npm@11.6.2"
}
```

**Purpose**: Workspace manager and root-level tooling

**Key Features**:
- NPM workspaces for package linking
- Turborepo for task orchestration
- Shared Prettier configuration
- Node.js version enforcement (>= 18)

---

### 1. apps/demo

**Package Name**: `demo` (not published)

**Purpose**: Standalone demo application showcasing HyperGate widget integration

**Entry Point**: `src/main.tsx`

**Key Dependencies**:
```json
{
  "@hypergate/widget": "workspace:*",
  "@rainbow-me/rainbowkit": "^2.2.10",
  "@tanstack/react-query": "^5.90.18",
  "wagmi": "^2.19.5",
  "react": "^19.2.0",
  "react-dom": "^19.2.0"
}
```

**Scripts**:
- `npm run dev` - Start Vite dev server
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

**Outputs**: `dist/` (Vite build output)

---

### 2. packages/widget

**Package Name**: `@hypergate/widget`

**Purpose**: Core HyperGate widget library (reusable across apps)

**Entry Point**: `src/index.ts`

**Public Exports**:
```typescript
export { HyperGate } from './HyperGate';
export * from './stores/useBridgeState';
```

**Key Dependencies**:
```json
{
  "@lifi/widget": "^3.40.2",
  "@lifi/sdk": "^3.15.3",
  "wagmi": "^2.19.5",
  "viem": "^2.44.4",
  "zustand": "^5.0.10",
  "@rainbow-me/rainbowkit": "^2.2.10",
  "@mysten/dapp-kit": "^0.20.0",
  "@solana/wallet-adapter-react": "^0.15.39",
  "react": "^19.2.0"
}
```

**Dev Dependencies**:
- Vite + React plugin
- TypeScript + ESLint
- Tailwind CSS + PostCSS

**Module Type**: `"module"` (ESM)

**Scripts**:
- `npm run dev` - Development mode
- `npm run build` - `tsc -b && vite build`
- `npm run lint` - ESLint check

**Source Files**: 9 TypeScript files (~15 KB total)

---

### 3. packages/ui

**Package Name**: `@repo/ui`

**Purpose**: Shared UI component library

**Entry Points**: Individual component exports
```json
{
  "exports": {
    "./*": "./src/*.tsx"
  }
}
```

**Usage Example**:
```typescript
import { Button } from '@repo/ui/button';
import { Card } from '@repo/ui/card';
import { Code } from '@repo/ui/code';
```

**Components**:

1. **Button** (`button.tsx`)
   - Props: `children`, `className`, `appName`
   - Features: Click handler with alert

2. **Card** (`card.tsx`)
   - Props: `className`, `title`, `children`, `href`
   - Features: Anchor link with UTM tracking

3. **Code** (`code.tsx`)
   - Props: `children`, `className`
   - Features: Simple code wrapper

**Dependencies**:
```json
{
  "react": "^19.2.0"
}
```

**Note**: Uses `"use client"` directive for React Server Components compatibility

---

### 4. packages/eslint-config

**Package Name**: `@repo/eslint-config`

**Purpose**: Shared ESLint configurations for consistency

**Exports**:
```json
{
  "exports": {
    "./base": "./base.js",
    "./next-js": "./next.js",
    "./react-internal": "./react-internal.js"
  }
}
```

**Base Config** (`base.js`):
```javascript
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'turbo'],
  rules: {
    'turbo/no-undeclared-env-vars': 'warn'
  }
};
```

**Usage in Widget**:
```javascript
import baseConfig from '@repo/eslint-config/base';

export default [
  ...baseConfig,
  // Additional rules
];
```

**Dependencies**:
- `eslint`
- `typescript-eslint`
- `eslint-plugin-react`
- `eslint-plugin-react-hooks`
- `eslint-plugin-turbo`
- `eslint-config-prettier`

---

### 5. packages/typescript-config

**Package Name**: `@repo/typescript-config`

**Purpose**: Shared TypeScript compiler configurations

**Exports**:
```json
{
  "exports": {
    "./base.json": "./base.json",
    "./nextjs.json": "./nextjs.json",
    "./react-library.json": "./react-library.json"
  }
}
```

**Base Config** (`base.json`):
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "resolveJsonModule": true,
    "noUncheckedIndexedAccess": true
  }
}
```

**Usage in Widget**:
```json
{
  "extends": "@repo/typescript-config/react-library.json",
  "compilerOptions": {
    "outDir": "./dist"
  }
}
```

**No Dependencies**: Pure configuration package

---

## Dependencies Graph

### Package Dependencies

```
apps/demo
  ├─> @hypergate/widget (workspace)
  ├─> @rainbow-me/rainbowkit
  ├─> wagmi
  └─> react + react-dom

@hypergate/widget
  ├─> @repo/ui (workspace)
  ├─> @lifi/widget
  ├─> wagmi
  ├─> zustand
  └─> react + react-dom

@repo/ui
  └─> react

@repo/eslint-config
  └─> eslint + plugins

@repo/typescript-config
  └─> (no dependencies)
```

### Shared Dependencies

**Managed at Root Level**:
- `turbo` (build orchestration)
- `prettier` (code formatting)
- `typescript` (type checking)

**Managed at Package Level**:
- React 19.2.0 (widget + demo + ui)
- Wagmi 2.19.5 (widget + demo)
- Viem 2.44.4 (widget + demo)
- Tailwind CSS 3.4.17 (widget + demo)

---

## Build System

### Turborepo Configuration

**File**: `turbo.json`

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "check-types": {
      "dependsOn": ["^check-types"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### Task Execution

**Build Task**:
```bash
turbo run build
```
- Builds all packages in dependency order
- Caches outputs for incremental builds
- Parallelizes independent package builds

**Dependency Order**:
1. `@repo/ui` (no dependencies)
2. `@hypergate/widget` (depends on ui)
3. `apps/demo` (depends on widget)

**Dev Task**:
```bash
turbo run dev
```
- Runs all dev servers concurrently
- No caching (always fresh)
- Persistent (long-running processes)

**Lint Task**:
```bash
turbo run lint
```
- Lints all packages
- Uses shared ESLint config
- Fails on errors

---

## Development Workflow

### Initial Setup

```bash
# Clone repository
git clone <repo-url>
cd hypergate

# Install all dependencies (root + workspaces)
npm install

# Verify installation
npm run check-types
```

### Daily Development

```bash
# Start all dev servers
npm run dev
# Opens:
# - Widget dev server: http://localhost:5173
# - Demo app: http://localhost:5174

# Make changes to widget
# Changes automatically reflect in demo app
```

### Adding New Packages

```bash
# Create new package
mkdir -p packages/new-package/src
cd packages/new-package

# Initialize package.json
npm init -y

# Add to workspace (automatic via workspaces pattern)
# No manual linking needed
```

### Installing Dependencies

**For Specific Package**:
```bash
# Add dependency to widget
npm install <package-name> --workspace=@hypergate/widget

# Add dev dependency to demo
npm install -D <package-name> --workspace=demo
```

**For All Packages**:
```bash
# Add to root (affects all)
npm install <package-name>
```

### Building

```bash
# Build all packages
npm run build

# Build specific package
turbo run build --filter=@hypergate/widget

# Clean and rebuild
rm -rf node_modules .turbo dist
npm install
npm run build
```

### Linting and Formatting

```bash
# Lint all packages
npm run lint

# Format all code
npm run format

# Type check all packages
npm run check-types
```

---

## Workspace Benefits

### 1. Code Sharing

**Before (Multiple Repos)**:
```
repo-widget/        # Separate repository
repo-demo/          # Duplicate code
repo-ui/            # Version mismatch issues
```

**After (Monorepo)**:
```
hypergate/
  ├── packages/widget/   # Single source of truth
  ├── packages/ui/       # Shared instantly
  └── apps/demo/         # Always in sync
```

### 2. Atomic Commits

```bash
# Single commit for breaking change
git commit -m "feat: update widget API and demo usage"
# Changes both packages atomically
```

### 3. Consistent Tooling

All packages use:
- Same ESLint rules
- Same TypeScript config
- Same Prettier formatting
- Same build tools (Vite)

### 4. Build Caching

**First Build**:
```
Building @repo/ui...           ✓ 2.1s
Building @hypergate/widget...  ✓ 8.3s
Building demo...               ✓ 5.7s
Total: 16.1s
```

**Second Build (no changes)**:
```
Building @repo/ui...           CACHE ⚡ 0.1s
Building @hypergate/widget...  CACHE ⚡ 0.1s
Building demo...               CACHE ⚡ 0.1s
Total: 0.3s (97% faster)
```

---

## Package Versioning

### Current Approach

- **Workspace Packages**: Use `workspace:*` for internal dependencies
- **External Packages**: Pinned versions with `^` for minor updates

### Example

**demo/package.json**:
```json
{
  "dependencies": {
    "@hypergate/widget": "workspace:*",  // Internal
    "wagmi": "^2.19.5"                   // External (allows 2.19.6)
  }
}
```

### Publishing Strategy

**Widget Package** (publishable):
```json
{
  "name": "@hypergate/widget",
  "version": "1.0.0",
  "private": false,
  "publishConfig": {
    "access": "public"
  }
}
```

**Demo Package** (not publishable):
```json
{
  "name": "demo",
  "private": true
}
```

---

## File Organization Best Practices

### Naming Conventions

**Files**:
- Components: `PascalCase.tsx` (e.g., `HyperGate.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useL1Deposit.ts`)
- Utilities: `camelCase.ts` (e.g., `constants.ts`)
- Configs: `kebab-case.js` (e.g., `vite.config.ts`)

**Directories**:
- `src/` - Source code
- `dist/` - Build output (gitignored)
- `public/` - Static assets
- `node_modules/` - Dependencies (gitignored)

### Import Patterns

**Absolute Imports** (preferred):
```typescript
import { HyperGate } from '@hypergate/widget';
import { Button } from '@repo/ui/button';
```

**Relative Imports** (within package):
```typescript
import { useBridgeState } from './stores/useBridgeState';
import { CHAINS } from '../config/constants';
```

---

## Testing Strategy

### Current State

**No Tests Yet**: Framework is ready, tests TBD

### Recommended Setup

**Widget Package**:
```bash
npm install -D vitest @testing-library/react --workspace=@hypergate/widget
```

**Test Structure**:
```
packages/widget/
  ├── src/
  │   ├── HyperGate.tsx
  │   └── HyperGate.test.tsx
  └── vitest.config.ts
```

**Run Tests**:
```bash
turbo run test
```

---

## Documentation Updates

When adding new packages:

1. Update this document with package details
2. Add package to dependencies graph
3. Document public APIs in API reference
4. Update main README.md

---

## Conclusion

The HyperGate monorepo structure provides:

✅ **Developer Efficiency**: Fast builds with Turborepo caching
✅ **Code Quality**: Shared configs ensure consistency
✅ **Maintainability**: Single source of truth for shared code
✅ **Scalability**: Easy to add new apps and packages

**Next**: See [Data Flow](./03-data-flow.md) for transaction flow documentation.
