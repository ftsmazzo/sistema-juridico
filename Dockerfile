# Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json drizzle.config.ts ./
COPY src ./src
RUN npm run build

# Run
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY drizzle ./drizzle

EXPOSE 3000

CMD ["node", "dist/index.js"]
