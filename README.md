# Research Ambit Explorer

Frontend web application for [**Research Ambit**](https://github.com/IITD-Tech-Ambit) — IIT Delhi's research discovery portal. Browse faculty, search publications, explore research themes, view the knowledge graph, and chat with an AI research assistant.

## Features

| Area | What it does |
|------|----------------|
| **Explore** | Hybrid search over IIT Delhi publications with filters, author scoping, taxonomy theme chips, and related-faculty discovery |
| **Taxonomy browse** | Navigate research themes and drill into topic hierarchies |
| **Directory** | Searchable faculty directory grouped by department, school, centre, and research lab |
| **Faculty profiles** | Per-faculty pages with publications, metrics, and external profile links |
| **Knowledge graph** | Interactive 3D research atlas (Research Atlas) linking papers, topics, and IITD faculty |
| **Magazines** | Browse and read Research Ambit magazine issues |
| **Research chatbot** | Global RAG chatbot widget (SSE streaming) for natural-language research queries |
| **Suggestions** | In-app feedback and suggestion submission |

## Tech stack

- **React 18** + **TypeScript** + **Vite 7**
- **React Router**, **TanStack Query**, **Axios**
- **shadcn/ui**, **Tailwind CSS**, **Radix UI**
- **Three.js** / **Cytoscape** for knowledge-graph visualizations
- **Recharts** for analytics-style views

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ (matches CI)
- npm
- Running backend services for full functionality (see [Related repositories](#related-repositories))

## Local development

```bash
git clone https://github.com/IITD-Tech-Ambit/tech-ambit-explorer.git
cd tech-ambit-explorer
npm install
cp .env.example .env   # adjust URLs if your services use non-default ports
npm run dev
```

The dev server starts on **http://localhost:8080** (see `vite.config.ts`).

### Environment variables

| Variable | Default (local) | Backend |
|----------|-----------------|---------|
| `VITE_API_URL` | `http://localhost:3002/api` | [research-ambit-main](https://github.com/IITD-Tech-Ambit/research-ambit-main) — CMS, directory, knowledge graph, magazines |
| `VITE_SEARCH_API_URL` | `http://localhost:3000/api/v1` | [SEO-Backend-iitd](https://github.com/IITD-Tech-Ambit/SEO-Backend-iitd) — hybrid OpenSearch + embeddings |
| `VITE_CHAT_API_URL` | `http://localhost:3003/api/v1` | [chatbot-agent](https://github.com/IITD-Tech-Ambit/chatbot-agent) — agentic RAG chatbot |

For Docker/nginx production (paths proxied under one host), use relative URLs:

```env
VITE_API_URL=/api
VITE_SEARCH_API_URL=/search/api/v1
VITE_CHAT_API_URL=/chat-api/api/v1
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build (`dist/`) |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

## Build and deploy

**Static build**

```bash
npm run build
```

Output is written to `dist/` and can be served by any static file host or container.

**Full-stack production**

This frontend is one service in the Tech Ambit stack. Production orchestration (nginx reverse proxy, Docker Compose, TLS) lives in the search/deploy tooling alongside sibling repos on the deployment VM. Typical layout:

- `/` → this frontend (port 80)
- `/api/` → research-ambit-main
- `/search/` → SEO-Backend-iitd (search API)
- `/chat-api/` → chatbot-agent

CI runs `npm ci` and `npm run build` on pushes and pull requests to `main` and `prod`.

## Project structure

```
src/
├── pages/           # Route-level views (Explore, Directory, KnowledgeGraph, …)
├── components/      # UI, chat widget, knowledge-graph atlas, directory cards
├── lib/api/         # API client, services, hooks, types
└── hooks/           # Shared React hooks
```

## Related repositories

| Repository | Role |
|------------|------|
| [research-ambit-main](https://github.com/IITD-Tech-Ambit/research-ambit-main) | Express backend — faculty directory, CMS, magazines, knowledge-graph API |
| [SEO-Backend-iitd](https://github.com/IITD-Tech-Ambit/SEO-Backend-iitd) | Hybrid search API (BM25 + semantic embeddings) |
| [chatbot-agent](https://github.com/IITD-Tech-Ambit/chatbot-agent) | LangGraph/FastAPI research chatbot with SSE streaming |
| [classification-pipeline](https://github.com/IITD-Tech-Ambit/classification-pipeline) | Publication classification and taxonomy tooling |
| [Faculty-Data-Parser](https://github.com/IITD-Tech-Ambit/Faculty-Data-Parser) | Faculty data ingestion |
| [Scopus_Parser](https://github.com/IITD-Tech-Ambit/Scopus_Parser) | Scopus bibliographic parsing |

## Contact

Research Ambit Team, IIT Delhi — [iitdambit@iitd.ac.in](mailto:iitdambit@iitd.ac.in)

## License

See repository license terms. Content and branding are property of IIT Delhi.
