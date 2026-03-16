# Frontend - React/Vite with Nginx
FROM node:20-alpine AS builder

# Proxy for IITD network
ARG HTTP_PROXY
ARG HTTPS_PROXY
ENV HTTP_PROXY=$HTTP_PROXY
ENV HTTPS_PROXY=$HTTPS_PROXY

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* package-lock.json* ./

# Install dependencies
RUN npm install --frozen-lockfile 2>/dev/null || npm install

# Copy source
COPY . .

# Build for production
ARG VITE_API_URL
ARG VITE_SEARCH_API_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SEARCH_API_URL=$VITE_SEARCH_API_URL

RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
