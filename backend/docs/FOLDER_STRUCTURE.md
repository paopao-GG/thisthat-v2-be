# Backend Folder Structure

This document describes the clean, organized folder structure of the THISTHAT backend.

## 📁 Directory Structure

```
backend/
├── 📚 docs/                    # All documentation files
│   ├── README.md               # Documentation index
│   ├── API_ENDPOINTS.md        # API documentation
│   ├── QUICK_START.md          # Getting started guide
│   ├── TESTING_QUICK_START.md  # Testing guide
│   └── ...                     # All other .md files
│
├── 🔧 scripts/                 # Utility scripts
│   ├── README.md               # Scripts documentation
│   ├── test-api.ps1            # API testing script
│   ├── view-database.ps1       # Database viewer
│   ├── view-events-only.ps1    # Events viewer
│   └── test-mongodb-connection.js
│
├── 📖 memory-bank/            # Project memory bank
│   ├── backend_roadmap.md      # Development roadmap
│   ├── progress.md             # Project progress
│   ├── activeContext.md        # Current context
│   └── ...                     # Other context files
│
├── 💻 src/                     # Source code
│   ├── app/                    # Application entry point
│   ├── features/               # Feature modules
│   │   ├── auth/               # Authentication
│   │   ├── fetching/           # Market & event data
│   │   └── database/           # Database operations
│   ├── lib/                    # Shared libraries
│   └── __tests__/              # Integration tests
│
├── 🗄️ prisma/                  # Database schema
│   └── schema.prisma
│
├── 📦 dist/                    # Compiled output (gitignored)
├── 📊 coverage/                # Test coverage reports (gitignored)
├── 📝 README.md                # Main project README
├── 📋 package.json             # Dependencies & scripts
├── ⚙️ tsconfig.json            # TypeScript config
└── ⚙️ vitest.config.ts          # Test config
```

## 📂 Folder Purposes

### `docs/` - Documentation
All markdown documentation files are organized here:
- **Getting Started:** Quick start guides, setup instructions
- **API Documentation:** Endpoint references, examples
- **Testing:** Testing guides, coverage reports
- **Phase Documentation:** Implementation summaries
- **Setup Guides:** Configuration, troubleshooting

**See [docs/README.md](./README.md) for complete documentation index.**

### `scripts/` - Utility Scripts
PowerShell and Node.js scripts for development tasks:
- **Testing Scripts:** API endpoint testing
- **Database Scripts:** MongoDB viewing, connection testing
- **Development Tools:** Various utility scripts

**See [scripts/README.md](../scripts/README.md) for script documentation.**

### `memory-bank/` - Project Memory
Project context and planning documents:
- **Roadmap:** Development phases and milestones
- **Progress:** Completed tasks and current status
- **Context:** Technical and product context

### `src/` - Source Code
All application source code:
- **app/:** Fastify server setup
- **features/:** Feature modules (auth, fetching, database)
- **lib/:** Shared utilities (MongoDB, Polymarket client)
- **__tests__/:** Integration tests

### `prisma/` - Database Schema
Prisma schema and migrations:
- **schema.prisma:** Database schema definition

## 🎯 Benefits of This Structure

✅ **Clean Root Directory** - Only essential files in root  
✅ **Organized Documentation** - All docs in one place  
✅ **Easy Script Discovery** - All scripts in dedicated folder  
✅ **Clear Separation** - Code, docs, scripts, and config separated  
✅ **Easy Navigation** - Logical grouping makes finding files simple  

## 📝 File Naming Conventions

- **Documentation:** `UPPERCASE_WITH_UNDERSCORES.md`
- **Scripts:** `kebab-case.ps1` or `kebab-case.js`
- **Source Code:** `kebab-case.ts`
- **Tests:** `*.test.ts` or `*.spec.ts`

## 🔍 Finding Files

- **Documentation?** → Check `docs/`
- **Scripts?** → Check `scripts/`
- **Project Context?** → Check `memory-bank/`
- **Source Code?** → Check `src/`
- **Database Schema?** → Check `prisma/`

---

**Last Updated:** 2025-01-XX

