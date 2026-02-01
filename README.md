# SignCrux

**Content Authentication & Provenance System (CAPS)**

An open-source platform for AI-era plagiarism detection and content ownership verification. Combines semantic fingerprinting, cryptographic signatures, visual tokens, and timestamped evidence chains to protect original content from copying, rewriting, and AI-powered plagiarism.

---

## ✨ Features

### 🔍 Four-Stage Detection Pipeline
- **Verbatim**: SHA-256 exact match detection
- **Lexical**: MinHash + LSH for light modifications
- **NearDuplicate**: Winnowing for partial copying
- **Semantic**: BGE-M3 embeddings + HNSW for AI rewrites

### 🔐 Cryptographic Authentication
- Ed25519 digital signatures
- SHA-256 content fingerprinting
- RFC3161 timestamp proofs
- Immutable evidence chains

### 🎨 Visual Token System
- Braille-encoded tokens for brand recognition
- Base32 ASCII fallback for compatibility
- One-click verification via `/verify/:token`
- SVG signature bundles (coming in Phase 3)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18.17.0 or higher
- PostgreSQL 15+ with pgvector extension
- npm 9.0.0 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/rifletoto/SignCrux.git
cd SignCrux

# Install dependencies (when network is available)
npm install

# Generate platform signing keys
npm run generate:keys

# Copy environment variables
cp .env.example .env.local
# Edit .env.local and add the generated keys

# Setup database
npm run db:push

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

---

## 📁 Project Structure

```
signcrux/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── lib/              # Core libraries
│   │   ├── canonicalization.ts   # Text normalization
│   │   ├── fingerprint.ts        # Content ID generation
│   │   ├── signature.ts          # Ed25519 signatures
│   │   └── token.ts              # Token generation & encoding
│   ├── db/               # Database schema
│   └── components/       # React components
├── docs/
│   ├── adr/              # Architecture Decision Records
│   ├── specs/            # Project specifications
│   └── guides/           # Development guides
├── scripts/              # Utility scripts
└── tests/                # Test files
```

---

## 🛠️ Development Roadmap

### Phase 1: Basic Authentication (Current)
- [x] Content canonicalization
- [x] SHA-256 fingerprinting
- [x] Ed25519 signatures
- [x] Token generation (Braille + ASCII)
- [ ] Registration API
- [ ] Verification API
- [ ] Token verification page

**Timeline**: 5-6 weeks

### Phase 2: Detection Pipeline (Next)
- [ ] Verbatim detection (SHA-256)
- [ ] Lexical detection (MinHash + LSH)
- [ ] NearDuplicate detection (Winnowing)
- [ ] Semantic detection (BGE-M3 + HNSW)

**Timeline**: 6-8 days

### Phase 3: SVG Bundle
- [ ] Static signature SVG
- [ ] Dynamic badge SVG
- [ ] Bundle API endpoint
- [ ] HTML snippet generation

**Timeline**: 4-5 days

### Phase 4: Enhanced Authentication
- [ ] RFC3161 TSA integration
- [ ] Merkle tree anchoring
- [ ] User-held signatures
- [ ] Evidence package export

**Timeline**: 4-5 weeks

### Phase 5: Fine-grained Evidence
- [ ] LCS alignment algorithm
- [ ] Structural alignment
- [ ] Weighted fusion
- [ ] Detection report page

**Timeline**: 3-4 weeks

---

## 📖 Documentation

- [Technical Stack Selection](./docs/adr/0001-tech-stack-selection.md)
- [Phase 1 Checklist](./docs/specs/PHASE_1_CHECKLIST.md)
- [API Documentation](./docs/api/) (coming soon)

---

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests with UI
npm run test:ui

# Type checking
npm run type-check
```

---

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details.

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) (coming soon) for details on our code of conduct and the process for submitting pull requests.

---

## 🔗 Links

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/rifletoto/SignCrux/issues)
- **Discussions**: [GitHub Discussions](https://github.com/rifletoto/SignCrux/discussions)

---

## 📊 Current Status

🚧 **Phase 1 in Progress** (Week 1 of 6)

- [x] Project initialization
- [x] Core libraries implemented
- [x] Database schema defined
- [ ] API implementation
- [ ] Frontend pages
- [ ] Testing & documentation

---

*Built with Next.js, TypeScript, PostgreSQL, and ❤️*
