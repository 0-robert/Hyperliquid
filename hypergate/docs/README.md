# HyperGate Documentation

Welcome to the comprehensive documentation for HyperGate - a cross-chain bridge widget for atomic deposits to Hyperliquid.

## 📚 Documentation Structure

### [Architecture](./architecture/)
System design, data flow, and technical architecture documentation.

- **[Overview](./architecture/01-overview.md)** - High-level system architecture
- **[Monorepo Structure](./architecture/02-monorepo-structure.md)** - Project organization and packages
- **[Data Flow](./architecture/03-data-flow.md)** - Transaction flow and state management
- **[Integration Points](./architecture/04-integration-points.md)** - External dependencies and services

### [API Reference](./api-reference/)
Detailed API documentation for all components, hooks, and utilities.

- **[Components](./api-reference/01-components.md)** - React component API
- **[Hooks](./api-reference/02-hooks.md)** - Custom React hooks
- **[State Management](./api-reference/03-state-management.md)** - Zustand stores
- **[Constants](./api-reference/04-constants.md)** - Configuration constants

### [Security](./security/)
Security audits, vulnerability assessments, and best practices.

- **[Audit Report](./security/01-audit-report.md)** - Comprehensive security audit
- **[Known Issues](./security/02-known-issues.md)** - Current vulnerabilities and TODOs
- **[Best Practices](./security/03-best-practices.md)** - Security guidelines

### [Guides](./guides/)
Step-by-step guides for developers and integrators.

- **[Getting Started](./guides/01-getting-started.md)** - Quick start guide
- **[Integration Guide](./guides/02-integration-guide.md)** - How to integrate HyperGate
- **[Development](./guides/03-development.md)** - Local development setup
- **[Deployment](./guides/04-deployment.md)** - Production deployment guide
- **[Configuration](./guides/05-configuration.md)** - Environment and config setup

### [Diagrams](./diagrams/)
Visual representations of system architecture and flows.

- **[System Architecture](./diagrams/system-architecture.md)** - Architecture diagrams
- **[Sequence Diagrams](./diagrams/sequence-diagrams.md)** - Transaction flows
- **[State Machine](./diagrams/state-machine.md)** - State transitions

---

## 🚀 Quick Links

- **[Project README](../README.md)** - Main project documentation
- **[Package.json](../package.json)** - Dependencies and scripts
- **[Turborepo Config](../turbo.json)** - Build configuration

---

## 📖 About HyperGate

HyperGate is a React widget that enables seamless cross-chain deposits to Hyperliquid trading accounts. It combines:

1. **LI.FI Bridge** - Multi-chain aggregation for optimal routing
2. **HyperEVM Integration** - Direct deposit to Hyperliquid L1
3. **Wallet Support** - RainbowKit integration for major wallets
4. **Safety Features** - Minimum deposit validation and error handling

### Key Features

- ✅ One-click atomic deposits from any chain to Hyperliquid
- ✅ Automated route optimization via LI.FI
- ✅ Multi-chain support (Ethereum, Arbitrum, Optimism, Base, Solana, Sui)
- ✅ Built-in safety guards (minimum $5.10 deposit)
- ✅ Real-time transaction tracking
- ✅ TypeScript-first with strict type safety
- ✅ Modular monorepo architecture

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | React | 19.2.0 |
| **Language** | TypeScript | 5.9.2 |
| **Build Tool** | Vite | 7.2.4 |
| **Monorepo** | Turborepo | 2.7.4 |
| **State** | Zustand | 5.0.10 |
| **Bridge** | LI.FI Widget | 3.40.2 |
| **Wallet** | Wagmi + RainbowKit | 2.19.5 + 2.2.10 |
| **Styling** | Tailwind CSS | 3.4.17 |

---

## 🔒 Security Status

**Current Status**: 🟡 **PRE-ALPHA / PROTOTYPE**

This codebase is under active development. See [Security Audit](./security/01-audit-report.md) for detailed findings.

**Critical Blockers**:
- ⚠️ Placeholder contract addresses must be replaced
- ⚠️ Test private key must be removed from production
- ⚠️ Balance verification required before L1 deposits

**Security Score**: 2/10 (see full audit for details)

---

## 📝 Contributing

When contributing to this project, please ensure:

1. All TypeScript code passes strict type checking
2. Components follow the established patterns
3. Security considerations are addressed
4. Documentation is updated accordingly

---

## 📄 License

[Add license information]

---

## 🤝 Support

For questions or issues:
- Review this documentation
- Check [Known Issues](./security/02-known-issues.md)
- Open an issue on GitHub

---

**Last Updated**: 2026-01-16
**Documentation Version**: 1.0.0
