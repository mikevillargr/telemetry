# Telemetry

A multi-tenant, multi-agent Business Intelligence and Agency Data Analytics Tool powered by AI.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Release](https://img.shields.io/github/v/release/mikevillargr/telemetry)](https://github.com/mikevillargr/telemetry/releases)

## 🚀 Overview

Telemetry is a comprehensive BI platform that combines traditional analytics with AI-powered insights. It enables agencies and businesses to:

- **Aggregate data** from multiple sources (Google Analytics, Search Console, Meta, Semrush)
- **Generate AI-driven analysis** using the Sulu multi-agent system
- **Discover trends and correlations** across industry intelligence
- **Automate reporting** with customizable deliverables
- **Collaborate** with team members in a multi-tenant environment

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, TailwindCSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL 16 with pgvector extension
- **Cache**: Redis 7
- **ORM**: Prisma
- **AI**: Local embeddings with @xenova/transformers (all-MiniLM-L6-v2)
- **Monorepo**: Turborepo with npm workspaces

### Project Structure

```
telemetry/
├── apps/
│   ├── web/           # Next.js frontend application
│   └── api/           # Express backend API
└── packages/
    └── shared/        # Shared types and utilities
```

## ✨ Features

### Dashboard
- **KPI Cards**: Real-time metrics with sparklines
- **Traffic Charts**: Session and conversion trends
- **Channel Breakdown**: Performance by source/medium
- **Strategy Agent Analysis**: AI-generated insights with:
  - Narrative with highlighted keywords
  - Key observations (opportunity, risk, emerging)
  - Recommended actions with priority badges
- **Potential Correlations**: Industry trend cards with impact analysis

### Data Connectors
- **Google Analytics 4**: Traffic and conversion data
- **Google Search Console**: Search visibility metrics
- **Meta Ads**: Paid media performance
- **Semrush**: Competitive intelligence
- **File Upload**: CSV/TXT data ingestion

### RAG Layer
- **Local Embeddings**: No external API keys required
- **Semantic Search**: Find relevant documents instantly
- **Auto-Embedding**: Automatically embeds after data pulls
- **Document Ingestion**: Upload and index custom documents

### AI Agents (Sulu)
- **Data Agent**: Query and analyze performance data
- **Strategy Agent**: Generate strategic insights
- **Trends Agent**: Analyze industry trends
- **Viz Agent**: Create data visualizations

### Automation
- **Daily Cron Jobs**: Automated analysis generation at 7am UTC
- **RSS Ingestion**: Trend feeds every 4 hours
- **Digest Generation**: Customizable digest schedules

## 🛠️ Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 16 with pgvector extension
- Redis 7
- Docker (optional, for containerized deployment)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/mikevillargr/telemetry.git
cd telemetry
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Edit the environment files with your configuration:
```env
# apps/api/.env
DATABASE_URL=postgresql://user:password@localhost:5432/telemetry
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key
```

4. **Initialize the database**
```bash
cd apps/api
npx prisma db push
npx prisma generate
```

5. **Start the development servers**
```bash
npm run dev
```

The application will be available at:
- **Web**: http://localhost:3000
- **API**: http://localhost:3001

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📊 Usage

### Creating a Client

1. Navigate to **Clients** page
2. Click **Add Client**
3. Fill in client details (name, domains, industry)
4. Set goals and nuance for AI context

### Connecting Data Sources

1. Go to **Client → Sources**
2. Click **Add Connector**
3. Select connector type (GA4, GSC, Meta, Semrush)
4. Enter credentials
5. Click **Pull Latest Data**

### Generating Analysis

1. Navigate to **Dashboard**
2. Select a client from the dropdown
3. Click **Pull Latest Data** to fetch metrics
4. Strategy Agent analysis auto-generates
5. Click **Refine Analysis** to regenerate

### Using Sulu AI

1. Click the **Sparkles** icon in the top bar
2. Select an agent type (Data, Strategy, Trends, Viz)
3. Ask a question or describe what you need
4. Review AI-generated insights and visualizations

### Analyzing Trends

1. Go to **Trends** page
2. Browse industry intelligence feed
3. Click **Analyze Impact** on any trend
4. Strategy Agent provides correlation analysis
5. Click **Correlate** to add to RAG knowledge base

## 🔄 Release Workflow

### Automated Releases

We use GitHub Actions for automated releases with Semver versioning.

**To create a release:**

1. Go to **Actions → Release → Run workflow**
2. Select **version type**:
   - `patch` - Bug fixes (0.0.X)
   - `minor` - New features (0.X.0)
   - `major` - Breaking changes (X.0.0)
3. Check **prerelease** for beta/rc releases
4. Click **Run workflow**

The workflow will:
- ✅ Auto-increment version number
- 📝 Generate release notes from commits
- 🏷️ Create Git tag
- 📦 Create GitHub Release

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

Types: feat, fix, docs, style, refactor, perf, test, chore, ci
```

**Examples:**
```bash
git commit -m "feat(dashboard): add strategy agent persistence"
git commit -m "fix(api): resolve infinite loading loop"
git commit -m "docs(readme): update setup instructions"
```

See [COMMIT_WORKFLOW.md](./COMMIT_WORKFLOW.md) for detailed guidelines.

## 📚 API Documentation

### Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh JWT token

#### Dashboard
- `GET /api/dashboard/:clientId` - Get dashboard metrics
- `GET /api/dashboard/:clientId/analysis` - Get persisted analysis
- `POST /api/dashboard/:clientId/analyze` - Generate new analysis

#### Connectors
- `POST /api/connectors/:clientId/:type` - Pull data from connector
- `GET /api/connectors/:clientId` - List connector credentials

#### RAG
- `POST /api/rag/:clientId/search` - Semantic search
- `POST /api/rag/:clientId/ingest` - Ingest raw text
- `POST /api/rag/:clientId/upload` - Upload CSV/TXT file
- `GET /api/rag/:clientId/stats` - Document counts

#### Trends
- `GET /api/trends` - List trend items
- `POST /api/trends/analyze` - Analyze trend impact

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests for specific package
npm test --workspace=apps/api
npm test --workspace=apps/web

# Run tests with coverage
npm test -- --coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [TailwindCSS](https://tailwindcss.com/) - CSS framework
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [@xenova/transformers](https://github.com/xenova/transformers) - Local embeddings

## 📞 Support

For questions, issues, or feature requests:
- Open an issue on [GitHub](https://github.com/mikevillargr/telemetry/issues)
- Email: support@telemetry.ai

---

**Built with ❤️ for agencies and businesses that need smarter analytics.**
