# Research Ambit — Frontend

React SPA for [Research Ambit](https://iitd-dev.vercel.app) at IIT Delhi. Browse faculty, explore research themes, search publications, view knowledge graphs, and chat with the research assistant.

## Features

| Area | Route | Backend |
|------|-------|---------|
| Faculty directory | `/directory` | [research-ambit-main](https://github.com/IITD-Tech-Ambit/research-ambit-main) |
| Research explore & taxonomy | `/explore` | [opensearch](https://github.com/IITD-Tech-Ambit/SEO-Backend-iitd) |
| Knowledge graph | `/knowledge-graph` | research-ambit-main |
| Faculty profiles | `/faculty/:id` | research-ambit-main |
| Magazines / CMS | `/magazines` | research-ambit-main |
| AI chatbot | floating widget | [chatbot-agent](https://github.com/IITD-Tech-Ambit/chatbot-agent) |

## Stack

- **Vite** + **React 18** + **TypeScript**
- **TanStack Query** for data fetching
- **shadcn/ui** + **Tailwind CSS**
- **Cytoscape** / **Three.js** for graph visualizations
- **React Router** for client-side routing

## Role in the Research Ambit stack

```
tech-ambit-explorer (this repo)     :8080 / nginx
        │
        ├── /api/*          → research-ambit-main      :3002
        ├── /search/*       → opensearch (search API)  :3000
        └── /chat-api/*     → chatbot-agent            :3003
```

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- Running backend services (or point env vars at deployed instances)

## Setup

```bash
git clone https://github.com/IITD-Tech-Ambit/tech-ambit-explorer.git
cd tech-ambit-explorer
npm install
cp .env.example .env
npm run dev
```

Dev server runs at **http://localhost:8080** (Vite default may vary — check terminal output).

### Environment variables

| Variable | Default (local) | Description |
|----------|-----------------|-------------|
| `VITE_API_URL` | `http://localhost:3002/api` | research-ambit-main backend |
| `VITE_SEARCH_API_URL` | `http://localhost:3000/api/v1` | Hybrid search API |
| `VITE_CHAT_API_URL` | `http://localhost:3003/api/v1` | Chatbot agent |

For Docker/nginx production, use relative paths (see `.env.example`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

## Deployment

Build static assets with `npm run build` and serve `dist/` behind nginx. In the full Research Ambit stack, nginx routes `/api`, `/search`, and `/chat-api` to the respective backend containers.

## Related repositories

| Repository | Role |
|------------|------|
| [research-ambit-main](https://github.com/IITD-Tech-Ambit/research-ambit-main) | Express backend API |
| [SEO-Backend-iitd](https://github.com/IITD-Tech-Ambit/SEO-Backend-iitd) | Hybrid search (OpenSearch) |
| [chatbot-agent](https://github.com/IITD-Tech-Ambit/chatbot-agent) | RAG chatbot |
| [classification-pipeline](https://github.com/IITD-Tech-Ambit/classification-pipeline) | Paper classification architecture |
