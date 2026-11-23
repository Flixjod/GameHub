# build stage: frontend + deps with dev tools
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx vite build

# runtime stage: prod deps only (better-sqlite3 ships prebuilt glibc binaries)
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["sh", "-c", "node server/ensureSeed.js && exec node server/index.js"]
