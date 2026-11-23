# full deps + frontend build (toolchain needed: better-sqlite3 compiles at install)
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/* \
 && npm ci
COPY . .
RUN npx vite build

# production-only dependencies, compiled against the same base image
FROM node:22-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/* \
 && npm ci --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY server ./server
EXPOSE 8080
CMD ["sh", "-c", "node server/ensureSeed.js && exec node server/index.js"]
