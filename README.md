# Research Ambit — Web client

Public research-discovery UI for IIT Delhi, plus signed-in faculty self-service on a directory profile. React 18, Vite 7, TypeScript, and Tailwind CSS. The app renders research data from the api-gateway and the search services below; it does not store that data.

## Stack

- React Router 6, TanStack Query 5, Axios
- Tailwind CSS and Radix UI
- Three.js for the research atlas (`/iitd-verse`)
- Node.js 20+ (`node:20-alpine` in `Dockerfile`)

## System design

### Request path

`src/lib/api/apiClient.ts` builds one axios client per base URL, each with `withCredentials: true` and a 30s timeout. Auth and chat use `fetch` with `credentials: 'include'`. The session is an httpOnly cookie set by auth-service. This client never reads a token from storage.

`cp .env.example .env` sends those calls to the api-gateway on port 8080:

| Client | Variable | Local base URL | Calls |
|--------|----------|----------------|-------|
| `apiClient` | `VITE_API_URL` | `http://localhost:8080/api` | Directory, profile writes, magazines, suggestions, auth |
| `kgApiClient` | `{VITE_API_URL}/kg` | `http://localhost:8080/api/kg` | Atlas / knowledge-graph reads |
| `searchApiClient` | `VITE_SEARCH_API_URL` | `http://localhost:8080/search/api/v1` | Publication search and research-area taxonomy |
| `ipSearchApiClient` | `VITE_IP_SEARCH_API_URL` | `http://localhost:8080/ip-search-api/api/v1` | Patents and other IP |
| chat (`fetch`) | `VITE_CHAT_API_URL` | `http://localhost:8080/chat-api/api/v1` | Chat stream and quota, when the widget is enabled |

If a variable is absent, `endpoints.ts` and `chatService.ts` fall back to `http://localhost:3002/api` (main API and `/kg`), `http://localhost:3000/api/v1` (search), and same-origin `/ip-search-api/api/v1` and `/chat-api/api/v1`. The local setup is `.env.example`, which overrides those fallbacks.

Vite listens on port **5173**. Relative base URLs hit its dev proxy: `/api`, `/search`, `/chat-api`, and `/health` go to `127.0.0.1:8080`; `/ip-search-api` goes to the IP search service on `127.0.0.1:3001` with the prefix removed. Absolute `http://localhost:8080/...` values from `.env.example` reach the gateway from the browser and skip that proxy. The Vite config comments that `/search` is bridged through the gateway, and that the IP proxy target is the search service directly.

`npm run build` inlines `VITE_*`. The production values commented in `.env.example` are same-origin (`/api`, `/search/api/v1`, `/chat-api/api/v1`, `/ip-search-api/api/v1`). The platform edge routes those prefixes (Coolify/Traefik, per `vite.config.ts`). `nginx.conf` in this repo serves the SPA and `/health`.

The chat client requires the gateway path: a direct chat call is rejected without the verified session identity.

### Application structure

`App.tsx` wraps the tree in the theme provider, one `QueryClient`, `AuthProvider`, and `BrowserRouter`. Queries use a 5-minute `staleTime`, a 10-minute `gcTime`, no refetch on window focus, and refetch on reconnect. Directory, publication search, IP search, taxonomy, and magazines go through hooks in `src/lib/api/hooks`. Atlas reads use a 60-second in-memory cache in `src/components/atlas/api.ts`. Auth, suggestions, profile writes, and chat call the network directly.

### Auth

On startup `AuthProvider` calls `GET {VITE_API_URL}/auth/me`. A failed response leaves the user signed out. `login()` is a full-page navigation to `{VITE_API_URL}/auth/login`. `logout()` is `POST {VITE_API_URL}/auth/logout`, then local state is cleared. An axios 401 does not redirect; `refresh()` reads `/auth/me` again.

The client derives three facts from that session and from the directory:

- **Owner** (`FacultyProfile.tsx`): `user.kerberos`, lowercased, equals the `:kerberos` route param.
- **Superadmin**: `user.role === "superadmin"`. The auth type states that auth-service sets this when the kerberos is in `SUPERADMIN_KERBEROS`. This UI reads `role` from `/auth/me` and does not consult that list.
- **Faculty** (nav “Profile” link): `GET /directory/faculty/{kerberos}/profile` succeeds. A failure means the account is not treated as faculty. That lookup is the faculties collection, separate from the OAuth `category` field.

`canEdit` is owner or superadmin. `VITE_ENABLE_AUTH=false` skips `/auth/me`, uses a fixed dev user, and disables the login redirect. Leave it unset or `true` outside local UI testing, in line with the gateway `ENABLE_AUTH` flag. The flag changes only this client.

### Feature map

| Surface | Where | Data |
|---------|-------|------|
| Home | `/` | Static landing |
| Publication search | `/explore` | `searchApiClient`: suggest, search, author scope, document |
| Research areas | `/research-areas` | Taxonomy on `searchApiClient`; faculty cards resolved via the directory API. Query: theme, domain, department |
| Legacy browse | `/explore/browse` | Redirect to `/research-areas`, query string kept |
| Directory | `/directory` | Faculties grouped as departments, schools, or centres; search |
| Faculty profile | `/faculty/:kerberos` | Directory profile, research summary, patents for that faculty |
| Patents / IP | `/explore/ip` | `ipSearchApiClient`: suggest, search, inventor scope, document |
| Knowledge graph (IITD Verse) | `/iitd-verse` | `kgApiClient`. Default renderer streams octree tiles (`/atlas/tree`, `/atlas/dict`, `/atlas/tile/:key`). `VITE_ATLAS_TILES=false` loads the legacy full `GET /atlas` payload |
| Legacy atlas | `/atlas` | Redirect to `/iitd-verse`, query string kept |
| Magazines | `/magazines`, `/magazines/:id` | Main API content routes |
| Contributors | `/contributors` | Static page |
| Privacy, terms | `/privacy-policy`, `/terms-of-service` | Static pages |
| Suggestions | Fixed button, every page | `POST /suggestions` (optional screenshot). Not a route |
| Chatbot | Floating control | Coming soon unless `VITE_CHATBOT_ENABLED=true` |

With `VITE_CHATBOT_ENABLED=true`, `App.tsx` mounts `ChatbotWidget` instead of `ChatbotComingSoon`. The widget asks for a session before sending, then streams `POST {VITE_CHAT_API_URL}/chat` and reads `GET {VITE_CHAT_API_URL}/quota`.

### Faculty profile editing

Edit controls render only when `canEdit` is true.

**Photo** (`ProfilePhotoDialog.tsx`): choose, crop, then review. Source files are JPEG, PNG, or WebP, at most 8 MB, with a shorter side of at least 200 px. The client crops a square and encodes a JPEG of at most 800 px on a side, then uploads it as multipart field `image` to `POST /directory/faculty/{kerberos}/image`.

**Metric visibility**: h-index, citations, papers, and patents, saved with `PATCH /directory/faculty/{kerberos}/visibility` on the same action as profile extras. The public profile payload is what the page shows; hidden metrics are already redacted there.

**Profile extras**: edit mode loads `GET /directory/faculty/{kerberos}/profile-extras` (full text, including hidden sections) and saves `PATCH` on that path. The body covers background, qualifications, awards, custom research areas, additional emails, phone, office address, and external links, with the visibility flags the API accepts. The form applies the server’s “check only when shown” rules before the request: background at least 100 characters to display it, and a non-empty phone, office address, qualification, award, or link when that section is visible.

### Client checks and server enforcement

File type, the 8 MB source limit, the 800 px JPEG crop, metric toggles, extras length, suggestion text length, and `http`/`https` href checks shape the form. The client checks are not the security boundary.

Image upload, visibility, and profile-extras are documented in this client as session-gated at the gateway, with owner checks on the directory API. The public profile read redacts hidden metrics and hidden sections. A superadmin session makes this UI offer the same write calls on any profile; the API accepts or rejects that write. `VITE_ENABLE_AUTH=false` does not turn off gateway auth.

## Setup

```bash
git clone https://github.com/IITD-Tech-Ambit/tech-ambit-explorer.git
cd tech-ambit-explorer
npm install
cp .env.example .env
npm run dev
```

Dev server: http://localhost:5173. With `.env.example`, API calls go to the gateway at http://localhost:8080.

### Environment variables

| Variable | Local value in `.env.example` | Role |
|----------|-------------------------------|------|
| `VITE_API_URL` | `http://localhost:8080/api` | Main API, auth, and the `/kg` prefix |
| `VITE_SEARCH_API_URL` | `http://localhost:8080/search/api/v1` | Publication search and taxonomy |
| `VITE_IP_SEARCH_API_URL` | `http://localhost:8080/ip-search-api/api/v1` | IP / patents search |
| `VITE_CHAT_API_URL` | `http://localhost:8080/chat-api/api/v1` | Chat API |
| `VITE_ENABLE_AUTH` | unset (OAuth on) | `false` only for a local UI with a fixed dev user |
| `VITE_CHATBOT_ENABLED` | unset (Coming soon) | `true` mounts the chat widget |
| `VITE_ATLAS_TILES` | unset (tiled atlas) | `false` selects the legacy full-atlas renderer |
| `VITE_DEV_ALLOWED_HOSTS` | unset | Extra Vite `allowedHosts`, comma-separated |

Same-origin production values from `.env.example`:

```
VITE_API_URL=/api
VITE_SEARCH_API_URL=/search/api/v1
VITE_CHAT_API_URL=/chat-api/api/v1
VITE_IP_SEARCH_API_URL=/ip-search-api/api/v1
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite on port 5173 |
| `npm run build` | Production build to `dist/` |
| `npm run build:dev` | Build with Vite’s development mode |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |

## Deployment

`Dockerfile` builds with Node 20 and serves `dist/` from nginx on port 80. That nginx file is the SPA fallback and `/health`. Build args baked into the image are `VITE_API_URL`, `VITE_SEARCH_API_URL`, `VITE_CHAT_API_URL`, and `VITE_ATLAS_TILES`. Pass `VITE_IP_SEARCH_API_URL`, `VITE_CHATBOT_ENABLED`, and `VITE_ENABLE_AUTH` at build time when they should differ from the client fallbacks. Vite reads `VITE_*` at build time.

## Related services

This UI calls them; it does not contain them.

| Service | What this client uses it for |
|---------|------------------------------|
| api-gateway (local port 8080) | `/api`, and `/search` plus `/chat-api` when those bases point at the gateway |
| auth-service, behind the gateway | `/api/auth/me`, `/login`, `/logout` |
| Directory, magazines, suggestions, KG API | Routes under `VITE_API_URL`, including `/kg` |
| [SEO-Backend-iitd](https://github.com/IITD-Tech-Ambit/SEO-Backend-iitd) | Publication search, taxonomy, and the IP search API |
| [chatbot-agent](https://github.com/IITD-Tech-Ambit/chatbot-agent) | Chat stream and quota when the widget is enabled |
